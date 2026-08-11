import assert from "node:assert/strict";
import test from "node:test";

import {
  PLAYERS,
  contributionTotal,
  crystalLedger,
  cycleFund,
  dropAdenaLedger,
  initialData,
  parseAdenaInput,
  recipientBalance,
  rewardTotal,
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

test("moves a contribution from the wrong player to the corrected player", () => {
  const data = clone(initialData);
  const wrongRecipient = data.cycles[0].recipients.find(player => player.player === "Ardranes");
  const correctRecipient = data.cycles[0].recipients.find(player => player.player === "Doidinha");
  wrongRecipient.contributions.push({
    id: "wrong-player", player: "Doidinha", amount: 500_000, at: "2026-08-10", note: "",
  });

  assert.match(validateData(data).join(" "), /Contribuição de Doidinha registrada no saldo de Ardranes/);

  const [corrected] = wrongRecipient.contributions.splice(0, 1);
  correctRecipient.contributions.push(corrected);
  assert.equal(contributionTotal(wrongRecipient), 0);
  assert.equal(contributionTotal(correctRecipient), 500_000);
  assert.deepEqual(validateData(data), []);
});

test("allows a partial gear reward above the player's contribution", () => {
  const data = clone(initialData);
  const cycle = data.cycles[0];
  cycle.value = 2_000_000;
  const recipientIndex = cycle.recipients.findIndex(player => player.player === "Doidinha");
  const [recipient] = cycle.recipients.splice(recipientIndex, 1);
  cycle.recipients.unshift(recipient);
  recipient.contributions.push({
    id: "c1", player: "Doidinha", amount: 1_500_000, at: "2026-08-09", note: "",
  });
  cycle.recipients.find(player => player.player === "Ardranes").contributions.push({
    id: "c2", player: "Ardranes", amount: 600_000, at: "2026-08-09", note: "",
  });
  recipient.rewards = [{
    id: "r1", amount: 1_700_000, at: "2026-08-09", note: "Reward antecipado",
  }];

  assert.equal(contributionTotal(recipient), 1_500_000);
  assert.equal(rewardTotal(recipient), 1_700_000);
  assert.equal(recipientBalance(recipient, cycle.value), -200_000);
  assert.equal(cycleFund(cycle), 400_000);
  assert.equal(recipient.received, false);
  assert.deepEqual(validateData(data), []);

  recipient.received = true;
  recipient.receivedAt = "2026-08-09";
  assert.equal(recipientBalance(recipient, cycle.value), -500_000);
  assert.equal(cycleFund(cycle), 100_000);
  assert.deepEqual(validateData(data), []);

  recipient.received = false;
  delete recipient.receivedAt;
  recipient.rewards.push({id: "r2", amount: 300_001, at: "2026-08-09", note: "Inválido"});
  assert.match(validateData(data).join(" "), /Rewards maiores que o valor do item para Doidinha/);
});

test("deleting a pending gear reward restores the player's balance and group fund", () => {
  const data = clone(initialData);
  const cycle = data.cycles[0];
  cycle.value = 1_000_000;
  const doidinha = cycle.recipients.find(player => player.player === "Doidinha");
  const ardranes = cycle.recipients.find(player => player.player === "Ardranes");
  doidinha.contributions.push({id: "c1", player: "Doidinha", amount: 500_000, at: "2026-08-10", note: ""});
  ardranes.contributions.push({id: "c2", player: "Ardranes", amount: 500_000, at: "2026-08-10", note: ""});
  doidinha.rewards = [{id: "r1", amount: 800_000, at: "2026-08-10", note: "Reward incorreto"}];

  assert.equal(recipientBalance(doidinha, cycle.value), -300_000);
  assert.equal(cycleFund(cycle), 200_000);

  doidinha.rewards = doidinha.rewards.filter(reward => reward.id !== "r1");
  assert.equal(recipientBalance(doidinha, cycle.value), 500_000);
  assert.equal(cycleFund(cycle), 1_000_000);
  assert.deepEqual(validateData(data), []);
});

test("deletes one exact Adena contribution without hiding the player's other entries", () => {
  const data = clone(initialData);
  const cycle = data.cycles[0];
  const ardranes = cycle.recipients.find(player => player.player === "Ardranes");
  ardranes.contributions.push(
    {id: "keep", player: "Ardranes", amount: 981_840, at: "2026-08-10", note: "Correta"},
    {id: "delete", player: "Ardranes", amount: 473_840, at: "2026-08-11", note: "Lançada por engano"},
  );

  ardranes.contributions = ardranes.contributions.filter(entry => entry.id !== "delete");

  assert.equal(contributionTotal(ardranes), 981_840);
  assert.deepEqual(ardranes.contributions.map(entry => entry.id), ["keep"]);
  assert.equal(cycleFund(cycle), 981_840);
  assert.deepEqual(validateData(data), []);
});

test("removing a historical reward after delivery keeps the charged item balance", () => {
  const data = clone(initialData);
  const cycle = data.cycles[0];
  const ardranes = cycle.recipients.find(player => player.player === "Ardranes");
  ardranes.contributions.push({id: "c1", player: "Ardranes", amount: 522_000, at: "2026-08-10", note: ""});
  ardranes.rewards = [{id: "r1", amount: 200_000, at: "2026-08-10", note: ""}];
  ardranes.received = true;
  ardranes.receivedAt = "2026-08-10";

  const beforeBalance = recipientBalance(ardranes, cycle.value);
  ardranes.rewards = [];

  assert.equal(recipientBalance(ardranes, cycle.value), beforeBalance);
  assert.equal(cycleFund(cycle), 0);
  assert.deepEqual(validateData(data), []);
});

test("closes the previous equipment round and keeps exactly one current round", () => {
  const data = clone(initialData);
  data.cycles[0].status = "closed";
  data.cycles[0].closedAt = "2026-08-09";
  data.cycles[0].closeReason = "Purchased individually";
  data.cycles.push({
    id: "cycle-2", item: "Top Weapon D", value: 1_200_000, status: "active",
    recipients: PLAYERS.map(player => ({player, received: false, contributions: []})),
  });
  assert.deepEqual(validateData(data), []);

  data.cycles[0].status = "active";
  delete data.cycles[0].closedAt;
  assert.match(validateData(data).join(" "), /mais de uma rodada ativa/);
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

test("records a player crystal delivery and clears only the delivered receivable", () => {
  const data = clone(initialData);
  data.drops.push({
    id: "d1", at: "2026-08-08", item: "Useful drop", crystals: 100, keeper: "Ardranes", note: "",
  });

  assert.deepEqual(crystalLedger(data), {
    Ardranes: -80,
    Doidinha: 20,
    xFonseca: 20,
    Sooul: 20,
    DeusCriolo: 20,
  });

  data.crystalPayments.push({
    id: "p1", at: "2026-08-09", player: "Doidinha", crystals: 20, note: "Entregue no trade",
  });
  const after = crystalLedger(data);
  assert.equal(after.Doidinha, 0);
  assert.equal(after.Ardranes, -60);
  assert.equal(after.xFonseca, 20);
  assert.ok(Math.abs(Object.values(after).reduce((sum, value) => sum + value, 0)) < 0.0001);
  assert.deepEqual(validateData(data), []);
});

test("rejects a crystal delivery above the selected player's receivable", () => {
  const data = clone(initialData);
  data.drops.push({
    id: "d1", at: "2026-08-08", item: "Useful drop", crystals: 100, keeper: "Ardranes", note: "",
  });
  data.crystalPayments.push({
    id: "p1", at: "2026-08-09", player: "Doidinha", crystals: 21, note: "",
  });

  assert.match(validateData(data).join(" "), /Entrega maior que o saldo a receber de Doidinha/);
});

test("allows one-click full settlement when a five-way split has a fraction", () => {
  const data = clone(initialData);
  data.drops.push({
    id: "d1", at: "2026-08-08", item: "Odd crystal value", crystals: 101, keeper: "Ardranes", note: "",
  });
  const due = crystalLedger(data).Doidinha;
  assert.equal(due, 20.2);

  data.crystalPayments.push({
    id: "p1", at: "2026-08-09", player: "Doidinha", crystals: due, note: "Quitação total",
  });
  assert.equal(crystalLedger(data).Doidinha, 0);
  assert.deepEqual(validateData(data), []);
});

test("lists a drop without dividing Adena, then splits only after sale confirmation", () => {
  const data = clone(initialData);
  data.dropSales.push({
    id: "s1", at: "2026-08-08", item: "Enchant Weapon D", quantity: 2,
    unitPrice: 338_000, status: "listed", note: "Loja aberta",
  });

  assert.deepEqual(dropAdenaLedger(data), {
    Ardranes: 0, Doidinha: 0, xFonseca: 0, Sooul: 0, DeusCriolo: 0,
  });

  data.dropSales[0].unitPrice = 340_000;
  assert.equal(dropAdenaLedger(data).Ardranes, 0);

  data.dropSales[0].status = "sold";
  data.dropSales[0].soldAt = "2026-08-09";
  assert.deepEqual(dropAdenaLedger(data), {
    Ardranes: 136_000, Doidinha: 136_000, xFonseca: 136_000, Sooul: 136_000, DeusCriolo: 136_000,
  });

  data.dropAdenaPayments.push({
    id: "ap1", at: "2026-08-09", player: "Sooul", adena: 136_000, note: "Quitação total",
  });
  assert.equal(dropAdenaLedger(data).Sooul, 0);
  assert.deepEqual(validateData(data), []);
});

test("preserves every Adena and rotates indivisible sale remainders fairly", () => {
  const data = clone(initialData);
  data.dropSales.push(
    { id: "s1", at: "2026-08-08", item: "Sale A", quantity: 1, unitPrice: 101, status: "sold", soldAt: "2026-08-08", note: "" },
    { id: "s2", at: "2026-08-09", item: "Sale B", quantity: 1, unitPrice: 102, status: "sold", soldAt: "2026-08-09", note: "" },
  );
  const ledger = dropAdenaLedger(data);
  assert.equal(Object.values(ledger).reduce((sum, value) => sum + value, 0), 203);
  assert.ok(Math.max(...Object.values(ledger)) - Math.min(...Object.values(ledger)) <= 1);
});

test("moves an unsold shop listing into the crystal split", () => {
  const data = clone(initialData);
  data.dropSales.push({
    id: "listing", at: "2026-08-11", item: "Enchant Weapon D", quantity: 2,
    unitPrice: 338_000, status: "listed", note: "Loja em Giran",
  });

  const listing = data.dropSales.find(sale => sale.id === "listing");
  data.dropSales = data.dropSales.filter(sale => sale.id !== listing.id);
  data.drops.push({
    id: "crystallized", at: "2026-08-11", item: `${listing.quantity}× ${listing.item}`,
    crystals: 820, keeper: null, note: "Item retirado da loja e cristalizado para divisão da CP",
  });

  assert.equal(data.dropSales.length, 0);
  assert.equal(data.drops[0].item, "2× Enchant Weapon D");
  assert.deepEqual(crystalLedger(data), {
    Ardranes: 164, Doidinha: 164, xFonseca: 164, Sooul: 164, DeusCriolo: 164,
  });
  assert.deepEqual(validateData(data), []);
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
