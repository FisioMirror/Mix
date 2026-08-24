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

async function checkRateLimit(ip: string): Promise<boolean> {
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
      return false;
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
  return true;
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
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const allowed = await checkRateLimit(ip);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Demasiadas peticiones. Espera un minuto." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password, fullName, role, especialidad, universidad, telefono } = await req.json();

    if (!email || !password || !fullName || !role) {
      return new Response(JSON.stringify({ error: "Faltan campos requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["paciente", "fisioterapeuta"].includes(role)) {
      return new Response(JSON.stringify({ error: "Rol inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const normalizedEmail = email.toLowerCase().trim();

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "El email ya está registrado" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const passwordHash = await hashPassword(password);

    const newProfile = {
      email: normalizedEmail,
      full_name: fullName,
      role: role,
      is_active: role === "fisioterapeuta",
      password_hash: passwordHash,
      especialidad: role === "fisioterapeuta" ? (especialidad || null) : null,
      universidad: role === "fisioterapeuta" ? (universidad || null) : null,
      telefono: telefono || null,
    };

    const { data: created, error: insertError } = await supabase
      .from("profiles")
      .insert(newProfile)
      .select("*")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError.message);
      return new Response(JSON.stringify({ error: "Error al crear el usuario" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { password_hash, ...userWithoutPassword } = created;

    return new Response(JSON.stringify({
      success: true,
      user_id: created.id,
      email: created.email,
      user: userWithoutPassword,
    }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Register error:", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
