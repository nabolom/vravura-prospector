import assert from "node:assert/strict";
import test from "node:test";

test("product source replaces the starter preview", async () => {
  const page = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../app/page.tsx", import.meta.url), "utf8"));
  const layout = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"));
  const client = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../app/prospector-app.tsx", import.meta.url), "utf8"));
  assert.match(page, /ProspectorApp/);
  assert.match(page, /requireChatGPTUser/);
  assert.match(layout, /VRAVURA Prospector/);
  assert.match(client, /EXPLORADOR/);
  assert.match(client, /OPORTUNIDADES REALES/);
  assert.match(client, /CAMPAÑAS/);
  assert.match(client, /SUBE TUS/);
  assert.match(client, /Sincronizar resultados ARL/);
  assert.match(client, /Volver al inicio/);
  assert.doesNotMatch(page + layout + client, /codex-preview|SkeletonPreview/);
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
