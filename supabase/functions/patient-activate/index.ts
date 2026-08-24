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

const SALT = "fisiomirror-salt-2024";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

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
    const { token, email, password } = await req.json();

    if (!token || !email || !password) {
      return new Response(
        JSON.stringify({ error: "Token, email y contraseña son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "La contraseña debe tener al menos 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Validate token: not used, not expired
    const { data: tokenData, error: tokenErr } = await supabase
      .from("activation_tokens")
      .select("*")
      .eq("token", token.trim())
      .maybeSingle();

    if (tokenErr || !tokenData) {
      return new Response(
        JSON.stringify({ error: "Token inválido o no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (tokenData.is_used) {
      return new Response(
        JSON.stringify({ error: "Este token ya fue utilizado" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "El token ha expirado" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pacienteId = tokenData.paciente_id;
    const emailAsignado = tokenData.email_asignado || null;

    // 2. If email differs from email_asignado, update across all tables
    if (emailAsignado && emailAsignado.toLowerCase() !== normalizedEmail) {
      await supabase
        .from("activation_tokens")
        .update({ email_asignado: normalizedEmail })
        .eq("id", tokenData.id);

      await supabase
        .from("profiles")
        .update({ email: normalizedEmail })
        .eq("id", pacienteId);

      await supabase
        .from("pacientes")
        .update({ email: normalizedEmail })
        .eq("id", pacienteId);
    } else if (!emailAsignado) {
      // No email was pre-assigned, set it now
      await supabase
        .from("activation_tokens")
        .update({ email_asignado: normalizedEmail })
        .eq("id", tokenData.id);

      await supabase
        .from("profiles")
        .update({ email: normalizedEmail })
        .eq("id", pacienteId);
    }

    // 3. Hash password and store in profiles
    const passwordHash = await hashPassword(password);

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        password_hash: passwordHash,
        email: normalizedEmail,
      })
      .eq("id", pacienteId);

    if (updateErr) {
      return new Response(
        JSON.stringify({ error: "Error al actualizar el perfil: " + updateErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Mark token as used
    const { error: markUsedErr } = await supabase
      .from("activation_tokens")
      .update({ is_used: true })
      .eq("id", tokenData.id);

    if (markUsedErr) {
      console.error("Error marking token as used:", markUsedErr.message);
    }

    // 5. Fetch the updated profile to return
    const { data: updatedProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", pacienteId)
      .maybeSingle();

    const { password_hash, ...userWithoutPassword } = updatedProfile || {};

    return new Response(
      JSON.stringify({
        success: true,
        user_id: pacienteId,
        user: userWithoutPassword,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("patient-activate error:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
