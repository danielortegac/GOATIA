// netlify/functions/paypal-webhook.js
const fetch = require('node-fetch');

// Función para obtener un token de administrador de Netlify
async function getNetlifyAdminToken() {
    const response = await fetch('https://api.netlify.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'client_credentials',
            client_id: process.env.NETLIFY_OAUTH_CLIENT_ID,
            client_secret: process.env.NETLIFY_OAUTH_CLIENT_SECRET
        })
    });
    const data = await response.json();
    return data.access_token;
}


exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const paypalEvent = JSON.parse(event.body);

        if (paypalEvent.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
            const resource = paypalEvent.resource;
            const userId = resource.custom_id;
            const paypalPlanId = resource.plan_id;

            if (!userId) {
                console.error("Webhook de PayPal recibido sin 'custom_id' (userId).");
                return { statusCode: 400, body: 'Falta userId.' };
            }

            let planName;
            if (paypalPlanId === process.env.PAYPAL_BOOST_PLAN_ID) {
                planName = 'boost';
            } else if (paypalPlanId === process.env.PAYPAL_PRO_PLAN_ID) {
                planName = 'pro';
            } else {
                console.warn(`Webhook con Plan ID desconocido: ${paypalPlanId}`);
                return { statusCode: 400, body: 'Plan ID desconocido.' };
            }
            
            const adminToken = await getNetlifyAdminToken();
            const siteId = process.env.SITE_ID;

            const response = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/identity/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    app_metadata: {
                        plan: planName,
                        roles: [planName, 'member'],
                        paypal_subscription_id: resource.id
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error al actualizar usuario en Netlify:', errorData);
                throw new Error('No se pudo actualizar el plan del usuario.');
            }

            console.log(`Usuario ${userId} actualizado al plan '${planName}' exitosamente.`);
        }
        
        return { statusCode: 200, body: 'Webhook procesado.' };

    } catch (error) {
        console.error('Error procesando webhook:', error);
        return { statusCode: 500, body: `Webhook Error: ${error.message}` };
    }
};
