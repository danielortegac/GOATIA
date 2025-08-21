const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  // Parsea los datos del usuario que Netlify envía en el webhook.
  const { user } = JSON.parse(event.body);

  // Crea un cliente de Supabase con permisos de administrador.
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // --- SECCIÓN CORREGIDA ---
  // Ahora, en lugar de pasar todo el user_metadata,
  // extraemos solo los datos que nos interesan de forma segura.
  const userData = {
    id: user.id,
    email: user.email,
    email_confirm: true, // Marcar el email como confirmado.
    user_metadata: {
      // Intenta obtener el nombre de 'full_name', si no, de 'name', y si no, usa el email.
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0],
      // Obtiene la URL del avatar si existe.
      avatar_url: user.user_metadata?.avatar_url
    }
  };
  // --- FIN DE LA SECCIÓN CORREGIDA ---

  // Le ordena a Supabase que cree el nuevo usuario con los datos limpios.
  const { data, error } = await supabaseAdmin.auth.admin.createUser(userData);

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
