// netlify/functions/get-usage.js
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

  // Esta función ahora solo consulta los datos, no los modifica.
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('credits, plan')
    .eq('id', user.sub)
    .single();

  if (error && error.code !== 'PGRST116') { // Ignora el error "fila no encontrada"
    console.error('Error al consultar el perfil:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Error al leer la base de datos' }) };
  }
  
  // Si el perfil no existe, es un usuario nuevo. El trigger SQL ya le dio 100 créditos.
  const credits = profile ? profile.credits : 100;
  // El plan de Netlify siempre es la fuente de verdad.
  const plan = user.app_metadata.plan || (profile ? profile.plan : 'free');

  return {
    statusCode: 200,
    body: JSON.stringify({
      credits: credits,
      plan: plan,
      user_metadata: user.user_metadata
    })
  };
};
