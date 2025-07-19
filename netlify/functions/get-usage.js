// netlify/functions/get-usage.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  const userId = user.sub;

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Simplemente obtenemos los créditos actuales del perfil del usuario.
  const { data, error } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('get-usage select error:', error);
    // Si no se encuentra el perfil (PGRST116), es probable que sea un usuario nuevo.
    // Devolvemos 100 para que la UI no muestre 0. El trigger lo creará en la DB.
    if (error.code === 'PGRST116') {
        return { statusCode: 200, body: JSON.stringify({ credits: 100 }) };
    }
    return { statusCode: 500, body: JSON.stringify({ error: 'Database error' }) };
  }

  // Devolvemos la cantidad de créditos correcta y siempre sincronizada.
  return {
    statusCode: 200,
    body: JSON.stringify({ credits: data.credits })
  };
};
