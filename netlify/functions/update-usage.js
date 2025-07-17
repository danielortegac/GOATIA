// netlify/functions/update-usage.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const userId = context.clientContext.user?.sub;
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not logged in' }) };
  }

  let delta;
  try {
    delta = JSON.parse(event.body).delta;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad request' }) };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        credits: supabase.raw('credits + ?', [delta]),
        updated_at: new Date().toISOString()
      })
      .eq('ident_id', userId)
      .single();

    if (error) throw error;
    return { statusCode: 200, body: JSON.stringify({ credits: data.credits }) };

  } catch (err) {
    console.error('🛑 update-usage error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
