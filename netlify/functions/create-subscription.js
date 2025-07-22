/* ------------------------------------------------------------------
   Goatify IA – create-subscription  (versión que envía custom_id correcto)
------------------------------------------------------------------- */
const fetch = require('node-fetch');

exports.handler = async (event) => {
  try {
    // 1. Autenticamos al usuario
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) return { statusCode: 401, body: 'Falta token' };

    const [, token] = authHeader.split(' ');
    const userJwt   = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
    const userId    = userJwt.sub;   // <-- ESTE es el UUID real de Netlify Identity

    // 2. Leemos el plan que envió el front
    const { plan } = JSON.parse(event.body || '{}');
    if (!plan || !['boost', 'pro'].includes(plan)) {
      return { statusCode: 400, body: 'Plan inválido' };
    }

    // 3. Definimos el ID del plan PayPal según env var
    const planId = plan === 'boost'
      ? process.env.PAYPAL_BOOST_PLAN_ID
      : process.env.PAYPAL_PRO_PLAN_ID;

    // 4. Obtenemos un access‑token de PayPal (client_credentials)
    const ppAuthRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' ,
                 'Authorization': 'Basic ' + Buffer.from(
                   process.env.PAYPAL_CLIENT_ID + ':' + process.env.PAYPAL_CLIENT_SECRET
                 ).toString('base64') },
      body: 'grant_type=client_credentials'
    });
    const { access_token } = await ppAuthRes.json();

    // 5. Creamos la suscripción PayPal y enviamos custom_id = userId
    const subRes = await fetch('https://api-m.sandbox.paypal.com/v1/billing/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${access_token}` },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: userId,              // 👈 EL DATO CRÍTICO
        application_context: {
          brand_name: 'Goatify IA',
          return_url: `${process.env.BASE_URL}/?payment=success`,
          cancel_url: `${process.env.BASE_URL}/?payment=cancel`
        }
      })
    });

    const subData = await subRes.json();
    if (!subData.links) throw new Error('No se creó la subscripción');

    // 6. Buscamos el link de aprobación y lo devolvemos al front
    const approvalUrl = subData.links.find(l => l.rel === 'approve')?.href;
    return { statusCode: 200, body: JSON.stringify({ approvalUrl }) };

  } catch (err) {
    console.error('[create-subscription] error:', err);
    return { statusCode: 500, body: 'Error interno' };
  }
};
