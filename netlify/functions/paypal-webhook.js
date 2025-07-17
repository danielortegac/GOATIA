// netlify/functions/paypal-webhook.js
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Helper para obtener el token de administrador de Netlify
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
    if (!res.ok) {
        console.error('Error obteniendo el token de Netlify:', json);
        throw new Error('No se pudo obtener el token de administrador de Netlify.');
    }
    return json.access_token;
}

// Handler principal de la función
exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const paypalEvent = JSON.parse(event.body);
        
        // Log para ver el evento completo que llega de PayPal (muy útil para depurar)
        console.log('Evento de PayPal recibido:', JSON.stringify(paypalEvent, null, 2));

        // Nos aseguramos de que sea el evento de activación de una suscripción
        if (paypalEvent.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
            const { resource } = paypalEvent;
            const userId = resource.custom_id;
            const paypalPlanId = resource.plan_id;

            if (!userId) {
                console.error('Error: Falta el ID de usuario (custom_id) en el recurso de PayPal.');
                return { statusCode: 400, body: 'Falta userId en el webhook.' };
            }

            // Asignamos el nombre del plan y los créditos a otorgar
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

            // 1) Actualizar rol y plan del usuario en Netlify Identity
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
                            // --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
                            plan: planName, // Usamos la variable correcta 'planName'
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

            // 2) Actualizar tablas y créditos en Supabase
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

            // a) Insertar en la tabla de suscripciones
            await supabase.from('subscriptions').insert({
                user_id: userId,
                plan_id: paypalPlanId,
                paypal_subscription_id: resource.id,
                status: 'active',
                updated_at: new Date().toISOString()
            });
            console.log('Tabla de suscripciones actualizada en Supabase.');

            // b) Añadir los créditos al perfil del usuario
            // Usamos una función de base de datos (RPC) para hacer esto de forma segura
            // y evitar condiciones de carrera.
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

// Función para incrementar créditos en Supabase (debes añadirla en tu SQL Editor)
/*
CREATE OR REPLACE FUNCTION increment_credits(user_id_param uuid, increment_value int)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.profiles
  SET credits = credits + increment_value
  WHERE id = user_id_param;
END;
$$;
*/
