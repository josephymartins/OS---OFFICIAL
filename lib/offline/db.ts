/**
 * Tipos e utilitários compartilhados da camada de dados.
 *
 * Os dados agora ficam no Supabase (Postgres + Storage), com login por
 * técnico. O nome da pasta "offline" foi mantido para não alterar os imports
 * das telas. O antigo IndexedDB só é lido por lib/offline/legacy.ts, para
 * enviar à nuvem os dados que já estavam salvos no aparelho.
 */

export const TABLE_ORDERS = 'orders';
export const PDF_BUCKET = 'os-pdfs';

/** Registro de uma ordem de serviço (formato usado pelas telas). */
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
  selectedServices: string; // JSON stringified array (igual ao schema antigo)
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

/** Linha da tabela public.orders (snake_case). */
export interface OrderRow {
  id: string;
  user_id?: string;
  client_name: string | null;
  client_cpf: string | null;
  client_fantasia: string | null;
  client_cnpj: string | null;
  client_endereco: string | null;
  client_cidade: string | null;
  client_cep: string | null;
  client_telefone: string | null;
  client_email: string | null;
  numero_os: string | null;
  equipamento: string | null;
  tecnico: string | null;
  problema_informado: string | null;
  selected_services: string;
  observacoes: string | null;
  data_atendimento: string | null;
  hora_entrada: string | null;
  hora_saida: string | null;
  responsavel: string | null;
  signature_data: string | null;
  has_pdf: boolean;
  archived: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export function rowToOrder(r: OrderRow): OfflineOrder {
  return {
    id: r.id,
    clientName: r.client_name,
    clientCpf: r.client_cpf,
    clientFantasia: r.client_fantasia,
    clientCnpj: r.client_cnpj,
    clientEndereco: r.client_endereco,
    clientCidade: r.client_cidade,
    clientCep: r.client_cep,
    clientTelefone: r.client_telefone,
    clientEmail: r.client_email,
    numeroOs: r.numero_os,
    equipamento: r.equipamento,
    tecnico: r.tecnico,
    problemaInformado: r.problema_informado,
    selectedServices: r.selected_services ?? '[]',
    observacoes: r.observacoes,
    dataAtendimento: r.data_atendimento,
    horaEntrada: r.hora_entrada,
    horaSaida: r.hora_saida,
    responsavel: r.responsavel,
    signatureData: r.signature_data,
    hasPdf: r.has_pdf,
    archived: r.archived,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Converte (parcialmente) uma ordem para colunas do banco. Só inclui chaves presentes. */
export function orderToRow(o: Partial<OfflineOrder>): Partial<OrderRow> {
  const map: Array<[keyof OfflineOrder, keyof OrderRow]> = [
    ['id', 'id'],
    ['clientName', 'client_name'],
    ['clientCpf', 'client_cpf'],
    ['clientFantasia', 'client_fantasia'],
    ['clientCnpj', 'client_cnpj'],
    ['clientEndereco', 'client_endereco'],
    ['clientCidade', 'client_cidade'],
    ['clientCep', 'client_cep'],
    ['clientTelefone', 'client_telefone'],
    ['clientEmail', 'client_email'],
    ['numeroOs', 'numero_os'],
    ['equipamento', 'equipamento'],
    ['tecnico', 'tecnico'],
    ['problemaInformado', 'problema_informado'],
    ['selectedServices', 'selected_services'],
    ['observacoes', 'observacoes'],
    ['dataAtendimento', 'data_atendimento'],
    ['horaEntrada', 'hora_entrada'],
    ['horaSaida', 'hora_saida'],
    ['responsavel', 'responsavel'],
    ['signatureData', 'signature_data'],
    ['hasPdf', 'has_pdf'],
    ['archived', 'archived'],
    ['status', 'status'],
    ['createdAt', 'created_at'],
    ['updatedAt', 'updated_at'],
  ];
  const row: Record<string, unknown> = {};
  for (const [k, col] of map) {
    if (o[k] !== undefined) row[col as string] = o[k];
  }
  return row as Partial<OrderRow>;
}

/** Gera um id único simples (mesmo formato de antes, para o import casar por id). */
export function generateId(): string {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `os_${Date.now().toString(36)}_${rnd}`;
}
