"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Prospect = {
  id: string; name: string; legal_name: string; activity: string; sector_code: string;
  employee_band: string; state: string; municipality: string; phone: string; email: string;
  website: string; score: number; score_reasons?: string; status: string; arl_url: string;
  source?: string; is_demo?: number; firmographic_score?: number; intent_score?: number;
  arl_level?: number | null; arl_last_event?: string; arl_completed_at?: string | null;
};

type ImportJob = {
  id: string; status: string; imported_count: number; processed_count: number;
  max_records: number; last_error: string;
};

type Dashboard = {
  stats?: { visible?: number; priority?: number; diagnosed?: number; qualified?: number };
  campaigns?: Array<{ id: number; name: string; total: number }>;
};

type Campaign = { id: number; name: string; total: number; diagnosed?: number; qualified?: number; created_at?: string };
type LeadRow = {
  name: string; legalName: string; activity: string; sectorCode: string; employeeBand: string;
  state: string; municipality: string; phone: string; email: string; website: string;
};

const statusLabel: Record<string, string> = {
  new: "Nuevo", contacted: "Contactado", diagnosed: "ARL completo", qualified: "Oportunidad",
};

const sectorNames: Record<string, string> = {
  "22": "Servicios", "23": "Construcción", "31": "Manufactura", "33": "Manufactura",
  "43": "Mayoreo", "46": "Retail", "48": "Logística", "54": "Profesionales",
  "61": "Educación", "62": "Salud", "72": "Hospitalidad", "81": "Otros servicios",
};

const mexicoStates = [
  ["01", "Aguascalientes"], ["02", "Baja California"], ["03", "Baja California Sur"],
  ["04", "Campeche"], ["05", "Coahuila"], ["06", "Colima"], ["07", "Chiapas"],
  ["08", "Chihuahua"], ["09", "Ciudad de México"], ["10", "Durango"], ["11", "Guanajuato"],
  ["12", "Guerrero"], ["13", "Hidalgo"], ["14", "Jalisco"], ["15", "Estado de México"],
  ["16", "Michoacán"], ["17", "Morelos"], ["18", "Nayarit"], ["19", "Nuevo León"],
  ["20", "Oaxaca"], ["21", "Puebla"], ["22", "Querétaro"], ["23", "Quintana Roo"],
  ["24", "San Luis Potosí"], ["25", "Sinaloa"], ["26", "Sonora"], ["27", "Tabasco"],
  ["28", "Tamaulipas"], ["29", "Tlaxcala"], ["30", "Veracruz"], ["31", "Yucatán"],
  ["32", "Zacatecas"],
] as const;

const scianSectors = [
  ["0", "Todos los sectores"],
  ["11", "Agricultura, pesca y actividades relacionadas"],
  ["21", "Minería"], ["22", "Energía, agua y gas"], ["23", "Construcción"],
  ["31", "Industrias manufactureras · grupo 31"], ["32", "Industrias manufactureras · grupo 32"],
  ["33", "Industrias manufactureras · grupo 33"], ["43", "Comercio al por mayor"],
  ["46", "Comercio al por menor"], ["48", "Transportes, correos y almacenamiento · grupo 48"],
  ["49", "Transportes, correos y almacenamiento · grupo 49"], ["51", "Información en medios masivos"],
  ["52", "Servicios financieros y de seguros"], ["53", "Servicios inmobiliarios y alquiler"],
  ["54", "Servicios profesionales, científicos y técnicos"], ["55", "Corporativos"],
  ["56", "Apoyo a negocios, residuos y remediación"], ["61", "Servicios educativos"],
  ["62", "Salud y asistencia social"], ["71", "Cultura, deporte y recreación"],
  ["72", "Hoteles, restaurantes y alimentos"], ["81", "Otros servicios"],
  ["93", "Gobierno y organismos internacionales"],
] as const;

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((word) => word[0]).join("");
}

