"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Prospect = {
  id: string; name: string; legal_name: string; activity: string; sector_code: string;
  employee_band: string; state: string; municipality: string; phone: string; email: string;
  website: string; score: number; status: string; arl_url: string;
};

type Dashboard = {
  stats?: { visible?: number; priority?: number; diagnosed?: number; qualified?: number };
  campaigns?: Array<{ id: number; name: string; total: number }>;
};

const statusLabel: Record<string, string> = {
  new: "Nuevo", contacted: "Contactado", diagnosed: "ARL completo", qualified: "Oportunidad",
};

const sectorNames: Record<string, string> = {
  "22": "Servicios", "23": "Construcción", "31": "Manufactura", "33": "Manufactura",
  "43": "Mayoreo", "46": "Retail", "48": "Logística", "54": "Profesionales",
  "61": "Educación", "62": "Salud", "72": "Hospitalidad", "81": "Otros servicios",
};

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

  const loadDashboard = useCallback(async () => {
    const response = await fetch("/api/dashboard");
    if (response.ok) setDashboard(await response.json());
  }, []);

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
  useEffect(() => {
    const timer = window.setTimeout(() => void loadProspects(), 180);
    return () => window.clearTimeout(timer);
  }, [loadProspects]);

  const clearFilters = () => { setSearch(""); setState(""); setSector(""); setSize(""); setMinScore(0); };
  const activeFilters = [state, sector, size, minScore ? String(minScore) : ""].filter(Boolean).length;
  const avgScore = useMemo(() => prospects.length ? Math.round(prospects.reduce((sum, item) => sum + item.score, 0) / prospects.length) : 0, [prospects]);

  async function addToCampaign(prospect: Prospect) {
    const response = await fetch("/api/campaigns", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prospectId: prospect.id, campaignId: 1 }) });
    if (response.ok) {
      setNotice(`${prospect.name} se agregó a la campaña`);
      void loadDashboard();
      window.setTimeout(() => setNotice(""), 2600);
    }
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

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand"><span className="brand-mark">V</span><span>VRAVURA</span></div>
        <div className="product-label">PROSPECTOR <span>BETA</span></div>
        <nav aria-label="Navegación principal">
          <a className="nav-item active" href="#prospectos"><span>◈</span> Prospectos</a>
          <a className="nav-item" href="#campanas"><span>◎</span> Campañas <b>{dashboard.campaigns?.[0]?.total ?? 0}</b></a>
          <a className="nav-item" href="#conversion"><span>↗</span> Conversión ARL</a>
          <a className="nav-item" href="#fuentes"><span>⬡</span> Fuentes de datos</a>
        </nav>
        <div className="sidebar-spacer" />
        <div className="sync-card">
          <div className="sync-head"><span className="pulse" /> DENUE 05/2026</div>
          <p>Fuente lista para conectar</p>
          <button onClick={() => setShowImport(true)}>Configurar fuente</button>
        </div>
        <div className="user-card"><div className="avatar">LR</div><div><strong>Equipo VRAVURA</strong><span>Administrador</span></div><button aria-label="Opciones">•••</button></div>
      </aside>

      <main>
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileNav(!mobileNav)} aria-label="Abrir menú">☰</button>
          <div><span className="eyebrow">INTELIGENCIA COMERCIAL</span><h1>Encuentra organizaciones listas para avanzar.</h1></div>
          <button className="primary-button" onClick={() => setShowImport(true)}><span>+</span> Importar DENUE</button>
        </header>

        <section className="metrics" aria-label="Resumen comercial">
          <article><div className="metric-icon lime">⬡</div><div><span>Universo disponible</span><strong>6.1M</strong><small>establecimientos en México</small></div></article>
          <article><div className="metric-icon blue">↗</div><div><span>Alta prioridad</span><strong>{dashboard.stats?.priority ?? 0}</strong><small>score de 70 o más</small></div></article>
          <article><div className="metric-icon violet">◎</div><div><span>Diagnósticos ARL</span><strong>{dashboard.stats?.diagnosed ?? 0}</strong><small>completados en el MVP</small></div></article>
          <article><div className="metric-icon coral">★</div><div><span>Score promedio</span><strong>{avgScore}</strong><small>en la vista actual</small></div></article>
        </section>

        <section className="workspace" id="prospectos">
          <div className="workspace-head">
            <div><h2>Explorador de prospectos</h2><p>Prioriza organizaciones con señales de oportunidad para automatización e IA.</p></div>
            <div className="head-actions"><button className="ghost-button" onClick={clearFilters}>Limpiar {activeFilters ? `(${activeFilters})` : ""}</button><button className="export-button" onClick={() => setNotice("La exportación se habilitará con la carga nacional")}>Exportar ↓</button></div>
          </div>

          <div className="filters">
            <label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar empresa, actividad o razón social" /></label>
            <select value={state} onChange={(event) => setState(event.target.value)} aria-label="Estado"><option value="">Todo México</option>{states.map((item) => <option key={item}>{item}</option>)}</select>
            <select value={sector} onChange={(event) => setSector(event.target.value)} aria-label="Sector"><option value="">Todos los sectores</option>{sectors.map((item) => <option key={item} value={item}>{sectorNames[item] ?? `Sector ${item}`}</option>)}</select>
            <select value={size} onChange={(event) => setSize(event.target.value)} aria-label="Tamaño"><option value="">Todos los tamaños</option>{sizes.map((item) => <option key={item}>{item}</option>)}</select>
            <select value={minScore} onChange={(event) => setMinScore(Number(event.target.value))} aria-label="Score mínimo"><option value="0">Cualquier score</option><option value="50">50+</option><option value="70">70+</option><option value="85">85+</option></select>
          </div>

          <div className="result-summary"><span><b>{prospects.length}</b> organizaciones encontradas</span><span>Ordenadas por oportunidad <b>↓</b></span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Organización</th><th>Sector</th><th>Tamaño</th><th>Ubicación</th><th>Contacto</th><th>Score</th><th>Estado</th><th /></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={8}><div className="loading-row">Analizando organizaciones…</div></td></tr> : prospects.map((prospect) => (
                  <tr key={prospect.id} onClick={() => setSelected(prospect)}>
                    <td><div className="company-cell"><div className="company-logo">{prospect.name.split(" ").slice(0, 2).map((word) => word[0]).join("")}</div><div><strong>{prospect.name}</strong><span>{prospect.legal_name || "Establecimiento independiente"}</span></div></div></td>
                    <td><span className="sector-pill">{sectorNames[prospect.sector_code] ?? prospect.activity}</span></td>
                    <td>{prospect.employee_band.replace(" personas", "")}</td>
                    <td><strong className="location">{prospect.state}</strong><span className="subline">{prospect.municipality}</span></td>
                    <td><div className="contact-icons"><span className={prospect.email ? "on" : ""}>@</span><span className={prospect.phone ? "on" : ""}>☎</span><span className={prospect.website ? "on" : ""}>◎</span></div></td>
                    <td><div className={`score score-${prospect.score >= 80 ? "high" : prospect.score >= 60 ? "mid" : "low"}`}><strong>{prospect.score}</strong><span>/100</span></div></td>
                    <td><span className={`status status-${prospect.status}`}>{statusLabel[prospect.status]}</span></td>
                    <td><button className="row-action" aria-label={`Abrir ${prospect.name}`}>→</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {selected && <div className="drawer-backdrop" onClick={() => setSelected(null)}><aside className="detail-drawer" onClick={(event) => event.stopPropagation()}>
        <button className="drawer-close" onClick={() => setSelected(null)} aria-label="Cerrar">×</button>
        <div className="drawer-top"><div className="company-logo large">{selected.name.split(" ").slice(0, 2).map((word) => word[0]).join("")}</div><span className={`status status-${selected.status}`}>{statusLabel[selected.status]}</span><h2>{selected.name}</h2><p>{selected.legal_name}</p></div>
        <div className="drawer-score"><div><span>Potencial VRAVURA</span><strong>{selected.score}<small>/100</small></strong></div><div className="score-bar"><i style={{ width: `${selected.score}%` }} /></div><p>Alta afinidad por tamaño, actividad y canales empresariales publicados.</p></div>
        <dl><div><dt>Actividad</dt><dd>{selected.activity}</dd></div><div><dt>Tamaño</dt><dd>{selected.employee_band}</dd></div><div><dt>Ubicación</dt><dd>{selected.municipality}, {selected.state}</dd></div><div><dt>Correo</dt><dd>{selected.email || "No publicado"}</dd></div><div><dt>Teléfono</dt><dd>{selected.phone || "No publicado"}</dd></div></dl>
        <div className="drawer-actions"><button className="primary-button full" onClick={() => void addToCampaign(selected)}>+ Agregar a campaña</button><a className="arl-button" href={selected.arl_url} target="_blank" rel="noreferrer">Abrir enlace ARL ↗</a></div>
        <label className="status-select">Etapa comercial<select value={selected.status} onChange={(event) => void updateStatus(selected, event.target.value)}><option value="new">Nuevo</option><option value="contacted">Contactado</option><option value="diagnosed">ARL completo</option><option value="qualified">Oportunidad</option></select></label>
      </aside></div>}

      {showImport && <div className="modal-backdrop" onClick={() => setShowImport(false)}><div className="import-modal" onClick={(event) => event.stopPropagation()}><button className="drawer-close" onClick={() => setShowImport(false)}>×</button><span className="modal-kicker">FUENTE NACIONAL</span><h2>Conecta el universo DENUE</h2><p>El MVP ya está listo para recibir la edición 05/2026 mediante archivos masivos o la API oficial de INEGI.</p><div className="import-option"><span>01</span><div><strong>Descarga masiva</strong><p>Recomendada para cargar los 6.1 millones de establecimientos.</p></div></div><div className="import-option"><span>02</span><div><strong>API DENUE</strong><p>Ideal para actualizaciones por estado, sector o tamaño. Requiere token.</p></div></div><div className="modal-note">Siguiente requisito: proporcionar el token DENUE o los archivos ZIP oficiales.</div><button className="primary-button full" onClick={() => setShowImport(false)}>Entendido</button></div></div>}
      {notice && <div className="toast"><span>✓</span>{notice}</div>}
    </div>
  );
}
