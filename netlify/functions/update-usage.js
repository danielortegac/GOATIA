const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) return { statusCode: 401, body: JSON.stringify({ error: 'Not logged in' }) };

  const { delta } = JSON.parse(event.body || '{}'); // ejemplo: -7 para gastar 7
  if (typeof delta !== 'number') return { statusCode: 400, body: JSON.stringify({ error: 'Delta missing' }) };

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', user.sub)
    .single();

  if (error) return { statusCode: 500, body: JSON.stringify({ error }) };

  const newCredits = Math.max(0, (data?.credits || 0) + delta);
  const { error: updErr } = await supabase
    .from('profiles')
    .update({ credits: newCredits, updated_at: new Date().toISOString() })
    .eq('id', user.sub);

  if (updErr) return { statusCode: 500, body: JSON.stringify({ error: updErr }) };

  return { statusCode: 200, body: JSON.stringify({ credits: newCredits }) };
};
