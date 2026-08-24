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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const now = new Date();
    const windowMs = 60_000;
    const maxRequests = 10;

    const { data: rateData } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("ip", ip)
      .maybeSingle();

    if (rateData) {
      const last = new Date(rateData.last_request).getTime();
      if (now.getTime() - last < windowMs && rateData.count >= maxRequests) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes. Espera un minuto." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      await supabase
        .from("rate_limits")
        .update({
          count: now.getTime() - last < windowMs ? rateData.count + 1 : 1,
          last_request: now.toISOString(),
        })
        .eq("ip", ip);
    } else {
      await supabase.from("rate_limits").insert({ ip, count: 1, last_request: now.toISOString() });
    }

    const { type, input_data } = await req.json();
    if (!type || !input_data) {
      return new Response(
        JSON.stringify({ error: "Faltan type o input_data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabase
      .from("ai_jobs")
      .insert({ type, input_data, status: "pending" })
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const processUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-job`;
    fetch(processUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ job_id: data.id }),
    }).then(async (resp) => {
      if (!resp.ok) {
        const errText = await resp.text().catch(() => "unknown");
        console.error(`process-job failed for ${data.id}:`, errText);
        await supabase
          .from("ai_jobs")
          .update({ status: "failed", error: `No se pudo iniciar el procesamiento: ${errText}`, updated_at: new Date().toISOString() })
          .eq("id", data.id);
      }
    }).catch(async (err) => {
      console.error(`process-job fetch error for ${data.id}:`, err);
      await supabase
        .from("ai_jobs")
        .update({ status: "failed", error: `No se pudo contactar al procesador: ${err.message}`, updated_at: new Date().toISOString() })
        .eq("id", data.id);
    });

    return new Response(JSON.stringify({ job_id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
