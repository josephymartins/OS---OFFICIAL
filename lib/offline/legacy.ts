/**
 * Leitura do IndexedDB ANTIGO (banco "autocom_os_offline"), usado antes da
 * migração para o Supabase. Serve só para enviar à nuvem os dados que já
 * estavam salvos neste aparelho. Os dados locais NÃO são apagados.
 */

import { openDB } from 'idb';
import type { OfflineOrder } from './db';
import { upsertOrder } from './orders';

const LEGACY_DB_NAME = 'autocom_os_offline';
const MIGRATED_FLAG = 'autocom_os_legacy_migrated';

interface LegacyPdfRecord {
  orderId: string;
  blob: Blob;
}

/** Abre o banco antigo sem criá-lo se ele não existir neste aparelho. */
async function openLegacyDb() {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return null;
  try {
    return await openDB(LEGACY_DB_NAME, 1, {
      upgrade(_db, oldVersion, _newVersion, tx) {
        // oldVersion 0 = o banco não existia: cancela para não criar um vazio.
        if (oldVersion === 0) tx.abort();
      },
    });
  } catch {
    return null;
  }
}

/** True se a migração já foi feita neste aparelho. */
export function isLegacyMigrated(): boolean {
  try {
    return window.localStorage.getItem(MIGRATED_FLAG) !== null;
  } catch {
    return false;
  }
}

/** Quantas ordens antigas existem neste aparelho (0 se nenhuma). */
export async function countLegacyOrders(): Promise<number> {
  const db = await openLegacyDb();
  if (!db) return 0;
  try {
    if (!db.objectStoreNames.contains('orders')) return 0;
    return await db.count('orders');
  } catch {
    return 0;
  } finally {
    db.close();
  }
}

export interface MigrationResult {
  total: number;
  migrated: number;
  failed: number;
}

/** Envia todas as ordens (e PDFs) do IndexedDB antigo para o Supabase. */
export async function migrateLegacyToCloud(
  onProgress?: (done: number, total: number) => void
): Promise<MigrationResult> {
  const db = await openLegacyDb();
  if (!db) return { total: 0, migrated: 0, failed: 0 };

  try {
    const orders = (await db.getAll('orders')) as OfflineOrder[];
    const total = orders.length;
    let migrated = 0;
    let failed = 0;

    for (const raw of orders) {
      if (!raw?.id) {
        failed++;
        continue;
      }
      try {
        let blob: Blob | null = null;
        if (db.objectStoreNames.contains('pdfs')) {
          const rec = (await db.get('pdfs', raw.id)) as LegacyPdfRecord | undefined;
          blob = rec?.blob ?? null;
        }
        const now = new Date().toISOString();
        await upsertOrder(
          {
            ...raw,
            selectedServices: raw.selectedServices ?? '[]',
            status: raw.status ?? 'finalizado',
            createdAt: raw.createdAt ?? now,
            updatedAt: raw.updatedAt ?? now,
          },
          blob
        );
        migrated++;
      } catch (err) {
        console.error('Falha ao migrar a ordem', raw.id, err);
        failed++;
      }
      onProgress?.(migrated + failed, total);
    }

    // Só marca como concluída se tudo foi enviado; se algo falhou, dá para tentar de novo.
    if (failed === 0) {
      try {
        window.localStorage.setItem(MIGRATED_FLAG, new Date().toISOString());
      } catch {
        /* ignora */
      }
    }
    return { total, migrated, failed };
  } finally {
    db.close();
  }
}
