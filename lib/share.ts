/** Compartilhamento do PDF (WhatsApp e outros apps). */

/** Mensagem padrão para o cliente. */
export function whatsappMessage(o: { numeroOs?: string | null; clientName?: string | null }): string {
  const os = o.numeroOs ? ` nº ${o.numeroOs}` : '';
  const cli = o.clientName ? `, ${o.clientName}` : '';
  return `Olá${cli}! Segue a Ordem de Serviço${os} assinada. Qualquer dúvida, estamos à disposição. AUTOCOM Manhuaçu – 0800 591 3107`;
}

/** Telefone em formato internacional para wa.me (Brasil), ou '' se inválido. */
export function whatsappPhone(raw?: string | null): string {
  let d = (raw ?? '').replace(/\D/g, '');
  if (d.startsWith('0')) d = d.replace(/^0+/, '');
  if (d.length === 10 || d.length === 11) d = '55' + d;
  return d.length >= 12 && d.length <= 13 ? d : '';
}

/**
 * Envia o PDF: no celular abre a folha de compartilhar (escolha o WhatsApp);
 * sem suporte a arquivos (computador), baixa o PDF e abre o WhatsApp com a mensagem.
 * Chame direto de um toque do usuário (o iPhone exige).
 */
export async function sharePdfViaWhatsApp(
  blob: Blob,
  fileName: string,
  message: string,
  phone?: string | null
): Promise<'shared' | 'fallback' | 'cancelled'> {
  const file = new File([blob], fileName, { type: 'application/pdf' });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text: message, title: fileName });
      return 'shared';
    } catch (err: any) {
      if (err?.name === 'AbortError') return 'cancelled';
    }
  }
  // Fallback: baixa o arquivo e abre o WhatsApp (o PDF é anexado manualmente)
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  const p = whatsappPhone(phone);
  window.open(`https://wa.me/${p}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  return 'fallback';
}
