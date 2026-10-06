/**
 * Exportação e importação de backup (arquivo .json).
 *
 * O backup contém as ordens de serviço e seus PDFs (em base64). O formato é
 * o mesmo de antes ("autocom-os-backup"), então arquivos gerados pela versão
 * offline antiga continuam podendo ser importados.
 *
 * Agora o backup é só uma cópia de segurança extra: os dados já ficam
 * na nuvem, por técnico.
 */

import { type OfflineOrder } from './db';
import { listOrders, getOrder, upsertOrder } from './orders';
import { getPdfBlob } from './files';

export const BACKUP_FORMAT = 'autocom-os-backup';
export const BACKUP_VERSION = 1;

interface BackupPdfEntry {
  orderId: string;
  base64: string;
  type: string;
}

export interface BackupFile {
  format: string;
  version: number;
  exportedAt: string;
  single?: boolean;
  orders: OfflineOrder[];
  pdfs: BackupPdfEntry[];
}

/** Converte um Blob em string base64 (sem o prefixo data:). */
export function blobToBase64(blob: Blob): Promise<string> {
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

/** Converte base64 de volta para Blob. */
function base64ToBlob(base64: string, type = 'application/pdf'): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type });
}

/** Monta o objeto de backup com todas as ordens + PDFs do técnico logado. */
export async function buildFullBackup(): Promise<BackupFile> {
  const orders = await listOrders(100000, { withSignature: true });
  const pdfs: BackupPdfEntry[] = [];
  for (const order of orders) {
    if (order.hasPdf) {
      const blob = await getPdfBlob(order.id);
      if (blob) {
        pdfs.push({
          orderId: order.id,
          base64: await blobToBase64(blob),
          type: blob.type || 'application/pdf',
        });
      }
    }
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    orders,
    pdfs,
  };
}

/** Gera um Blob JSON com o backup completo (para download). */
export async function exportAllData(): Promise<{ blob: Blob; count: number }> {
  const backup = await buildFullBackup();
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  return { blob, count: backup.orders.length };
}

/** Gera um Blob JSON com UMA ordem de serviço (e seu PDF, se houver). */
export async function exportSingleOrder(
  id: string
): Promise<{ blob: Blob; order: OfflineOrder } | null> {
  const order = await getOrder(id);
  if (!order) return null;
  const pdfs: BackupPdfEntry[] = [];
  if (order.hasPdf) {
    const blob = await getPdfBlob(id);
    if (blob) {
      pdfs.push({
        orderId: id,
        base64: await blobToBase64(blob),
        type: blob.type || 'application/pdf',
      });
    }
  }
  const backup: BackupFile = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    single: true,
    orders: [order],
    pdfs,
  };
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  return { blob, order };
}

export interface ImportResult {
  ordersImported: number;
  pdfsImported: number;
  skipped: number;
}

/**
 * Importa um arquivo de backup para a conta do técnico logado, fazendo
 * UPSERT por id. Nunca apaga ordens existentes.
 */
export async function importData(file: File): Promise<ImportResult> {
  const text = await file.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Arquivo inválido: não é um backup válido');
  }

  if (!parsed || parsed.format !== BACKUP_FORMAT || !Array.isArray(parsed.orders)) {
    throw new Error('Arquivo inválido: formato de backup não reconhecido');
  }

  const pdfByOrder = new Map<string, BackupPdfEntry>();
  if (Array.isArray(parsed.pdfs)) {
    for (const pdf of parsed.pdfs as BackupPdfEntry[]) {
      if (pdf?.orderId && pdf?.base64) pdfByOrder.set(pdf.orderId, pdf);
    }
  }

  let ordersImported = 0;
  let pdfsImported = 0;
  let skipped = 0;

  for (const rawOrder of parsed.orders as OfflineOrder[]) {
    if (!rawOrder || !rawOrder.id) {
      skipped++;
      continue;
    }
    const now = new Date().toISOString();
    const order: OfflineOrder = {
      ...rawOrder,
      selectedServices: rawOrder.selectedServices ?? '[]',
      status: rawOrder.status ?? 'finalizado',
      createdAt: rawOrder.createdAt ?? now,
      updatedAt: rawOrder.updatedAt ?? now,
    };

    let blob: Blob | null = null;
    const pdf = pdfByOrder.get(order.id);
    if (pdf) {
      try {
        blob = base64ToBlob(pdf.base64, pdf.type || 'application/pdf');
      } catch (err) {
        console.error('PDF inválido na ordem', order.id, err);
      }
    }

    try {
      await upsertOrder(order, blob);
      ordersImported++;
      if (blob) pdfsImported++;
    } catch (err) {
      console.error('Erro ao importar a ordem', order.id, err);
      skipped++;
    }
  }

  return { ordersImported, pdfsImported, skipped };
}
