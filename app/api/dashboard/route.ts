import { ensureDatabase } from "../data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await ensureDatabase();
    const [stats, funnel, campaigns] = await Promise.all([
      db.prepare(`SELECT COUNT(*) AS visible, SUM(CASE WHEN score >= 70 THEN 1 ELSE 0 END) AS priority,
        SUM(CASE WHEN status = 'diagnosed' THEN 1 ELSE 0 END) AS diagnosed,
        SUM(CASE WHEN status = 'qualified' THEN 1 ELSE 0 END) AS qualified FROM prospects`).first(),
      db.prepare("SELECT status, COUNT(*) AS total FROM prospects GROUP BY status").all(),
      db.prepare(`SELECT c.id, c.name, c.created_at, COUNT(p.id) AS total
        FROM campaigns c LEFT JOIN campaign_prospects cp ON c.id = cp.campaign_id
        LEFT JOIN prospects p ON p.id = cp.prospect_id
        GROUP BY c.id ORDER BY c.created_at DESC`).all(),
    ]);
    return Response.json({ stats, funnel: funnel.results, campaigns: campaigns.results });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible cargar el tablero" }, { status: 500 });
  }
}
