export const PLAYERS = ["Ardranes", "Doidinha", "xFonseca", "Sooul", "DeusCriolo"] as const;
export type Player = (typeof PLAYERS)[number];
export type Contribution = { id: string; player: Player; amount: number; at: string; note: string };
export type GearReward = { id: string; amount: number; at: string; note: string };
export type GearRecipient = { player: Player; received: boolean; receivedAt?: string; contributions: Contribution[]; rewards?: GearReward[] };
export type GearCycle = { id: string; item: string; value: number; status: "active" | "complete" | "closed"; closedAt?: string; closeReason?: string; recipients: GearRecipient[] };
export type DropEvent = { id: string; at: string; item: string; crystals: number; keeper: Player | null; note: string };
export type CrystalPayment = { id: string; at: string; crystals: number; note: string; player?: Player };
export type DropSale = { id: string; at: string; item: string; quantity: number; unitPrice: number; status: "listed" | "sold"; soldAt?: string; note: string };
export type DropAdenaPayment = { id: string; at: string; player: Player; adena: number; note: string };
export type AppData = { cp: string; players: readonly Player[]; cycles: GearCycle[]; drops: DropEvent[]; crystalPayments: CrystalPayment[]; dropSales?: DropSale[]; dropAdenaPayments?: DropAdenaPayment[] };

export const initialData: AppData = {
  cp: "ParabelluM", players: PLAYERS,
  cycles: [{
    id: "cycle-1", item: "Top Joias D", value: 522000, status: "active",
    recipients: PLAYERS.map((player) => ({ player, received: false, contributions: [] })),
  }],
  drops: [], crystalPayments: [], dropSales: [], dropAdenaPayments: [],
};

export function normalizeInitialItem(data: AppData): AppData {
  const first = data.cycles?.[0];
  const untouchedPlaceholder = first?.item === "Set Manticore" && first.value === 500000 &&
    first.recipients.every(r => !r.received && r.contributions.length === 0);
  if (!untouchedPlaceholder) return data;
  const next = structuredClone(data);
  next.cycles[0].item = "Top Joias D";
  next.cycles[0].value = 522000;
  return next;
}

export function adena(n: number) { return new Intl.NumberFormat("pt-BR").format(Math.round(n)); }
export function parseAdenaInput(value: unknown) {
  const raw = String(value ?? "").trim().toLowerCase().replace(/\s+/g, "");
  const suffix = raw.endsWith("kk") ? "kk" : raw.endsWith("k") ? "k" : "";
  const numberPart = suffix ? raw.slice(0, -suffix.length) : raw;
  if (!numberPart || !/^\d+(?:[.,]\d+)*$/.test(numberPart)) return Number.NaN;

  let base: number;
  if (!suffix) {
    base = Number(numberPart.replace(/[.,]/g, ""));
  } else if (/^\d{1,3}(?:[.,]\d{3})+$/.test(numberPart)) {
    base = Number(numberPart.replace(/[.,]/g, ""));
  } else {
    base = Number(numberPart.replace(",", "."));
  }

  const amount = Math.round(base * (suffix === "kk" ? 1_000_000 : suffix === "k" ? 1_000 : 1));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : Number.NaN;
}
export function contributionTotal(r: GearRecipient) { return r.contributions.reduce((s, c) => s + c.amount, 0); }
export function rewardTotal(r: GearRecipient) { return (r.rewards ?? []).reduce((s, reward) => s + reward.amount, 0); }
export function recipientBalance(r: GearRecipient, value: number) { return contributionTotal(r) - rewardTotal(r) - (r.received ? value : 0); }
export function cycleFund(c: GearCycle) { return c.recipients.reduce((s, r) => s + contributionTotal(r) - rewardTotal(r), 0) - c.recipients.filter(r => r.received).length * c.value; }

export function crystalLedger(data: AppData) {
  const balance = Object.fromEntries(PLAYERS.map(p => [p, 0])) as Record<Player, number>;
  for (const d of data.drops) {
    if (d.keeper) {
      const others = PLAYERS.filter(p => p !== d.keeper);
      const share = d.crystals / PLAYERS.length;
      balance[d.keeper] -= share * others.length;
      others.forEach(p => balance[p] += share);
    } else {
      const share = d.crystals / PLAYERS.length;
      PLAYERS.forEach(p => balance[p] += share);
    }
  }
  for (const payment of data.crystalPayments) {
    if (payment.player) {
      const paid = Math.min(payment.crystals, Math.max(0, balance[payment.player]));
      balance[payment.player] -= paid;

      // A physical delivery settles the selected creditor and relieves active
      // crystal debts proportionally. Any excess came from the shared crystal
      // pool and therefore only reduces the group's outstanding inventory.
      const debtors = PLAYERS.filter(p => balance[p] < -0.0001);
      const totalDebt = debtors.reduce((sum, p) => sum - balance[p], 0);
      const debtRelief = Math.min(paid, totalDebt);
      if (debtRelief > 0) {
        debtors.forEach(p => { balance[p] += debtRelief * ((-balance[p]) / totalDebt); });
      }
      continue;
    }

    // Every new batch gives each member a theoretical 1/5 share. Negative
    // balances absorb that share first; the physical crystals then go to the
    // positive balances, preserving a zero-sum ledger.
    PLAYERS.forEach(p => balance[p] += payment.crystals / PLAYERS.length);
    let pool = payment.crystals;
    const creditors = PLAYERS.filter(p => balance[p] > 0);
    while (pool > 0.0001 && creditors.length) {
      const active = creditors.filter(p => balance[p] > 0.0001);
      if (!active.length) break;
      const share = pool / active.length;
      let used = 0;
      active.forEach(p => { const give = Math.min(share, balance[p]); balance[p] -= give; used += give; });
      pool -= used;
    }
  }
  return balance;
}

