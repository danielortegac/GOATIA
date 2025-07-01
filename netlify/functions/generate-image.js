const fetch = require("node-fetch");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Método no permitido" })
    };
  }

  const { prompt } = JSON.parse(event.body || "{}");
  const openAIKey = process.env.OPENAI_API_KEY;

  if (!openAIKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "API key de OpenAI no configurada" })
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
        model: "dall-e-3",
        prompt: prompt,
        size: "1024x1024",
        quality: "standard",
        n: 1,
        response_format: "b64_json"
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ OpenAI Error:", result);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: result.error?.message || "Error desconocido al generar imagen" })
      };
    }

    const b64Image = result.data?.[0]?.b64_json;

    if (!b64Image) {
      console.error("❌ Imagen vacía:", result);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "La API no devolvió imagen válida" })
      };
    }

    const imageData = `data:image/png;base64,${b64Image}`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageData })
    };

  } catch (error) {
    console.error("💥 Error interno:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Error interno al generar imagen", details: error.message })
    };
  }
};
