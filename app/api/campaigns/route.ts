import { ensureDatabase } from "../data";

export async function POST(request: Request) {
  try {
    const db = await ensureDatabase();
    const payload = (await request.json()) as { prospectId?: string; campaignId?: number };
    const campaignId = Number(payload.campaignId ?? 1);
    if (!payload.prospectId || !Number.isInteger(campaignId)) {
      return Response.json({ error: "Datos inválidos" }, { status: 400 });
    }
    await db.prepare("INSERT OR IGNORE INTO campaign_prospects (campaign_id, prospect_id) VALUES (?, ?)")
      .bind(campaignId, payload.prospectId).run();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible agregar el prospecto" }, { status: 500 });
  }
}
