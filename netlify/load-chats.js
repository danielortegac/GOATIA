const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { userId } = JSON.parse(event.body);
  if (!userId) {
    return { statusCode: 400, body: 'User ID is required' };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Busca el perfil del usuario por su netlify user_id
    const { data, error } = await supabase
      .from('profiles')
      .select('state_json')
      .eq('user_id', userId)
      .single(); // .single() espera un solo resultado o ninguno

    if (error && error.code !== 'PGRST116') { // PGRST116 es el error para "no rows found", lo cual es normal si el usuario es nuevo.
      throw error;
    }

    // Si hay datos, devuelve el estado guardado. Si no, devuelve un objeto vacío.
    const stateData = data ? data.state_json : {};

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stateData)
    };
  } catch (err) {
    console.error('Error loading data from Supabase:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to load data.', details: err.message })
    };
  }
};
