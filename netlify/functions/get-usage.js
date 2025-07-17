// VERSIÓN FINAL Y CORRECTA de get-usage.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not logged in' }) };
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // La única responsabilidad de esta función ahora es LEER los créditos.
  // El trigger que acabamos de arreglar se encarga de crearlos la primera vez.
  const { data, error } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', user.sub)
    .single();

  // Si hay un error (incluyendo si no encuentra al usuario), lo reportamos.
  if (error) {
    console.error('Error al obtener los créditos para el usuario:', user.sub, error);
    return { statusCode: 500, body: JSON.stringify({ error: "No se pudieron obtener los créditos del usuario." }) };
  }

  // Si todo está bien, simplemente devolvemos los créditos que encontró.
  return { statusCode: 200, body: JSON.stringify({ credits: data.credits }) };
};
