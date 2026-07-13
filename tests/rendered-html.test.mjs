import assert from "node:assert/strict";
import test from "node:test";

test("product source replaces the starter preview", async () => {
  const page = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../app/page.tsx", import.meta.url), "utf8"));
  const layout = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"));
  const client = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../app/prospector-app.tsx", import.meta.url), "utf8"));
  assert.match(page, /ProspectorApp/);
  assert.match(page, /getSessionUser/);
  assert.match(page, /redirect\("\/login"\)/);
  assert.match(layout, /VRAVURA Prospector/);
  assert.match(client, /EXPLORADOR/);
  assert.match(client, /OPORTUNIDADES REALES/);
  assert.match(client, /CAMPAÑAS/);
  assert.match(client, /SUBE TUS/);
  assert.match(client, /Sincronizar resultados ARL/);
  assert.match(client, /Volver al inicio/);
  assert.doesNotMatch(page + layout + client, /codex-preview|SkeletonPreview/);
});

test("temporary login uses signed cookie sessions and protects business APIs", async () => {
  const { readFile } = await import("node:fs/promises");
  const auth = await readFile(new URL("../lib/auth.ts", import.meta.url), "utf8");
  const login = await readFile(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8");
  const routes = [
    "../app/api/campaigns/route.ts",
    "../app/api/dashboard/route.ts",
    "../app/api/prospects/route.ts",
    "../app/api/leads/import/route.ts",
    "../app/api/admin/imports/route.ts",
    "../app/api/admin/imports/[id]/run/route.ts",
    "../app/api/integrations/arl/sync/route.ts",
    "../app/api/prospects/[id]/arl-link/route.ts",
  ];
  assert.match(auth, /httpOnly: true/);
  assert.match(auth, /sameSite: "lax"/);
  assert.match(auth, /HMAC/);
  assert.match(auth, /APP_LOGIN_PASSWORD/);
  assert.match(login, /authenticateCredentials/);
  for (const route of routes) {
    const source = await readFile(new URL(route, import.meta.url), "utf8");
    assert.match(source, /rejectUnauthenticatedApiRequest/);
  }
});

test("campaign deletion removes membership rows before the campaign", async () => {
  const route = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../app/api/campaigns/route.ts", import.meta.url), "utf8"));
  assert.match(route, /DELETE FROM campaign_prospects WHERE campaign_id = \?/);
  assert.match(route, /DELETE FROM campaigns WHERE id = \?/);
  assert.match(route, /deleted: "campaign"/);
});

test("prospect controls include regression fixes", async () => {
  const { readFile } = await import("node:fs/promises");
  const client = await readFile(new URL("../app/prospector-app.tsx", import.meta.url), "utf8");
  const prospectsApi = await readFile(new URL("../app/api/prospects/route.ts", import.meta.url), "utf8");
  const leadsApi = await readFile(new URL("../app/api/leads/import/route.ts", import.meta.url), "utf8");
  assert.match(client, /Limpiar filtros/);
  assert.match(client, /firstLine\.match\(\/;\/g\)/);
  assert.match(prospectsApi, /COUNT\(\*\) AS total/);
  assert.match(prospectsApi, /LIMIT \? OFFSET \?/);
  assert.doesNotMatch(leadsApi, /score_reasons=excluded\.score_reasons, source='uploaded'/);
});
