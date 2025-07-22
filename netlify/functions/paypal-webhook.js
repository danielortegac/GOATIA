/* ------------------------------------------------------------------
   Goatify IA – Webhook PayPal
   Versión: PAT 100 % funcional (sin OAuth)
------------------------------------------------------------------- */
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  console.log('--- [INICIO] Webhook de PayPal recibido ---');

  /* 1. Aceptamos solo POST ------------------------------------------------ */
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método no permitido.' };
  }

  try {
    /* 2. Leemos el evento de PayPal -------------------------------------- */
    const paypalEvent = JSON.parse(event.body);
    console.log(`Evento recibido: ${paypalEvent.event_type}`);

    if (paypalEvent.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      const { resource } = paypalEvent;
      const userId       = resource.custom_id;   // ← lo mandaste en el checkout
      const paypalPlanId = resource.plan_id;     // ID del plan en PayPal

      if (!userId) throw new Error("Falta 'custom_id' (userId) en el webhook.");

      /* 3. Traducimos el plan de PayPal a tu plan interno ---------------- */
      let planName;
      if      (paypalPlanId === process.env.PAYPAL_BOOST_PLAN_ID) planName = 'boost';
      else if (paypalPlanId === process.env.PAYPAL_PRO_PLAN_ID)   planName = 'pro';
      else throw new Error(`ID de plan de PayPal desconocido: ${paypalPlanId}`);

      console.log(`Plan de Goatify identificado como: '${planName}'`);

      /* 4. TOKEN de administración (Personal Access Token) --------------- */
      const adminToken = process.env.NETLIFY_API_TOKEN;
      if (!adminToken) throw new Error('Falta NETLIFY_API_TOKEN en variables.');

      /* 5. Actualizamos Netlify Identity --------------------------------- */
      console.log('--- [PASO 1] Actualizando Netlify Identity...');
      const identityUrl =
        `https://api.netlify.com/api/v1/sites/${process.env.SITE_ID}` +
        `/identity/users/${userId}`;

      const netlifyRes = await fetch(identityUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type':  'application/json'
        },
        body: JSON.stringify({ app_metadata: { plan: planName } })
      });

      if (!netlifyRes.ok) {
        const errorTxt = await netlifyRes.text();
        console.error('--- Error en Netlify Identity:', errorTxt);
        throw new Error('No se pudo actualizar el plan en Netlify Identity.');
      }
      console.log('--- [✔] Identity actualizado');

      /* 6. Conectamos con Supabase --------------------------------------- */
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );

      /* 6a. RPC que sube plan + créditos en profiles --------------------- */
      console.log('--- [PASO 2] Ejecutando RPC upgrade_user_plan...');
      const { error: rpcError } = await supabase.rpc('upgrade_user_plan', {
        user_id_input: userId,
        new_plan:      planName
      });
      if (rpcError) throw rpcError;
      console.log('--- [✔] Tabla profiles actualizada');

      /* 6b. Upsert en tabla subscriptions -------------------------------- */
      console.log('--- [PASO 3] Upsert tabla subscriptions...');
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
      console.log('--- [✔] Tabla subscriptions actualizada');

      console.log(`--- [FIN] Usuario ${userId} ya es ${planName}`);
    } else {
      console.log('Evento ignorado (no es ACTIVATED).');
    }

    return { statusCode: 200, body: 'Webhook procesado.' };

  } catch (err) {
    console.error('--- [ERROR FATAL]', err.message);
    return { statusCode: 500, body: `Error interno: ${err.message}` };
  }
};
