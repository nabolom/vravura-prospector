import { ensureDatabase } from "../data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const db = await ensureDatabase();
    const url = new URL(request.url);
    const search = (url.searchParams.get("search") ?? "").trim();
    const state = (url.searchParams.get("state") ?? "").trim();
    const sector = (url.searchParams.get("sector") ?? "").trim();
    const size = (url.searchParams.get("size") ?? "").trim();
    const minScore = Math.max(0, Math.min(100, Number(url.searchParams.get("minScore") ?? 0)));
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") ?? 100)));
    const offset = Math.max(0, Math.min(1000000, Number(url.searchParams.get("offset") ?? 0)));
    const clauses = ["score >= ?"];
    const values: Array<string | number> = [minScore];

    if (search) {
      clauses.push("(name LIKE ? OR legal_name LIKE ? OR activity LIKE ?)");
      values.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (state) {
      clauses.push("state = ?");
      values.push(state);
    }
    if (sector) {
      clauses.push("sector_code = ?");
      values.push(sector);
    }
    if (size) {
      clauses.push("employee_band = ?");
      values.push(size);
    }

    const where = clauses.join(" AND ");
    const query = `SELECT * FROM prospects WHERE ${where} ORDER BY score DESC, name LIMIT ? OFFSET ?`;
    const [result, count] = await Promise.all([
      db.prepare(query).bind(...values, limit, offset).all(),
      db.prepare(`SELECT COUNT(*) AS total FROM prospects WHERE ${where}`).bind(...values).first<{ total: number }>(),
    ]);
    const facets = await Promise.all([
      db.prepare("SELECT DISTINCT state FROM prospects ORDER BY state").all(),
      db.prepare("SELECT sector_code, activity, COUNT(*) AS total FROM prospects GROUP BY sector_code ORDER BY total DESC").all(),
      db.prepare("SELECT DISTINCT employee_band FROM prospects ORDER BY employee_band").all(),
    ]);
    return Response.json({ prospects: result.results, total: count?.total ?? 0, limit, offset, states: facets[0].results, sectors: facets[1].results, sizes: facets[2].results });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible cargar prospectos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = await ensureDatabase();
    const payload = (await request.json()) as { id?: string; status?: string };
    const allowed = new Set(["new", "contacted", "diagnosed", "qualified"]);
    if (!payload.id || !payload.status || !allowed.has(payload.status)) {
      return Response.json({ error: "Datos inválidos" }, { status: 400 });
    }
    await db.prepare("UPDATE prospects SET status = ? WHERE id = ?").bind(payload.status, payload.id).run();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible actualizar" }, { status: 500 });
  }
}
