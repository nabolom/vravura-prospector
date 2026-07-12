import { ensureDatabase } from "../../../data";
import { calculateIntentScore } from "../../../../../lib/scoring";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const db = await ensureDatabase();
    const { id } = await context.params;
    const prospect = await db.prepare("SELECT id, firmographic_score, intent_score FROM prospects WHERE id = ?").bind(id)
      .first<{ id: string; firmographic_score: number; intent_score: number }>();
    if (!prospect) return Response.json({ error: "Prospecto no encontrado" }, { status: 404 });
    const intent = Math.max(prospect.intent_score ?? 0, calculateIntentScore("opened"));
    const eventId = `opened-${crypto.randomUUID()}`;
    await db.batch([
      db.prepare("INSERT INTO arl_events (prospect_id, event_id, event_type) VALUES (?, ?, 'opened')").bind(id, eventId),
      db.prepare(`UPDATE prospects SET intent_score = ?, score = MIN(100, firmographic_score + ?),
        arl_last_event = 'opened' WHERE id = ?`).bind(intent, intent, id),
    ]);
    const url = new URL("https://arl-vravura.bolt.host/");
    url.searchParams.set("utm_source", "vravura");
    url.searchParams.set("utm_medium", "prospector");
    url.searchParams.set("utm_campaign", "arl_activation");
    url.searchParams.set("lead_id", id);
    return Response.json({ url: url.toString(), intentScore: intent, score: Math.min(100, prospect.firmographic_score + intent) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible crear el enlace ARL" }, { status: 500 });
  }
}
