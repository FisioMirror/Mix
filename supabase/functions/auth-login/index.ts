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

    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email y contraseña requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profiles, error: dbError } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (dbError) {
      return new Response(JSON.stringify({ error: "Error al consultar la base de datos" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profiles) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profile = profiles;
    const passwordHash = await hashPassword(password);

    if (passwordHash !== profile.password_hash) {
      return new Response(JSON.stringify({ error: "Contraseña incorrecta" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { password_hash, ...userWithoutPassword } = profile;

    return new Response(JSON.stringify({
      success: true,
      user_id: profile.id,
      email: profile.email,
      user: userWithoutPassword,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Auth error:", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
