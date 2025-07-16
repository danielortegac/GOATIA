const fetch = require('node-fetch');

const BASE_URL = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getAccessToken() {
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
    const response = await fetch(`${BASE_URL}/v1/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${auth}` },
        body: 'grant_type=client_credentials'
    });
    const data = await response.json();
    if (!response.ok) throw new Error('Error de autenticación con PayPal');
    return data.access_token;
}

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método no permitido' };
    }

    // 1. Verificación de seguridad: Solo usuarios autenticados pueden continuar.
    const { user } = context.clientContext;
    if (!user) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Acceso no autorizado.' }) };
    }

    try {
        const { plan } = JSON.parse(event.body || '{}');
        if (!plan) {
            return { statusCode: 400, body: JSON.stringify({ error: 'El plan no fue especificado en la petición.' }) };
        }

        // 2. Mapeo de planes a IDs de PayPal (leídos desde Netlify)
        const planIdMap = {
            'boost': process.env.PAYPAL_BOOST_PLAN_ID,
            'pro': process.env.PAYPAL_PRO_PLAN_ID
        };
        const paypalPlanId = planIdMap[plan];

        if (!paypalPlanId) {
            return { statusCode: 400, body: JSON.stringify({ error: `ID de plan de PayPal no encontrado para el plan: ${plan}` }) };
        }

        const accessToken = await getAccessToken();

        // 3. Creación de la suscripción con el ID de usuario seguro
        const response = await fetch(`${BASE_URL}/v1/billing/subscriptions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                plan_id: paypalPlanId,
                custom_id: user.sub, // ID de usuario de Netlify
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

        if (response.ok && subscriptionData.links) {
            const approvalUrl = subscriptionData.links.find(link => link.rel === 'approve').href;
            return { statusCode: 200, body: JSON.stringify({ approvalUrl }) };
        } else {
            throw new Error(subscriptionData.message || 'Error en la API de PayPal.');
        }

    } catch (err) {
        console.error('Error en create-subscription:', err.message);
        return { statusCode: 500, body: JSON.stringify({ error: 'Error interno del servidor.', details: err.message }) };
    }
};
