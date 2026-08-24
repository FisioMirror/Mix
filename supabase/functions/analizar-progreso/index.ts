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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get all active patients with their therapist links
    const { data: patients } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "paciente")
      .eq("is_active", true);

    if (!patients || patients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, alerts: 0, message: "No hay pacientes activos" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let alertsCreated = 0;

    for (const patient of patients) {
      // Get therapist link
      const { data: link } = await supabase
        .from("pacientes_terapeutas")
        .select("terapeuta_id")
        .eq("paciente_id", patient.id)
        .maybeSingle();

      if (!link?.terapeuta_id) continue;

      // Check for plateau: last 3 sessions with no ROM improvement
      const { data: recentSessions } = await supabase
        .from("sesiones_completadas")
        .select("calidad_promedio, created_at")
        .eq("paciente_id", patient.id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (recentSessions && recentSessions.length >= 3) {
        const qualities = recentSessions.map((s: any) => s.calidad_promedio || 0);
        const hasImprovement = qualities[0] > qualities[1] || qualities[1] > qualities[2];

        if (!hasImprovement && qualities[0] > 0) {
          // Check if we already sent a plateau alert recently
          const { data: existingAlert } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", link.terapeuta_id)
            .eq("type", "sistema")
            .ilike("title", "%meseta%")
            .eq("read", false)
            .maybeSingle();

          if (!existingAlert) {
            await supabase.from("notifications").insert({
              user_id: link.terapeuta_id,
              type: "sistema",
              title: "Meseta terapéutica detectada",
              message: `${patient.full_name || "Paciente"} no muestra mejora en las últimas 3 sesiones. Considera ajustar el plan.`,
              link: `/paciente/${patient.id}`,
              read: false,
            });
            alertsCreated++;
          }
        }
      }

      // Check for abandonment risk: adherence < 40% in last 2 weeks
      const { data: recentSessions2W } = await supabase
        .from("sesiones_completadas")
        .select("id, adherencia")
        .eq("paciente_id", patient.id)
        .gte("created_at", twoWeeksAgo.toISOString());

      const sessionCount = recentSessions2W?.length || 0;

      if (sessionCount === 0) {
        // No sessions in 2 weeks = high abandonment risk
        const { data: existingAbandon } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", link.terapeuta_id)
          .eq("type", "sistema")
          .ilike("title", "%abandono%")
          .eq("read", false)
          .maybeSingle();

        if (!existingAbandon) {
          await supabase.from("notifications").insert({
            user_id: link.terapeuta_id,
            type: "sistema",
            title: "Riesgo de abandono",
            message: `${patient.full_name || "Paciente"} no ha completado sesiones en las últimas 2 semanas.`,
            link: `/paciente/${patient.id}`,
            read: false,
          });
          alertsCreated++;
        }
      } else if (sessionCount > 0) {
        const avgAdherence = recentSessions2W.reduce((sum: number, s: any) => sum + (s.adherencia || 0), 0) / sessionCount;
        if (avgAdherence < 40) {
          const { data: existingAbandon } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", link.terapeuta_id)
            .eq("type", "sistema")
            .ilike("title", "%abandono%")
            .eq("read", false)
            .maybeSingle();

          if (!existingAbandon) {
            await supabase.from("notifications").insert({
              user_id: link.terapeuta_id,
              type: "sistema",
              title: "Riesgo de abandono",
              message: `${patient.full_name || "Paciente"} tiene adherencia de ${Math.round(avgAdherence)}% en las últimas 2 semanas.`,
              link: `/paciente/${patient.id}`,
              read: false,
            });
            alertsCreated++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, alerts: alertsCreated }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("analizar-progreso error:", error);
    return new Response(
      JSON.stringify({ error: "Error interno: " + (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
