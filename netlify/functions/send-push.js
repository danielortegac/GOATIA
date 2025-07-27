const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

webpush.setVapidDetails(
  'mailto:info@goatify.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.handler = async (event) => {
  console.info('[send-push] start');

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userId, email, title = 'Goatify IA', body = '¡Tienes una nueva notificación!' } =
      JSON.parse(event.body || '{}');

    if (!userId && !email) {
      return { statusCode: 400, body: 'userId or email required' };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY; // <- única variable

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return { statusCode: 500, body: 'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY' };
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    let profile = null;
    if (userId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, push_subscription')
        .eq('id', userId)
        .single();
      if (!error && data) profile = data;
    }
    if (!profile && email) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, push_subscription')
        .eq('email', email.toLowerCase())
        .single();
      if (!error && data) profile = data;
    }

    if (!profile || !profile.push_subscription) {
      console.error('[send-push] No sub for', userId || email, 'sin subscription');
      return { statusCode: 404, body: 'Subscription not found' };
    }

    await webpush.sendNotification(profile.push_subscription, JSON.stringify({ title, body }));

    console.info('[send-push] sent ok to', profile.id);
    return { statusCode: 200, body: 'OK' };
  } catch (e) {
    console.error('[send-push] error', e);
    if (e.statusCode === 410) return { statusCode: 410, body: 'Subscription gone' };
    return { statusCode: 500, body: e.message || 'Error' };
  }
};
