/**
 * PDFs gerados, guardados no Supabase Storage (bucket privado "os-pdfs").
 * Caminho: <id-do-usuario>/<id-da-ordem>.pdf — as políticas do bucket só
 * permitem acesso à pasta do próprio usuário.
 */

import { getSupabase, requireUserId } from '@/lib/supabase';
import { PDF_BUCKET } from './db';

async function pdfPath(orderId: string): Promise<string> {
  const userId = await requireUserId();
  return `${userId}/${orderId}.pdf`;
}

/** Salva (ou substitui) o PDF de uma ordem. */
export async function savePdf(orderId: string, blob: Blob): Promise<void> {
  const path = await pdfPath(orderId);
  const { error } = await getSupabase()
    .storage.from(PDF_BUCKET)
    .upload(path, blob, { upsert: true, contentType: 'application/pdf' });
  if (error) throw error;
}

/** Recupera o Blob do PDF de uma ordem (ou null se não existir). */
export async function getPdfBlob(orderId: string): Promise<Blob | null> {
  const path = await pdfPath(orderId);
  const { data, error } = await getSupabase().storage.from(PDF_BUCKET).download(path);
  if (error || !data) return null;
  return data;
}

/** Cria uma object URL temporária para o PDF de uma ordem. */
export async function getPdfObjectUrl(orderId: string): Promise<string | null> {
  const blob = await getPdfBlob(orderId);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

/** Remove o PDF de uma ordem. */
export async function deletePdf(orderId: string): Promise<void> {
  const path = await pdfPath(orderId);
  const { error } = await getSupabase().storage.from(PDF_BUCKET).remove([path]);
  if (error) throw error;
}
