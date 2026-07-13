import { ensureDatabase } from "../data";
import { rejectUnauthenticatedApiRequest } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await rejectUnauthenticatedApiRequest();
  if (unauthorized) return unauthorized;
  try {
    const db = await ensureDatabase();
    const campaignId = Number(new URL(request.url).searchParams.get("campaignId") ?? 0);
    const campaigns = await db.prepare(`SELECT c.id, c.name, c.created_at,
      COUNT(p.id) AS total,
      SUM(CASE WHEN p.status = 'diagnosed' THEN 1 ELSE 0 END) AS diagnosed,
      SUM(CASE WHEN p.status = 'qualified' THEN 1 ELSE 0 END) AS qualified
      FROM campaigns c
      LEFT JOIN campaign_prospects cp ON c.id = cp.campaign_id
      LEFT JOIN prospects p ON p.id = cp.prospect_id
      GROUP BY c.id ORDER BY c.created_at DESC`).all();
    let members: unknown[] = [];
    if (Number.isInteger(campaignId) && campaignId > 0) {
      const result = await db.prepare(`SELECT p.*, cp.added_at FROM campaign_prospects cp
        JOIN prospects p ON p.id = cp.prospect_id WHERE cp.campaign_id = ?
        ORDER BY p.score DESC, cp.added_at DESC`).bind(campaignId).all();
      members = result.results;
    }
    return Response.json({ campaigns: campaigns.results, members });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible consultar campañas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await rejectUnauthenticatedApiRequest();
  if (unauthorized) return unauthorized;
  try {
    const db = await ensureDatabase();
    const payload = (await request.json()) as { name?: string; prospectId?: string; campaignId?: number };
    if (payload.name !== undefined) {
      const name = payload.name.trim().slice(0, 80);
      if (name.length < 3) return Response.json({ error: "El nombre debe tener al menos 3 caracteres" }, { status: 400 });
      const created = await db.prepare("INSERT INTO campaigns (name) VALUES (?) RETURNING *").bind(name).first();
      return Response.json({ campaign: created }, { status: 201 });
    }
    const campaignId = Number(payload.campaignId);
    if (!payload.prospectId || !Number.isInteger(campaignId) || campaignId < 1) {
      return Response.json({ error: "Selecciona una campaña válida" }, { status: 400 });
    }
    const [campaign, prospect] = await Promise.all([
      db.prepare("SELECT id FROM campaigns WHERE id = ?").bind(campaignId).first(),
      db.prepare("SELECT id FROM prospects WHERE id = ?").bind(payload.prospectId).first(),
    ]);
    if (!campaign || !prospect) return Response.json({ error: "Campaña o prospecto no encontrado" }, { status: 404 });
    const result = await db.prepare("INSERT OR IGNORE INTO campaign_prospects (campaign_id, prospect_id) VALUES (?, ?)")
      .bind(campaignId, payload.prospectId).run();
    return Response.json({ ok: true, added: (result.meta?.changes ?? 0) > 0 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible actualizar la campaña" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await rejectUnauthenticatedApiRequest();
  if (unauthorized) return unauthorized;
  try {
    const db = await ensureDatabase();
    const payload = (await request.json()) as { prospectId?: string; campaignId?: number };
    const campaignId = Number(payload.campaignId);
    if (!Number.isInteger(campaignId) || campaignId < 1) {
      return Response.json({ error: "Datos inválidos" }, { status: 400 });
    }
    if (payload.prospectId) {
      await db.prepare("DELETE FROM campaign_prospects WHERE campaign_id = ? AND prospect_id = ?")
        .bind(campaignId, payload.prospectId).run();
      return Response.json({ ok: true, deleted: "membership" });
    }
    const campaign = await db.prepare("SELECT id FROM campaigns WHERE id = ?").bind(campaignId).first();
    if (!campaign) return Response.json({ error: "Campaña no encontrada" }, { status: 404 });
    await db.batch([
      db.prepare("DELETE FROM campaign_prospects WHERE campaign_id = ?").bind(campaignId),
      db.prepare("DELETE FROM campaigns WHERE id = ?").bind(campaignId),
    ]);
    return Response.json({ ok: true, deleted: "campaign" });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible retirar el prospecto" }, { status: 500 });
  }
}
