/* ------------------------------------------------------------------
   Goatify IA – PayPal Webhook (versión silenciosa sin errores rojos)
   - No rompe si custom_id viene vacío
   - Intenta recuperarlo desde Supabase o PayPal
   - Actualiza profiles y subscriptions solo cuando tiene user_id
------------------------------------------------------------------- */

const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// === Init Supabase client ===
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// === Helpers PayPal ===
async function getPayPalAccessToken() {
  const auth = Buffer.from(
    process.env.PAYPAL_CLIENT_ID + ':' + process.env.PAYPAL_CLIENT_SECRET
  ).toString('base64');

  const res = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`
    },
    body: 'grant_type=client_credentials'
  });

  const json = await res.json();
  if (!res.ok) throw new Error('PayPal token error: ' + JSON.stringify(json));
  return json.access_token;
}

async function fetchCustomIdFromPayPal(subscriptionId) {
  const token = await getPayPalAccessToken();
  const res = await fetch(`https://api-m.sandbox.paypal.com/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  return data.custom_id || null;
}

// === Main handler ===
exports.handler = async (event) => {
  console.log('--- WEBHOOK INIT ---');

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const type = body.event_type;
    const resource = body.resource || {};

    // Eventos interesantes
    const interesting = [
      'BILLING.SUBSCRIPTION.ACTIVATED',
      'BILLING.SUBSCRIPTION.CREATED',
      'BILLING.SUBSCRIPTION.CANCELLED',
      'BILLING.SUBSCRIPTION.SUSPENDED',
      'BILLING.SUBSCRIPTION.EXPIRED',
      'PAYMENT.SALE.COMPLETED'
    ];
    if (!interesting.includes(type)) {
      console.log('Evento ignorado:', type);
      return { statusCode: 200, body: 'ignored' };
    }

    // Extraer datos
    let customId  = resource.custom_id || resource.customId || null;
    const subId   = resource.id || resource.subscription_id || resource.billing_agreement_id || null;
    const ppPlanId = resource.plan_id || null;
    const status  = (resource.status || 'ACTIVE').toLowerCase();

    console.log('DEBUG custom_id recibido =>', customId);
    console.log('DEBUG subscription_id  =>', subId);
    console.log('DEBUG plan_id_paypal   =>', ppPlanId);
    console.log('DEBUG status           =>', status);

    // Si falta customId, intentamos encontrarlo
    if (!customId && subId) {
      // 1) Buscar en Supabase por paypal_subscription_id (si ya existe un row previo)
      const { data: subsRow, error: subsErr } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('paypal_subscription_id', subId)
        .maybeSingle();

      if (!subsErr && subsRow && subsRow.user_id) {
        customId = subsRow.user_id;
        console.log('DEBUG custom_id obtenido de Supabase:', customId);
      }

      // 2) Si aún no lo tenemos, ir a PayPal
      if (!customId) {
        try {
          const fetched = await fetchCustomIdFromPayPal(subId);
          if (fetched) {
            customId = fetched;
            console.log('DEBUG custom_id obtenido de PayPal:', customId);
          }
        } catch (e) {
          console.warn('No se pudo consultar custom_id en PayPal:', e.message);
        }
      }
    }

    // Si aún no hay customId, no es crítico; log y salimos ok.
    if (!customId) {
      console.warn('custom_id vacío. Evento procesado pero sin actualización.');
      return { statusCode: 200, body: 'no_custom_id_but_ok' };
    }

    // Mapear plan interno
    let plan = 'free';
    let creditsToGive = 100;
    if (ppPlanId === process.env.PAYPAL_BOOST_PLAN_ID) {
      plan = 'boost';
      creditsToGive = 1000;
    } else if (ppPlanId === process.env.PAYPAL_PRO_PLAN_ID) {
      plan = 'pro';
      creditsToGive = 4000;
    }

    // Si el evento es CANCELLED / EXPIRED / SUSPENDED, bajamos a free
    if (['billing.subscription.cancelled', 'billing.subscription.expired', 'billing.subscription.suspended'].includes(type.toLowerCase())) {
      plan = 'free';
      creditsToGive = 100;
    }

    // Actualizar profiles
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ plan, credits: creditsToGive, updated_at: new Date().toISOString() })
      .eq('id', customId);

    if (profileErr) {
      console.error('Error al actualizar profile:', profileErr);
      // Aun así responde 200 para que PayPal no re-envíe eternamente
      return { statusCode: 200, body: 'profile_update_error_logged' };
    }

    // Upsert en subscriptions (requiere índice único para onConflict)
    if (subId) {
      const { error: subErr } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: customId,
          plan_id: ppPlanId || '',
          paypal_subscription_id: subId,
          status,
          updated_at: new Date().toISOString()
        }, { onConflict: 'paypal_subscription_id' });

      if (subErr) {
        console.error('Error upsert subscriptions:', subErr);
        return { statusCode: 200, body: 'subscriptions_upsert_error_logged' };
      }
    }

    console.log('WEBHOOK DONE -> Perfil y suscripción actualizados.');
    return { statusCode: 200, body: 'ok' };

  } catch (err) {
    console.error('WEBHOOK ERROR FATAL:', err);
    // Para que PayPal no bombardeé reintentos, aun en fatal devolvemos 200.
    return { statusCode: 200, body: 'fatal_logged' };
  }
};
