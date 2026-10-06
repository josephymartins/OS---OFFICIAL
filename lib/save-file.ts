/**
 * Entrega um arquivo ao usuário.
 * No iPhone (principalmente no app da tela inicial) o download comum não
 * funciona bem, então tenta primeiro a folha de compartilhar do sistema
 * (Salvar em Arquivos, WhatsApp, e-mail, AirDrop...). Se não houver, baixa.
 * IMPORTANTE: chame direto de um clique (sem esperas antes), senão o iOS recusa.
 */
export async function saveOrShareFile(
  blob: Blob,
  fileName: string
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
  };
  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: fileName });
      return 'shared';
    } catch (err: any) {
      if (err?.name === 'AbortError') return 'cancelled';
      // qualquer outro erro: cai para o download comum
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return 'downloaded';
}
