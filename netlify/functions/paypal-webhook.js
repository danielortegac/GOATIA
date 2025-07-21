// CÓDIGO FINAL Y VERIFICADO PARA EL NUEVO ARCHIVO paypal-webhook.js

const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

async function getNetlifyAdminToken() {
    console.log("--- [PASO 1] Iniciando obtención de token de Netlify ---");
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.NETLIFY_OAUTH_CLIENT_ID);
    params.append('client_secret', process.env.NETLIFY_OAUTH_CLIENT_SECRET);
    const response = await fetch('https://api.netlify.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    });
    const jsonResponse = await response.json();
    if (!response.ok) {
        console.error('--- [ERROR CRÍTICO] Falló la obtención del token de Netlify. Respuesta:', jsonResponse);
        throw new Error(`No se pudo obtener el token de Netlify: ${jsonResponse.error_description || 'Respuesta desconocida.'}`);
    }
    console.log("--- [ÉXITO PASO 1] Token de administrador de Netlify obtenido. ---");
    return jsonResponse.access_token;
}

exports.handler = async (event) => {
    console.log("--- [INICIO] Webhook de PayPal recibido. ---");
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Método no permitido.' };

    try {
        const paypalEvent = JSON.parse(event.body);
        console.log(`Evento de PayPal recibido: ${paypalEvent.event_type}`);

        if (paypalEvent.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
            const { resource } = paypalEvent;
            const userId = resource.custom_id;
            const paypalPlanId = resource.plan_id;

            if (!userId) throw new Error("Falta 'custom_id' (userId) en el payload de PayPal.");
            console.log(`Datos extraídos: User ID: ${userId}, PayPal Plan ID: ${paypalPlanId}`);

            let planName;
            if (paypalPlanId === process.env.PAYPAL_BOOST_PLAN_ID) planName = 'boost';
            else if (paypalPlanId === process.env.PAYPAL_PRO_PLAN_ID) planName = 'pro';
            else throw new Error(`ID de plan de PayPal desconocido: ${paypalPlanId}`);

            console.log(`Plan de Goatify identificado como: '${planName}'. Iniciando proceso de actualización.`);

            const adminToken = await getNetlifyAdminToken();

            console.log("--- [PASO 2] Actualizando metadatos en Netlify Identity... ---");
            const netlifyResponse = await fetch(`https://api.netlify.com/api/v1/sites/${process.env.SITE_ID}/identity/${userId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ app_metadata: { plan: planName } })
            });
            if (!netlifyResponse.ok) {
                const errorBody = await netlifyResponse.text();
                console.error('--- [ERROR PASO 2] Falló la actualización en Netlify Identity:', errorBody);
                throw new Error('No se pudo actualizar los metadatos del usuario en Netlify.');
            }
            console.log('--- [ÉXITO PASO 2] Metadatos del usuario actualizados en Netlify. ---');

            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

            console.log("--- [PASO 3] Llamando a RPC 'upgrade_user_plan' en Supabase... ---");
            const { error: rpcError } = await supabase.rpc('upgrade_user_plan', { user_id_input: userId, new_plan: planName });
            if (rpcError) throw rpcError;
            console.log('--- [ÉXITO PASO 3] Tabla "profiles" actualizada con nuevo plan y créditos. ---');

            console.log("--- [PASO 4] Actualizando tabla 'subscriptions'... ---");
            const { error: upsertError } = await supabase.from('subscriptions').upsert({
                user_id: userId, plan_id: paypalPlanId, paypal_subscription_id: resource.id, status: 'active'
            }, { onConflict: 'user_id' });
            if (upsertError) throw upsertError;
            console.log('--- [ÉXITO PASO 4] Tabla "subscriptions" actualizada. ---');

            console.log(`--- [COMPLETADO] Proceso finalizado para el usuario ${userId}. ---`);
        } else {
            console.log("Evento ignorado (no es BILLING.SUBSCRIPTION.ACTIVATED).");
        }

        return { statusCode: 200, body: 'Webhook procesado.' };
    } catch (e) {
        console.error('--- [ERROR FATAL] Ocurrió un error en el handler del webhook:', e.message);
        return { statusCode: 500, body: `Error interno del servidor: ${e.message}` };
    }
};
