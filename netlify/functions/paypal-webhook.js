// netlify/functions/paypal-webhook.js
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

async function getNetlifyAdminToken() {
    console.log("--- Obteniendo token de Netlify (Estrategia Definitiva v3) ---");
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.NETLIFY_OAUTH_CLIENT_ID);
    params.append('client_secret', process.env.NETLIFY_OAUTH_CLIENT_SECRET);

    const res = await fetch('https://api.netlify.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, // CORRECCIÓN CLAVE
        body: params.toString()
    });

    const json = await res.json();
    if (!res.ok) {
        console.error('ERROR CRÍTICO obteniendo el token de Netlify:', json);
        throw new Error(`No se pudo obtener token de Netlify: ${json.error_description}`);
    }
    console.log("--- Token de Netlify obtenido exitosamente ---");
    return json.access_token;
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    try {
        const paypalEvent = JSON.parse(event.body);

        if (paypalEvent.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
            const { resource } = paypalEvent;
            const userId = resource.custom_id;
            const paypalPlanId = resource.plan_id;

            if (!userId) throw new Error('Falta custom_id (userId) en PayPal.');

            let planName;
            let creditsToAdd = 0;
            if (paypalPlanId === process.env.PAYPAL_BOOST_PLAN_ID) {
                planName = 'boost';
                creditsToAdd = 1000;
            } else if (paypalPlanId === process.env.PAYPAL_PRO_PLAN_ID) {
                planName = 'pro';
                creditsToAdd = 4000;
            } else {
                throw new Error(`Plan ID de PayPal desconocido: ${paypalPlanId}`);
            }
            
            console.log(`Procesando: User ID: ${userId}, Plan: ${planName}, Créditos: ${creditsToAdd}`);

            // 1. Actualizar Netlify Identity
            const adminToken = await getNetlifyAdminToken();
            await fetch(`https://api.netlify.com/api/v1/sites/${process.env.SITE_ID}/identity/${userId}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ app_metadata: { plan: planName } })
            });
            console.log('Metadatos del usuario en Netlify actualizados.');

            // 2. Actualizar Supabase
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
            
            // Actualizamos el plan en la tabla de perfiles
            await supabase.from('profiles').update({ plan: planName }).eq('id', userId);
            console.log('Tabla de perfiles actualizada con el nuevo plan.');

            // Usamos la función SQL unificada para AÑADIR los créditos
            const { error: rpcError } = await supabase.rpc('increment_credits', {
                user_id_param: userId,
                increment_value: creditsToAdd
            });
            if (rpcError) throw rpcError;
            
            // Insertamos el registro en la tabla de suscripciones
            await supabase.from('subscriptions').upsert({
                user_id: userId,
                plan_id: paypalPlanId,
                paypal_subscription_id: resource.id,
                status: 'active'
            }, { onConflict: 'user_id' });
            console.log('Tabla de suscripciones actualizada.');
                
            console.log(`ÉXITO: Se actualizó el plan y se añadieron créditos al usuario ${userId}.`);
        }

        return { statusCode: 200, body: 'Webhook procesado.' };
    } catch (e) {
        console.error('Error fatal en la función paypal-webhook:', e);
        return { statusCode: 500, body: `Error interno: ${e.message}` };
    }
};
