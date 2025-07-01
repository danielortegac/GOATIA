// netlify/functions/generate-image.js
const { OpenAI } = require("openai");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { 
        statusCode: 405, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({error: "Method Not Allowed"}) 
    };
  }

  const { prompt } = JSON.parse(event.body || "{}");
  const openAIKey = process.env.OPENAI_API_KEY;

  if (!openAIKey) {
    return { 
        statusCode: 500, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "La clave API de OpenAI no está configurada en el servidor." }) 
    };
  }

  const openai = new OpenAI({ apiKey: openAIKey });

  if (!prompt || prompt.length < 5) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "El prompt debe tener 5 o más caracteres." })
    };
  }

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024", // Mantengo 1024x1024, si da error de tamaño lo bajamos a 512x512
      response_format: "b64_json"
    });

    const imageData = `data:image/png;base64,${response.data[0].b64_json}`;
    
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageData })
    };
  } catch (e) {
    console.error("Internal function error:", e);
    const errorBody = {
        error: "Error en la API de OpenAI.",
        details: e.message
    };
    if (e.response) {
        try {
            const openAIError = await e.response.json();
            errorBody.details = openAIError.error?.message || e.message;
        } catch (parseError) {
            // Ignore if response is not JSON
        }
    }
    return {
      statusCode: e.response?.status || 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(errorBody)
    };
  }
};
