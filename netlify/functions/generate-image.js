const fetch = require("node-fetch");

exports.handler = async (event) => {
  // 1. Asegurarse de que el método sea POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Método no permitido" }),
    };
  }

  try {
    const { prompt } = JSON.parse(event.body || "{}");
    const openAIKey = process.env.OPENAI_API_KEY;

    // 2. Validar que la API Key y el prompt existan
    if (!openAIKey) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "La variable de entorno OPENAI_API_KEY no está configurada en Netlify." }),
      };
    }

    if (!prompt || prompt.trim().length < 5) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "La descripción de la imagen debe tener al menos 5 caracteres." }),
      };
    }

    // 3. Llamar a la API de OpenAI con el modelo DALL-E 3
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3", // Modelo más reciente y de mayor calidad
        prompt: prompt,
        n: 1,
        size: "1024x1024", // Tamaño estándar para DALL-E 3
        quality: "standard", // "standard" o "hd"
        response_format: "b64_json", // Formato para obtener la imagen en base64
      }),
    });

    const result = await response.json();

    // 4. Manejo de errores de la API de OpenAI
    if (!response.ok) {
      console.error("❌ Error de OpenAI:", result);
      const errorMessage = result.error?.message || "Error desconocido al contactar la API de OpenAI.";
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: errorMessage }),
      };
    }

    const b64Image = result.data?.[0]?.b64_json;

    // 5. Validar que la respuesta contenga la imagen
    if (!b64Image) {
      console.error("❌ Respuesta de API no contenía una imagen:", result);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "La API no devolvió una imagen válida." }),
      };
    }

    // 6. Enviar la imagen de vuelta al frontend
    const imageData = `data:image/png;base64,${b64Image}`;
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageData: imageData }),
    };

  } catch (error) {
    console.error("💥 Error interno en la función:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Ocurrió un error interno en el servidor.", details: error.message }),
    };
  }
};
