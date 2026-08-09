import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the complete public ParabelluM dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>ParabelluM • Controle da CP<\/title>/i);
  assert.match(html, /Top Joias D/);
  assert.match(html, /522\.000/);
  assert.match(html, /3 TYRANTS/);
  assert.match(html, /Tank Dark Elf/);
  assert.match(html, /Gladiator/);
  assert.match(html, /Dados públicos em modo somente leitura/);
  assert.match(html, /parabellum-emblem\.png/);
  assert.match(html, /parabellum-party-v2\.png/);
  assert.match(html, /Dual Blunt/);

  for (const player of ["Ardranes", "Doidinha", "xFonseca", "Sooul", "DeusCriolo"]) {
    assert.match(html, new RegExp(`>${player}<`));
  }

  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/i);
});

test("ships the final brand assets and removes the disposable starter", async () => {
  const [emblem, party, social] = await Promise.all([
    stat(new URL("../public/parabellum-emblem.png", import.meta.url)),
    stat(new URL("../public/parabellum-party-v2.png", import.meta.url)),
    stat(new URL("../public/og.png", import.meta.url)),
  ]);

  assert.ok(emblem.size > 10_000);
  assert.ok(party.size > 100_000);
  assert.ok(social.size > 100_000);
  assert.deepEqual(await readdir(new URL("../app/_sites-preview", import.meta.url)), []);
});

test("keeps recipient ordering owner-editable and protects server writes", async () => {
  const [dashboard, route] = await Promise.all([
    readFile(new URL("../app/Dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/state/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(dashboard, /function reorderRecipient/);
  assert.match(dashboard, /draggable=\{canDrag\}/);
  assert.match(dashboard, /Use Reward parcial no cartão do jogador/);
  assert.match(dashboard, /function editCurrentCycle/);
  assert.match(dashboard, /Editar rodada atual/);
  assert.match(dashboard, /Encerrar e iniciar próxima rodada/);
  assert.match(dashboard, /c\.status="closed"/);
  assert.match(dashboard, /Somente a rodada atual aceita entregas/);
  assert.match(route, /if \(!\(await isAdmin\(\)\) \|\| !user\)/);
  assert.match(route, /status: 403/);
  assert.match(route, /status: 409/);
  assert.match(route, /validateData\(body\.data\)/);
});

test("ships the class-themed crystal vault and complete movement feed", async () => {
  const [dashboard, theme] = await Promise.all([
    readFile(new URL("../app/Dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/theme.css", import.meta.url), "utf8"),
  ]);

  assert.match(dashboard, /COFRE DE CRISTAIS D/);
  assert.match(dashboard, /SALDOS DA FORMAÇÃO/);
  assert.match(dashboard, /PLAYER_META\[p\]/);
  assert.match(dashboard, /data\.crystalPayments\.map/);
  assert.match(dashboard, /REGRA PARABELLUM/);
  assert.match(theme, /\.crystal-vault/);
  assert.match(theme, /\.crystal-content \.ledger-card\.tyrant/);
  assert.match(theme, /@media\(max-width:480px\).*\.crystal-content \.ledger/s);
});

test("keeps admin entry fast with LU4 Adena shorthand and contextual controls", async () => {
  const [dashboard, theme] = await Promise.all([
    readFile(new URL("../app/Dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/theme.css", import.meta.url), "utf8"),
  ]);

  assert.match(dashboard, /function AdenaInput/);
  assert.match(dashboard, /50k.*100k.*250k.*500k.*1kk/);
  assert.match(dashboard, /parseAdenaInput\(fd\.get\("amount"\)\)/);
  assert.match(dashboard, /async function giveGearReward/);
  assert.match(dashboard, /Reward parcial • até/);
  assert.match(dashboard, /Rewards pagos/);
  assert.match(dashboard, /Reward máximo disponível/);
  assert.match(dashboard, /adminSection==="adena"/);
  assert.match(dashboard, /adminSection==="crystal"/);
  assert.match(dashboard, /async function deliverCrystals/);
  assert.match(dashboard, /Confirmar entrega/);
  assert.match(dashboard, /balance>\.05/);
  assert.doesNotMatch(dashboard, /Entregar cristais a jogador/);
  assert.match(dashboard, /Loja e divisão da CP/);
  assert.match(dashboard, /Colocar item na loja/);
  assert.match(dashboard, /Atualizar preço/);
  assert.match(dashboard, /Confirmar venda/);
  assert.match(dashboard, /deliverDropAdena/);
  assert.match(theme, /\.adena-quick/);
  assert.match(theme, /\.gear-reward/);
  assert.match(theme, /\.reward-toggle/);
  assert.match(theme, /\.admin-switch/);
  assert.match(theme, /\.crystal-settle/);
  assert.match(theme, /\.loot-sales/);
  assert.match(theme, /\.shop-actions/);
});