export function dropAdenaLedger(data: AppData) {
  const balance = Object.fromEntries(PLAYERS.map(p => [p, 0])) as Record<Player, number>;
  (data.dropSales ?? []).filter(sale => sale.status === "sold").forEach((sale, saleIndex) => {
    const total = sale.quantity * sale.unitPrice;
    const share = Math.floor(total / PLAYERS.length);
    const remainder = total % PLAYERS.length;
    PLAYERS.forEach((player, playerIndex) => {
      const rotatedIndex = (playerIndex - saleIndex + PLAYERS.length) % PLAYERS.length;
      balance[player] += share + (rotatedIndex < remainder ? 1 : 0);
    });
  });
  for (const payment of data.dropAdenaPayments ?? []) balance[payment.player] -= payment.adena;
  return balance;
}

export function validateData(data: AppData): string[] {
  const errors: string[] = [];
  if (!data || data.cp !== "ParabelluM") errors.push("Identificação da CP inválida.");
  if (JSON.stringify(data.players) !== JSON.stringify(PLAYERS)) errors.push("A lista fixa de jogadores foi alterada.");
  data.cycles?.forEach((c, i) => {
    if (!c.item.trim()) errors.push(`Item ${i + 1} sem nome.`);
    if (!Number.isSafeInteger(c.value) || c.value <= 0) errors.push(`Valor inválido no item ${c.item}.`);
    if (c.recipients.length !== PLAYERS.length || new Set(c.recipients.map(r => r.player)).size !== PLAYERS.length) errors.push(`Turnos inconsistentes em ${c.item}.`);
    c.recipients.forEach(r => {
      r.contributions.forEach(x => {
        if (!Number.isSafeInteger(x.amount) || x.amount <= 0) errors.push(`Contribuição inválida de ${r.player}.`);
        if (!x.at) errors.push(`Contribuição de ${r.player} sem data.`);
      });
      (r.rewards ?? []).forEach(reward => {
        if (!Number.isSafeInteger(reward.amount) || reward.amount <= 0) errors.push(`Reward inválido de ${r.player}.`);
        if (!reward.at) errors.push(`Reward de ${r.player} sem data.`);
      });
      if (rewardTotal(r) > contributionTotal(r)) errors.push(`Rewards maiores que as contribuições de ${r.player}.`);
    });
    if (cycleFund(c) < 0) errors.push(`Caixa negativo em ${c.item}.`);
    const next = c.recipients.findIndex(r => !r.received);
    if (c.recipients.some((r, ix) => r.received && ix > next && next >= 0)) errors.push(`Ordem de recebimento quebrada em ${c.item}.`);
    if (!["active", "complete", "closed"].includes(c.status)) errors.push(`Status inválido em ${c.item}.`);
    if (c.status === "closed" && !c.closedAt) errors.push(`Rodada encerrada sem data em ${c.item}.`);
  });
  if ((data.cycles?.filter(c => c.status === "active").length ?? 0) > 1) errors.push("Existe mais de uma rodada ativa.");
  data.drops?.forEach(d => { if (!d.item.trim() || !Number.isSafeInteger(d.crystals) || d.crystals <= 0) errors.push("Drop com dados inválidos."); });
  const previousPayments: CrystalPayment[] = [];
  data.crystalPayments?.forEach(p => {
    if (!Number.isFinite(p.crystals) || p.crystals <= 0 || (!p.player && !Number.isSafeInteger(p.crystals)) || !p.at) errors.push("Distribuição de cristais inválida.");
    if (p.player && !PLAYERS.includes(p.player)) errors.push("Jogador inválido na entrega de cristais.");
    if (p.player) {
      const before = crystalLedger({...data, crystalPayments: previousPayments});
      if (p.crystals > before[p.player] + 0.0001) errors.push(`Entrega maior que o saldo a receber de ${p.player}.`);
    }
    previousPayments.push(p);
  });
  data.dropSales?.forEach(s => {
    if (!s.item.trim() || !Number.isSafeInteger(s.quantity) || s.quantity <= 0 || !Number.isSafeInteger(s.unitPrice) || s.unitPrice <= 0 || !s.at || !["listed", "sold"].includes(s.status) || (s.status === "sold" && !s.soldAt)) errors.push("Venda de drop com dados inválidos.");
  });
  const previousAdenaPayments: DropAdenaPayment[] = [];
  data.dropAdenaPayments?.forEach(p => {
    if (!PLAYERS.includes(p.player) || !Number.isSafeInteger(p.adena) || p.adena <= 0 || !p.at) errors.push("Entrega de Adena de drop inválida.");
    const before = dropAdenaLedger({...data, dropAdenaPayments: previousAdenaPayments});
    if (p.adena > before[p.player]) errors.push(`Entrega maior que a Adena a receber de ${p.player}.`);
    previousAdenaPayments.push(p);
  });
  return errors;
}
