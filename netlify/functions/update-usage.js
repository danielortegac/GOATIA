// netlify/functions/update-usage.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const auth = event.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const supabaseAuth = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: jwtData, error: jwtErr } = await supabaseAuth.auth.getUser();
  if (jwtErr || !jwtData.user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  const userId = jwtData.user.id;

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
  const { data, error } = await supabase
    .from('profiles')
    .update({ credits: supabase.raw('credits + ?', [delta]) })
    .eq('id', userId)
    .single();

  if (error) {
    console.error('update-usage error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Database error' }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ credits: data.credits })
  };
};
