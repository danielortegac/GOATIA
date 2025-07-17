// netlify/functions/get-usage.js
exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) return { statusCode: 401, body: '{}' };

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data, error } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', user.id)
    .single();

  if (error) return { statusCode: 500, body: '{}' };
  return { statusCode: 200, body: JSON.stringify({ credits: data.credits }) };
};