function parseCsv(text: string): LeadRow[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = "";
    } else cell += character;
  }
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return [];
  const aliases: Record<string, keyof LeadRow> = {
    nombre: "name", empresa: "name", name: "name", razon_social: "legalName", legal_name: "legalName",
    actividad: "activity", activity: "activity", sector_scian: "sectorCode", sector: "sectorCode",
    tamano: "employeeBand", tamaño: "employeeBand", employee_band: "employeeBand",
    estado: "state", state: "state", municipio: "municipality", municipality: "municipality",
    telefono: "phone", teléfono: "phone", phone: "phone", correo: "email", email: "email",
    sitio_web: "website", website: "website",
  };
  const headers = rows[0].map((header) => aliases[header.toLowerCase().trim().replace(/\s+/g, "_")]);
  return rows.slice(1, 1001).map((values) => {
    const lead: LeadRow = { name: "", legalName: "", activity: "", sectorCode: "", employeeBand: "", state: "", municipality: "", phone: "", email: "", website: "" };
    headers.forEach((header, index) => { if (header) lead[header] = values[index] ?? ""; });
    return lead;
  }).filter((lead) => lead.name);
}

export default function ProspectorApp() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard>({});
  const [states, setStates] = useState<string[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [sector, setSector] = useState("");
  const [size, setSize] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [selected, setSelected] = useState<Prospect | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [importState, setImportState] = useState("09");
  const [importSector, setImportSector] = useState("0");
  const [importStratum, setImportStratum] = useState("0");
  const [importLimit, setImportLimit] = useState(1000);
  const [importJob, setImportJob] = useState<ImportJob | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaignId, setActiveCampaignId] = useState(0);
  const [campaignMembers, setCampaignMembers] = useState<Prospect[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [campaignBusy, setCampaignBusy] = useState(false);
  const [showLeads, setShowLeads] = useState(false);
  const [leadRows, setLeadRows] = useState<LeadRow[]>([]);
  const [leadFileName, setLeadFileName] = useState("");
  const [leadError, setLeadError] = useState("");
  const [leadBusy, setLeadBusy] = useState(false);
  const [arlBusy, setArlBusy] = useState(false);

  const loadDashboard = useCallback(async () => {
    const response = await fetch("/api/dashboard");
    if (response.ok) setDashboard(await response.json());
  }, []);

  const loadCampaigns = useCallback(async (requestedId?: number) => {
    const listResponse = await fetch("/api/campaigns");
    if (!listResponse.ok) return;
    const listData = await listResponse.json();
    const nextCampaigns = (listData.campaigns ?? []) as Campaign[];
    setCampaigns(nextCampaigns);
    const id = requestedId ?? (activeCampaignId || nextCampaigns[0]?.id || 0);
    if (!id) { setCampaignMembers([]); return; }
    setActiveCampaignId(id);
    const membersResponse = await fetch(`/api/campaigns?campaignId=${id}`);
    if (membersResponse.ok) setCampaignMembers((await membersResponse.json()).members ?? []);
  }, [activeCampaignId]);

  const loadProspects = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (state) params.set("state", state);
    if (sector) params.set("sector", sector);
    if (size) params.set("size", size);
    if (minScore) params.set("minScore", String(minScore));
    const response = await fetch(`/api/prospects?${params}`);
    if (response.ok) {
      const data = await response.json();
      setProspects(data.prospects ?? []);
      setStates((data.states ?? []).map((item: { state: string }) => item.state));
      setSectors((data.sectors ?? []).map((item: { sector_code: string }) => item.sector_code));
      setSizes((data.sizes ?? []).map((item: { employee_band: string }) => item.employee_band));
    }
    setLoading(false);
  }, [search, state, sector, size, minScore]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);
  useEffect(() => { void loadCampaigns(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const timer = window.setTimeout(() => void loadProspects(), 180);
    return () => window.clearTimeout(timer);
  }, [loadProspects]);

  const clearFilters = () => { setSearch(""); setState(""); setSector(""); setSize(""); setMinScore(0); };
  const activeFilters = [state, sector, size, minScore ? String(minScore) : ""].filter(Boolean).length;
  const avgScore = useMemo(() => prospects.length ? Math.round(prospects.reduce((sum, item) => sum + item.score, 0) / prospects.length) : 0, [prospects]);

  async function addToCampaign(prospect: Prospect) {
    const campaignId = activeCampaignId || campaigns[0]?.id;
    if (!campaignId) { setNotice("Crea una campaña antes de agregar prospectos"); return; }
    const response = await fetch("/api/campaigns", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prospectId: prospect.id, campaignId }) });
    if (response.ok) {
      const result = await response.json();
      setNotice(result.added ? `${prospect.name} se agregó a la campaña` : `${prospect.name} ya estaba en la campaña`);
      void Promise.all([loadDashboard(), loadCampaigns(campaignId)]);
      window.setTimeout(() => setNotice(""), 2600);
    }
  }

  async function createCampaign() {
    if (campaignName.trim().length < 3) return;
    setCampaignBusy(true);
    const response = await fetch("/api/campaigns", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: campaignName }) });
    const result = await response.json();
    if (response.ok) {
      setCampaignName("");
      await Promise.all([loadCampaigns(result.campaign.id), loadDashboard()]);
      setNotice("Campaña creada");
    } else setNotice(result.error || "No fue posible crear la campaña");
    setCampaignBusy(false);
    window.setTimeout(() => setNotice(""), 2600);
  }

  async function removeFromCampaign(prospectId: string) {
    await fetch("/api/campaigns", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ prospectId, campaignId: activeCampaignId }) });
    await Promise.all([loadCampaigns(activeCampaignId), loadDashboard()]);
  }

  async function selectLeadFile(file?: File) {
    setLeadError(""); setLeadRows([]); setLeadFileName(file?.name ?? "");
    if (!file) return;
    const rows = parseCsv(await file.text());
    if (!rows.length) { setLeadError("No encontramos filas válidas. Verifica que exista una columna nombre."); return; }
    setLeadRows(rows);
  }

  async function uploadLeads() {
    if (!leadRows.length) return;
    setLeadBusy(true); setLeadError("");
    const response = await fetch("/api/leads/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ leads: leadRows }) });
    const result = await response.json();
    if (response.ok) {
      setNotice(`${result.imported} leads nuevos · ${result.updated} actualizados`);
      setShowLeads(false); setLeadRows([]); setLeadFileName("");
      await Promise.all([loadProspects(), loadDashboard()]);
      window.setTimeout(() => setNotice(""), 3200);
    } else setLeadError(result.error || "No fue posible cargar los leads");
    setLeadBusy(false);
  }

  function downloadLeadTemplate() {
    const content = "nombre,razon_social,actividad,sector_scian,tamano,estado,municipio,telefono,correo,sitio_web\nEmpresa Ejemplo,Empresa Ejemplo SA de CV,Servicios profesionales,54,11 a 30 personas,Ciudad de México,Benito Juárez,5555555555,hola@ejemplo.mx,ejemplo.mx\n";
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    link.download = "plantilla-leads-vravura.csv"; link.click(); URL.revokeObjectURL(link.href);
  }

  async function openArl(prospect: Prospect) {
    const popup = window.open("about:blank", "_blank");
    const response = await fetch(`/api/prospects/${encodeURIComponent(prospect.id)}/arl-link`, { method: "POST" });
    const result = await response.json();
    if (response.ok) {
      if (popup) popup.location.href = result.url; else window.location.href = result.url;
      await Promise.all([loadProspects(), loadDashboard()]);
    } else { popup?.close(); setNotice(result.error || "No fue posible abrir ARL"); }
  }

  async function syncArl() {
    setArlBusy(true);
    const response = await fetch("/api/integrations/arl/sync", { method: "POST" });
    const result = await response.json();
    if (response.ok) {
      setNotice(`${result.matched} diagnósticos vinculados · ${result.unmatched} sin coincidencia`);
      await Promise.all([loadProspects(), loadDashboard(), loadCampaigns(activeCampaignId)]);
    } else setNotice(result.error || "No fue posible sincronizar ARL");
    setArlBusy(false); window.setTimeout(() => setNotice(""), 3600);
  }

  async function updateStatus(prospect: Prospect, status: string) {
    const response = await fetch("/api/prospects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: prospect.id, status }) });
    if (response.ok) {
      const updated = { ...prospect, status };
      setSelected(updated);
      setProspects((items) => items.map((item) => item.id === prospect.id ? updated : item));
      void loadDashboard();
    }
  }

  async function startImport() {
    setImporting(true);
    setImportError("");
    setImportJob(null);
    try {
      const createdResponse = await fetch("/api/admin/imports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stateCodes: [importState], sector: importSector, stratum: importStratum,
          pageSize: 100, maxRecords: importLimit,
        }),
      });
      const created = await createdResponse.json();
      if (!createdResponse.ok) throw new Error(created.error || "No fue posible crear la importación");
      let job = created.job as ImportJob;
      setImportJob(job);
      for (let batch = 0; batch < 500 && job.status !== "completed"; batch += 1) {
        const runResponse = await fetch(`/api/admin/imports/${job.id}/run`, { method: "POST" });
        const result = await runResponse.json();
        job = result.job as ImportJob;
        setImportJob(job);
        if (!runResponse.ok) throw new Error(result.error || "DENUE no pudo procesar el lote");
      }
      if (job.status === "completed") {
        setNotice(`${job.imported_count} establecimientos reales importados`);
        await Promise.all([loadProspects(), loadDashboard()]);
        window.setTimeout(() => setNotice(""), 3200);
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Error de importación");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="app-shell">
      <section className="blueprint-hero">
        <nav className="top-nav" aria-label="Navegación principal">
          <a className="wordmark" href="#top" aria-label="VRAVURA inicio">VRAVURA<span>®</span></a>
          <div className={`nav-links ${mobileNav ? "nav-links-open" : ""}`}>
            <a className="active" href="#prospectos">Prospectos</a>
            <a href="#campanas">Campañas <b>{dashboard.campaigns?.[0]?.total ?? 0}</b></a>
            <a href="#conversion">Conversión ARL</a>
            <a href="#fuentes">Fuentes</a>
          </div>
          <div className="mode-tabs" aria-label="Modo de producto"><span className="active">Prospector</span><a href="https://arl-vravura.bolt.host/" target="_blank" rel="noreferrer">Diagnóstico ARL</a></div>
          <div className="nav-actions"><button className="outline-light-button" onClick={() => setShowLeads(true)}>Subir leads</button><button className="primary-button nav-cta" onClick={() => setShowImport(true)}>Importar DENUE</button></div>
          <button className="menu-button" onClick={() => setMobileNav(!mobileNav)} aria-label="Abrir menú">MENU</button>
        </nav>

        <div className="hero-content" id="top">
          <div className="section-marker light">01</div>
          <div className="hero-label"><span className="source-dot" /> Inteligencia comercial · México</div>
          <h1>DE 6.1M<br />ESTABLECIMIENTOS<br /><em>A OPORTUNIDADES REALES.</em></h1>
          <div className="hero-footer">
            <p>Encuentra, prioriza y activa organizaciones con señales reales de preparación para automatización e inteligencia artificial.</p>
            <div className="source-stamp"><span>FUENTE ACTIVA</span><strong>DENUE 05/2026</strong><small>COBERTURA NACIONAL</small></div>
          </div>
        </div>

        <div className="metrics" aria-label="Resumen comercial">
          <article><span className="metric-number">01</span><div><strong>6.1M</strong><span>Universo disponible</span><small>Establecimientos en México</small></div></article>
          <article><span className="metric-number">02</span><div><strong>{dashboard.stats?.priority ?? 0}</strong><span>Alta prioridad</span><small>Score de 70 o más</small></div></article>
          <article><span className="metric-number">03</span><div><strong>{dashboard.stats?.diagnosed ?? 0}</strong><span>Diagnósticos ARL</span><small>Completados en el MVP</small></div></article>
          <article><span className="metric-number">04</span><div><strong>{avgScore}</strong><span>Score promedio</span><small>En la vista actual</small></div></article>
        </div>
      </section>

      <main>
        <section className="workspace" id="prospectos">
          <div className="section-marker">02</div>
          <div className="workspace-head">
            <div><span className="section-kicker">MAPA DE OPORTUNIDAD</span><h2>EXPLORADOR<br />DE PROSPECTOS.</h2></div>
            <p>Ordena el universo empresarial mexicano por tamaño, sector, contactabilidad y afinidad con los servicios de VRAVURA.</p>
          </div>

          <div className="filters">
            <label className="search-box"><span>01</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar empresa, actividad o razón social" /></label>
            <select value={state} onChange={(event) => setState(event.target.value)} aria-label="Estado"><option value="">Todo México</option>{states.map((item) => <option key={item}>{item}</option>)}</select>
            <select value={sector} onChange={(event) => setSector(event.target.value)} aria-label="Sector"><option value="">Todos los sectores</option>{sectors.map((item) => <option key={item} value={item}>{sectorNames[item] ?? `Sector ${item}`}</option>)}</select>
            <select value={size} onChange={(event) => setSize(event.target.value)} aria-label="Tamaño"><option value="">Todos los tamaños</option>{sizes.map((item) => <option key={item}>{item}</option>)}</select>
            <select value={minScore} onChange={(event) => setMinScore(Number(event.target.value))} aria-label="Score mínimo"><option value="0">Cualquier score</option><option value="50">Score 50+</option><option value="70">Score 70+</option><option value="85">Score 85+</option></select>
          </div>

          <div className="result-summary">
            <span><b>{prospects.length}</b> organizaciones encontradas</span>
            <div><button className="text-button" onClick={clearFilters}>Limpiar {activeFilters ? `(${activeFilters})` : ""}</button><button className="outline-button" onClick={() => setShowLeads(true)}>Subir leads ↑</button></div>
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>Organización</th><th>Sector</th><th>Tamaño</th><th>Ubicación</th><th>Contacto</th><th>Score</th><th>Estado</th><th /></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={8}><div className="loading-row">Trazando oportunidades…</div></td></tr> : prospects.map((prospect, index) => (
                  <tr key={prospect.id} onClick={() => setSelected(prospect)}>
                    <td><div className="company-cell"><div className="company-logo">{initials(prospect.name)}</div><div><strong>{prospect.name} {prospect.is_demo ? <i className="demo-badge">DEMO</i> : null}</strong><span>{prospect.legal_name || "Establecimiento independiente"}</span></div></div></td>
                    <td><span className="sector-pill">{sectorNames[prospect.sector_code] ?? prospect.activity}</span></td>
                    <td>{prospect.employee_band.replace(" personas", "")}</td>
                    <td><strong className="location">{prospect.state}</strong><span className="subline">{prospect.municipality}</span></td>
                    <td><div className="contact-icons"><span className={prospect.email ? "on" : ""}>@</span><span className={prospect.phone ? "on" : ""}>☎</span><span className={prospect.website ? "on" : ""}>W</span></div></td>
                    <td><div className="score"><strong>{prospect.score}</strong><span>/100</span></div></td>
                    <td><span className={`status status-${prospect.status}`}>{statusLabel[prospect.status]}</span></td>
                    <td><button className="row-action" aria-label={`Abrir ${prospect.name}`}><span>{String(index + 1).padStart(2, "0")}</span>→</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="campaign-workspace" id="campanas">
          <div className="section-marker">03</div>
          <div className="campaign-head"><div><span className="section-kicker">ACTIVACIÓN COMERCIAL</span><h2>CAMPAÑAS<br />TRAZABLES.</h2></div><div className="campaign-create"><input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void createCampaign(); }} placeholder="Nombre de la nueva campaña" maxLength={80} /><button className="primary-button" onClick={() => void createCampaign()} disabled={campaignBusy || campaignName.trim().length < 3}>Crear campaña</button></div></div>
          <div className="campaign-layout">
            <div className="campaign-list" aria-label="Campañas">
              {campaigns.length ? campaigns.map((campaign) => <button key={campaign.id} className={activeCampaignId === campaign.id ? "active" : ""} onClick={() => void loadCampaigns(campaign.id)}><span>{String(campaign.id).padStart(2, "0")}</span><div><strong>{campaign.name}</strong><small>{campaign.total ?? 0} prospectos · {campaign.diagnosed ?? 0} ARL</small></div><b>→</b></button>) : <p>Crea tu primera campaña para agrupar prospectos.</p>}
            </div>
            <div className="campaign-members">
              <div className="campaign-members-head"><strong>{campaigns.find((item) => item.id === activeCampaignId)?.name ?? "Sin campaña seleccionada"}</strong><span>{campaignMembers.length} integrantes</span></div>
              {campaignMembers.length ? campaignMembers.slice(0, 12).map((member) => <article key={member.id}><div className="company-logo">{initials(member.name)}</div><div><strong>{member.name}</strong><span>{member.state} · Score {member.score}</span></div><span className={`status status-${member.status}`}>{statusLabel[member.status]}</span><button onClick={() => void removeFromCampaign(member.id)} aria-label={`Retirar ${member.name}`}>×</button></article>) : <div className="campaign-empty">Abre una empresa y agrégala desde su ficha para construir esta campaña.</div>}
            </div>
          </div>
        </section>

        <section className="workflow-strip" id="conversion">
          <div className="section-marker">04</div>
          <div><span className="section-kicker">SISTEMA DE CONVERSIÓN</span><h2>DEL DATO<br />AL DIAGNÓSTICO.</h2></div>
          <ol>
            <li><span>01</span><strong>DESCUBRE</strong><p>DENUE identifica el universo empresarial.</p></li>
            <li><span>02</span><strong>PRIORIZA</strong><p>El score ordena la oportunidad comercial.</p></li>
            <li><span>03</span><strong>ACTIVA</strong><p>Cada prospecto recibe un enlace ARL trazable.</p></li>
            <li><span>04</span><strong>CONVIERTE</strong><p>El diagnóstico abre una conversación consultiva.</p></li>
          </ol>
          <button className="sync-arl-button" onClick={() => void syncArl()} disabled={arlBusy}>{arlBusy ? "Sincronizando…" : "Sincronizar resultados ARL ↻"}</button>
        </section>
      </main>

      {selected && <div className="drawer-backdrop" onClick={() => setSelected(null)}><aside className="detail-drawer" onClick={(event) => event.stopPropagation()}>
        <button className="drawer-close" onClick={() => setSelected(null)} aria-label="Cerrar">CERRAR ×</button>
        <div className="section-marker">04</div>
        <div className="drawer-top"><div className="company-logo large">{initials(selected.name)}</div><span className={`status status-${selected.status}`}>{statusLabel[selected.status]}</span><h2>{selected.name}</h2><p>{selected.legal_name}</p></div>
        <div className="drawer-score"><div><span>Potencial VRAVURA {selected.source === "uploaded" ? "· LEAD PROPIO" : selected.is_demo ? "· DEMO" : "· DENUE"}</span><strong>{selected.score}<small>/100</small></strong></div><div className="score-bar"><i style={{ width: `${selected.score}%` }} /></div><p>Base firmográfica {selected.firmographic_score ?? selected.score} + intención ARL {selected.intent_score ?? 0}. {selected.arl_level ? `Nivel ARL ${selected.arl_level} confirmado.` : "Aún sin diagnóstico completo."}</p></div>
        <dl><div><dt>Actividad</dt><dd>{selected.activity}</dd></div><div><dt>Tamaño</dt><dd>{selected.employee_band}</dd></div><div><dt>Ubicación</dt><dd>{selected.municipality}, {selected.state}</dd></div><div><dt>Correo</dt><dd>{selected.email || "No publicado"}</dd></div><div><dt>Teléfono</dt><dd>{selected.phone || "No publicado"}</dd></div></dl>
        <label className="status-select">Campaña<select value={activeCampaignId} onChange={(event) => { const id = Number(event.target.value); setActiveCampaignId(id); void loadCampaigns(id); }}><option value="0">Selecciona una campaña</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></label>
        <div className="drawer-actions"><button className="primary-button full" onClick={() => void addToCampaign(selected)}>Agregar a campaña</button><button className="outline-button arl-button" onClick={() => void openArl(selected)}>Abrir enlace ARL ↗</button></div>
        <label className="status-select">Etapa comercial<select value={selected.status} onChange={(event) => void updateStatus(selected, event.target.value)}><option value="new">Nuevo</option><option value="contacted">Contactado</option><option value="diagnosed">ARL completo</option><option value="qualified">Oportunidad</option></select></label>
      </aside></div>}

      {showLeads && <div className="modal-backdrop" onClick={() => setShowLeads(false)}><div className="import-modal" onClick={(event) => event.stopPropagation()}>
        <button className="drawer-close" onClick={() => setShowLeads(false)}>CERRAR ×</button><div className="section-marker">05</div><span className="section-kicker">BASE PROPIA · CSV</span><h2>SUBE TUS<br />PROPIOS LEADS.</h2><p>Carga hasta 1,000 organizaciones por archivo. Se validan, deduplican por correo o teléfono y reciben el mismo score firmográfico.</p>
        <div className="lead-upload-zone"><input id="lead-file" type="file" accept=".csv,text/csv" onChange={(event) => void selectLeadFile(event.target.files?.[0])} disabled={leadBusy} /><label htmlFor="lead-file"><strong>{leadFileName || "Seleccionar archivo CSV"}</strong><span>{leadRows.length ? `${leadRows.length} filas listas para importar` : "Arrastra o elige un archivo con encabezados"}</span></label></div>
        <button className="text-button template-button" onClick={downloadLeadTemplate}>Descargar plantilla CSV ↓</button>
        <div className="modal-note">Columnas admitidas: nombre, razón social, actividad, sector SCIAN, tamaño, estado, municipio, teléfono, correo y sitio web. Sólo “nombre” es obligatoria.</div>
        {leadError && <div className="import-error">{leadError}</div>}
        <button className="primary-button full" onClick={() => void uploadLeads()} disabled={leadBusy || !leadRows.length}>{leadBusy ? "Importando…" : leadRows.length ? `Importar ${leadRows.length} leads` : "Selecciona un CSV"}</button>
      </div></div>}

      {showImport && <div className="modal-backdrop" onClick={() => setShowImport(false)}><div className="import-modal" onClick={(event) => event.stopPropagation()}>
        <button className="drawer-close" onClick={() => setShowImport(false)}>CERRAR ×</button><div className="section-marker">06</div><span className="section-kicker">CONECTOR SERVER-SIDE</span><h2>IMPORTA<br />DESDE DENUE.</h2><p>Consulta la API oficial por entidad, sector y tamaño. Los registros se normalizan, deduplican y califican automáticamente.</p>
        <div className="import-form">
          <label>Entidad<select value={importState} onChange={(event) => setImportState(event.target.value)} disabled={importing}>{mexicoStates.map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}</select></label>
          <label>Sector SCIAN<select value={importSector} onChange={(event) => setImportSector(event.target.value)} disabled={importing}>{scianSectors.map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}</select></label>
          <label>Estrato<select value={importStratum} onChange={(event) => setImportStratum(event.target.value)} disabled={importing}><option value="0">Todos los tamaños</option><option value="1">0–5 personas</option><option value="2">6–10 personas</option><option value="3">11–30 personas</option><option value="4">31–50 personas</option><option value="5">51–100 personas</option><option value="6">101–250 personas</option><option value="7">251+ personas</option></select></label>
          <label>Límite<select value={importLimit} onChange={(event) => setImportLimit(Number(event.target.value))} disabled={importing}><option value="500">500 registros</option><option value="1000">1,000 registros</option><option value="5000">5,000 registros</option><option value="10000">10,000 registros</option></select></label>
        </div>
        {importJob && <div className="import-progress"><div><span>{importJob.status === "completed" ? "COMPLETADO" : importJob.status === "error" ? "REQUIERE ATENCIÓN" : "IMPORTANDO"}</span><strong>{importJob.imported_count.toLocaleString("es-MX")} / {importJob.max_records.toLocaleString("es-MX")}</strong></div><div className="progress-track"><i style={{ width: `${Math.min(100, (importJob.processed_count / importJob.max_records) * 100)}%` }} /></div></div>}
        {importError && <div className="import-error">{importError}</div>}
        <div className="modal-note">El token nunca se expone al navegador. Los dummies se eliminan con el primer lote real.</div><button className="primary-button full" onClick={() => void startImport()} disabled={importing}>{importing ? "Importando…" : "Iniciar importación"}</button>
      </div></div>}
      {notice && <div className="toast"><span>OK</span>{notice}</div>}
    </div>
  );
}
