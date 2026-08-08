import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { appState, auditLog } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { initialData, normalizeInitialItem, validateData, type AppData } from "@/app/lib/model";

async function adminEmail() { return (globalThis as { process?: { env?: Record<string,string> } }).process?.env?.ADMIN_EMAIL?.toLowerCase() ?? ""; }
async function isAdmin() { const u = await getChatGPTUser(); const expected = await adminEmail(); return !!u && !!expected && u.email.toLowerCase() === expected; }

export async function GET() {
  try {
    const db = getDb();
    const [row] = await db.select().from(appState).where(eq(appState.id, 1));
    const history = await db.select({ id: auditLog.id, action: auditLog.action, actor: auditLog.actor, summary: auditLog.summary, createdAt: auditLog.createdAt }).from(auditLog).orderBy(desc(auditLog.id)).limit(40);
    const stored = row ? JSON.parse(row.payload) as AppData : initialData;
    return Response.json({ data: normalizeInitialItem(stored), version: row?.version ?? 0, history, admin: await isAdmin() });
  } catch {
    return Response.json({ data: initialData, version: 0, history: [], admin: await isAdmin(), setup: true });
  }
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!(await isAdmin()) || !user) return Response.json({ error: "Edição permitida somente ao administrador." }, { status: 403 });
  const body = await request.json() as { data: AppData; version: number; action: string; summary: string };
  const errors = validateData(body.data);
  if (errors.length) return Response.json({ error: errors.join(" ") }, { status: 400 });
  const db = getDb();
  const payload = JSON.stringify(body.data);
  const nextVersion = body.version + 1;
  if (body.version === 0) {
    await db.insert(appState).values({ id: 1, version: nextVersion, payload });
  } else {
    const result = await db.update(appState).set({ version: nextVersion, payload, updatedAt: new Date().toISOString() }).where(eq(appState.version, body.version));
    if (!result.meta.changes) return Response.json({ error: "Os dados mudaram em outra janela. Recarregue antes de salvar." }, { status: 409 });
  }
  await db.insert(auditLog).values({ version: nextVersion, actor: user.email, action: body.action.slice(0, 60), summary: body.summary.slice(0, 240), snapshot: payload });
  return Response.json({ ok: true, version: nextVersion });
}
