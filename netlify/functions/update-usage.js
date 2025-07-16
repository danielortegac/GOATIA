// netlify/functions/update-usage.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) return { statusCode: 401, body: '{"error":"Auth required"}' };

  const { delta } = JSON.parse(event.body || '{}'); // p.e. delta = 1
  if (!delta || delta < 0)
    return { statusCode: 400, body: '{"error":"Bad delta"}' };

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { data, error } = await supabase.rpc('decrement_credits_simple', {
    _user_id: user.sub,
    _delta: delta
  });

  if (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ credits: data }) };
};
