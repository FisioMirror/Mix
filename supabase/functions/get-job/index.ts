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
    const url = new URL(req.url);
    const job_id = url.searchParams.get("job_id");
    if (!job_id) {
      return new Response(
        JSON.stringify({ error: "Falta job_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabase
      .from("ai_jobs")
      .select("id, type, status, result, error, created_at, updated_at")
      .eq("id", job_id)
      .maybeSingle();

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: "Job no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stale job timeout: if processing for more than 120s, mark as failed
    if (data.status === "processing" && data.updated_at) {
      const elapsed = Date.now() - new Date(data.updated_at).getTime();
      if (elapsed > 120_000) {
        await supabase
          .from("ai_jobs")
          .update({ status: "failed", error: "Timeout: el job excedió los 120 segundos de procesamiento", updated_at: new Date().toISOString() })
          .eq("id", job_id);
        data.status = "failed";
        data.error = "Timeout: el job excedió los 120 segundos de procesamiento";
      }
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
