import { env } from "cloudflare:workers";

type ArlEnvironment = { ARL_SUPABASE_URL?: string; ARL_SUPABASE_ANON_KEY?: string };

export function getArlConfig() {
  const runtime = env as unknown as ArlEnvironment;
  const url = runtime.ARL_SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = runtime.ARL_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) throw new Error("La conexión ARL aún no está configurada");
  return { url, key };
}

export async function fetchArlTable<T>(table: string, select = "*") {
  const { url, key } = getArlConfig();
  const response = await fetch(`${url}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=1000`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  if (!response.ok) throw new Error(`ARL respondió HTTP ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload)) throw new Error("ARL devolvió una respuesta inesperada");
  return payload as T[];
}
