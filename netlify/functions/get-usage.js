const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) return { statusCode: 401, body: JSON.stringify({ error: 'Not logged in' }) };

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // Lee cuántos créditos quedan
  const { data, error } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', user.sub)
    .single();

  // Si es la primera vez, crea el registro con 100 créditos
  if (error && error.code === 'PGRST116') {
    await supabase.from('profiles').insert({ id: user.sub, credits: 100 });
    return { statusCode: 200, body: JSON.stringify({ credits: 100 }) };
  }
  if (error) return { statusCode: 500, body: JSON.stringify({ error }) };

  return { statusCode: 200, body: JSON.stringify({ credits: data.credits }) };
};
