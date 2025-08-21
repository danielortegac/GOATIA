const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const { user } = JSON.parse(event.body);

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // 1. Revisamos si el usuario ya existe en Supabase Auth.
  const { data: existingUser, error: findError } = await supabaseAdmin.auth.admin.getUserById(user.id);
  
  // Si el usuario ya existe (o si hubo un error que no sea "no encontrado"), no hacemos nada.
  if (existingUser || (findError && findError.status !== 404)) {
    console.log(`El usuario ${user.email} ya existe en Supabase o hubo un error, no se tomará acción.`);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'El usuario ya existe, no se requiere acción.' }),
    };
  }

  // 2. Si el usuario NO existe, lo creamos (esta es la lógica que faltaba para Google/GitHub).
  console.log(`El usuario ${user.email} no fue encontrado en Supabase. Intentando crear...`);
  
  const userData = {
    id: user.id,
    email: user.email,
    email_confirm: true,
    user_metadata: {
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0],
      avatar_url: user.user_metadata?.avatar_url
    }
  };

  const { error: createError } = await supabaseAdmin.auth.admin.createUser(userData);

  if (createError) {
    console.error('Error creando el usuario en Supabase desde identity-login:', createError);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Fallo al crear el usuario en Supabase desde el login.' }),
    };
  }

  console.log(`Usuario de Supabase creado exitosamente para ${user.email} a través del evento de login.`);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Usuario de Supabase creado desde el login.' }),
  };
};
