const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userId, subscription } = JSON.parse(event.body || '{}');
    if (!userId || !subscription) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId or subscription' }) };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Quickest fix to match your existing query path in send-push v2:
    // store the subscription in profiles.push_subscription (jsonb)
    const { data, error } = await supabase
      .from('profiles')
      .update({ push_subscription: subscription })
      .eq('id', userId)
      .select('id')
      .single();

    if (error) {
      console.error('save-subscription supabase error', error);
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    console.error('[save-subscription] unexpected error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Unexpected error' }) };
  }
};
