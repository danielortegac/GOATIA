const fetch = require("node-fetch");

exports.handler = async (event) => {
  // Agregamos un log para saber que la función se inició
  console.log("[LOG] La función generate-image ha sido invocada.");

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método no permitido" }),
    };
  }

  try {
    const { prompt } = JSON.parse(event.body || "{}");
    const openAIKey = process.env.OPENAI_API_KEY;

    console.log(`[LOG] Prompt recibido: "${prompt}"`);

    if (!openAIKey) {
      console.error("[ERROR] La API Key de OpenAI no está configurada.");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "La API Key de OpenAI no está configurada." }),
      };
    }

    if (!prompt || prompt.trim().length < 5) {
      console.error(`[ERROR] El prompt es demasiado corto: "${prompt}"`);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "El prompt debe tener al menos 5 caracteres." }),
      };
    }

    const apiRequestBody = {
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "b64_json",
    };

    console.log("[LOG] Llamando a la API de OpenAI...");
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAIKey}`,
      },
      body: JSON.stringify(apiRequestBody),
    });

    // Leemos la respuesta como texto para depurar sin riesgo de error en JSON
    const resultText = await response.text();
    console.log(`[LOG] Respuesta de OpenAI (Status ${response.status}):`, resultText);

    if (!response.ok) {
      // Intentamos interpretar el texto como JSON para obtener el mensaje de error
      const errorResult = JSON.parse(resultText);
      const errorMessage = errorResult.error?.message || "Error desconocido en la respuesta de OpenAI.";
      console.error(`[ERROR] La API de OpenAI devolvió un error: ${errorMessage}`);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: errorMessage }),
      };
    }
    
    const result = JSON.parse(resultText);
    const b64Image = result.data?.[0]?.b64_json;

    if (!b64Image) {
      console.error("[ERROR] La respuesta de la API no contenía una imagen válida.");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "La API no devolvió una imagen válida." }),
      };
    }

    console.log("[LOG] Imagen generada con éxito.");
    const imageData = `data:image/png;base64,${b64Image}`;
    return {
      statusCode: 200,
      body: JSON.stringify({ imageData: imageData }),
    };

  } catch (error) {
    console.error("💥 Error catastrófico en la función:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Ocurrió un error interno grave en el servidor.", details: error.message }),
    };
  }
};
