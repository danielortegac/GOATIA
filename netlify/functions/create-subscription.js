// netlify/functions/create-subscription.js
const fetch = require('node-fetch');

// Función interna para obtener un token de acceso seguro de PayPal
async function getPayPalAccessToken() {
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
    const response = await fetch('https://api.sandbox.paypal.com/v1/oauth2/token', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}` },
        body: 'grant_type=client_credentials',
    });
    const data = await response.json();
    return data.access_token;
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método no permitido' };
    }

    try {
        const { plan } = JSON.parse(event.body);
        const { user } = event.clientContext;

        if (!user) {
            return { statusCode: 401, body: 'No estás autorizado.' };
        }

        // Selecciona el ID del plan correcto desde las variables de entorno
        const planId = plan === 'boost' ? process.env.PAYPAL_PLAN_ID_BOOST : process.env.PAYPAL_PLAN_ID_PRO;
        const accessToken = await getPayPalAccessToken();

        // Llama a la API de PayPal para crear la suscripción
        const response = await fetch('https://api.sandbox.paypal.com/v1/billing/subscriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'PayPal-Request-Id': `sub-${user.sub}-${Date.now()}`
            },
            body: JSON.stringify({
                plan_id: planId,
                custom_id: user.sub, // ¡Importante! Guardamos el ID del usuario para saber quién pagó
                application_context: {
                    return_url: 'https://www.goatify.app/success.html',
                    cancel_url: 'https://www.goatify.app/',
                },
            }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        // Devuelve el enlace de pago para que el usuario sea redirigido
        const approvalLink = data.links.find(link => link.rel === 'approve');
        return { statusCode: 200, body: JSON.stringify({ approvalUrl: approvalLink.href }) };

    } catch (error) {
        console.error('Error al crear suscripción:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
