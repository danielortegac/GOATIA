/* ------------------------------------------------------------------
   Goatify IA – create-subscription (envía custom_id correcto = userId)
------------------------------------------------------------------- */
const fetch = require('node-fetch');

exports.handler = async (event) => {
  try {
    /* 1. Verificamos token (solo existencia) --------------------------- */
    const auth = event.headers.authorization || event.headers.Authorization;
    if (!auth)  return { statusCode: 401, body: 'Falta token' };

    /* 2. Tomamos plan + userId del body -------------------------------- */
    const { plan, userId } = JSON.parse(event.body || '{}');
    if (!plan || !['boost', 'pro'].includes(plan)) {
      return { statusCode: 400, body: 'Plan inválido' };
    }
    if (!userId) {
      return { statusCode: 400, body: 'userId faltante' };
    }

    /* 3. Plan‑ID de PayPal -------------------------------------------- */
    const planId = plan === 'boost'
      ? process.env.PAYPAL_BOOST_PLAN_ID
      : process.env.PAYPAL_PRO_PLAN_ID;

    /* 4. Access token PayPal ------------------------------------------ */
    const authRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          process.env.PAYPAL_CLIENT_ID + ':' + process.env.PAYPAL_CLIENT_SECRET
        ).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });
    const { access_token } = await authRes.json();

    /* 5. Crear suscripción PayPal -------------------------------------- */
    const subRes = await fetch('https://api-m.sandbox.paypal.com/v1/billing/subscriptions', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`
      },
      body: JSON.stringify({
        plan_id:   planId,
        custom_id: userId,                         // 👈 uuid netlify
        application_context: {
          brand_name: 'Goatify IA',
          return_url: `${process.env.BASE_URL}/?payment=success`,
          cancel_url: `${process.env.BASE_URL}/?payment=cancel`
        }
      })
    });

    const subData = await subRes.json();
    const approvalUrl = subData.links?.find(l => l.rel === 'approve')?.href;
    return { statusCode: 200, body: JSON.stringify({ approvalUrl }) };

  } catch (err) {
    console.error('[create-subscription] error:', err);
    return { statusCode: 500, body: 'Error interno' };
  }
};
