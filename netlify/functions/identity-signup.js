const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Parsea los datos del webhook de Netlify Identity
  let user;
  try {
    const payload = JSON.parse(event.body);
    user = payload.user || payload; // Ajuste para manejar diferentes formatos de webhook
    if (!user || !user.id || !user.email) {
      throw new Error('Datos de usuario inválidos en el webhook');
    }
  } catch (parseError) {
    console.error('Error al parsear el cuerpo del evento:', parseError);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Datos de usuario inválidos o malformados' }),
    };
  }

  // Crea un cliente de Supabase con permisos de administrador
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Sincroniza el perfil del usuario en la tabla 'profiles' con 100 créditos iniciales
    const { error } = await supabaseAdmin.from('profiles').upsert(
      {
        id: user.id,
        email: user.email,
        credits: 100,
        last_credit_month: new Date().toISOString().slice(0, 7), // Formato YYYY-MM
        updated_at: new Date().toISOString(),
        plan: 'free',
        user_metadata: user.user_metadata || {}
      },
      { onConflict: 'id' }
    );

    if (error) {
      throw error;
    }

    console.log(`Perfil de Supabase creado/actualizado exitosamente para ${user.email}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Perfil de usuario sincronizado en Supabase.' }),
    };
  } catch (error) {
    console.error('Error sincronizando el perfil en Supabase:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Fallo al sincronizar el perfil en Supabase.', details: error.message }),
    };
  }
};
