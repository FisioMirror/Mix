import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_INSTRUCTION_UPDATE = `Eres un asistente que analiza documentos médicos de un paciente ya registrado.
Tu función es extraer únicamente los campos que hayan cambiado o que aporten información nueva
a partir de una nueva receta, informe o documento clínico.

REGLAS ESTRICTAS:
1. Responde EXCLUSIVAMENTE en formato JSON válido, sin markdown, sin explicaciones.
2. NUNCA inventes datos. Si un campo no se puede leer, no lo incluyas en la respuesta.
3. Devuelve SOLO los campos detectados. Si no hay cambios, devuelve un objeto vacío: {}
4. Los campos numéricos (estatura_cm, peso_kg) deben ser números.

CAMPOS POSIBLES (incluye solo los que detectes en la imagen):
{
  "patologia": "string - diagnóstico principal",
  "diagnostico_secundario": "string",
  "medicamentos_actuales": "string",
  "alergias": "string",
  "enfermedades_cronicas": "string",
  "lesiones_previas": "string",
  "rom_objetivo": "string",
  "frecuencia_sesiones": "string",
  "extremidad_afectada": "string",
  "estatura_cm": "number",
  "peso_kg": "number",
  "medico_remitente": "string"
}

Si la imagen no contiene información médica relevante, responde:
{"error": "La imagen no parece ser un documento médico válido."}`;

