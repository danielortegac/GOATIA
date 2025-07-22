// netlify/functions/paypal-webhook.js
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  console.log('--- WEBHOOK INIT ---');

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const paypalEvent = JSON.parse(event.body);
    if (paypalEvent.event_type !== 'BILLING.SUBSCRIPTION.ACTIVATED') {
      console.log('Evento ignorado:', paypalEvent.event_type);
      return { statusCode: 200, body: 'Ignored' };
    }

    const { resource } = paypalEvent;
    const userId       = resource.custom_id;
    const paypalPlanId = resource.plan_id;
    if (!userId) throw new Error('custom_id faltante en PayPal');

    let planName;
    if (paypalPlanId === process.env.PAYPAL_BOOST_PLAN_ID) planName = 'boost';
    else if (paypalPlanId === process.env.PAYPAL_PRO_PLAN_ID) planName = 'pro';
    else throw new Error('plan_id desconocido: ' + paypalPlanId);

    /* --- Netlify Identity ------------------------------------------------ */
    const adminToken = process.env.NETLIFY_API_TOKEN;
    if (!adminToken) throw new Error('NETLIFY_API_TOKEN faltante');

    const identityUrl =
      `https://api.netlify.com/api/v1/sites/${process.env.MY_SITE_ID}` +
      `/identity/users/${userId}`;

    const idRes = await fetch(identityUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ app_metadata: { plan: planName } })
    });
    if (!idRes.ok) {
      const txt = await idRes.text();
      throw new Error('Identity error: ' + txt);
    }
    console.log('Identity actualizado');

    /* --- Supabase -------------------------------------------------------- */
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { error: rpcErr } = await supabase.rpc('upgrade_user_plan', {
      user_id_input: userId,
      new_plan:      planName
    });
    if (rpcErr) throw rpcErr;

    const { error: upsertErr } = await supabase.from('subscriptions').upsert(
      {
        user_id:                 userId,
        plan_id:                 paypalPlanId,
        paypal_subscription_id:  resource.id,
        status:                  'active'
      },
      { onConflict: 'user_id' }
    );
    if (upsertErr) throw upsertErr;

    console.log('Supabase actualizado ->', planName);
    return { statusCode: 200, body: 'OK' };

  } catch (err) {
    console.error('WEBHOOK ERROR:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
