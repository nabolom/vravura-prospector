import { env } from "cloudflare:workers";

const DENUE_BASE = "https://www.inegi.org.mx/app/api/denue/v1/consulta";

const employeePoints: Record<string, number> = {
  "0 a 5 personas": 3,
  "6 a 10 personas": 8,
  "11 a 30 personas": 14,
  "31 a 50 personas": 19,
  "51 a 100 personas": 24,
  "101 a 250 personas": 29,
  "251 y mas personas": 35,
  "251 y más personas": 35,
};

const sectorPoints: Record<string, number> = {
  "11": 5, "21": 15, "22": 18, "23": 12, "31": 22, "32": 22, "33": 22,
  "43": 17, "46": 10, "48": 22, "49": 22, "51": 25, "52": 24, "53": 15,
  "54": 24, "55": 25, "56": 22, "61": 18, "62": 20, "71": 14, "72": 16,
  "81": 12, "93": 10,
};

export type NormalizedProspect = {
  id: string; clee: string; name: string; legalName: string; activityCode: string;
  activity: string; sectorCode: string; employeeBand: string; state: string;
  municipality: string; locality: string; postalCode: string; address: string;
  phone: string; email: string; website: string; score: number; scoreReasons: string;
  arlUrl: string;
};

type DenueRow = Record<string, unknown>;

function clean(value: unknown) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return /^(null|none|n\/a|s\/d|sin dato)$/i.test(text) ? "" : text;
}

function pick(row: DenueRow, ...keys: string[]) {
  for (const key of keys) {
    const value = clean(row[key]);
    if (value) return value;
  }
  return "";
}

function normalizeEmail(value: string) {
  const email = value.toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 ? digits : "";
}

function normalizeWebsite(value: string) {
  if (!value) return "";
  const website = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try { return new URL(website).hostname.includes(".") ? website : ""; } catch { return ""; }
}

function splitLocation(value: string) {
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  return {
    state: parts.length >= 3 ? parts.at(-1) ?? "" : "",
    municipality: parts.length >= 2 ? parts.at(-2) ?? "" : "",
    locality: parts.length >= 3 ? parts.slice(0, -2).join(", ") : parts[0] ?? "",
  };
}

function calculateScore(input: Omit<NormalizedProspect, "score" | "scoreReasons" | "arlUrl">) {
  let score = 5;
  const reasons = ["Establecimiento activo en DENUE (+5)"];
  const size = employeePoints[input.employeeBand] ?? 0;
  if (size) { score += size; reasons.push(`Tamaño ${input.employeeBand} (+${size})`); }
  const sector = sectorPoints[input.sectorCode] ?? 8;
  score += sector;
  reasons.push(`Potencial de automatización del sector ${input.sectorCode || "sin clasificar"} (+${sector})`);
  if (input.email) { score += 18; reasons.push("Correo empresarial publicado (+18)"); }
  if (input.phone) { score += 9; reasons.push("Teléfono publicado (+9)"); }
  if (input.website) { score += 10; reasons.push("Sitio web publicado (+10)"); }
  if (input.legalName) { score += 3; reasons.push("Razón social identificada (+3)"); }
  return { score: Math.min(score, 100), reasons: JSON.stringify(reasons) };
}

export function getDenueToken() {
  const token = (env as unknown as { DENUE_TOKEN?: string }).DENUE_TOKEN?.trim();
  if (!token) throw new Error("DENUE_TOKEN no está configurado en el servidor");
  return token;
}

export async function fetchDenueBatch(options: {
  stateCode: string; sector: string; stratum: string; start: number; end: number;
}) {
  const token = getDenueToken();
  const parts = [
    "BuscarAreaActEstr", options.stateCode, "0", "0", "0", "0", options.sector,
    "0", "0", "0", "0", String(options.start), String(options.end), "0", options.stratum, token,
  ];
  const url = `${DENUE_BASE}/${parts.map((part) => encodeURIComponent(part)).join("/")}`;
  const response = await fetch(url, { headers: { "user-agent": "VRAVURA-Prospector/1.0" } });
  if (!response.ok) throw new Error(`DENUE respondió HTTP ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload)) throw new Error("DENUE devolvió una respuesta inesperada");
  return payload.filter((item): item is DenueRow => Boolean(item) && typeof item === "object");
}

export function normalizeDenueRow(row: DenueRow): NormalizedProspect | null {
  const id = pick(row, "Id", "id");
  const name = pick(row, "Nombre", "nombre");
  if (!id || !name) return null;
  const location = splitLocation(pick(row, "Ubicacion", "ubicacion"));
  const activityCode = pick(row, "Id_actividad", "Id_clase_actividad", "Codigo_act", "codigo_act").replace(/\D/g, "");
  const sectorCode = pick(row, "Id_sector_actividad", "id_sector_actividad").replace(/\D/g, "").slice(0, 2) || activityCode.slice(0, 2);
  const street = pick(row, "Calle", "calle");
  const exterior = pick(row, "Num_Exterior", "num_exterior");
  const neighborhood = pick(row, "Colonia", "colonia");
  const input = {
    id,
    clee: pick(row, "CLEE", "clee"),
    name,
    legalName: pick(row, "Razon_social", "razon_social"),
    activityCode,
    activity: pick(row, "Clase_actividad", "clase_actividad"),
    sectorCode,
    employeeBand: pick(row, "Estrato", "estrato"),
    state: location.state,
    municipality: location.municipality,
    locality: location.locality,
    postalCode: pick(row, "CP", "cp"),
    address: [street, exterior, neighborhood].filter(Boolean).join(", "),
    phone: normalizePhone(pick(row, "Telefono", "telefono")),
    email: normalizeEmail(pick(row, "Correo_e", "correo_e")),
    website: normalizeWebsite(pick(row, "Sitio_internet", "sitio_internet", "www")),
  };
  const scored = calculateScore(input);
  return {
    ...input,
    score: scored.score,
    scoreReasons: scored.reasons,
    arlUrl: `https://arl-vravura.bolt.host/?utm_source=denue&utm_medium=prospector&utm_campaign=mx_denue&lead_id=${encodeURIComponent(id)}`,
  };
}

