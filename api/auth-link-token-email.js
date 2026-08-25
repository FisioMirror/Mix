import { createClient } from '@supabase/supabase-js';
import { SUPABASE_FALLBACK } from '../src/config/supabase-fallback';

const supabaseUrl = process.env.SUPABASE_URL || SUPABASE_FALLBACK.url;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_FALLBACK.anonKey;
const functionsUrl = `${supabaseUrl}/functions/v1`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Client-Info, Apikey");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token, email, password, fullName } = req.body;

    const response = await fetch(`${functionsUrl}/auth-link-token-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ token, email, password, fullName }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(201).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
