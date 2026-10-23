/** Duplicar OS: transforma uma OS salva nos dados iniciais de uma OS nova. */
import type { OfflineOrder } from '@/lib/offline/db';

export interface DuplicatePrefill {
  /** Mesmo formato que o leitor de PDF devolve (usado pela tela de finalizar e pelo PDF). */
  extractedData: Record<string, string>;
  responsavel: string;
  pdfFileName: string | null;
  /** Texto curto para o aviso: "CLIENTE (dd/mm/aaaa)". */
  sourceLabel: string;
}

export function orderToPrefill(o: OfflineOrder): DuplicatePrefill {
  const v = (x?: string | null) => x ?? '';
  return {
    extractedData: {
      nome_cliente: v(o.clientName),
      cpf_cliente: v(o.clientCpf),
      fantasia: v(o.clientFantasia),
      cnpj: v(o.clientCnpj),
      endereco_cliente: v(o.clientEndereco),
      cidade_cliente: v(o.clientCidade),
      cep: v(o.clientCep),
      telefone_cliente: v(o.clientTelefone),
      email_cliente: v(o.clientEmail),
      numero_os: v(o.numeroOs),
      equipamento: v(o.equipamento),
      tecnico: v(o.tecnico),
      problema_informado: v(o.problemaInformado),
      detalhes_sistema: v(o.detalhesSistema),
      contrato: v(o.contrato),
      pagamento: v(o.pagamento),
    },
    responsavel: v(o.responsavel),
    pdfFileName: o.pdfFileName ?? null,
    sourceLabel: [o.clientName || o.clientFantasia || 'cliente', o.dataAtendimento ? `(${o.dataAtendimento})` : '']
      .filter(Boolean)
      .join(' '),
  };
}

export function servicesOf(o: OfflineOrder): string[] {
  try {
    const arr = JSON.parse(o.selectedServices ?? '[]');
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}
