import { getD1 } from "../../db";

export const seedProspects = [
  ["denue-1001", "Fábrica del Centro", "Fábrica del Centro, S.A. de C.V.", "Fabricación de productos metálicos", "33", "51 a 100 personas", "San Luis Potosí", "San Luis Potosí", "444 123 4567", "contacto@fabricacentro.mx", "fabricacentro.mx", 91, "new"],
  ["denue-1002", "Logística del Bajío", "Logística del Bajío, S.A.P.I.", "Autotransporte de carga", "48", "101 a 250 personas", "Querétaro", "El Marqués", "442 221 9080", "operaciones@logisticabajio.mx", "logisticabajio.mx", 89, "contacted"],
  ["denue-1003", "Clínica Nova Salud", "Servicios Médicos Nova, S.C.", "Hospitales generales", "62", "31 a 50 personas", "Nuevo León", "Monterrey", "81 8355 1200", "direccion@novasalud.mx", "novasalud.mx", 84, "new"],
  ["denue-1004", "Grupo Educativo Horizonte", "Educación Horizonte, A.C.", "Escuelas de educación superior", "61", "51 a 100 personas", "Ciudad de México", "Benito Juárez", "55 5687 4110", "innovacion@horizonte.edu.mx", "horizonte.edu.mx", 81, "diagnosed"],
  ["denue-1005", "Distribuidora Norte", "Distribuidora Norte de México, S.A.", "Comercio al por mayor", "43", "11 a 30 personas", "Chihuahua", "Chihuahua", "614 410 8900", "ventas@distribuidoranorte.mx", "distribuidoranorte.mx", 77, "new"],
  ["denue-1006", "Alimentos Sierra Madre", "Procesadora Sierra Madre, S.A.", "Industria alimentaria", "31", "101 a 250 personas", "Jalisco", "Zapopan", "33 3620 1140", "", "sierramadre.mx", 74, "contacted"],
  ["denue-1007", "Constructora Vértice", "Vértice Proyectos, S.A. de C.V.", "Construcción de inmuebles", "23", "31 a 50 personas", "Yucatán", "Mérida", "999 920 1830", "proyectos@vertice.mx", "vertice.mx", 71, "new"],
  ["denue-1008", "Hotel Casa Nómada", "Operadora Nómada, S.A.", "Hoteles con servicios integrados", "72", "11 a 30 personas", "Quintana Roo", "Benito Juárez", "998 884 2200", "gerencia@casanomada.mx", "casanomada.mx", 69, "diagnosed"],
  ["denue-1009", "Soluciones Hídricas MX", "Soluciones Hídricas, S.A.", "Captación y tratamiento de agua", "22", "11 a 30 personas", "Guanajuato", "León", "477 712 6080", "", "hidricasmx.com", 65, "new"],
  ["denue-1010", "Estudio Contable Punto", "Punto Fiscal, S.C.", "Servicios de contabilidad", "54", "6 a 10 personas", "Puebla", "Puebla", "222 231 6700", "hola@puntofiscal.mx", "puntofiscal.mx", 62, "new"],
  ["denue-1011", "Comercializadora La Ruta", "La Ruta Comercial, S.A.", "Comercio al por menor", "46", "6 a 10 personas", "Estado de México", "Naucalpan", "55 5360 1010", "", "", 43, "new"],
  ["denue-1012", "Taller Industrial Robles", "", "Reparación de maquinaria", "81", "0 a 5 personas", "Coahuila", "Saltillo", "844 412 0920", "", "", 36, "new"],
] as const;

export async function ensureDatabase() {
  const db = getD1();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS prospects (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, legal_name TEXT NOT NULL DEFAULT '',
      activity TEXT NOT NULL, sector_code TEXT NOT NULL, employee_band TEXT NOT NULL,
      state TEXT NOT NULL, municipality TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '', website TEXT NOT NULL DEFAULT '', score INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'new', arl_url TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS campaign_prospects (
      campaign_id INTEGER NOT NULL, prospect_id TEXT NOT NULL, added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (campaign_id, prospect_id)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS arl_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, prospect_id TEXT NOT NULL,
      event_type TEXT NOT NULL, occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS prospects_score_idx ON prospects(score DESC)"),
    db.prepare("CREATE INDEX IF NOT EXISTS prospects_location_idx ON prospects(state, municipality)"),
  ]);

  const count = await db.prepare("SELECT COUNT(*) AS total FROM prospects").first<{ total: number }>();
  if ((count?.total ?? 0) === 0) {
    const inserts = seedProspects.map((row) => {
      const arlUrl = `https://arl-vravura.bolt.host/?utm_source=denue&utm_medium=prospector&utm_campaign=mvp&lead_id=${row[0]}`;
      return db.prepare(`INSERT INTO prospects (
        id, name, legal_name, activity, sector_code, employee_band, state, municipality,
        phone, email, website, score, status, arl_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(...row, arlUrl);
    });
    await db.batch(inserts);
    await db.prepare("INSERT INTO campaigns (name) VALUES (?)").bind("Prospectos ARL · Julio").run();
    await db.batch([
      db.prepare("INSERT INTO arl_events (prospect_id, event_type) VALUES (?, ?)").bind("denue-1004", "completed"),
      db.prepare("INSERT INTO arl_events (prospect_id, event_type) VALUES (?, ?)").bind("denue-1008", "completed"),
      db.prepare("INSERT INTO arl_events (prospect_id, event_type) VALUES (?, ?)").bind("denue-1002", "opened"),
    ]);
  }
  return db;
}
