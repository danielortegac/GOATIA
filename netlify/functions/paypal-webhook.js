/* ------------------------------------------------------------------
   Goatify IA – PayPal Webhook (LÓGICA CORREGIDA)
   - Otorga créditos SÓLO en eventos de activación o pago completado.
   - Revierte el plan en cancelaciones.
   - Maneja de forma segura la ausencia de 'custom_id'.
------------------------------------------------------------------- */

const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// === Inicializar cliente de Supabase ===
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// === Funciones de Ayuda para PayPal (Estas no necesitan cambios) ===
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
  if (!res.ok) throw new Error('Error en token de PayPal: ' + JSON.stringify(json));
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

// === Manejador Principal del Webhook ===
exports.handler = async (event) => {
  console.log('--- INICIO DE WEBHOOK ---');

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método no permitido' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const eventType = body.event_type;
    const resource = body.resource || {};

    let customId  = resource.custom_id || resource.customId || null;
    const subId   = resource.id || resource.subscription_id || resource.billing_agreement_id || null;
    const ppPlanId = resource.plan_id || null;
    const status  = (resource.status || '').toLowerCase();

    // Si falta customId, intentamos recuperarlo (lógica sin cambios, es correcta)
    if (!customId && subId) {
      const { data: subsRow } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('paypal_subscription_id', subId)
        .maybeSingle();

      if (subsRow && subsRow.user_id) {
        customId = subsRow.user_id;
      } else {
        try {
          customId = await fetchCustomIdFromPayPal(subId);
        } catch (e) {
          console.warn('No se pudo consultar custom_id en PayPal:', e.message);
        }
      }
    }

    if (!customId) {
      console.warn('custom_id vacío. Evento procesado pero sin actualización de perfil.');
      return { statusCode: 200, body: 'no_custom_id_but_ok' };
    }

    // --- INICIO DE LA LÓGICA CORREGIDA ---

    let planToSet = null;
    let creditsToSet = null;

    // Solo asignamos plan y créditos si el pago FUE EXITOSO.
    if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED' || eventType === 'PAYMENT.SALE.COMPLETED') {
        console.log(`Evento de activación/pago para usuario: ${customId}`);
        if (ppPlanId === process.env.PAYPAL_BOOST_PLAN_ID) {
            planToSet = 'boost';
            creditsToSet = 1000;
        } else if (ppPlanId === process.env.PAYPAL_PRO_PLAN_ID) {
            planToSet = 'pro';
            creditsToSet = 4000;
        }
    } 
    // Si la suscripción se cancela o expira, lo revertimos a 'free'.
    else if (['BILLING.SUBSCRIPTION.CANCELLED', 'BILLING.SUBSCRIPTION.EXPIRED', 'BILLING.SUBSCRIPTION.SUSPENDED'].includes(eventType)) {
        console.log(`Evento de cancelación/expiración para usuario: ${customId}`);
        planToSet = 'free';
        creditsToSet = 100; // O los créditos que correspondan al plan gratuito
    }
    // Para otros eventos como 'CREATED', no hacemos nada con los créditos.
    else {
        console.log(`Evento "${eventType}" recibido. No requiere actualización de plan/créditos.`);
    }

    // Si determinamos que hay que cambiar el plan, actualizamos la base de datos.
    if (planToSet !== null && creditsToSet !== null) {
        console.log(`Actualizando perfil de ${customId}: Plan=${planToSet}, Créditos=${creditsToSet}`);
        const { error: profileErr } = await supabase
            .from('profiles')
            .update({ plan: planToSet, credits: creditsToSet, updated_at: new Date().toISOString() })
            .eq('id', customId);

        if (profileErr) {
            console.error('Error al actualizar el perfil:', profileErr);
            return { statusCode: 200, body: 'profile_update_error_logged' };
        }
    }

    // Siempre guardamos o actualizamos el estado de la suscripción para tener un registro.
    if (subId) {
        const { error: subErr } = await supabase
            .from('subscriptions')
            .upsert({
                user_id: customId,
                plan_id: ppPlanId || '',
                paypal_subscription_id: subId,
                status: status,
                updated_at: new Date().toISOString()
            }, { onConflict: 'paypal_subscription_id' });

        if (subErr) {
            console.error('Error al actualizar la tabla de suscripciones:', subErr);
            return { statusCode: 200, body: 'subscriptions_upsert_error_logged' };
        }
    }
    
    // --- FIN DE LA LÓGICA CORREGIDA ---

    console.log('--- FIN DE WEBHOOK: Procesado exitosamente ---');
    return { statusCode: 200, body: 'ok' };

  } catch (err) {
    console.error('ERROR FATAL EN WEBHOOK:', err);
    return { statusCode: 200, body: 'fatal_error_logged' };
  }
};
