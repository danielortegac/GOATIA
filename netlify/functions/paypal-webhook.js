/* ------------------------------------------------------------------
   Goatify IA – Webhook PayPal  (versión PAT + MY_SITE_ID)
------------------------------------------------------------------- */
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  console.log('--- [INICIO] Webhook de PayPal recibido ---');

  /* 1. Solo POST */
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método no permitido.' };
  }

  try {
    /* 2. Parseamos evento PayPal */
    const paypalEvent = JSON.parse(event.body);
    console.log(`Evento: ${paypalEvent.event_type}`);

    if (paypalEvent.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      const { resource } = paypalEvent;
      const userId       = resource.custom_id;   // ← ID Netlify Identity
      const paypalPlanId = resource.plan_id;

      if (!userId) throw new Error("Falta 'custom_id' en el webhook.");

      /* 3. Mapear plan PayPal → plan interno */
      let planName;
      if      (paypalPlanId === process.env.PAYPAL_BOOST_PLAN_ID) planName = 'boost';
      else if (paypalPlanId === process.env.PAYPAL_PRO_PLAN_ID)   planName = 'pro';
      else throw new Error(`ID de plan PayPal desconocido: ${paypalPlanId}`);

      console.log(`Plan identificado: ${planName}`);

      /* 4. Token PAT */
      const adminToken = process.env.NETLIFY_API_TOKEN;
      if (!adminToken) throw new Error('Falta NETLIFY_API_TOKEN');

      /* 5. 🔑  Actualizar Netlify Identity */
      console.log('[PASO 1] Actualizando Netlify Identity...');
      const identityUrl =
        `https://api.netlify.com/api/v1/sites/${process.env.MY_SITE_ID}/identity/users/${userId}`;

      const netlifyRes = await fetch(identityUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type':  'application/json'
        },
        body: JSON.stringify({ app_metadata: { plan: planName } })
      });

      if (!netlifyRes.ok) {
        const txt = await netlifyRes.text();
        console.error('Error Identity:', txt);
        throw new Error('No se pudo actualizar Netlify Identity');
      }
      console.log('[✔] Identity actualizado');

      /* 6. Supabase */
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );

      /* 6a. RPC upgrade_user_plan */
      console.log('[PASO 2] RPC upgrade_user_plan...');
      const { error: rpcErr } = await supabase.rpc('upgrade_user_plan', {
        user_id_input: userId,
        new_plan:      planName
      });
      if (rpcErr) throw rpcErr;
      console.log('[✔] profiles actualizado');

      /* 6b. Upsert subscriptions */
      console.log('[PASO 3] Upsert subscriptions...');
      const { error: upsertErr } = await supabase.from('subscriptions').upsert(
        {
          user_id:               userId,
          plan_id:               paypalPlanId,
          paypal_subscription_id: resource.id,
          status:                'active'
        },
        { onConflict: 'user_id' }
      );
      if (upsertErr) throw upsertErr;
      console.log('[✔] subscriptions actualizado');

      console.log(`[FIN] Usuario ${userId} → ${planName}`);
    } else {
      console.log('Evento ignorado.');
    }

    return { statusCode: 200, body: 'Webhook procesado.' };

  } catch (err) {
    console.error('[ERRO]()
