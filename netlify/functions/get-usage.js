// netlify/functions/get-usage.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // 1. Autenticación (como ya la tienes, está perfecta)
  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  const userId = user.sub;

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // 2. ✨ PASO CLAVE: Llamar a la función inteligente en Supabase ✨
  // Esta llamada no devuelve datos, pero ejecuta la lógica de dar créditos si es necesario.
  // Es atómica y segura.
  const { error: rpcError } = await supabase.rpc('grant_monthly_credits_by_plan', {
    user_id_param: userId
});

  if (rpcError) {
    console.error('Error llamando a la RPC grant_monthly_credits_if_needed:', rpcError);
    // Aunque haya un error aquí, intentamos seguir para no bloquear al usuario.
  }

  // 3. Ahora sí, obtenemos el total de créditos (que ya estará actualizado si correspondía).
  const { data, error: selectError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (selectError) {
    console.error('get-usage select error:', selectError);
    // Si no se encuentra el perfil, podría ser un usuario nuevo. Devolvemos 0.
    // Lo ideal es que un trigger en Supabase cree el perfil al registrarse.
    if (selectError.code === 'PGRST116') {
        return { statusCode: 200, body: JSON.stringify({ credits: 0 }) };
    }
    return { statusCode: 500, body: JSON.stringify({ error: 'Database error' }) };
  }

  // 4. Devolvemos la cantidad de créditos correcta y siempre sincronizada desde la DB.
  return {
    statusCode: 200,
    body: JSON.stringify({ credits: data.credits })
  };
};

