const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const userId = user.sub;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('credits, plan')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error al consultar el perfil:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Error al leer la base de datos' }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ 
      credits: profile.credits,
      plan: profile.plan 
    })
  };
};
