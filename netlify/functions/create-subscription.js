// netlify/functions/create-subscription.js

const fetch = require('node-fetch');

const BASE_URL = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// Función para obtener el token de acceso de PayPal
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

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método no permitido' };
    }

    try {
        const { plan, userId } = JSON.parse(event.body || '{}');

        // Validar que los datos necesarios están presentes
        if (!plan || !userId) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Faltan datos requeridos (plan o userId)' }) };
        }

        // Mapear el nombre del plan a su ID de PayPal correspondiente desde las variables de entorno
        const planIdMap = {
            'boost': process.env.PAYPAL_BOOST_PLAN_ID,
            'pro': process.env.PAYPAL_PRO_PLAN_ID
        };

        const paypalPlanId = planIdMap[plan];

        if (!paypalPlanId) {
            return { statusCode: 400, body: JSON.stringify({ error: `Plan inválido: ${plan}` }) };
        }

        const accessToken = await getAccessToken();

        const response = await fetch(`${BASE_URL}/v1/billing/subscriptions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'PayPal-Request-Id': `sub-${Date.now()}` // ID único para evitar duplicados
            },
            body: JSON.stringify({
                plan_id: paypalPlanId,
                custom_id: userId, // Pasar el ID de usuario de Netlify
                application_context: {
                    return_url: 'https://your-app-url.com/success', // URL a la que volver tras un pago exitoso
                    cancel_url: 'https://your-app-url.com/cancel'  // URL a la que volver si el usuario cancela
                }
            })
        });

        const subscriptionData = await response.json();

        if (response.status >= 200 && response.status < 300) {
            // El link de aprobación es lo que necesita el frontend para redirigir al usuario
            const approvalUrl = subscriptionData.links.find(link => link.rel === 'approve').href;
            return {
                statusCode: 200,
                body: JSON.stringify({ approvalUrl })
            };
        } else {
            console.error('Error de API de PayPal:', subscriptionData);
            return { statusCode: response.status, body: JSON.stringify({ error: subscriptionData.message || 'Error al crear la suscripción en PayPal.' }) };
        }

    } catch (err) {
        console.error('Error interno en la función:', err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
