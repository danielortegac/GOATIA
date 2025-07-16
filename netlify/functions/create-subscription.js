const fetch = require('node-fetch');

const BASE_URL = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getAccessToken() {
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
    const response = await fetch(`${BASE_URL}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${auth}`
        },
        body: 'grant_type=client_credentials'
    });
    const data = await response.json();
    if (!response.ok) {
        console.error("Error al obtener token de PayPal:", data);
        throw new Error('Error de autenticación con PayPal');
    }
    return data.access_token;
}

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método no permitido' };
    }

    // Verificación de seguridad: Asegurarse de que la petición viene de un usuario autenticado
    const { user } = context.clientContext;
    if (!user) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Acceso no autorizado. Debes iniciar sesión.' }) };
    }

    try {
        const { plan } = JSON.parse(event.body || '{}');
        const userId = user.sub; // Usar el ID del usuario verificado por Netlify

        if (!plan) {
            return { statusCode: 400, body: JSON.stringify({ error: 'No se especificó un plan.' }) };
        }

        const planIdMap = {
            'boost': process.env.PAYPAL_BOOST_PLAN_ID,
            'pro': process.env.PAYPAL_PRO_PLAN_ID
        };
        const paypalPlanId = planIdMap[plan];

        if (!paypalPlanId) {
            return { statusCode: 400, body: JSON.stringify({ error: `ID de plan de PayPal no válido para: ${plan}` }) };
        }

        const accessToken = await getAccessToken();

        const response = await fetch(`${BASE_URL}/v1/billing/subscriptions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'PayPal-Request-Id': `sub-${userId}-${Date.now()}`
            },
            body: JSON.stringify({
                plan_id: paypalPlanId,
                custom_id: userId,
                application_context: {
                    brand_name: 'Goatify IA',
                    shipping_preference: 'NO_SHIPPING',
                    user_action: 'SUBSCRIBE_NOW',
                    return_url: 'https://www.goatify.app?subscription=success',
                    cancel_url: 'https://www.goatify.app?subscription=cancelled'
                }
            })
        });

        const subscriptionData = await response.json();

        if (response.status >= 200 && response.status < 300 && subscriptionData.links) {
            const approvalUrl = subscriptionData.links.find(link => link.rel === 'approve').href;
            return {
                statusCode: 200,
                body: JSON.stringify({ approvalUrl: approvalUrl })
            };
        } else {
            console.error('Error API PayPal:', subscriptionData);
            return { statusCode: response.status, body: JSON.stringify({ error: 'Error al crear la suscripción en PayPal.', details: subscriptionData }) };
        }

    } catch (err) {
        console.error('Error interno en función:', err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
