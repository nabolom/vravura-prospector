import assert from "node:assert/strict";
import test from "node:test";

test("product source replaces the starter preview", async () => {
  const page = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../app/page.tsx", import.meta.url), "utf8"));
  const layout = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"));
  const client = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../app/prospector-app.tsx", import.meta.url), "utf8"));
  assert.match(page, /ProspectorApp/);
  assert.match(layout, /VRAVURA Prospector/);
  assert.match(client, /EXPLORADOR/);
  assert.match(client, /OPORTUNIDADES REALES/);
  assert.doesNotMatch(page + layout + client, /codex-preview|SkeletonPreview/);
});
