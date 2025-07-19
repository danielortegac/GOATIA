// netlify/functions/update-usage.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // 1. Autenticación
  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  const userId = user.sub;

  // 2. Obtener la cantidad a cambiar (delta)
  let delta;
  try {
    delta = JSON.parse(event.body).delta;
    if (typeof delta !== 'number') {
      throw new Error('Delta must be a number.');
    }
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad request: Invalid delta.' }) };
  }

  // 3. Crear cliente de Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // 4. ✨ PASO CLAVE: Llamar a la función RPC para actualizar créditos de forma segura ✨
  const { error: rpcError } = await supabase.rpc('increment_credits', {
    user_id_param: userId,
    increment_value: delta
  });

  if (rpcError) {
    console.error('update-usage RPC error:', rpcError);
    return { statusCode: 500, body: JSON.stringify({ error: 'Database error while updating credits.' }) };
  }

  // 5. Devolver el nuevo total de créditos al frontend
  const { data: profileData, error: selectError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (selectError) {
    console.error('Error fetching new credit total:', selectError);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not retrieve updated credits.' }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ credits: profileData.credits })
  };
};
