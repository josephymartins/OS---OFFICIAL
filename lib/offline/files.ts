/**
 * Armazenamento de PDFs gerados no IndexedDB (substitui AWS S3).
 * Cada PDF é guardado como Blob associado ao id da ordem.
 */

import { getDb, STORE_PDFS } from './db';

interface PdfRecord {
  orderId: string;
  blob: Blob;
  createdAt: string;
}

/** Salva (ou substitui) o PDF de uma ordem. */
export async function savePdf(orderId: string, blob: Blob): Promise<void> {
  const db = await getDb();
  const record: PdfRecord = {
    orderId,
    blob,
    createdAt: new Date().toISOString(),
  };
  await db.put(STORE_PDFS, record);
}

/** Recupera o Blob do PDF de uma ordem (ou null se não existir). */
export async function getPdfBlob(orderId: string): Promise<Blob | null> {
  const db = await getDb();
  const record = (await db.get(STORE_PDFS, orderId)) as PdfRecord | undefined;
  return record?.blob ?? null;
}

/** Cria uma object URL temporária para o PDF de uma ordem. */
export async function getPdfObjectUrl(orderId: string): Promise<string | null> {
  const blob = await getPdfBlob(orderId);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

/** Remove o PDF de uma ordem. */
export async function deletePdf(orderId: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_PDFS, orderId);
}
