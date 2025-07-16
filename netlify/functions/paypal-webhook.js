// netlify/functions/paypal-webhook.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async ({ body, headers }) => {
    // Validar que el webhook viene de PayPal (esto es una validación básica, para producción se recomienda una más robusta)
    if (!headers['paypal-transmission-id']) {
        return { statusCode: 400, body: 'Webhook no parece ser de PayPal.' };
    }
    
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    try {
        const paypalEvent = JSON.parse(body);

        // Escuchar el evento de suscripción activada
        if (paypalEvent.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
            const resource = paypalEvent.resource;
            const userId = resource.custom_id;
            const planId = resource.plan_id;
            const subscriptionId = resource.id;

            // Determinar qué plan se compró basado en el Plan ID de PayPal
            let planName;
            if (planId === process.env.PAYPAL_BOOST_PLAN_ID) {
                planName = 'boost';
            } else if (planId === process.env.PAYPAL_PRO_PLAN_ID) {
                planName = 'pro';
            } else {
                console.warn(`Plan ID desconocido recibido: ${planId}`);
                planName = 'unknown'; // O maneja el error como prefieras
            }

            if (!userId) {
                console.error('Webhook recibido sin userId en custom_id.');
                return { statusCode: 400, body: 'Falta el ID de usuario.' };
            }

            // Actualizar la tabla de usuarios en Supabase para reflejar el nuevo plan
            const { error } = await supabase
                .from('users') // Asumiendo que tienes una tabla 'users'
                .update({ 
                    plan: planName, 
                    paypal_subscription_id: subscriptionId,
                    subscription_status: 'active'
                })
                .eq('id', userId);

            if (error) {
                console.error('Error al actualizar el usuario en Supabase:', error);
                throw error;
            }
            
            console.log(`Usuario ${userId} actualizado al plan ${planName}.`);
        }
        
        // Aquí podrías manejar otros eventos importantes, como:
        // BILLING.SUBSCRIPTION.CANCELLED
        // BILLING.SUBSCRIPTION.SUSPENDED
        
        return { statusCode: 200, body: 'Webhook procesado correctamente.' };

    } catch (error) {
        console.error('Error procesando el webhook de PayPal:', error);
        return { statusCode: 500, body: `Error en Webhook: ${error.message}` };
    }
};
