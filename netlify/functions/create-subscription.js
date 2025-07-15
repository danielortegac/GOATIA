// netlify/functions/create-subscription.js
const fetch = require('node-fetch');

// --- helpers ---------------------------------------------------------------
async function getPayPalAccessToken () {
  const auth = Buffer
    .from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`)
    .toString('base64');

  const rsp = await fetch('https://api.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}` },
    body: 'grant_type=client_credentials'
  });

  const data = await rsp.json();
  if (!rsp.ok) throw new Error(JSON.stringify(data));
  return data.access_token;
}
// ---------------------------------------------------------------------------

exports.handler = async (event) => {
  /* ⚠️  QUITAMOS el filtro 401 para que cualquiera pueda llamar.           */
  /* Si más adelante quieres volver a proteger, re‑activa el bloque.        */
  // if (!event.clientContext || !event.clientContext.user) {
  //   return { statusCode: 401, body: 'No autorizado' };
  // }

  try {
    const { plan = 'boost' } = JSON.parse(event.body || '{}');
    const planId = plan === 'boost'
      ? process.env.PAYPAL_PLAN_ID_BOOST
      : process.env.PAYPAL_PLAN_ID_PRO;

    const access = await getPayPalAccessToken();

    const rsp = await fetch(
      'https://api.sandbox.paypal.com/v1/billing/subscriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `sub-${Date.now()}`
        },
        body: JSON.stringify({
          plan_id: planId,
          custom_id: `anon-${Date.now()}`,        // ← cualquier string
          application_context: {
            brand_name: 'Goatify IA',
            return_url: 'https://www.goatify.app/success.html',
            cancel_url: 'https://www.goatify.app/cancel.html'
          }
        })
      }
    );

    const data = await rsp.json();
    if (!rsp.ok) throw new Error(JSON.stringify(data));

    const approve = data.links.find(l => l.rel === 'approve')?.href;
    return { statusCode: 200, body: JSON.stringify({ approvalUrl: approve }) };

  } catch (err) {
    console.error('create‑subscription ERROR →', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
