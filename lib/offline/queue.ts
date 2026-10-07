/**
 * Fila de envio das ordens de serviço.
 * Sem internet, a OS (e o PDF) ficam guardados no aparelho e são enviadas
 * sozinhas quando o sinal voltar. O envio usa /api/orders/import, que grava
 * pelo id da OS, então repetir o envio nunca duplica a ordem.
 */

import { openDB, type IDBPDatabase } from 'idb';
import { generateId } from './db';
import type { CreateOrderInput } from './orders';

const DB_NAME = 'autocom_os_pending';
const STORE = 'pending';
const UID_KEY = 'autocom_uid';
const CHANGED_EVENT = 'os-queue-changed';

interface PendingRecord {
  id: string;
  order: Record<string, any>;
  pdfBlob: Blob | null;
  ownerId: string | null;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getQueueDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

function notifyChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGED_EVENT));
}

function getLocalUid(): string | null {
  try {
    return localStorage.getItem(UID_KEY);
  } catch {
    return null;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Envia uma ordem (e o PDF) ao servidor. Lança erro se não conseguir. */
async function sendOrder(order: Record<string, any>, pdfBlob: Blob | null): Promise<void> {
  const pdfBase64 = pdfBlob ? await blobToBase64(pdfBlob) : undefined;
  const res = await fetch('/api/orders/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify({ order, pdfBase64 }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

/** Descobre (e lembra) quem está logado. Retorna null sem internet ou sem login. */
async function rememberUser(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/session', { cache: 'no-store', credentials: 'same-origin' });
    if (!res.ok) return null;
    const data = await res.json();
    const uid = (data?.user?.id as string | undefined) ?? null;
    if (uid) {
      try {
        localStorage.setItem(UID_KEY, uid);
      } catch {
        /* ignora */
      }
    }
    return uid;
  } catch {
    return null;
  }
}

/**
 * Salva a OS: envia agora se houver internet; senão guarda no aparelho.
 * Retorna queued=true quando ficou guardada para envio posterior.
 */
export async function saveOrderWithQueue(
  input: CreateOrderInput
): Promise<{ queued: boolean; id: string }> {
  const { pdfBlob = null, ...fields } = input;
  const id = generateId();
  const createdAt = new Date().toISOString();
  const order: Record<string, any> = {
    ...fields,
    id,
    selectedServices: fields.selectedServices ?? '[]',
    status: fields.status ?? 'finalizado',
    createdAt,
  };

  let lastError = 'sem conexão';
  if (typeof navigator === 'undefined' || navigator.onLine !== false) {
    try {
      await sendOrder(order, pdfBlob);
      return { queued: false, id };
    } catch (err: any) {
      lastError = String(err?.message ?? err);
    }
  }

  const db = await getQueueDb();
  const record: PendingRecord = {
    id,
    order,
    pdfBlob,
    ownerId: getLocalUid(),
    createdAt,
    attempts: 1,
    lastError,
  };
  await db.put(STORE, record);
  notifyChanged();
  return { queued: true, id };
}

/** Quantas OS do usuário atual estão esperando envio. */
export async function countPending(): Promise<number> {
  const db = await getQueueDb();
  const all = (await db.getAll(STORE)) as PendingRecord[];
  const uid = getLocalUid();
  return all.filter((r) => !r.ownerId || !uid || r.ownerId === uid).length;
}

let syncing = false;

/** Tenta enviar as OS pendentes. Seguro para chamar várias vezes. */
export async function syncPending(): Promise<{ sent: number; remaining: number }> {
  let sent = 0;
  if (syncing) return { sent, remaining: await countPending().catch(() => 0) };
  syncing = true;
  try {
    const uid = await rememberUser();
    if (uid) {
      const db = await getQueueDb();
      const all = (await db.getAll(STORE)) as PendingRecord[];
      for (const rec of all) {
        if (rec.ownerId && rec.ownerId !== uid) continue;
        try {
          await sendOrder(rec.order, rec.pdfBlob);
          await db.delete(STORE, rec.id);
          sent++;
        } catch (err: any) {
          await db.put(STORE, {
            ...rec,
            attempts: rec.attempts + 1,
            lastError: String(err?.message ?? err),
          });
        }
      }
    }
  } catch (err) {
    console.error('Erro ao sincronizar a fila:', err);
  } finally {
    syncing = false;
    notifyChanged();
  }
  return { sent, remaining: await countPending().catch(() => 0) };
}
