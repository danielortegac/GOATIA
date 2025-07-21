// netlify/functions/paypal-webhook.js
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Helper to get Netlify admin token with the corrected header
async function getNetlifyAdminToken() {
    console.log("--- Obteniendo token de Netlify (Estrategia Final v5) ---");
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.NETLIFY_OAUTH_CLIENT_ID);
    params.append('client_secret', process.env.NETLIFY_OAUTH_CLIENT_SECRET);

    const res = await fetch('https://api.netlify.com/oauth/token', {
        method: 'POST',
        // This is the critical fix: setting the correct Content-Type
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, 
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
            if (paypalPlanId === process.env.PAYPAL_BOOST_PLAN_ID) {
                planName = 'boost';
            } else if (paypalPlanId === process.env.PAYPAL_PRO_PLAN_ID) {
                planName = 'pro';
            } else {
                throw new Error(`Plan ID de PayPal desconocido: ${paypalPlanId}`);
            }
            
            console.log(`Procesando: User ID: ${userId}, Plan: ${planName}`);

            // 1. Update Netlify Identity
            const adminToken = await getNetlifyAdminToken();
            const netlifyResponse = await fetch(`https://api.netlify.com/api/v1/sites/${process.env.SITE_ID}/identity/${userId}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ app_metadata: { plan: planName } })
            });
            if (!netlifyResponse.ok) {
                const errorBody = await netlifyResponse.text();
                console.error('Error al actualizar Netlify Identity:', errorBody);
                throw new Error('No se pudo actualizar los metadatos en Netlify.');
            }
            console.log('Metadatos del usuario en Netlify actualizados.');

            // 2. Update Supabase
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
            
            // Use your existing SQL function to upgrade the plan and grant credits
            const { error: rpcError } = await supabase.rpc('upgrade_user_plan', {
                user_id_input: userId,
                new_plan: planName
            });
            if (rpcError) throw rpcError;
            console.log('Tabla de perfiles actualizada en Supabase con el nuevo plan y créditos.');

            // Insert/update the record in the 'subscriptions' table
            await supabase.from('subscriptions').upsert({
                user_id: userId,
                plan_id: paypalPlanId,
                paypal_subscription_id: resource.id,
                status: 'active'
            }, { onConflict: 'user_id' });
            console.log('Tabla de suscripciones actualizada en Supabase.');
        }
        return { statusCode: 200, body: 'Webhook procesado.' };
    } catch (e) {
        console.error('Error fatal en la función paypal-webhook:', e);
        return { statusCode: 500, body: `Error interno: ${e.message}` };
    }
};
