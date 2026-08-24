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

// Venezuela timezone: UTC-4
function getVenezuelaNow(): Date {
  const now = new Date();
  return new Date(now.getTime() - 4 * 60 * 60 * 1000);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const veNow = getVenezuelaNow();
    const currentDay = veNow.getDay(); // 0=Sunday, 1=Monday, ...
    const currentHour = veNow.getHours();
    const currentMinute = veNow.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;

    // Get all active reminders
    const { data: reminders } = await supabase
      .from("recordatorios")
      .select("*")
      .eq("activo", true);

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No hay recordatorios activos" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;

    for (const reminder of reminders) {
      let shouldSend = false;

      if (reminder.tipo === "unico") {
        // Single reminder: check fecha_hora
        if (reminder.fecha_hora) {
          const reminderDate = new Date(reminder.fecha_hora);
          const veReminder = new Date(reminderDate.getTime() - 4 * 60 * 60 * 1000);
          if (
            veReminder.getDate() === veNow.getDate() &&
            veReminder.getMonth() === veNow.getMonth() &&
            veReminder.getHours() === currentHour &&
            veReminder.getMinutes() === currentMinute
          ) {
            shouldSend = true;
          }
        }
      } else if (reminder.tipo === "recurrente") {
        // Recurring: check dias_semana array + hora
        if (reminder.dias_semana && reminder.hora) {
          const dayMatches = reminder.dias_semana.includes(currentDay);
          const hourMatches = reminder.hora === currentTimeStr;
          if (dayMatches && hourMatches) {
            shouldSend = true;
          }
        }
      }

      if (shouldSend) {
        // Create notification for the patient
        const { error: notifErr } = await supabase
          .from("notifications")
          .insert({
            user_id: reminder.paciente_id,
            type: "recordatorio",
            title: "Recordatorio de sesión",
            message: "Es hora de tu sesión de fisioterapia. ¡Vamos!",
            link: "/exercises",
            read: false,
          });

        if (!notifErr) {
          sentCount++;
          // If single reminder, mark as inactive after sending
          if (reminder.tipo === "unico") {
            await supabase
              .from("recordatorios")
              .update({ activo: false })
              .eq("id", reminder.id);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("enviar-recordatorios error:", error);
    return new Response(
      JSON.stringify({ error: "Error interno: " + (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
