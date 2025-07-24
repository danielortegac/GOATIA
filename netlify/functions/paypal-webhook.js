/* ------------------------------------------------------------------
   Goatify IA – PayPal Webhook  (versión sin llamada a Netlify Identity)
------------------------------------------------------------------- */
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  console.log('--- WEBHOOK INIT ---');

  if (event.httpMethod !== 'POST')
    return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const pe = JSON.parse(event.body);

    // Sólo procesamos ACTIVATED
    if (pe.event_type !== 'BILLING.SUBSCRIPTION.ACTIVATED') {
      console.log('Evento ignorado:', pe.event_type);
      return { statusCode: 200, body: 'Ignored' };
    }

    const { resource } = pe;
    const userId       = resource.custom_id;         // UUID Netlify
    const paypalPlanId = resource.plan_id;

    let planName;
    if      (paypalPlanId === process.env.PAYPAL_BOOST_PLAN_ID) planName = 'boost';
    else if (paypalPlanId === process.env.PAYPAL_PRO_PLAN_ID)   planName = 'pro';
    else   throw new Error('plan_id desconocido: ' + paypalPlanId);

    /* ----------  SUPABASE  ------------------------------------------ */
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // 1. RPC que actualiza perfiles y recarga créditos
    const { error: rpcErr } = await supabase.rpc('upgrade_user_plan', {
      user_id_input: userId,
      new_plan:      planName
    });
    if (rpcErr) throw rpcErr;

    // 2. Upsert de la tabla subscriptions
    const { error: upsertErr } = await supabase.from('subscriptions').upsert(
      {
        user_id:                userId,
        plan_id:                paypalPlanId,
        paypal_subscription_id: resource.id,
        status:                 'active'
      },
      { onConflict: 'user_id' }
    );
    if (upsertErr) throw upsertErr;

    console.log('Supabase actualizado →', planName);
    return { statusCode: 200, body: 'OK' };

  } catch (err) {
    console.error('WEBHOOK ERROR:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
