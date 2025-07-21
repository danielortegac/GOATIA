// netlify/functions/paypal-webhook.js
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Helper para obtener el token de administrador de Netlify (CORREGIDO)
async function getNetlifyAdminToken() {
    console.log("--- Obteniendo token de Netlify (Estrategia Definitiva) ---");
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.NETLIFY_OAUTH_CLIENT_ID);
    params.append('client_secret', process.env.NETLIFY_OAUTH_CLIENT_SECRET);

    const res = await fetch('https://api.netlify.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, // CORRECCIÓN CLAVE para el error 'unsupported_grant_type'
        body: params.toString()
    });

    const json = await res.json();
    if (!res.ok) {
        console.error('ERROR CRÍTICO obteniendo el token de Netlify:', json);
        throw new Error(`No se pudo obtener token de Netlify. Razón: ${json.error_description || 'Desconocida'}`);
    }
    console.log("--- Token de Netlify obtenido exitosamente ---");
    return json.access_token;
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const paypalEvent = JSON.parse(event.body);
        console.log('--- Ejecutando Webhook Definitivo ---');

        if (paypalEvent.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
            const { resource } = paypalEvent;
            const userId = resource.custom_id;
            const paypalPlanId = resource.plan_id;

            if (!userId) throw new Error('Falta custom_id (userId) en el recurso de PayPal.');

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
            
            // Usamos la función que ya tienes para sumar créditos y actualizar el plan
            const { error: rpcError } = await supabase.rpc('upgrade_user_plan', {
                user_id_input: userId,
                new_plan: planName
            });
            if (rpcError) throw rpcError;
            console.log('Tabla de perfiles actualizada en Supabase con el nuevo plan y créditos.');

            // Insertar o actualizar registro en la tabla 'subscriptions'
            await supabase.from('subscriptions').upsert({
                user_id: userId,
                plan_id: paypalPlanId,
                paypal_subscription_id: resource.id,
                status: 'active',
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
            console.log('Tabla de suscripciones actualizada en Supabase.');
                
            console.log(`ÉXITO: Se actualizó el plan a ${planName} y se añadieron créditos al usuario ${userId}.`);
        }

        return { statusCode: 200, body: 'Webhook procesado.' };
    } catch (e) {
        console.error('Error fatal en la función paypal-webhook:', e);
        return { statusCode: 500, body: `Error interno: ${e.message}` };
    }
};
