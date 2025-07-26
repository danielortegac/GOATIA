const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

webpush.setVapidDetails(
  'mailto:info@goatify.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.handler = async (event) => {
  console.log('[send-push inline] start');

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método no permitido' };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { userId, email, title = 'Goatify IA', body = '¡Tienes una nueva notificación!' } = payload;

    if (!userId && !email) {
      return { statusCode: 400, body: 'Falta userId o email.' };
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // 1) Buscar por id si viene
    let profile = null;
    if (userId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, push_subscription')
        .eq('id', userId)
        .single();
      if (!error && data) profile = data;
    }

    // 2) Fallback por email si no hay resultado
    if (!profile && email) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, push_subscription')
        .eq('email', email.toLowerCase())
        .single();
      if (!error && data) profile = data;
    }

    if (!profile || !profile.push_subscription) {
      console.error('[send-push] No sub para', userId || email, profile ? 'sin subscription' : 'no row');
      return { statusCode: 404, body: 'Suscripción no encontrada.' };
    }

    await webpush.sendNotification(
      profile.push_subscription,
      JSON.stringify({ title, body })
    );

    console.log('[send-push] OK');
    return { statusCode: 200, body: 'Push enviado correctamente.' };
  } catch (e) {
    console.error('[send-push] error', e);
    if (e.statusCode === 410) {
      // 410 = suscripción vencida; puedes limpiar aquí si quieres
      console.warn('[send-push] Suscripción expirada (410).');
    }
    return { statusCode: 500, body: e.message };
  }
};
