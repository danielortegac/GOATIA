/* ------------------------------------------------------------------
   Goatify IA – create-subscription  (versión definitiva, custom_id correcto,
   con LOG de verificación de variables para que nunca adivines errores)
------------------------------------------------------------------- */
const fetch = require('node-fetch');

exports.handler = async (event) => {
  try {
    /* 1. Autenticamos al usuario (JWT de Netlify Identity) -------------- */
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) return { statusCode: 401, body: 'Falta token' };

    const [, token] = authHeader.split(' ');
    const userJwt   = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString('utf8')
    );
    const userId = userJwt.sub; // 👈 ID exacto del usuario en Netlify Identity

    /* 2. Obtenemos el plan recibido desde el front ---------------------- */
    const { plan } = JSON.parse(event.body || '{}');
    if (!plan || !['boost', 'pro'].includes(plan)) {
      return { statusCode: 400, body: 'Plan inválido' };
    }

    /* 3. ID del plan PayPal según env vars ------------------------------ */
    const planId = plan === 'boost'
      ? process.env.PAYPAL_BOOST_PLAN_ID
      : process.env.PAYPAL_PRO_PLAN_ID;

    /* 4. DEBUG: imprime qué variables existen -------------------------- */
    console.log('[DEBUG create-subscription] envs:', {
      PAYPAL_CLIENT_ID:       !!process.env.PAYPAL_CLIENT_ID,
      PAYPAL_CLIENT_SECRET:   !!process.env.PAYPAL_CLIENT_SECRET,
      PAYPAL_PLAN_ID:         planId,
      BASE_URL:               process.env.BASE_URL,
    });

    /* 5. Access‑token PayPal (client_credentials) ---------------------- */
    const ppAuthRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          process.env.PAYPAL_CLIENT_ID + ':' + process.env.PAYPAL_CLIENT_SECRET
        ).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });

    if (!ppAuthRes.ok) {
      const txt = await ppAuthRes.text();
      console.error('[PayPal Auth] status', ppAuthRes.status, txt);
      throw new Error('No se pudo obtener access_token de PayPal');
    }
    const { access_token } = await ppAuthRes.json();

    /* 6. Creamos la suscripción PayPal --------------------------------- */
    const subRes = await fetch('https://api-m.sandbox.paypal.com/v1/billing/subscriptions', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`
      },
      body: JSON.stringify({
        plan_id:   planId,
        custom_id: userId,               // 👈 DATO CRÍTICO para el webhook
        application_context: {
          brand_name:  'Goatify IA',
          return_url:  `${process.env.BASE_URL}/?payment=success`,
          cancel_url:  `${process.env.BASE_URL}/?payment=cancel`
        }
      })
    });

    if (!subRes.ok) {
      const txt = await subRes.text();
      console.error('[PayPal Create Sub] status', subRes.status, txt);
      throw new Error('No se creó la suscripción en PayPal');
    }
    const subData = await subRes.json();

    /* 7. Link de aprobación para enviar al front ----------------------- */
    const approvalUrl = subData.links?.find(l => l.rel === 'approve')?.href;
    if (!approvalUrl) throw new Error('No se encontró approvalUrl');

    return { statusCode: 200, body: JSON.stringify({ approvalUrl }) };

  } catch (err) {
    console.error('[create-subscription] error:', err);
    return { statusCode: 500, body: 'Error interno' };
  }
};
