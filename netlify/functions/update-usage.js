// netlify/functions/update-usage.js
const { createClient } = require('@supabase/supabase-js');
exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) return { statusCode: 401, body: '' };

  const { delta } = JSON.parse(event.body || '{}');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase
    .from('profiles')
    .update({ credits: supabase.raw('credits + ?', [delta]) })
    .eq('id', user.id)
    .single();

  if (error) return { statusCode: 500, body: '' };
  return { statusCode: 200, body: JSON.stringify({ credits: data.credits }) };
};
