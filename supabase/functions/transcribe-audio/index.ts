import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    const { audioBase64, mimeType } = await req.json();

    if (!audioBase64) {
      return new Response(
        JSON.stringify({ success: false, error: "Audio requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const detectedMime = mimeType || "audio/webm";

    // --- Provider 1: Cloudflare Whisper ---
    const cfToken = Deno.env.get("CF_API_TOKEN");
    const cfAccount = Deno.env.get("CF_ACCOUNT_ID");

    if (cfToken && cfAccount) {
      try {
        const binaryString = atob(audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const formData = new FormData();
        formData.append("audio", new Blob([bytes], { type: detectedMime }));

        const cfResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/run/@cf/openai/whisper-large-v3-turbo`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${cfToken}` },
            body: formData,
          },
        );

        if (cfResponse.ok) {
          const cfData = await cfResponse.json();
          if (cfData.success && cfData.result?.text) {
            const text = cfData.result.text.trim();
            if (text) {
              return new Response(
                JSON.stringify({ text, success: true }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
              );
            }
          }
        }
        console.error("Whisper falló, intentando fallback con Gemini");
      } catch (cfError) {
        console.error("Error Whisper:", cfError instanceof Error ? cfError.message : cfError);
      }
    }

    // --- Provider 2: Gemini (fallback) ---
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Servicio de transcripción no configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const GEMINI_MODELS = [
      "gemini-3.6-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
    ];

    let geminiResponse: Response | null = null;
    let lastError = "";

    for (const model of GEMINI_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      geminiResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: detectedMime,
                    data: audioBase64,
                  },
                },
                {
                  text: "Transcribe este audio en español. Es una nota de voz de un fisioterapeuta dictando datos de un paciente. Devuelve únicamente el texto transcrito, sin formato, sin markdown, sin explicaciones.",
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
        }),
      });

      if (geminiResponse.ok) break;
      lastError = await geminiResponse.text();
      if (geminiResponse.status === 403 || geminiResponse.status === 400) break;
    }

    if (!geminiResponse || !geminiResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No se pudo transcribir el audio.",
          details: lastError,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText || !responseText.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "No se pudo transcribir el audio." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ text: responseText.trim(), success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: "No se pudo transcribir el audio." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
