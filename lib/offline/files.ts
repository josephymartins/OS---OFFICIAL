/** PDFs das ordens, guardados na nuvem e acessados via API. */

import { api } from './api';

const pdfUrl = (orderId: string) => `/api/orders/${encodeURIComponent(orderId)}/pdf`;

/** Salva (ou substitui) o PDF de uma ordem. */
export async function savePdf(orderId: string, blob: Blob): Promise<void> {
  const res = await api(pdfUrl(orderId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: blob,
  });
  if (!res.ok) throw new Error('A ordem foi salva, mas não foi possível enviar o PDF');
}

/** Recupera o Blob do PDF de uma ordem (ou null se não existir). */
export async function getPdfBlob(orderId: string): Promise<Blob | null> {
  const res = await api(pdfUrl(orderId));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Não foi possível carregar o PDF');
  return res.blob();
}

/** Cria uma object URL temporária para o PDF de uma ordem. */
export async function getPdfObjectUrl(orderId: string): Promise<string | null> {
  const blob = await getPdfBlob(orderId);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

/** Remove o PDF de uma ordem. */
export async function deletePdf(orderId: string): Promise<void> {
  await api(pdfUrl(orderId), { method: 'DELETE' });
}
