const fetch = require("node-fetch");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  const { prompt } = JSON.parse(event.body || "{}");

  const openAIKey = process.env.OPENAI_API_KEY;
  if (!openAIKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "La clave API de OpenAI no está configurada." })
    };
  }

  if (!prompt || prompt.trim().length < 5) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "El prompt debe tener al menos 5 caracteres." })
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAIKey}`
      },
      body: JSON.stringify({
        model: "dall-e-3", // este modelo es el correcto
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json"
      })
    });

    const data = await response.json();

    if (!response.ok || !data.data || !data.data[0] || !data.data[0].b64_json) {
      console.error("OpenAI API error:", data);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "La API de OpenAI no devolvió una imagen válida.", details: data })
      };
    }

    const imageData = `data:image/png;base64,${data.data[0].b64_json}`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageData })
    };

  } catch (err) {
    console.error("Error interno generando la imagen:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Error interno al generar la imagen.", details: err.message })
    };
  }
};
