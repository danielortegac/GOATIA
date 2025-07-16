// netlify/functions/create-subscription.js
const fetch = require('node-fetch');

// Función para obtener el token de acceso de PayPal
async function getPayPalAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch('https://api.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}` },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Error al obtener token de PayPal:", data);
    throw new Error(`Error de token de PayPal: ${data.error_description}`);
  }
  return data.access_token;
}

// Handler principal de la función
exports.handler = async (event) => {
  // Log para ver qué contexto de usuario recibimos
  console.log('create-subscription: Contexto de cliente recibido:', JSON.stringify(event.clientContext, null, 2));

  // Validación de seguridad
  if (!event.clientContext || !event.clientContext.user) {
    console.error('create-subscription: Petición no autorizada. Falta contexto de usuario.');
    return { statusCode: 401, body: JSON.stringify({ error: 'No autorizado. Debes iniciar sesión.' }) };
  }

  try {
    const { plan } = JSON.parse(event.body);
    const user = event.clientContext.user;

    console.log(`create-subscription: Usuario ${user.sub} (${user.email}) está intentando suscribirse al plan: ${plan}`);

    if (!plan) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Falta el nombre del plan.' }) };
    }

    const planId =
      plan === 'boost'
        ? process.env.PAYPAL_PLAN_ID_BOOST
        : process.env.PAYPAL_PLAN_ID_PRO;

    if (!planId) {
        console.error(`Error: Variable de entorno para el plan "${plan}" no está configurada.`);
        return { statusCode: 500, body: JSON.stringify({ error: 'Configuración del servidor incompleta.'}) };
    }
    
    console.log(`Usando PayPal Plan ID: ${planId}`);

    const accessToken = await getPayPalAccessToken();

    const response = await fetch(
      'https://api.sandbox.paypal.com/v1/billing/subscriptions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `sub-${Date.now()}` // Buena práctica para trazabilidad
        },
        body: JSON.stringify({
          plan_id: planId,
          custom_id: user.sub, // ID de usuario de Netlify para vincular la suscripción
          application_context: {
            brand_name: 'Goatify IA',
            return_url: 'https://www.goatify.app/success.html', // Página de éxito
            cancel_url: 'https://www.goatify.app/cancel.html',   // Página de cancelación
          },
        }),
      }
    );

    const data = await response.json();
    console.log('Respuesta de la API de PayPal:', data);

    if (!response.ok) {
        const errorDetail = data.details ? data.details[0].description : JSON.stringify(data);
        throw new Error(`Error de PayPal: ${errorDetail}`);
    }

    const approvalLink = data.links.find((link) => link.rel === 'approve');
    
    if (!approvalLink) {
        throw new Error("No se encontró el enlace de aprobación en la respuesta de PayPal.");
    }

    return { 
        statusCode: 200, 
        body: JSON.stringify({ approvalUrl: approvalLink.href }) 
    };

  } catch (err) {
    console.error('Error fatal en create-subscription:', err);
    return { 
        statusCode: 500, 
        body: JSON.stringify({ error: 'No se pudo procesar la suscripción.', details: err.message }) 
    };
  }
};
