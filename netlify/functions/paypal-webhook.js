// netlify/functions/paypal-webhook.js
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// --------------------------------------------------------------------
// TOKEN de admin Netlify
async function getNetlifyAdminToken() {
    const res = await fetch('https://api.netlify.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'client_credentials',
            client_id: process.env.NETLIFY_OAUTH_CLIENT_ID,
            client_secret: process.env.NETLIFY_OAUTH_CLIENT_SECRET
        })
    });
    const json = await res.json();
    return json.access_token;
}

// --------------------------------------------------------------------
// HANDLER
exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const paypalEvent = JSON.parse(event.body);
        
        // Log para ver el evento que llega de PayPal (muy útil para depurar)
        console.log('Evento de PayPal recibido:', JSON.stringify(paypalEvent, null, 2));

        if (paypalEvent.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
            const { resource } = paypalEvent;
            const userId = resource.custom_id; // viene de create-subscription
            const paypalPlanId = resource.plan_id;

            if (!userId) {
                console.error('Error: Falta el ID de usuario (custom_id) en el recurso de PayPal.');
                return { statusCode: 400, body: 'Falta userId' };
            }

            // Plan ↔ nombre
            let planName;
            let bonus = 0;

            if (paypalPlanId === process.env.PAYPAL_BOOST_PLAN_ID) {
                planName = 'boost';
                bonus = 1000;
            } else if (paypalPlanId === process.env.PAYPAL_PRO_PLAN_ID) {
                planName = 'pro';
                bonus = 4000;
            } else {
                console.error('Error: Plan ID de PayPal desconocido:', paypalPlanId);
                return { statusCode: 400, body: 'Plan ID desconocido' };
            }
            
            console.log(`Procesando activación para el usuario: ${userId}, Plan: ${planName}, Créditos a añadir: ${bonus}`);

            // 1) Actualiza Identity en Netlify
            const adminToken = await getNetlifyAdminToken();
            await fetch(
                `https://api.netlify.com/api/v1/sites/${process.env.SITE_ID}/identity/${userId}`,
                {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${adminToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        app_metadata: {
                            // ---- LA CORRECCIÓN ESTÁ AQUÍ ----
                            plan: planName, // Usamos la variable correcta 'planName'
                            roles: [planName, 'member'],
                            paypal_subscription_id: resource.id
                        }
                    })
                }
            );
            console.log('Metadatos del usuario en Netlify actualizados.');

            // 2) Actualiza en Supabase
            const supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_KEY
            );

            // a) tabla subscriptions
            await supabase.from('subscriptions').insert({
                user_id: userId,
                plan_id: paypalPlanId,
                paypal_subscription_id: resource.id,
                status: 'active',
                updated_at: new Date().toISOString()
            });
            console.log('Tabla de suscripciones actualizada.');

            // b) créditos
            const { data: prof, error: profileError } = await supabase
                .from('profiles')
                .select('credits')
                .eq('id', userId)
                .single();

            if (profileError && profileError.code !== 'PGRST116') {
                // Si hay un error que no sea "no se encontró fila", lo registramos.
                console.error('Error al obtener el perfil del usuario:', profileError);
                throw profileError;
            }

            const currentCredits = prof?.credits || 0;
            const newTotalCredits = currentCredits + bonus;

            await supabase
                .from('profiles')
                .update({ credits: newTotalCredits })
                .eq('id', userId);
                
            console.log(`Créditos actualizados para el usuario ${userId}. Nuevo total: ${newTotalCredits}`);
        }

        return { statusCode: 200, body: 'Webhook procesado exitosamente' };
    } catch (e) {
        console.error('Error en la función paypal-webhook:', e);
        return { statusCode: 500, body: e.message };
    }
};
