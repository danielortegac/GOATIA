const { createClient } = require('@supabase/supabase-js');

// ESTA ES LA VERSIÓN FINAL Y CORRECTA DE TU FUNCIÓN get-usage.js
exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  // Claves de entorno para la conexión segura
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const userId = user.sub;

  // 1. Llama a la función "inteligente" de la base de datos
  // Esta función SOLO dará créditos si corresponde (plan gratis, mes nuevo)
  const { error: rpcError } = await supabase.rpc('handle_monthly_credits', {
    user_id_input: userId // Usando el nombre correcto de la función
  });

  if (rpcError) {
    console.error('Error en RPC al manejar créditos mensuales:', rpcError);
    // No devolvemos un error fatal, para que al menos pueda obtener los créditos actuales
  }

  // 2. Después de la lógica de créditos, consulta el saldo final del usuario
  const { data: finalProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (fetchError) {
    console.error('Error al consultar créditos finales:', fetchError);
    return { statusCode: 500, body: JSON.stringify({ error: 'Error al leer la base de datos' }) };
  }

  // 3. Devuelve los créditos actuales al usuario
  return {
    statusCode: 200,
    body: JSON.stringify({ credits: finalProfile.credits })
  };
};
