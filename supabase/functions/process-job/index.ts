import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function normalizeBase64(raw: string): string {
  let b64 = raw;
  const commaIdx = b64.indexOf(",");
  if (b64.startsWith("data:") && commaIdx !== -1) {
    b64 = b64.slice(commaIdx + 1);
  }
  b64 = b64.replace(/\s+/g, "");
  b64 = b64.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) {
    b64 += "=";
  }
  if (!/^[A-Za-z0-9+/=]+$/.test(b64)) {
    throw new Error("Invalid base64 charset");
  }
  return b64;
}

// ------------------------------------------------------------------
// SYSTEM PROMPTS POR TIPO (ANTI-ALUCINACIONES)
// ------------------------------------------------------------------

const PROMPTS: Record<string, { system: string; temperature: number; maxTokens: number }> = {
  image_analysis: {
    system: `Eres un Doctor IA especializado en lectura de documentos clínicos (recetas médicas, informes, órdenes de estudio).
Responde SIEMPRE en español. Nunca uses inglés.
INSTRUCCIONES:
1. Extraé TODA la información visible en la imagen con el mayor detalle posible.
2. Si un campo no se ve claramente, indícalo como null pero continúa con los demás.
3. Para cada documento, genera un análisis ÚNICO y específico — no uses respuestas genéricas.
4. NUNCA inventes datos (cero alucinaciones). Si un campo no se puede leer, usa null.
5. Respondé EXCLUSIVAMENTE con JSON válido, sin markdown, sin explicaciones.
6. Los campos numéricos (estatura_cm, peso_kg) deben ser números, no strings.

Formato de salida OBLIGATORIO (SIEMPRE JSON válido):
{
  "nombre_completo": "string | null",
  "documento_identidad": "string | null",
  "fecha_nacimiento": "YYYY-MM-DD | null",
  "telefono": "string | null",
  "email": "string | null",
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

Si la imagen no contiene información médica relevante, devolvé:
{"error": "La imagen no parece ser un documento médico válido."}
Si no podés leer NADA, devolvé: {"error": "No se pudo leer el documento"}`,
    temperature: 0.4,
    maxTokens: 2048,
  },

  text_generation: {
    system: `Eres FisioMirror AI, un asistente virtual especializado en fisioterapia y rehabilitación. Eres empático, profesional y conocedor.
Responde SIEMPRE en español. Nunca uses inglés.

PRINCIPIOS:
- Responde con CONFIANZA utilizando la información del contexto que se te proporciona.
- Si se te proporcionan datos del paciente (nombre, diagnóstico, sesiones, progreso), ÚSALOS para dar respuestas personalizadas.
- NUNCA digas "no tengo suficiente información" si los datos están en el contexto proporcionado.
- Da recomendaciones específicas basadas en el diagnóstico y progreso del paciente.
- Hablá siempre en español, con un tono profesional pero cálido.
- Sé conciso pero completo. No repitas información innecesariamente.
- Si el paciente pregunta sobre dolor o incomodidad, responde con empatía y sugiere ajustes específicos.
- Puedes sugerir modificaciones a ejercicios basándote en el progreso reportado.
- Si algo está genuinamente fuera de tu alcance (emergencias médicas), recomienda contactar al fisioterapeuta.`,
    temperature: 0.7,
    maxTokens: 512,
  },

  insights: {
    system: `Eres un Copiloto Clínico IA especializado en fisioterapia y rehabilitación musculoesquelética para fisioterapeutas profesionales.
Responde SIEMPRE en español. Nunca uses inglés.

INSTRUCCIONES:
- Analiza los datos clínicos proporcionados (sesiones, progreso de ROM, calidad de ejecución, adherencia, métricas funcionales).
- Usa terminología médica profesional: rango de movimiento (ROM), escala funcional, déficit neuromuscular, reclutamiento motor, propiocepción, carga progresiva, etc.
- Personaliza SIEMPRE con el nombre del paciente, diagnóstico y datos específicos cuando estén disponibles.

ESTRUCTURA OBLIGATORIA DE RESPUESTA (formato JSON):
{
  "evaluacion_clinica": "Análisis del estado actual del paciente: evolución del cuadro, respuesta al tratamiento, hallazgos clínicos relevantes. Usa terminología médica.",
  "recomendaciones": "Acciones terapéuticas concretas: ajustes de dosis de ejercicio, modificaciones de ROM objetivo, progresión de carga, técnicas complementarias. Sé específico.",
  "nivel_atencion": "baja | media | alta — según riesgo de estancamiento, empeoramiento o necesidad de reevaluación presencial."
}

REGLAS CRÍTICAS:
- NUNCA digas "Lo siento, no puedo generar esto" ni "no hay datos suficientes".
- Si los datos son limitados, responde: "Datos insuficientes para un análisis completo. Se sugiere ampliar la historia clínica del paciente."
- Detecta patrones: mejora, meseta terapéutica, regresión funcional, déficit residual.
- Sugiere acciones accionables y medibles (ej: "Aumentar series de flexión de hombro de 3x10 a 3x15", "Incluir trabajo excéntrico de manguito rotador").
- Responde EXCLUSIVAMENTE en JSON válido, sin markdown, sin texto adicional.`,
    temperature: 0.5,
    maxTokens: 512,
  },

  summaries: {
    system: `Eres un asistente clínico especializado en fisioterapia. Genera un resumen profesional estructurado.
Responde SIEMPRE en español. Nunca uses inglés.

ESTRUCTURA OBLIGATORIA:
## Resumen de Sesión
- **Paciente:** [nombre]
- **Diagnóstico:** [diagnóstico]
- **Sesiones completadas:** [número]
- **Progreso de ROM:** [datos si disponibles]
- **Calidad promedio:** [porcentaje]
- **Tendencia:** [mejora/estable/empeoramiento]

## Observaciones Clínicas
- [2-3 puntos clave basados en los datos]

## Recomendaciones
- [2-3 acciones específicas para el fisioterapeuta]

Usa SOLO los datos proporcionados. Si falta un dato, escribe "No disponible".`,
    temperature: 0.3,
    maxTokens: 512,
  },

  pdf_report: {
    system: `Eres un asistente clínico IA de FisioMirror especializado en fisioterapia. Genera un análisis clínico narrativo profesional basado en los datos del paciente.
Responde SIEMPRE en español. Nunca uses inglés.
El análisis debe incluir:
1. **Resumen Clínico:** Estado actual del paciente, evolución observada, respuesta al tratamiento.
2. **Hallazgos Relevantes:** Patrones de mejora, meseta o regresión. Identificar tendencias en calidad de ejecución y adherencia.
3. **Recomendaciones Terapéuticas:** Acciones específicas para el fisioterapeuta (ajustes de ROM, progresión de carga, técnicas complementarias).
4. **Notas Adicionales:** Observaciones sobre motivación del paciente, factores de riesgo, sugerencias para próxima sesión.
Usa terminología médica profesional pero clara. Personaliza SIEMPRE con el nombre del paciente y datos específicos.
Responde SOLO con el texto narrativo, sin HTML ni markdown. Será insertado en una plantilla PDF premium.`,
    temperature: 0.5,
    maxTokens: 800,
  },
};

