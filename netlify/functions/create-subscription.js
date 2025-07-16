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
    if (!response.ok) {
        console.error("Error al obtener token de PayPal:", data);
        throw new Error('Error de autenticación con PayPal. Revisa tus variables de entorno PAYPAL_CLIENT_ID y PAYPAL_SECRET.');
    }
    return data.access_token;
}

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
    }

    const { user } = context.clientContext;
    if (!user) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Acceso no autorizado. El usuario debe iniciar sesión.' }) };
    }

    try {
        const { plan } = JSON.parse(event.body || '{}');
        if (!plan) {
            return { statusCode: 400, body: JSON.stringify({ error: 'El plan no fue especificado. El frontend debe enviar el "plan".' }) };
        }

        const planIdMap = {
            'boost': process.env.PAYPAL_BOOST_PLAN_ID,
            'pro': process.env.PAYPAL_PRO_PLAN_ID
        };
        const paypalPlanId = planIdMap[plan];

        if (!paypalPlanId) {
            console.error(`ID de plan no encontrado para el plan '${plan}'. Verifica las variables PAYPAL_BOOST_PLAN_ID y PAYPAL_PRO_PLAN_ID en Netlify.`);
            return { statusCode: 400, body: JSON.stringify({ error: `Configuración de plan inválida en el servidor para: ${plan}` }) };
        }

        const accessToken = await getAccessToken();

        const response = await fetch(`${BASE_URL}/v1/billing/subscriptions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'PayPal-Request-Id': `sub-${user.sub}-${Date.now()}`
            },
            body: JSON.stringify({
                plan_id: paypalPlanId,
                custom_id: user.sub,
                application_context: {
                    brand_name: 'Goatify IA',
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
            console.error('Error en la API de PayPal al crear la suscripción:', subscriptionData);
            return { statusCode: response.status, body: JSON.stringify({ error: 'Error al iniciar la suscripción en PayPal.', details: subscriptionData }) };
        }

    } catch (err) {
        console.error('Error fatal en la función create-subscription:', err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Error interno del servidor.', details: err.message }) };
    }
};
