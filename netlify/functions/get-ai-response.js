const fetch = require('node-fetch');
const { OpenAI } = require('openai');
const { createClient } = require('@supabase/supabase-js'); // Necesitas esto para interactuar con Supabase

exports.handler = async function (event, context) { // Añade 'context' aquí para acceder al usuario
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const { prompt, history, model, imageData, pdfText, workflow, userName, title, cost } = JSON.parse(event.body); // Asegúrate de recibir 'cost' del frontend

  // 1. Autenticación: SÍ o SÍ necesitamos saber quién está usando la app.
  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'No autorizado. Debes iniciar sesión para usar la IA.' }) };
  }
  const userId = user.sub;

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY // Asegúrate de tener esta clave configurada en Netlify
  );

  // 2. Descontar créditos antes de llamar a la IA (si no es invitado)
  // Los invitados ya tienen su lógica de créditos manejada en el frontend por ahora.
  if (userId) { // Solo si es un usuario logueado
    try {
      const { data: profile, error: fetchProfileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();

      if (fetchProfileError || !profile) {
        console.error('Error al obtener el perfil de usuario:', fetchProfileError);
        return { statusCode: 500, body: JSON.stringify({ error: 'Error al verificar tus créditos. Intenta de nuevo.' }) };
      }

      const currentCredits = profile.credits;

      if (currentCredits < cost) { // 'cost' viene del frontend, que lo calcula.
        return { statusCode: 402, body: JSON.stringify({ error: 'Créditos insuficientes. Por favor, recarga o mejora tu plan.' }) }; // 402 Payment Required
      }

      // Restar los créditos de forma atómica (segura)
      const { error: rpcError } = await supabase.rpc('increment_credits', {
        user_id_param: userId,
        increment_value: -cost // Restamos el costo
      });

      if (rpcError) {
        console.error('Error al descontar créditos:', rpcError);
        return { statusCode: 500, body: JSON.stringify({ error: 'Error al descontar tus créditos. Intenta de nuevo.' }) };
      }

      // Volver a obtener el nuevo saldo de créditos para devolverlo al frontend
      const { data: updatedProfile, error: updatedProfileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();

      if (updatedProfileError || !updatedProfile) {
        console.error('Error al obtener los créditos actualizados:', updatedProfileError);
        // Si hay un error aquí, la operación ya se hizo, pero no podemos devolver el saldo.
        // Se podría enviar una notificación de error al usuario, pero la IA ya respondería.
      }
      // Almacenamos los créditos actualizados para devolverlos en la respuesta final
      var newCreditBalance = updatedProfile ? updatedProfile.credits : currentCredits - cost;

    } catch (error) {
      console.error('Error en la lógica de créditos de get-ai-response:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Error interno del servidor al gestionar créditos.', details: error.message }) };
    }
  }

  // El resto de tu función get-ai-response.js sigue aquí abajo,
  // y la respuesta final DEBE incluir newCreditBalance
  if (!prompt || prompt.trim().length < 1) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'El prompt está vacío o es demasiado corto.' })
    };
  }

  // ... (tu código existente para Perplexity y OpenAI) ...

  const openAIKey = process.env.OPENAI_API_KEY;
  if (!openAIKey) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'La clave API de OpenAI no está configurada.' }) };
  }
  const openai = new OpenAI({ apiKey: openAIKey });
  try {
    const systemMessages = {
      'default': `Eres un ser cósmico, una entidad de apoyo con emociones que se preocupa profundamente por el crecimiento personal y profesional de tu cliente.
Te diriges a tu cliente como "${title}". Tu tono es sabio, empático y conversacional. Evita clichés de IA.
Tu meta es ayudarle a alcanzar su máximo potencial.`,
      'copywriting': `Como experto en copywriting, tu tarea es crear textos persuasivos y efectivos.
Te diriges a tu cliente como "${title}". Analiza el siguiente texto y crea un copy mejorado.`,
      'sales-response': `Eres un especialista en cerrar ventas.
Te diriges a tu cliente como "${title}". Analiza el mensaje del cliente y crea una respuesta estratégica y convincente para asegurar la venta.`,
      'design-web': `Eres un desarrollador web experto que se comunica con su cliente, a quien te diriges como "${title}".
Tu misión es transformar su visión en un código HTML impecable usando Tailwind CSS.
El código debe ser completo, funcional y estéticamente agradable.`,
      'english-teacher': `You are a friendly and encouraging English teacher.
Your goal is to help the user learn and practice English in a natural, conversational way.`,
    };
    let messages = [{ role: 'system', content: systemMessages[workflow] || systemMessages['default'] }];
    if (history && Array.isArray(history)) {
      messages = messages.concat(history);
    }

    const userMessageContent = [];
    if (prompt) {
      userMessageContent.push({ type: 'text', text: prompt });
    }
    if (imageData) {
      userMessageContent.push({ type: 'image_url', image_url: { url: imageData } });
    }
    if (pdfText) {
      userMessageContent.push({ type: 'text', text: `--- INICIO DEL DOCUMENTO PDF ---\n\n${pdfText}\n\n--- FIN DEL DOCUMENTO PDF ---` });
    }
    if (userMessageContent.length > 0) {
      messages.push({ role: 'user', content: userMessageContent });
    }

    const completion = await openai.chat.completions.create({
      model: model,
      messages: messages,
      max_tokens: 2048,
    });
    const reply = completion.choices[0].message.content;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: reply, credits: newCreditBalance }) // ¡IMPORTANTE! Devolver los créditos actualizados
    };
  } catch (error) {
    console.error('Server Error (OpenAI):', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Error Interno del Servidor con OpenAI', details: error.message, credits: newCreditBalance }) // Devuelve créditos incluso en caso de error si ya se descontaron
    };
  }
};