// ------------------------------------------------------------------
// PROVIDERS DE IA (FALLBACK EN CADENA)
// ------------------------------------------------------------------

const GEMINI_IMAGE_MODELS = [
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

async function callGeminiImage(imageBase64: string, prompt: string, temperature: number, maxTokens: number, mimeType: string): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");
  let lastErr = "";
  for (const model of GEMINI_IMAGE_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: imageBase64 } }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens, responseMimeType: "application/json" },
        safetySettings: GEMINI_SAFETY_SETTINGS,
      }),
    });
    if (!res.ok) {
      lastErr = await res.text().catch(() => "unknown");
      if (res.status === 403 || res.status === 400) break;
      continue;
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text && text.trim().length > 0) return text;
    const blockedReason = data.promptFeedback?.blockReason;
    lastErr = blockedReason ? `Blocked: ${blockedReason}` : "empty response";
  }
  throw new Error(`Gemini no devolvió texto: ${lastErr}`);
}

const GROQ_VISION_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "llama-3.2-90b-vision-preview",
  "llama-3.2-11b-vision-preview",
];

async function callGroqVision(imageBase64: string, prompt: string, temperature: number, maxTokens: number, mimeType: string): Promise<string> {
  const apiKey = Deno.env.get("GROQ_API_KEY2");
  if (!apiKey) throw new Error("GROQ_API_KEY2 no configurada");
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;
  let lastErr = "";
  for (const model of GROQ_VISION_MODELS) {
    const res = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "user", content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ] },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });
    if (!res.ok) {
      lastErr = await res.text().catch(() => "unknown");
      if (res.status === 403 || res.status === 400) break;
      continue;
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (text && text.trim().length > 0) return text;
    lastErr = "empty response";
  }
  throw new Error(`Groq Vision no devolvió texto: ${lastErr}`);
}

const HF_VISION_MODELS = [
  "meta-llama/Llama-3.2-11B-Vision-Instruct",
  "Qwen/Qwen2-VL-7B-Instruct",
];

