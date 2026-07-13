import { ensureDatabase } from "../../data";
import { rejectUnauthenticatedApiRequest } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

const statePattern = /^(?:0[1-9]|[12]\d|3[0-2])$/;

export async function GET() {
  const unauthorized = await rejectUnauthenticatedApiRequest();
  if (unauthorized) return unauthorized;
  try {
    const db = await ensureDatabase();
    const result = await db.prepare("SELECT * FROM import_jobs ORDER BY created_at DESC LIMIT 20").all();
    return Response.json({ jobs: result.results });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible consultar importaciones" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await rejectUnauthenticatedApiRequest();
  if (unauthorized) return unauthorized;
  try {
    const db = await ensureDatabase();
    const payload = (await request.json()) as {
      stateCodes?: string[]; sector?: string; stratum?: string; pageSize?: number; maxRecords?: number;
    };
    const stateCodes = [...new Set((payload.stateCodes ?? []).map((code) => String(code).padStart(2, "0")))];
    if (!stateCodes.length || stateCodes.some((code) => !statePattern.test(code))) {
      return Response.json({ error: "Selecciona claves estatales válidas" }, { status: 400 });
    }
    const sector = /^(?:0|\d{2})$/.test(payload.sector ?? "0") ? payload.sector ?? "0" : "0";
    const stratum = /^[0-7]$/.test(payload.stratum ?? "0") ? payload.stratum ?? "0" : "0";
    const pageSize = Math.max(25, Math.min(200, Number(payload.pageSize ?? 100)));
    const maxRecords = Math.max(pageSize, Math.min(50000, Number(payload.maxRecords ?? 5000)));
    const id = crypto.randomUUID();
    await db.prepare(`INSERT INTO import_jobs (
      id, state_codes, sector, stratum, page_size, max_records
    ) VALUES (?, ?, ?, ?, ?, ?)`).bind(id, JSON.stringify(stateCodes), sector, stratum, pageSize, maxRecords).run();
    const job = await db.prepare("SELECT * FROM import_jobs WHERE id = ?").bind(id).first();
    return Response.json({ job }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible crear la importación" }, { status: 500 });
  }
}
