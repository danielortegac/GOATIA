// netlify/functions/paypal-webhook.js
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Helper para obtener el token de administrador de Netlify (NUEVA ESTRATEGIA)
async function getNetlifyAdminToken() {
    console.log("--- Intentando obtener el token de Netlify (Estrategia v4) ---");
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.NETLIFY_OAUTH_CLIENT_ID);
    params.append('client_secret', process.env.NETLIFY_OAUTH_CLIENT_SECRET);

    const res = await fetch('https://api.netlify.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    });

    const json = await res.json();
    if (!res.ok) {
        console.error('ERROR CRÍTICO obteniendo el token de Netlify:', json);
        throw new Error('No se pudo obtener el token de administrador de Netlify.');
    }
    console.log("--- TOKEN DE NETLIFY OBTENIDO EXITOSAMENTE ---");
    return json.access_token;
}

// Handler principal de la función
exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const paypalEvent = JSON.parse(event.body);
        console.log('--- EJECUTANDO WEBHOOK V4 ---');
        console.log('Evento de PayPal recibido:', JSON.stringify(paypalEvent, null, 2));

        if (paypalEvent.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
            const { resource } = paypalEvent;
            const userId = resource.custom_id;
            const paypalPlanId = resource.plan_id;

            if (!userId) {
                console.error('Error: Falta el ID de usuario (custom_id) en el recurso de PayPal.');
                return { statusCode: 400, body: 'Falta userId en el webhook.' };
            }

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
                return { statusCode: 400, body: 'Plan ID desconocido.' };
            }
            
            console.log(`Procesando activación para Usuario ID: ${userId}, Plan: ${planName}, Créditos a añadir: ${bonus}`);

            const adminToken = await getNetlifyAdminToken();
            
            const netlifyUserUpdateResponse = await fetch(
                `https://api.netlify.com/api/v1/sites/${process.env.SITE_ID}/identity/${userId}`,
                {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${adminToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        app_metadata: {
                            plan: planName,
                            roles: [planName, 'member'],
                            paypal_subscription_id: resource.id
                        }
                    })
                }
            );
            
            if (!netlifyUserUpdateResponse.ok) {
                 const errorBody = await netlifyUserUpdateResponse.text();
                 console.error('Error al actualizar Netlify Identity:', errorBody);
                 throw new Error('No se pudieron actualizar los metadatos del usuario en Netlify.');
            }
            console.log('Metadatos del usuario en Netlify actualizados exitosamente.');

            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

            await supabase.from('subscriptions').insert({
                user_id: userId,
                plan_id: paypalPlanId,
                paypal_subscription_id: resource.id,
                status: 'active',
                updated_at: new Date().toISOString()
            });
            console.log('Tabla de suscripciones actualizada en Supabase.');

            const { error: rpcError } = await supabase.rpc('increment_credits', {
                user_id_param: userId,
                increment_value: bonus
            });

            if (rpcError) {
                console.error('Error al ejecutar RPC para incrementar créditos:', rpcError);
                throw rpcError;
            }
                
            console.log(`Créditos actualizados exitosamente para el usuario ${userId}. Se añadieron ${bonus} créditos.`);
        }

        return { statusCode: 200, body: 'Webhook procesado exitosamente.' };
    } catch (e) {
        console.error('Error fatal en la función paypal-webhook:', e);
        return { statusCode: 500, body: `Error interno del servidor: ${e.message}` };
    }
};
