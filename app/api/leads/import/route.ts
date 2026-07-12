import { ensureDatabase } from "../../data";
import { calculateFirmographicScore } from "../../../../lib/scoring";

export const dynamic = "force-dynamic";

type LeadInput = {
  name?: string; legalName?: string; activity?: string; sectorCode?: string;
  employeeBand?: string; state?: string; municipality?: string; phone?: string;
  email?: string; website?: string;
};

function clean(value: unknown, limit = 180) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, limit);
}

function email(value: unknown) {
  const normalized = clean(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : "";
}

function phone(value: unknown) {
  const normalized = clean(value).replace(/\D/g, "");
  return normalized.length >= 7 && normalized.length <= 15 ? normalized : "";
}

function website(value: unknown) {
  const raw = clean(value);
  if (!raw) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.hostname.includes(".") ? url.toString() : "";
  } catch { return ""; }
}

export async function POST(request: Request) {
  try {
    const db = await ensureDatabase();
    const payload = (await request.json()) as { leads?: LeadInput[] };
    if (!Array.isArray(payload.leads) || payload.leads.length === 0 || payload.leads.length > 1000) {
      return Response.json({ error: "Carga entre 1 y 1,000 leads por archivo" }, { status: 400 });
    }
    let imported = 0;
    let updated = 0;
    let rejected = 0;
    for (const raw of payload.leads) {
      const name = clean(raw.name, 160);
      if (!name) { rejected += 1; continue; }
      const normalized = {
        legalName: clean(raw.legalName, 180), activity: clean(raw.activity, 180) || "Actividad no especificada",
        sectorCode: clean(raw.sectorCode, 2).replace(/\D/g, "") || "00",
        employeeBand: clean(raw.employeeBand, 40) || "Tamaño no especificado",
        state: clean(raw.state, 80) || "No especificado", municipality: clean(raw.municipality, 100),
        phone: phone(raw.phone), email: email(raw.email), website: website(raw.website),
      };
      const existing = normalized.email
        ? await db.prepare("SELECT id, intent_score FROM prospects WHERE LOWER(email) = ? LIMIT 1").bind(normalized.email).first<{ id: string; intent_score: number }>()
        : normalized.phone
          ? await db.prepare("SELECT id, intent_score FROM prospects WHERE phone = ? LIMIT 1").bind(normalized.phone).first<{ id: string; intent_score: number }>()
          : await db.prepare("SELECT id, intent_score FROM prospects WHERE LOWER(name) = LOWER(?) AND state = ? LIMIT 1").bind(name, normalized.state).first<{ id: string; intent_score: number }>();
      const id = existing?.id ?? `uploaded-${crypto.randomUUID()}`;
      const scored = calculateFirmographicScore(normalized, "uploaded");
      const arlUrl = `https://arl-vravura.bolt.host/?utm_source=vravura&utm_medium=prospector&utm_campaign=uploaded&lead_id=${encodeURIComponent(id)}`;
      await db.prepare(`INSERT INTO prospects (
        id, name, legal_name, activity, sector_code, employee_band, state, municipality,
        phone, email, website, firmographic_score, intent_score, score, score_reasons,
        status, arl_url, source, is_demo, imported_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'new', ?, 'uploaded', 0, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, legal_name=excluded.legal_name, activity=excluded.activity,
        sector_code=excluded.sector_code, employee_band=excluded.employee_band, state=excluded.state,
        municipality=excluded.municipality, phone=excluded.phone, email=excluded.email,
        website=excluded.website, firmographic_score=excluded.firmographic_score,
        score=MIN(100, excluded.firmographic_score + prospects.intent_score),
        score_reasons=excluded.score_reasons, source='uploaded', imported_at=CURRENT_TIMESTAMP`).bind(
        id, name, normalized.legalName, normalized.activity, normalized.sectorCode,
        normalized.employeeBand, normalized.state, normalized.municipality, normalized.phone,
        normalized.email, normalized.website, scored.score,
        Math.min(100, scored.score + (existing?.intent_score ?? 0)), scored.reasons, arlUrl,
      ).run();
      if (existing) updated += 1; else imported += 1;
    }
    return Response.json({ imported, updated, rejected, total: payload.leads.length });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible importar los leads" }, { status: 500 });
  }
}
