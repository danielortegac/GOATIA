// netlify/functions/create-subscription.js
const fetch = require('node-fetch');

// Determina si estamos en entorno de producción o de pruebas (sandbox)
const BASE_URL = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// Función para obtener el token de acceso de PayPal de forma segura
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
        // Obtenemos el plan y el ID del usuario desde el cuerpo de la petición del frontend
        const { plan, userId } = JSON.parse(event.body || '{}');

        // Verificación de seguridad: si no tenemos el plan o el ID del usuario, detenemos el proceso
        if (!plan || !userId) {
            console.error('Petición incompleta. Faltan "plan" o "userId".');
            return { statusCode: 400, body: JSON.stringify({ error: `Datos incompletos. Se recibió plan: ${plan}, userId: ${userId}` }) };
        }

        // Mapeamos el nombre del plan a su ID de PayPal correspondiente (configurado en Netlify)
        const planIdMap = {
            'boost': process.env.PAYPAL_BOOST_PLAN_ID,
            'pro': process.env.PAYPAL_PRO_PLAN_ID
        };
        const paypalPlanId = planIdMap[plan];

        if (!paypalPlanId) {
            return { statusCode: 400, body: JSON.stringify({ error: `ID de plan de PayPal no encontrado para: ${plan}` }) };
        }

        const accessToken = await getAccessToken();

        const response = await fetch(`${BASE_URL}/v1/billing/subscriptions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'PayPal-Request-Id': `sub-${userId}-${Date.now()}` // ID único para seguridad
            },
            body: JSON.stringify({
                plan_id: paypalPlanId,
                custom_id: userId, // Guardamos el ID del usuario para saber quién pagó
                application_context: {
                    brand_name: 'Goatify IA',
                    shipping_preference: 'NO_SHIPPING',
                    user_action: 'SUBSCRIBE_NOW',
                    return_url: 'https://goatify.app?subscription=success',
                    cancel_url: 'https://goatify.app?subscription=cancelled'
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
            console.error('Error en la API de PayPal:', subscriptionData);
            return { statusCode: response.status, body: JSON.stringify({ error: 'Error al iniciar la suscripción en PayPal.', details: subscriptionData }) };
        }

    } catch (err) {
        console.error('Error interno en la función:', err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
