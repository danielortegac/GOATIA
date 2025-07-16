const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  // Parsea los datos del usuario que Netlify envía en el webhook.
  const { user } = JSON.parse(event.body);

  // Crea un cliente de Supabase con permisos de administrador.
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Le ordena a Supabase que cree un nuevo usuario en la tabla 'auth.users'.
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    id: user.id, // Usa el mismo ID de Netlify para mantener la sincronización.
    email: user.email,
    user_metadata: user.user_metadata,
    email_confirm: true // Marca el email como confirmado.
  });

  if (error) {
    console.error('Error creando el usuario en Supabase:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Fallo al crear el usuario en Supabase.' }),
    };
  }

  console.log(`Usuario de Supabase creado exitosamente para ${user.email}`);
  
  // ¡Listo! El trigger que creamos antes se encargará del resto (crear perfil y chats).

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Usuario de Supabase creado.' }),
  };
};
