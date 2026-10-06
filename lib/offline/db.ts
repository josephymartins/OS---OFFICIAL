/**
 * Tipos compartilhados das ordens de serviço.
 * Os dados agora ficam na nuvem (Neon/PostgreSQL), acessados pelas rotas /api.
 * O nome do arquivo foi mantido para não quebrar os imports existentes.
 */

/** Registro de uma ordem de serviço. */
export interface OfflineOrder {
  id: string;
  clientName?: string | null;
  clientCpf?: string | null;
  clientFantasia?: string | null;
  clientCnpj?: string | null;
  clientEndereco?: string | null;
  clientCidade?: string | null;
  clientCep?: string | null;
  clientTelefone?: string | null;
  clientEmail?: string | null;
  numeroOs?: string | null;
  equipamento?: string | null;
  tecnico?: string | null;
  problemaInformado?: string | null;
  selectedServices: string; // JSON stringified array
  observacoes?: string | null;
  dataAtendimento?: string | null;
  horaEntrada?: string | null;
  horaSaida?: string | null;
  responsavel?: string | null;
  signatureData?: string | null;
  hasPdf?: boolean;
  archived?: boolean;
  status: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

/** Gera um id único simples (mantido por compatibilidade). */
export function generateId(): string {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `os_${Date.now().toString(36)}_${rnd}`;
}
