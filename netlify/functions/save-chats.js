const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { userId, stateToSave } = JSON.parse(event.body);
  if (!userId || !stateToSave) {
    return { statusCode: 400, body: 'User ID and state are required' };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Usamos 'upsert' para insertar una nueva fila si el usuario no existe,
    // o para actualizar la existente si ya tiene datos.
    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        user_id: userId, 
        state_json: stateToSave 
      }, {
        onConflict: 'user_id' // Le dice a Supabase que use 'user_id' para detectar conflictos
      });

    if (error) {
      throw error;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'State saved successfully.' })
    };

  } catch (err) {
    console.error('Error saving data to Supabase:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to save data.', details: err.message })
    };
  }
};
