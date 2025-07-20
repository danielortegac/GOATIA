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

  // Primero, llamamos a la función inteligente para que otorgue créditos si es necesario.
  // Esta función es segura, solo dará créditos una vez por mes.
  const { error: rpcError } = await supabase.rpc('grant_monthly_credits', {
    // 👇 NOMBRE DE FUNCIÓN Y PARÁMETRO CORREGIDOS
    user_id_input: userId 
  });

  if (rpcError) {
    console.error('Error RPC:', rpcError);
    // No devolvemos un error fatal aquí, para que el usuario al menos pueda ver sus créditos actuales.
  }

  // Después de (intentar) otorgar créditos, consultamos el valor final.
  const { data: updatedProfile, error: finalError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (finalError) {
    console.error('Error fetching final credits:', finalError);
    return { statusCode: 500, body: JSON.stringify({ error: 'DB Error after RPC' }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ credits: updatedProfile.credits })
  };
};
