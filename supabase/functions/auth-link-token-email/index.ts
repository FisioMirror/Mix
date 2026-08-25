import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    const { token, email, password, fullName } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Token es requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email y contraseña son requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Buscar token
    const tokenResponse = await fetch(
      `${supabaseUrl}/rest/v1/activation_tokens?token=eq.${encodeURIComponent(token.trim())}&select=*`,
      {
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
      }
    );

    const tokens = await tokenResponse.json();
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenRow = tokens[0];
    const normalizedEmail = email.toLowerCase().trim();

    // Verificar si el email ya existe
    const emailCheck = await fetch(
      `${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(normalizedEmail)}&select=id,email,role`,
      {
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
      }
    );

    const existingProfiles = await emailCheck.json();
    if (existingProfiles && existingProfiles.length > 0) {
      return new Response(JSON.stringify({ error: "El email ya está registrado" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hash de la contraseña
    const passwordHash = await hashPassword(password);

    // Crear perfil del paciente
    const newProfile = {
      email: normalizedEmail,
      full_name: fullName || `Paciente ${token}`,
      role: 'paciente',
      is_active: true,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const createResponse = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: "POST",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify(newProfile),
    });

    const created = await createResponse.json();
    if (!createResponse.ok || !created || created.length === 0) {
      console.error("Error creating profile:", created);
      return new Response(JSON.stringify({ error: "Error al crear el perfil" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newProfileId = created[0].id;

    // Actualizar token con email y password_hash
    await fetch(
      `${supabaseUrl}/rest/v1/activation_tokens?id=eq.${tokenRow.id}`,
      {
        method: "PATCH",
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password_hash: passwordHash,
          paciente_id: newProfileId,
          used: false, // El token sigue siendo reutilizable
          updated_at: new Date().toISOString(),
        }),
      }
    );

    // Crear relación paciente-terapeuta
    if (tokenRow.terapeuta_id) {
      await fetch(`${supabaseUrl}/rest/v1/pacientes_terapeutas`, {
        method: "POST",
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          paciente_id: newProfileId,
          terapeuta_id: tokenRow.terapeuta_id,
        }),
      });
    }

    // Crear registro en pacientes si no existe
    const pacientesCheck = await fetch(
      `${supabaseUrl}/rest/v1/pacientes?paciente_id=eq.${newProfileId}&select=id`,
      {
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
      }
    );

    const existingPacientes = await pacientesCheck.json();
    if (!existingPacientes || existingPacientes.length === 0) {
      await fetch(`${supabaseUrl}/rest/v1/pacientes`, {
        method: "POST",
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          id: newProfileId,
          paciente_id: newProfileId,
          nombre: newProfile.full_name,
          email: normalizedEmail,
          terapeuta_id: tokenRow.terapeuta_id,
          fecha_creacion: new Date().toISOString(),
        }),
      });
    }

    const { password_hash, ...userWithoutPassword } = created[0];

    return new Response(JSON.stringify({
      success: true,
      user_id: newProfileId,
      email: normalizedEmail,
      user: userWithoutPassword,
      token: token,
    }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Link token email error:", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
