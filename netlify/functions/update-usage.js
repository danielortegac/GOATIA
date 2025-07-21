// netlify/functions/update-usage.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  // Obtenemos el costo del cuerpo de la solicitud, con un valor por defecto de 1
  let costToDecrement = 1;
  try {
      const body = JSON.parse(event.body || '{}');
      if (typeof body.cost === 'number' && body.cost > 0) {
          costToDecrement = body.cost;
      }
  } catch (e) {
      // Ignoramos el error si el cuerpo está vacío, usamos el costo por defecto
  }
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Usamos nuestra función SQL unificada, enviando un número negativo para restar.
  const { error } = await supabase.rpc('increment_credits', {
    user_id_param: user.sub,
    increment_value: -costToDecrement
  });

  if (error) {
    console.error('Error al descontar crédito:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Error en la base de datos.' }) };
  }

  // Devolvemos el nuevo total de créditos para mantener sincronizado el frontend.
  const { data } = await supabase.from('profiles').select('credits').eq('id', user.sub).single();

  return {
    statusCode: 200,
    body: JSON.stringify({ credits: data ? data.credits : 0 })
  };
};
