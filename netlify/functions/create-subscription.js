/**
 *  netlify/functions/create-subscription.js
 *
 *  Crea (o devuelve) el enlace de aprobación para una suscripción PayPal.
 *  – Funciona en SANDBOX o LIVE según la variable PAYPAL_ENV
 *  – Traza los errores con console.error para verlos en Netlify → Functions → Logs
 *  – Necesita las variables de entorno:
 *        PAYPAL_ENV            = sandbox   (o live)
 *        PAYPAL_CLIENT_ID
 *        PAYPAL_CLIENT_SECRET
 *        PAYPAL_PLAN_ID_BOOST  = P-xxxxxxxxxxxxxxxxxxxx
 *        PAYPAL_PLAN_ID_PRO    = P-xxxxxxxxxxxxxxxxxxxx
 */

const fetch = require('node-fetch');

/* -------------------------------------------------------------------------- */
/* 1. Helpers                                                                  */
/* -------------------------------------------------------------------------- */

const PAYPAL_ENV   = process.env.PAYPAL_ENV?.toLowerCase() === 'live' ? 'live' : 'sandbox';
const PAYPAL_HOST  = PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken () {
  const auth = Buffer
    .from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`)
    .toString('base64');

  const rsp  = await fetch(`${PAYPAL_HOST}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await rsp.json();
  if (!rsp.ok) throw new Error(`Token PayPal → ${rsp.status}: ${data.error_description || rsp.statusText}`);
  return data.access_token;
}

/* -------------------------------------------------------------------------- */
/* 2. Lambda handler                                                           */
/* -------------------------------------------------------------------------- */
exports.handler = async (event) => {
  /* ––– Seguridad Netlify Identity ––– */
  if (!event.clientContext || !event.clientContext.user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'No autorizado. Inicia sesión.' }) };
  }

  try {
    const { plan } = JSON.parse(event.body || '{}') || {};
    if (!plan) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Falta el nombre del plan.' }) };
    }

    const planId = plan === 'boost'
      ? process.env.PAYPAL_PLAN_ID_BOOST
      : process.env.PAYPAL_PLAN_ID_PRO;

    if (!planId) throw new Error(`PLAN_ID no definido para el plan «${plan}».`);

    /* Obtener token */
    const token = await getPayPalAccessToken();

    /* Crear la suscripción */
    const rsp = await fetch(`${PAYPAL_HOST}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization : `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `sub-${Date.now()}`   // idempotencia / trazabilidad
      },
      body: JSON.stringify({
        plan_id : planId,
        custom_id: event.clientContext.user.sub,   // id de usuario Netlify
        application_context: {
          brand_name: 'Goatify IA',
          user_action: 'SUBSCRIBE_NOW',
          return_url: 'https://www.goatify.app/success.html',
          cancel_url: 'https://www.goatify.app/cancel.html'
        }
      })
    });

    const data = await rsp.json();
    console.log('PayPal ↩', JSON.stringify(data, null, 2));

    if (!rsp.ok) {
      const detail = data.details?.[0]?.description || data.message || 'Error PayPal';
      throw new Error(`${rsp.status} ${detail}`);
    }

    const approval = data.links.find(l => l.rel === 'approve');
    if (!approval) throw new Error('PayPal no devolvió enlace de aprobación.');

    return { statusCode: 200, body: JSON.stringify({ approvalUrl: approval.href }) };

  } catch (err) {
    console.error('create‑subscription ERROR →', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
