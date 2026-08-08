import assert from "node:assert/strict";
import test from "node:test";

import {
  PLAYERS,
  contributionTotal,
  crystalLedger,
  cycleFund,
  initialData,
  parseAdenaInput,
  recipientBalance,
  validateData,
} from "../app/lib/model.ts";

const clone = (value) => structuredClone(value);

test("starts with the five-player Top Joias D cycle at 522k", () => {
  assert.deepEqual([...PLAYERS], ["Ardranes", "Doidinha", "xFonseca", "Sooul", "DeusCriolo"]);
  assert.equal(initialData.cycles[0].item, "Top Joias D");
  assert.equal(initialData.cycles[0].value, 522_000);
  assert.deepEqual(validateData(initialData), []);
});

test("tracks contributions, delivery debt and available group funds", () => {
  const cycle = clone(initialData.cycles[0]);
  cycle.recipients[0].contributions.push({
    id: "c1", player: "Ardranes", amount: 600_000, at: "2026-08-08", note: "",
  });

  assert.equal(contributionTotal(cycle.recipients[0]), 600_000);
  assert.equal(recipientBalance(cycle.recipients[0], cycle.value), 600_000);
  assert.equal(cycleFund(cycle), 600_000);

  cycle.recipients[0].received = true;
  assert.equal(recipientBalance(cycle.recipients[0], cycle.value), 78_000);
  assert.equal(cycleFund(cycle), 78_000);
});

test("accepts Lineage Adena shorthand and formatted amounts", () => {
  assert.equal(parseAdenaInput("50k"), 50_000);
  assert.equal(parseAdenaInput("500K"), 500_000);
  assert.equal(parseAdenaInput("1kk"), 1_000_000);
  assert.equal(parseAdenaInput("1,5kk"), 1_500_000);
  assert.equal(parseAdenaInput("500.000"), 500_000);
  assert.equal(parseAdenaInput("1.000.000"), 1_000_000);
  assert.ok(Number.isNaN(parseAdenaInput("50 moedas")));
});

test("offsets simultaneous crystal keepers while preserving a zero-sum ledger", () => {
  const data = clone(initialData);
  data.drops.push(
    { id: "d1", at: "2026-08-08", item: "Drop A", crystals: 100, keeper: "Ardranes", note: "" },
    { id: "d2", at: "2026-08-08", item: "Drop B", crystals: 50, keeper: "Sooul", note: "" },
  );

  const before = crystalLedger(data);
  assert.deepEqual(before, {
    Ardranes: -70,
    Doidinha: 30,
    xFonseca: 30,
    Sooul: -20,
    DeusCriolo: 30,
  });

  data.crystalPayments.push({ id: "p1", at: "2026-08-09", crystals: 100, note: "" });
  const after = crystalLedger(data);
  const total = Object.values(after).reduce((sum, value) => sum + value, 0);
  assert.ok(Math.abs(total) < 0.0001);
  assert.ok(after.Ardranes > before.Ardranes);
  assert.equal(after.Sooul, 0);
  assert.ok(after.Doidinha < before.Doidinha);
});

test("rejects inconsistent recipient order and invalid financial values", () => {
  const data = clone(initialData);
  data.cycles[0].recipients[1].received = true;
  data.cycles[0].recipients[0].contributions.push({
    id: "bad", player: "Ardranes", amount: -1, at: "", note: "",
  });

  const errors = validateData(data).join(" ");
  assert.match(errors, /Ordem de recebimento quebrada/);
  assert.match(errors, /Contribui.*inv.*lida/);
  assert.match(errors, /sem data/);
});
