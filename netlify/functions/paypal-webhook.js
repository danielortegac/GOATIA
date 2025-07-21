// RUTA: netlify/functions/paypal-webhook.js
// Reemplaza todo el contenido de tu archivo con este código.

const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

/**
 * Obtiene el token de administrador de Netlify.
 * ESTA FUNCIÓN CONTIENE LA CORRECCIÓN CRÍTICA.
 */
async function getNetlifyAdminToken() {
    console.log("--- [PASO 1] Iniciando obtención de token de Netlify ---");
    
    if (!process.env.NETLIFY_OAUTH_CLIENT_ID || !process.env.NETLIFY_OAUTH_CLIENT_SECRET) {
        throw new Error("Las variables de entorno NETLIFY_OAUTH_CLIENT_ID o NETLIFY_OAUTH_CLIENT_SECRET no están definidas. Revisa la configuración de tu sitio en Netlify.");
    }

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
        console.error('--- [ERROR CRÍTICO] Falló la obtención del token de Netlify. Respuesta de la API:', jsonResponse);
        throw new Error(`No se pudo obtener el token de Netlify: ${jsonResponse.error_description || 'Respuesta desconocida del servidor.'}`);
    }

    console.log("--- [ÉXITO PASO 1] Token de administrador de Netlify obtenido. ---");
    return jsonResponse.access_token;
}

/**
 * Handler principal del webhook de PayPal.
 */
exports.handler = async (event) => {
    console.log("--- [INICIO] Webhook de PayPal recibido. ---");
    
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método no permitido.' };
    }

    try {
        const paypalEvent = JSON.parse(event.body);
        console.log(`Evento recibido: ${paypalEvent.event_type}`);

        if (paypalEvent.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
            const { resource } = paypalEvent;
            const userId = resource.custom_id;
            const paypalPlanId = resource.plan_id;

            if (!userId) {
                console.error("--- [ERROR] No se encontró 'custom_id' (userId) en el payload de PayPal.");
                throw new Error("Falta 'custom_id' (userId) en el payload de PayPal.");
            }
            console.log(`Datos extraídos: User ID: ${userId}, PayPal Plan ID: ${paypalPlanId}`);

            let planName;
            if (paypalPlanId === process.env.PAYPAL_BOOST_PLAN_ID) {
                planName = 'boost';
            } else if (paypalPlanId === process.env.PAYPAL_PRO_PLAN_ID) {
                planName = 'pro';
            } else {
                 console.error(`--- [ERROR] ID de plan de PayPal desconocido: ${paypalPlanId}`);
                throw new Error(`ID de plan de PayPal desconocido: ${paypalPlanId}`);
            }
            
            console.log(`Plan de Goatify identificado como: '${planName}'. Iniciando proceso de actualización.`);

            // --- PROCESO DE ACTUALIZACIÓN ---
            const adminToken = await getNetlifyAdminToken();

            console.log("--- [PASO 2] Intentando actualizar metadatos en Netlify Identity... ---");
            const netlifyResponse = await fetch(`https://api.netlify.com/api/v1/sites/${process.env.SITE_ID}/identity/${userId}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${adminToken}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ app_metadata: { plan: planName } })
            });

            if (!netlifyResponse.ok) {
                const errorBody = await netlifyResponse.text();
                console.error('--- [ERROR PASO 2] Falló la actualización en Netlify Identity:', errorBody);
                throw new Error('No se pudo actualizar los metadatos del usuario en Netlify.');
            }
            console.log('--- [ÉXITO PASO 2] Metadatos del usuario actualizados en Netlify. ---');

            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
            
            console.log("--- [PASO 3] Llamando a la función RPC 'upgrade_user_plan' en Supabase... ---");
            const { error: rpcError } = await supabase.rpc('upgrade_user_plan', {
                user_id_input: userId,
                new_plan: planName
            });

            if (rpcError) {
                console.error("--- [ERROR PASO 3] Falló la llamada a la función RPC:", rpcError);
                throw rpcError;
            }
            console.log('--- [ÉXITO PASO 3] Tabla "profiles" actualizada con nuevo plan y créditos. ---');

            console.log("--- [PASO 4] Insertando/actualizando registro en la tabla 'subscriptions'... ---");
            const { error: upsertError } = await supabase.from('subscriptions').upsert({
                user_id: userId,
                plan_id: paypalPlanId,
                paypal_subscription_id: resource.id,
                status: 'active'
            }, { onConflict: 'user_id' });

            if (upsertError) {
                console.error("--- [ERROR PASO 4] Falló el upsert en la tabla 'subscriptions':", upsertError);
                throw upsertError;
            }
            console.log('--- [ÉXITO PASO 4] Tabla "subscriptions" actualizada. ---');
            
            console.log(`--- [COMPLETADO] Proceso finalizado exitosamente para el usuario ${userId}. ---`);
        } else {
            console.log("Evento ignorado (no es BILLING.SUBSCRIPTION.ACTIVATED).");
        }
        
        return { statusCode: 200, body: 'Webhook procesado.' };

    } catch (e) {
        console.error('--- [ERROR FATAL] Ocurrió un error en el handler del webhook:', e);
        return { statusCode: 500, body: `Error interno del servidor: ${e.message}` };
    }
};
