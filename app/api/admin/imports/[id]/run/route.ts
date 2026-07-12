import { ensureDatabase } from "../../../../data";
import { fetchDenueBatch, normalizeDenueRow, type NormalizedProspect } from "../../../../../../lib/denue";

export const dynamic = "force-dynamic";

type ImportJob = {
  id: string; state_codes: string; current_state_index: number; sector: string; stratum: string;
  page_size: number; max_records: number; next_record: number; processed_count: number;
  imported_count: number; status: string; last_error: string;
};

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

async function upsertProspects(db: D1Database, prospects: NormalizedProspect[]) {
  for (const group of chunks(prospects, 60)) {
    await db.batch(group.map((prospect) => db.prepare(`INSERT INTO prospects (
      id, clee, name, legal_name, activity_code, activity, sector_code, employee_band,
      state, municipality, locality, postal_code, address, phone, email, website,
      firmographic_score, intent_score, score, score_reasons, status, arl_url, source, is_demo, imported_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'new', ?, 'denue', 0, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      clee=excluded.clee, name=excluded.name, legal_name=excluded.legal_name,
      activity_code=excluded.activity_code, activity=excluded.activity, sector_code=excluded.sector_code,
      employee_band=excluded.employee_band, state=excluded.state, municipality=excluded.municipality,
      locality=excluded.locality, postal_code=excluded.postal_code, address=excluded.address,
      phone=excluded.phone, email=excluded.email, website=excluded.website,
      firmographic_score=excluded.firmographic_score,
      score=MIN(100, excluded.firmographic_score + prospects.intent_score),
      score_reasons=excluded.score_reasons, arl_url=excluded.arl_url,
      source='denue', is_demo=0, imported_at=CURRENT_TIMESTAMP`).bind(
        prospect.id, prospect.clee, prospect.name, prospect.legalName, prospect.activityCode,
        prospect.activity, prospect.sectorCode, prospect.employeeBand, prospect.state,
        prospect.municipality, prospect.locality, prospect.postalCode, prospect.address,
        prospect.phone, prospect.email, prospect.website, prospect.score, prospect.score, prospect.scoreReasons,
        prospect.arlUrl,
      )));
  }
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const db = await ensureDatabase();
  const { id } = await context.params;
  const job = await db.prepare("SELECT * FROM import_jobs WHERE id = ?").bind(id).first<ImportJob>();
  if (!job) return Response.json({ error: "Importación no encontrada" }, { status: 404 });
  if (job.status === "completed") return Response.json({ job });

  try {
    await db.prepare("UPDATE import_jobs SET status='running', last_error='', updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
    const stateCodes = JSON.parse(job.state_codes) as string[];
    const stateCode = stateCodes[job.current_state_index];
    if (!stateCode) {
      await db.prepare("UPDATE import_jobs SET status='completed', updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
      return Response.json({ job: await db.prepare("SELECT * FROM import_jobs WHERE id=?").bind(id).first() });
    }
    const remaining = job.max_records - job.processed_count;
    const requested = Math.min(job.page_size, remaining);
    const start = job.next_record;
    const end = start + requested - 1;
    const raw = await fetchDenueBatch({ stateCode, sector: job.sector, stratum: job.stratum, start, end });
    const normalized = raw.map(normalizeDenueRow).filter((item): item is NormalizedProspect => item !== null);
    if (normalized.length) {
      await upsertProspects(db, normalized);
      await db.prepare("DELETE FROM prospects WHERE is_demo=1").run();
    }

    const processedCount = job.processed_count + raw.length;
    const importedCount = job.imported_count + normalized.length;
    const stateFinished = raw.length < requested;
    const limitReached = processedCount >= job.max_records;
    const nextStateIndex = stateFinished ? job.current_state_index + 1 : job.current_state_index;
    const completed = limitReached || nextStateIndex >= stateCodes.length;
    await db.prepare(`UPDATE import_jobs SET
      current_state_index=?, next_record=?, processed_count=?, imported_count=?, status=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?`).bind(
        nextStateIndex,
        stateFinished ? 1 : end + 1,
        processedCount,
        importedCount,
        completed ? "completed" : "running",
        id,
      ).run();
    const updated = await db.prepare("SELECT * FROM import_jobs WHERE id=?").bind(id).first();
    return Response.json({ job: updated, batch: { received: raw.length, imported: normalized.length, stateCode } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al consultar DENUE";
    await db.prepare("UPDATE import_jobs SET status='error', last_error=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(message, id).run();
    const updated = await db.prepare("SELECT * FROM import_jobs WHERE id=?").bind(id).first();
    return Response.json({ error: message, job: updated }, { status: message.includes("DENUE_TOKEN") ? 503 : 502 });
  }
}
