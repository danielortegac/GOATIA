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

  const userId = user.sub;

  /*
  // LÍNEAS ELIMINADAS PARA BLOQUEAR LOS 100 CRÉDITOS AL INICIAR SESIÓN
  const { error: grantError } = await supabase.rpc('grant_monthly_credits_by_plan', {
    user_id: userId
  });

  if (grantError) {
    console.error('Error al intentar otorgar créditos:', grantError);
  }
  */

  // Obtiene y devuelve el perfil actualizado
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('credits, plan')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Error al consultar el perfil:', profileError);
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
