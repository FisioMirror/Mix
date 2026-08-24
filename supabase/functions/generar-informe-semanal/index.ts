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

const MOTIVATIONAL_MESSAGES = [
  "¡Sigue así! Tu esfuerzo de esta semana te acerca a tu recuperación.",
  "Cada sesión cuenta. Estás construyendo un futuro más fuerte.",
  "Tu dedicación esta semana es admirable. ¡No te rindas!",
  "El progreso es pequeño pero constante, y tú lo estás logrando.",
  "Esta semana demostraste disciplina. ¡Orgulloso de tu trabajo!",
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all active patients
    const { data: patients } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "paciente")
      .eq("is_active", true);

    if (!patients || patients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No hay pacientes activos", reports: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let reportsCreated = 0;

    for (const patient of patients) {
      // Get sessions from last 7 days
      const { data: sessions } = await supabase
        .from("sesiones_completadas")
        .select("*")
        .eq("paciente_id", patient.id)
        .gte("created_at", weekAgo.toISOString())
        .lte("created_at", now.toISOString());

      const sessionsCompleted = sessions?.length || 0;

      // Calculate adherence
      const { data: routines } = await supabase
        .from("rutinas")
        .select("sesiones_programadas")
        .eq("paciente_id", patient.id)
        .eq("estado", "activa")
        .maybeSingle();

      const sessionsProgrammed = routines?.sesiones_programadas || 7;
      const adherence = sessionsProgrammed > 0
        ? Math.min(100, Math.round((sessionsCompleted / sessionsProgrammed) * 100))
        : 0;

      // Get average pain from post_session_reports
      const { data: reports } = await supabase
        .from("post_session_reports")
        .select("dolor_despues")
        .eq("paciente_id", patient.id)
        .gte("created_at", weekAgo.toISOString());

      const painValues = (reports || [])
        .map((r: any) => r.dolor_despues)
        .filter((v: any) => v !== null && v !== undefined);
      const avgPain = painValues.length > 0
        ? Math.round(painValues.reduce((a: number, b: number) => a + b, 0) / painValues.length * 10) / 10
        : 0;

      // Get ROM improvement (best quality score vs worst in the week)
      const qualityScores = (sessions || [])
        .map((s: any) => s.calidad_promedio)
        .filter((v: any) => v !== null && v !== undefined);
      const romImprovement = qualityScores.length >= 2
        ? Math.max(...qualityScores) - Math.min(...qualityScores)
        : 0;

      const motivationalMessage = MOTIVATIONAL_MESSAGES[
        Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)
      ];

      const weekStart = weekAgo.toISOString().split("T")[0];
      const weekEnd = now.toISOString().split("T")[0];

      // Check if report already exists for this week
      const { data: existing } = await supabase
        .from("informes_semanales")
        .select("id")
        .eq("paciente_id", patient.id)
        .eq("fecha_inicio", weekStart)
        .maybeSingle();

      if (existing) continue;

      const { error: insertErr } = await supabase
        .from("informes_semanales")
        .insert({
          paciente_id: patient.id,
          fecha_inicio: weekStart,
          fecha_fin: weekEnd,
          sesiones_completadas: sessionsCompleted,
          adherencia: adherence,
          dolor_promedio: avgPain,
          rom_mejora: romImprovement,
          mensaje_motivador: motivationalMessage,
        });

      if (!insertErr) reportsCreated++;
    }

    return new Response(
      JSON.stringify({ success: true, reports: reportsCreated }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generar-informe-semanal error:", error);
    return new Response(
      JSON.stringify({ error: "Error interno: " + (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
