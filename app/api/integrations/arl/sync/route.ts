import { ensureDatabase } from "../../../data";
import { fetchArlTable } from "../../../../../lib/arl";
import { calculateIntentScore } from "../../../../../lib/scoring";
import { rejectUnauthenticatedApiRequest } from "../../../../../lib/auth";

export const dynamic = "force-dynamic";

type ArlLead = { id?: string; correo?: string };
type ArlSession = {
  id?: string | number; lead_id?: string; case_name?: string | null; nivel_arl?: number;
  datos?: number; proceso?: number; talento?: number; cultura?: number; tecnologia?: number;
};

export async function POST() {
  const unauthorized = await rejectUnauthenticatedApiRequest();
  if (unauthorized) return unauthorized;
  try {
    const db = await ensureDatabase();
    const [leads, sessions] = await Promise.all([
      fetchArlTable<ArlLead>("arl_leads", "id,correo"),
      fetchArlTable<ArlSession>("arl_sessions", "id,lead_id,case_name,datos,proceso,talento,cultura,tecnologia,nivel_arl"),
    ]);
    const emails = new Map(leads.map((lead) => [String(lead.id ?? ""), String(lead.correo ?? "").trim().toLowerCase()]));
    let matched = 0;
    let unmatched = 0;
    let alreadySynced = 0;
    for (const session of sessions) {
      if (session.id === undefined) { unmatched += 1; continue; }
      const eventId = `arl-session-${session.id}`;
      const exists = await db.prepare("SELECT id FROM arl_events WHERE event_id = ?").bind(eventId).first();
      if (exists) { alreadySynced += 1; continue; }
      const explicitProspectId = String(session.case_name ?? "").trim();
      const email = emails.get(String(session.lead_id ?? "")) ?? "";
      const prospect = explicitProspectId
        ? await db.prepare("SELECT id, firmographic_score, intent_score FROM prospects WHERE id = ?").bind(explicitProspectId).first<{ id: string; firmographic_score: number; intent_score: number }>()
        : email
          ? await db.prepare("SELECT id, firmographic_score, intent_score FROM prospects WHERE LOWER(email) = ? LIMIT 1").bind(email).first<{ id: string; firmographic_score: number; intent_score: number }>()
          : null;
      if (!prospect) { unmatched += 1; continue; }
      const level = Math.max(0, Math.min(5, Number(session.nivel_arl ?? 0)));
      const intent = Math.max(prospect.intent_score ?? 0, calculateIntentScore("completed", level));
      const dimensions = JSON.stringify({
        datos: session.datos ?? 0, proceso: session.proceso ?? 0, talento: session.talento ?? 0,
        cultura: session.cultura ?? 0, tecnologia: session.tecnologia ?? 0,
      });
      await db.batch([
        db.prepare(`INSERT OR IGNORE INTO arl_events
          (prospect_id, event_id, event_type, arl_level, dimension_scores)
          VALUES (?, ?, 'completed', ?, ?)`).bind(prospect.id, eventId, level, dimensions),
        db.prepare(`UPDATE prospects SET intent_score = ?, score = MIN(100, firmographic_score + ?),
          arl_level = ?, arl_last_event = 'completed', arl_completed_at = CURRENT_TIMESTAMP,
          status = CASE WHEN status IN ('new', 'contacted') THEN 'diagnosed' ELSE status END
          WHERE id = ?`).bind(intent, intent, level, prospect.id),
      ]);
      matched += 1;
    }
    return Response.json({ matched, unmatched, alreadySynced, sessions: sessions.length });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible sincronizar ARL" }, { status: 502 });
  }
}
