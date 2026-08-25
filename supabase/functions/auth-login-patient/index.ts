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
    const { email, password, token } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email y contraseña son requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const normalizedEmail = email.toLowerCase().trim();
    const passwordHash = await hashPassword(password);

    // Primero intentar autenticar por email/password (pacientes registrados)
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(normalizedEmail)}&select=id,email,full_name,role,is_active,password_hash`,
      {
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
      }
    );

    const profiles = await profileResponse.json();
    
    if (profiles && profiles.length > 0) {
      const profile = profiles[0];
      
      // Verificar contraseña
      if (profile.password_hash === passwordHash) {
        if (!profile.is_active) {
          return new Response(JSON.stringify({ error: "Cuenta inactiva. Contacta a tu fisioterapeuta." }), {
            status: 403,
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
      }
    }

    // Si no funciona por email, intentar por token + email/password
    if (token) {
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
      
      // Verificar si el token tiene email y password_hash
      if (tokenRow.email && tokenRow.password_hash) {
        if (tokenRow.password_hash === passwordHash) {
          // Obtener perfil del paciente
          const patientResponse = await fetch(
            `${supabaseUrl}/rest/v1/profiles?id=eq.${tokenRow.paciente_id}&select=id,email,full_name,role,is_active`,
            {
              headers: {
                "apikey": serviceRoleKey,
                "Authorization": `Bearer ${serviceRoleKey}`,
              },
            }
          );

          const patientProfiles = await patientResponse.json();
          if (patientProfiles && patientProfiles.length > 0) {
            const patientProfile = patientProfiles[0];
            
            // Verificar si el email coincide
            if (patientProfile.email === normalizedEmail) {
              const { password_hash, ...userWithoutPassword } = patientProfile;
              
              return new Response(JSON.stringify({
                success: true,
                user_id: patientProfile.id,
                email: patientProfile.email,
                user: userWithoutPassword,
              }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }
        }
      }

      // Token no tiene email/password vinculado, usar flujo antiguo
      if (!tokenRow.paciente_id) {
        return new Response(JSON.stringify({ error: "Token no tiene paciente asignado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Obtener perfil por paciente_id
      const patientByIdResponse = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${tokenRow.paciente_id}&select=id,email,full_name,role,is_active`,
        {
          headers: {
            "apikey": serviceRoleKey,
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
        }
      );

      const patientByIdProfiles = await patientByIdResponse.json();
      if (patientByIdProfiles && patientByIdProfiles.length > 0) {
        const patientProfile = patientByIdProfiles[0];
        const { password_hash, ...userWithoutPassword } = patientProfile;
        
        return new Response(JSON.stringify({
          success: true,
          user_id: patientProfile.id,
          email: patientProfile.email,
          user: userWithoutPassword,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Credenciales inválidas" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Patient login error:", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
