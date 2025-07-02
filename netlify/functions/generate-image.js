const { OpenAI } = require("openai");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  // Leemos tanto el prompt como el modelo que vienen del frontend
  const { prompt, model } = JSON.parse(event.body || "{}");
  const openAIKey = process.env.OPENAI_API_KEY;

  if (!openAIKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "La clave API de OpenAI no está configurada en el servidor." }),
    };
  }

  if (!prompt || prompt.length < 5) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "El prompt debe tener 5 o más caracteres." }),
    };
  }
  
  const openai = new OpenAI({ apiKey: openAIKey });

  try {
    // Definimos los parámetros para generar la imagen
    const imageParams = {
      // Usamos el modelo que llega del frontend, o DALL-E 2 si no llega ninguno.
      model: model || "dall-e-2",
      prompt: prompt,
      n: 1,
      // Usamos un tamaño más pequeño para que sea más rápido y ligero.
      size: "512x512",
      response_format: "b64_json",
    };

    // Si específicamente se pide DALL-E 3, se ajustan los parámetros a ese modelo.
    if (imageParams.model === "dall-e-3") {
      imageParams.size = "1024x1024"; // DALL-E 3 requiere este tamaño como mínimo.
      imageParams.quality = "standard"; // Usamos calidad estándar para velocidad.
    }

    const response = await openai.images.generate(imageParams);

    const imageData = `data:image/jpeg;base64,${response.data[0].b64_json}`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageData }),
    };
  } catch (e) {
    console.error("Error en la función de Netlify:", e);

    const errorDetails = e.response ? e.response.data?.error?.message : e.message;

    return {
      statusCode: e.response?.status || 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Hubo un error con la API de OpenAI al generar la imagen.",
        details: errorDetails || "Error desconocido.",
      }),
    };
  }
};
