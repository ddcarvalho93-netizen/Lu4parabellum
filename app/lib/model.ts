export const PLAYERS = ["Ardranes", "Doidinha", "xFonseca", "Sooul", "DeusCriolo"] as const;
export type Player = (typeof PLAYERS)[number];
export type Contribution = { id: string; player: Player; amount: number; at: string; note: string };
export type GearRecipient = { player: Player; received: boolean; receivedAt?: string; contributions: Contribution[] };
export type GearCycle = { id: string; item: string; value: number; status: "active" | "complete"; recipients: GearRecipient[] };
export type DropEvent = { id: string; at: string; item: string; crystals: number; keeper: Player | null; note: string };
export type CrystalPayment = { id: string; at: string; crystals: number; note: string };
export type AppData = { cp: string; players: readonly Player[]; cycles: GearCycle[]; drops: DropEvent[]; crystalPayments: CrystalPayment[] };

export const initialData: AppData = {
  cp: "ParabelluM", players: PLAYERS,
  cycles: [{
    id: "cycle-1", item: "Set Manticore", value: 500000, status: "active",
    recipients: PLAYERS.map((player) => ({ player, received: false, contributions: [] })),
  }],
  drops: [], crystalPayments: [],
};

export function adena(n: number) { return new Intl.NumberFormat("pt-BR").format(Math.round(n)); }
export function contributionTotal(r: GearRecipient) { return r.contributions.reduce((s, c) => s + c.amount, 0); }
export function recipientBalance(r: GearRecipient, value: number) { return contributionTotal(r) - (r.received ? value : 0); }
export function cycleFund(c: GearCycle) { return c.recipients.reduce((s, r) => s + contributionTotal(r), 0) - c.recipients.filter(r => r.received).length * c.value; }

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

export function validateData(data: AppData): string[] {
  const errors: string[] = [];
  if (!data || data.cp !== "ParabelluM") errors.push("Identificação da CP inválida.");
  if (JSON.stringify(data.players) !== JSON.stringify(PLAYERS)) errors.push("A lista fixa de jogadores foi alterada.");
  data.cycles?.forEach((c, i) => {
    if (!c.item.trim()) errors.push(`Item ${i + 1} sem nome.`);
    if (!Number.isSafeInteger(c.value) || c.value <= 0) errors.push(`Valor inválido no item ${c.item}.`);
    if (c.recipients.length !== PLAYERS.length || new Set(c.recipients.map(r => r.player)).size !== PLAYERS.length) errors.push(`Turnos inconsistentes em ${c.item}.`);
    c.recipients.forEach(r => r.contributions.forEach(x => {
      if (!Number.isSafeInteger(x.amount) || x.amount <= 0) errors.push(`Contribuição inválida de ${r.player}.`);
      if (!x.at) errors.push(`Contribuição de ${r.player} sem data.`);
    }));
    const next = c.recipients.findIndex(r => !r.received);
    if (c.recipients.some((r, ix) => r.received && ix > next && next >= 0)) errors.push(`Ordem de recebimento quebrada em ${c.item}.`);
  });
  data.drops?.forEach(d => { if (!d.item.trim() || !Number.isSafeInteger(d.crystals) || d.crystals <= 0) errors.push("Drop com dados inválidos."); });
  data.crystalPayments?.forEach(p => { if (!Number.isSafeInteger(p.crystals) || p.crystals <= 0) errors.push("Distribuição de cristais inválida."); });
  return errors;
}
