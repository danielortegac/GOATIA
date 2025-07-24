/* ------------------------------------------------------------------
   Goatify IA – PayPal Webhook (versión final estable)
   Actualiza plan/credits en profiles y registra la fila en subscriptions.
------------------------------------------------------------------- */
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

exports.handler = async (event) => {
  try {
    console.log('--- WEBHOOK INIT ---');

    const body = JSON.parse(event.body || '{}');
    const eventType = body.event_type;

    // Solo nos interesan estos eventos
    const interesting = [
      'BILLING.SUBSCRIPTION.ACTIVATED',
      'BILLING.SUBSCRIPTION.CREATED',
      'PAYMENT.SALE.COMPLETED',
      'BILLING.SUBSCRIPTION.CANCELLED',
      'BILLING.SUBSCRIPTION.SUSPENDED',
      'BILLING.SUBSCRIPTION.EXPIRED'
    ];
    if (!interesting.includes(eventType)) {
      console.log('Evento ignorado:', eventType);
      return { statusCode: 200, body: 'ignored' };
    }

    const paypalSub = body.resource || {};
    const customId   = paypalSub.custom_id;              // viene del create-subscription
    const ppPlanId   = paypalSub.plan_id;                // id del plan de PayPal
    const ppSubId    = paypalSub.id;                     // id de la suscripción PayPal
    const status     = paypalSub.status || 'active';

    console.log('DEBUG custom_id recibido ➜', customId);
    console.log('DEBUG plan_id paypal ➜', ppPlanId);
    console.log('DEBUG status ➜', status);

    // 1. Validación mínima
    if (!customId) {
      console.error('WEBHOOK ERROR: custom_id vacío');
      return { statusCode: 400, body: 'custom_id vacío' };
    }
    if (!ppSubId) {
      console.error('WEBHOOK ERROR: paypal_subscription_id vacío');
      return { statusCode: 400, body: 'paypal_subscription_id vacío' };
    }

    // 2. Determina plan y créditos que vamos a dar
    // (haz el mapping de tus Plan IDs de PayPal a tus planes internos)
    let plan = 'free';
    let creditsToGive = 100;

    if (ppPlanId === process.env.PAYPAL_BOOST_PLAN_ID) {
      plan = 'boost';
      creditsToGive = 1000;
    } else if (ppPlanId === process.env.PAYPAL_PRO_PLAN_ID) {
      plan = 'pro';
      creditsToGive = 4000;
    }

    // 3. Actualiza perfiles (server wins)
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .update({ plan, credits: creditsToGive, updated_at: new Date().toISOString() })
      .eq('id', customId)
      .select()
      .single();

    if (profileErr) {
      console.error('WEBHOOK ERROR: No se pudo actualizar profiles =>', profileErr);
      return { statusCode: 500, body: 'Error al actualizar perfil' };
    }

    // 4. Inserta/actualiza fila en subscriptions
    // Usamos ON CONFLICT en user_id porque acabamos de crear el constraint.
    const { error: subErr } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: customId,
        plan_id: ppPlanId,
        paypal_subscription_id: ppSubId,
        status,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (subErr) {
      console.error('WEBHOOK ERROR subscriptions:', subErr);
      return { statusCode: 500, body: 'Error al upsert subscriptions' };
    }

    console.log('WEBHOOK DONE -> Perfil y suscripción actualizados.');
    return { statusCode: 200, body: 'ok' };

  } catch (err) {
    console.error('WEBHOOK ERROR FATAL:', err);
    return { statusCode: 500, body: 'fatal error' };
  }
};
