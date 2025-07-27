const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userId, email, subscription } = JSON.parse(event.body || '{}');
    if (!userId || !subscription) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId or subscription' }) };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY; // <- única variable

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY' }) };
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Actualiza por id; si no toca fila y hay email, intenta por email.
    let { data, error } = await supabase
      .from('profiles')
      .update({ push_subscription: subscription })
      .eq('id', userId)
      .select('id')
      .single();

    if (error || !data) {
      if (email) {
        const res2 = await supabase
          .from('profiles')
          .update({ push_subscription: subscription })
          .eq('email', email.toLowerCase())
          .select('id')
          .single();
        if (res2.error) {
          return { statusCode: 500, body: JSON.stringify({ error: res2.error.message }) };
        }
      } else {
        return { statusCode: 404, body: JSON.stringify({ error: 'Profile not found by id and no email provided' }) };
      }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('[save-subscription] unexpected error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Unexpected error' }) };
  }
};
