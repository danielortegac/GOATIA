// netlify/functions/send-push.js
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
    const { userId, email, title = 'Goatify IA', body = '¡Tienes una nueva notificación!' } =
      JSON.parse(event.body || '{}');

    if (!userId && !email) {
      return { statusCode: 400, body: 'Falta userId o email' };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    let query = supabase.from('profiles').select('id, push_subscription').single();
    if (userId) query = query.eq('id', userId);
    else query = query.eq('email', email);

    const { data: profile, error } = await query;

    if (error || !profile || !profile.push_subscription) {
      console.error('[send-push] No sub para', userId || email, error);
      return { statusCode: 404, body: 'Suscripción no encontrada' };
    }

    await webpush.sendNotification(
      profile.push_subscription,
      JSON.stringify({ title, body })
    );

    console.log('[send-push] ok');
    return { statusCode: 200, body: 'Push enviado correctamente.' };
  } catch (e) {
    console.error('[send-push] error', e);
    if (e.statusCode === 410) return { statusCode: 410, body: 'Suscripción expirada' };
    return { statusCode: 500, body: e.message };
  }
};
