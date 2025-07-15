const fetch = require('node-fetch');

/* 🔑 PayPal – token helper */
async function getPayPalAccessToken() {
  const auth = Buffer
    .from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`)
    .toString('base64');

  const res = await fetch('https://api.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}` },
    body: 'grant_type=client_credentials',
  });

  const data = await res.json();
  return data.access_token;
}

/* ────────────────────────────────────────────────────────────────────────── */
exports.handler = async (event, context) => {
  /* ✔️ Autenticación Netlify Identity */
  const { user } = context.clientContext || {};
  if (!user) return { statusCode: 401, body: 'No autorizado' };

  const { plan } = JSON.parse(event.body || '{}');
  if (!plan) return { statusCode: 400, body: 'Plan requerido' };

  try {
    const planId = plan === 'boost'
      ? process.env.PAYPAL_PLAN_ID_BOOST
      : process.env.PAYPAL_PLAN_ID_PRO;

    const accessToken = await getPayPalAccessToken();

    const res = await fetch('https://api.sandbox.paypal.com/v1/billing/subscriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: user.sub,           // guarda tu userId dentro de PayPal
        application_context: {
          return_url: 'https://www.goatify.app/success.html',
          cancel_url: 'https://www.goatify.app/',
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Error de PayPal');

    const approvalLink = data.links.find(l => l.rel === 'approve');
    return { statusCode: 200, body: JSON.stringify({ approvalUrl: approvalLink.href }) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