async function callHFVision(imageBase64: string, prompt: string, temperature: number, maxTokens: number, mimeType: string): Promise<string> {
  const apiKey = Deno.env.get("HF_API_TOKEN2");
  if (!apiKey) throw new Error("HF_API_TOKEN2 no configurada");
  let lastErr = "";
  for (const model of HF_VISION_MODELS) {
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {
          image: `data:${mimeType};base64,${imageBase64}`,
          prompt,
        },
        parameters: { temperature, max_new_tokens: maxTokens, return_full_text: false },
      }),
    });
    if (!res.ok) {
      lastErr = await res.text().catch(() => "unknown");
      if (res.status === 403 || res.status === 400) break;
      continue;
    }
    const data = await res.json();
    const text = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
    if (text && text.trim().length > 0) return text;
    lastErr = "empty response";
  }
  throw new Error(`HuggingFace Vision no devolvió texto: ${lastErr}`);
}

const IMAGE_MODELS = [
  {
    name: "Gemini Flash (multimodal)",
    provider: async (imageBase64: string, prompt: string, temperature: number, maxTokens: number, mimeType: string) => {
      return callGeminiImage(imageBase64, prompt, temperature, maxTokens, mimeType);
    },
  },
  {
    name: "Groq Vision (Llama 4 / 3.2)",
    provider: async (imageBase64: string, prompt: string, temperature: number, maxTokens: number, mimeType: string) => {
      return callGroqVision(imageBase64, prompt, temperature, maxTokens, mimeType);
    },
  },
  {
    name: "Cloudflare LLaVA 1.5 7B",
    provider: async (imageBase64: string, prompt: string, _temperature: number, maxTokens: number, _mimeType: string) => {
      const binaryString = atob(imageBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${Deno.env.get("CF_ACCOUNT_ID")}/ai/run/@cf/llava-hf/llava-1.5-7b-hf`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("CF_API_TOKEN")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt, image: Array.from(bytes), max_tokens: maxTokens }),
        }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.errors?.[0]?.message || "Error Cloudflare");
      const response = data.result?.response;
      if (!response) throw new Error("Cloudflare no devolvió respuesta");
      return response;
    },
  },
  {
    name: "HuggingFace Vision (Llama 3.2 / Qwen2-VL)",
    provider: async (imageBase64: string, prompt: string, temperature: number, maxTokens: number, mimeType: string) => {
      return callHFVision(imageBase64, prompt, temperature, maxTokens, mimeType);
    },
  },
];

const GEMINI_TEXT_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

async function callGeminiText(prompt: string, temperature: number, maxTokens: number): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");
  let lastErr = "";
  for (const model of GEMINI_TEXT_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens },
        safetySettings: GEMINI_SAFETY_SETTINGS,
      }),
    });
    if (!res.ok) {
      lastErr = await res.text().catch(() => "unknown");
      if (res.status === 403 || res.status === 400) break;
      continue;
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text && text.trim().length > 0) return text;
    lastErr = data.promptFeedback?.blockReason ? `Blocked: ${data.promptFeedback.blockReason}` : "empty response";
  }
  throw new Error(`Gemini no devolvió texto: ${lastErr}`);
}

const GROQ_TEXT_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

async function callGroqText(prompt: string, temperature: number, maxTokens: number): Promise<string> {
  const apiKey = Deno.env.get("GROQ_API_KEY2");
  if (!apiKey) throw new Error("GROQ_API_KEY2 no configurada");
  let lastErr = "";
  for (const model of GROQ_TEXT_MODELS) {
    const res = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: maxTokens,
      }),
    });
    if (!res.ok) {
      lastErr = await res.text().catch(() => "unknown");
      if (res.status === 403 || res.status === 400) break;
      continue;
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (text && text.trim().length > 0) return text;
    lastErr = "empty response";
  }
  throw new Error(`Groq Text no devolvió texto: ${lastErr}`);
}

async function callHFText(prompt: string, temperature: number, maxTokens: number): Promise<string> {
  const apiKey = Deno.env.get("HF_API_TOKEN2");
  if (!apiKey) throw new Error("HF_API_TOKEN2 no configurada");
  const res = await fetch(`https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3.1-8B-Instruct`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { temperature, max_new_tokens: maxTokens, return_full_text: false },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "unknown");
    throw new Error(`HF Text error: ${errText}`);
  }
  const data = await res.json();
  const text = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
  if (!text || text.trim().length === 0) throw new Error("HF Text: empty response");
  return text;
}

const TEXT_MODELS = [
  {
    name: "Gemini Flash (texto)",
    provider: async (prompt: string, temperature: number, maxTokens: number) => {
      return callGeminiText(prompt, temperature, maxTokens);
    },
  },
  {
    name: "Groq (Llama 3.3 70B)",
    provider: async (prompt: string, temperature: number, maxTokens: number) => {
      return callGroqText(prompt, temperature, maxTokens);
    },
  },
  {
    name: "Cloudflare Llama 3.1 8B",
    provider: async (prompt: string, temperature: number, maxTokens: number) => {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${Deno.env.get("CF_ACCOUNT_ID")}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("CF_API_TOKEN")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt, max_tokens: maxTokens, temperature, max_length: maxTokens }),
        }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.errors?.[0]?.message || "Error Cloudflare Texto");
      return data.result.response;
    },
  },
  {
    name: "HuggingFace (Llama 3.1 8B)",
    provider: async (prompt: string, temperature: number, maxTokens: number) => {
      return callHFText(prompt, temperature, maxTokens);
    },
  },
];

// ------------------------------------------------------------------
// LÓGICA PRINCIPAL
// ------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { job_id } = await req.json();
    if (!job_id) {
      return new Response(
        JSON.stringify({ error: "Falta job_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: job, error: fetchError } = await supabase
      .from("ai_jobs")
      .select("*")
      .eq("id", job_id)
      .maybeSingle();

    if (fetchError || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("ai_jobs")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", job_id);

    const { type, input_data } = job;

    const config = PROMPTS[type];
    if (!config) {
      await supabase
        .from("ai_jobs")
        .update({ status: "failed", error: `Tipo no soportado: ${type}`, updated_at: new Date().toISOString() })
        .eq("id", job_id);
      return new Response(
        JSON.stringify({ error: `Tipo no soportado: ${type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isImage = type === "image_analysis";
    const models = isImage ? IMAGE_MODELS : TEXT_MODELS;
    const systemPrompt = input_data.systemPrompt || config.system;
    const temperature = input_data.temperature ?? config.temperature;
    const maxTokens = input_data.maxTokens ?? config.maxTokens;

    let imageBase64Clean = "";
    if (isImage) {
      if (!input_data.imageBase64 || typeof input_data.imageBase64 !== "string") {
        await supabase
          .from("ai_jobs")
          .update({ status: "failed", error: "Invalid imageBase64: ausente o vacío", updated_at: new Date().toISOString() })
          .eq("id", job_id);
        return new Response(
          JSON.stringify({ error: "Invalid imageBase64" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      try {
        imageBase64Clean = normalizeBase64(input_data.imageBase64);
      } catch {
        await supabase
          .from("ai_jobs")
          .update({ status: "failed", error: "Invalid imageBase64: caracteres no válidos tras normalización", updated_at: new Date().toISOString() })
          .eq("id", job_id);
        return new Response(
          JSON.stringify({ error: "Invalid imageBase64" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!imageBase64Clean || imageBase64Clean.length < 100) {
        await supabase
          .from("ai_jobs")
          .update({ status: "failed", error: "Invalid imageBase64: demasiado corto tras normalización", updated_at: new Date().toISOString() })
          .eq("id", job_id);
        return new Response(
          JSON.stringify({ error: "Invalid imageBase64" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    let prompt = "";
    if (isImage) {
      prompt = systemPrompt;
      if (input_data.audioTranscription) {
        prompt += `\n\nCONTEXTO ADICIONAL (transcripción de nota de voz del fisioterapeuta):\n${input_data.audioTranscription}\n\nUsa esta transcripción para enriquecer la extracción de datos de la imagen.`;
      }
    } else {
      const userMsg = input_data.userPrompt || input_data.prompt || "";
      prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n${systemPrompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n${userMsg}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n`;
    }

    const providerErrors: string[] = [];
    let lastError: Error | null = null;
    for (const model of models) {
      try {
        const result = isImage
          ? await model.provider(imageBase64Clean, prompt, temperature, maxTokens, input_data.mimeType || "image/jpeg")
          : await model.provider(prompt, temperature, maxTokens);

        const cleanedResult = isImage
          ? result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
          : result;

        await supabase
          .from("ai_jobs")
          .update({ status: "completed", result: cleanedResult, updated_at: new Date().toISOString() })
          .eq("id", job_id);

        return new Response(
          JSON.stringify({ success: true, result: cleanedResult }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`Modelo ${model.name} falló:`, errMsg);
        providerErrors.push(`${model.name}: ${errMsg}`);
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    const errorDetail = providerErrors.join(" | ");
    await supabase
      .from("ai_jobs")
      .update({
        status: "failed",
        error: `All models failed: ${errorDetail}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job_id);

    return new Response(
      JSON.stringify({ error: "All models failed", detail: errorDetail }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});