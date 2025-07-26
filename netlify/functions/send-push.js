const { ensureVapid, fetchSubscription, sendToSubscription } = require('./_send_push_common');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  console.log('[send-push] Función iniciada.');

  try {
    ensureVapid();

    const { userId, payload } = JSON.parse(event.body || '{}');
    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId' }) };
    }
    console.log('[send-push] Buscando suscripción push para el usuario:', userId);

    let subscription;
    try {
      subscription = await fetchSubscription(userId);
    } catch (err) {
      if (err.code === 'NO_SUB') {
        console.error('[send-push] No se encontró la suscripción push para el usuario:', userId);
        return { statusCode: 200, body: JSON.stringify({ ok: false, reason: 'no-subscription' }) };
      }
      throw err;
    }

    const effectivePayload = payload || { title: 'Goatify', body: 'Tienes una notificación.' };
    await sendToSubscription(subscription, effectivePayload);

    console.log('[send-push] Notificación enviada.');
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('[send-push] Error', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