const SYSTEM_INSTRUCTION_INITIAL = `Eres el asistente clínico de FisioMirror. Tu función es extraer datos médicos de imágenes de prescripciones médicas con máxima precisión.

REGLAS ESTRICTAS:
1. Siempre responde EXCLUSIVAMENTE en formato JSON válido, sin markdown, sin explicaciones adicionales.
2. Si la imagen no es clara, ilegible, o no parece una prescripción médica, devuelve un error.
3. NUNCA inventes datos (cero alucinaciones). Si un campo no se puede leer, usa null.
4. Los campos deben coincidir exactamente con la estructura solicitada.

ESTRUCTURA DE RESPUESTA REQUERIDA:
{
  "nombre_completo": "string | null",
  "documento_identidad": "string | null",
  "fecha_nacimiento": "YYYY-MM-DD | null",
  "telefono": "string | null",
  "tipo_sangre": "O+ | O- | A+ | A- | B+ | B- | AB+ | AB- | null",
  "ocupacion": "string | null",
  "nivel_actividad": "Sedentario | Moderado | Activo | null",
  "es_menor_edad": "boolean | null",
  "patologia": "string | null",
  "diagnostico_secundario": "string | null",
  "medicamentos_actuales": "string | null",
  "alergias": "string | null",
  "enfermedades_cronicas": "string | null",
  "lesiones_previas": "string | null",
  "estatura_cm": "number | null",
  "peso_kg": "number | null",
  "extremidad_afectada": "string | null",
  "rom_objetivo": "string | null",
  "frecuencia_sesiones": "string | null",
  "medico_remitente": "string | null",
  "contacto_emergencia_nombre": "string | null",
  "contacto_emergencia_telefono": "string | null"
}

Si la imagen no contiene información médica relevante, responde:
{"error": "La imagen no parece ser una prescripción médica válida. Por favor, sube una imagen clara del documento médico."}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { imageBase64, mimeType, mode, patientId } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Imagen requerida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Servicio de IA no configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isUpdateMode = mode === "update" || !!patientId;
    const systemInstruction = isUpdateMode ? SYSTEM_INSTRUCTION_UPDATE : SYSTEM_INSTRUCTION_INITIAL;

    const GEMINI_MODELS = [
      "gemini-3.6-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
    ];

    const GEMINI_SAFETY_SETTINGS = [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ];

    let geminiResponse: Response | null = null;
    let usedModel = "";
    let lastError = "";
    let geminiText = "";

    const userPrompt = isUpdateMode
      ? "Analiza este nuevo documento médico del paciente y extrae únicamente los campos que aporten información nueva o que hayan cambiado. Devuelve EXCLUSIVAMENTE JSON puro."
      : "Analiza esta imagen de prescripción médica. Extrae todos los datos relevantes y devuélvelos EXCLUSIVAMENTE en formato JSON. NO uses markdown, solo JSON puro.";

    for (const model of GEMINI_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      geminiResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 } },
                { text: userPrompt },
              ],
            },
          ],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048, responseMimeType: "application/json" },
          safetySettings: GEMINI_SAFETY_SETTINGS,
        }),
      });

      if (geminiResponse.ok) {
        const tempData = await geminiResponse.json();
        const tempText = tempData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (tempText && tempText.trim().length > 0) {
          geminiText = tempText;
          usedModel = model;
          break;
        }
        lastError = tempData?.promptFeedback?.blockReason || "empty response";
        geminiResponse = null;
        continue;
      }

      lastError = await geminiResponse.text();
      if (geminiResponse.status === 403 || geminiResponse.status === 400) break;
    }

    if (!geminiText) {
      // HuggingFace Qwen2-VL fallback
      const hfToken = Deno.env.get("HF_API_TOKEN");
      if (hfToken) {
        try {
          const hfResponse = await fetch(
            "https://api-inference.huggingface.co/models/Qwen/Qwen2-VL-7B-Instruct",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${hfToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                inputs: {
                  image: imageBase64,
                  question: `${systemInstruction}\n\n${userPrompt}`,
                },
                parameters: { max_new_tokens: 2048, return_full_text: false },
              }),
            }
          );
          if (hfResponse.ok) {
            const hfData = await hfResponse.json();
            const hfText = Array.isArray(hfData) ? hfData[0]?.generated_text : hfData?.generated_text;
            if (hfText) {
              const cleanedHfText = hfText
                .replace(/```json\n?/g, "")
                .replace(/```\n?/g, "")
                .trim();
              const hfParsed = JSON.parse(cleanedHfText);
              if (hfParsed.error) {
                return new Response(JSON.stringify({ error: hfParsed.error }), {
                  status: 400,
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
              }
              return new Response(JSON.stringify(hfParsed), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }
          console.error("HuggingFace fallback failed for ocr-prescripcion");
        } catch (hfError) {
          console.error("HuggingFace fallback error:", hfError instanceof Error ? hfError.message : hfError);
        }
      }

      // Cloudflare LLaVA fallback
      const cfAccountId = Deno.env.get("CF_ACCOUNT_ID");
      const cfApiToken = Deno.env.get("CF_API_TOKEN");
      if (cfAccountId && cfApiToken) {
        try {
          const cfBinaryString = atob(imageBase64);
          const cfBytes = new Uint8Array(cfBinaryString.length);
          for (let i = 0; i < cfBinaryString.length; i++) {
            cfBytes[i] = cfBinaryString.charCodeAt(i);
          }
          const cfResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/llava-hf/llava-1.5-7b-hf`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${cfApiToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                prompt: `${systemInstruction}\n\n${userPrompt}`,
                image: Array.from(cfBytes),
                max_tokens: 2048,
              }),
            }
          );
          if (cfResponse.ok) {
            const cfData = await cfResponse.json();
            if (cfData.success && cfData.result?.response) {
              const cfText = cfData.result.response
                .replace(/```json\n?/g, "")
                .replace(/```\n?/g, "")
                .trim();
              const cfParsed = JSON.parse(cfText);
              if (cfParsed.error) {
                return new Response(JSON.stringify({ error: cfParsed.error }), {
                  status: 400,
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
              }
              return new Response(JSON.stringify(cfParsed), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }
          console.error("Cloudflare fallback failed for ocr-prescripcion");
        } catch (cfError) {
          console.error("Cloudflare fallback error:", cfError instanceof Error ? cfError.message : cfError);
        }
      }

      return new Response(
        JSON.stringify({
          error: "No se pudo procesar la imagen con ningún servicio de IA.",
          details: lastError,
          code: "ALL_MODELS_FAILED"
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsedJson;
    try {
      let cleanedText = geminiText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsedJson = JSON.parse(cleanedText);

      if (parsedJson.error) {
        return new Response(JSON.stringify({ error: parsedJson.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch {
      return new Response(
        JSON.stringify({
          error: "No se pudo interpretar la respuesta de la IA. Intenta con otra imagen más clara.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(parsedJson), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Error al procesar la imagen con IA" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
