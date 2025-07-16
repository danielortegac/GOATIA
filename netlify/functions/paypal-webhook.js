// netlify/functions/paypal-webhook.js
const fetch            = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// --------------------------------------------------------------------
// TOKEN de admin Netlify
async function getNetlifyAdminToken () {
  const res = await fetch('https://api.netlify.com/oauth/token', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({
      grant_type   : 'client_credentials',
      client_id    : process.env.NETLIFY_OAUTH_CLIENT_ID,
      client_secret: process.env.NETLIFY_OAUTH_CLIENT_SECRET
    })
  });
  const json = await res.json();
  return json.access_token;
}

// --------------------------------------------------------------------
// HANDLER
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const paypalEvent = JSON.parse(event.body);

    if (paypalEvent.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      const { resource } = paypalEvent;
      const userId       = resource.custom_id;   // viene de create‑subscription
      const paypalPlanId = resource.plan_id;

      if (!userId) return { statusCode: 400, body: 'Falta userId' };

      // Plan ↔ nombre
      let planName;
      if (paypalPlanId === process.env.PAYPAL_BOOST_PLAN_ID) planName = 'boost';
      else if (paypalPlanId === process.env.PAYPAL_PRO_PLAN_ID) planName = 'pro';
      else return { statusCode: 400, body: 'Plan ID desconocido' };

      // 1) Actualiza Identity en Netlify
      const adminToken = await getNetlifyAdminToken();
      await fetch(
        `https://api.netlify.com/api/v1/sites/${process.env.SITE_ID}/identity/${userId}`,
        {
          method : 'PUT',
          headers: {
            Authorization : `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            app_metadata: {
              plan,
              roles                 : [planName, 'member'],
              paypal_subscription_id: resource.id
            }
          })
        }
      );

      // 2) Actualiza en Supabase
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );

      // a) tabla subscriptions
      await supabase.from('subscriptions').insert({
        user_id              : userId,
        plan_id              : paypalPlanId,
        paypal_subscription_id: resource.id,
        status               : 'active',
        updated_at           : new Date().toISOString()
      });

      // b) créditos
      const bonus = planName === 'pro' ? 4000 : 1000;

      const { data: prof } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();

      await supabase
        .from('profiles')
        .update({ credits: (prof?.credits || 0) + bonus })
        .eq('id', userId);
    }

    return { statusCode: 200, body: 'Webhook procesado' };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: e.message };
  }
};
