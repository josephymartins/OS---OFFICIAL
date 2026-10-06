/**
 * CRUD de Ordens de Serviço no Supabase (Postgres).
 * Cada técnico enxerga apenas as próprias ordens (RLS por user_id).
 */

import { getSupabase, requireUserId } from '@/lib/supabase';
import {
  TABLE_ORDERS,
  generateId,
  orderToRow,
  rowToOrder,
  type OfflineOrder,
  type OrderRow,
} from './db';
import { savePdf, deletePdf } from './files';

export interface CreateOrderInput {
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
  selectedServices?: string;
  observacoes?: string | null;
  dataAtendimento?: string | null;
  horaEntrada?: string | null;
  horaSaida?: string | null;
  responsavel?: string | null;
  signatureData?: string | null;
  status?: string;
  pdfBlob?: Blob | null;
}

/** Colunas da listagem (sem a assinatura, que é pesada). */
const LIST_COLUMNS =
  'id,client_name,client_cpf,client_fantasia,client_cnpj,client_endereco,client_cidade,client_cep,client_telefone,client_email,numero_os,equipamento,tecnico,problema_informado,selected_services,observacoes,data_atendimento,hora_entrada,hora_saida,responsavel,has_pdf,archived,status,created_at,updated_at';

const PAGE_SIZE = 1000; // limite padrão do PostgREST

/**
 * Cria uma nova ordem. Se pdfBlob for fornecido, envia o PDF também.
 * Se só o envio do PDF falhar, a ordem é salva mesmo assim (hasPdf = false).
 */
export async function createOrder(input: CreateOrderInput): Promise<OfflineOrder> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const id = generateId();

  let hasPdf = false;
  if (input.pdfBlob) {
    try {
      await savePdf(id, input.pdfBlob);
      hasPdf = true;
    } catch (err) {
      console.error('Erro ao enviar o PDF da ordem:', err);
    }
  }

  const order: OfflineOrder = {
    id,
    clientName: input.clientName ?? null,
    clientCpf: input.clientCpf ?? null,
    clientFantasia: input.clientFantasia ?? null,
    clientCnpj: input.clientCnpj ?? null,
    clientEndereco: input.clientEndereco ?? null,
    clientCidade: input.clientCidade ?? null,
    clientCep: input.clientCep ?? null,
    clientTelefone: input.clientTelefone ?? null,
    clientEmail: input.clientEmail ?? null,
    numeroOs: input.numeroOs ?? null,
    equipamento: input.equipamento ?? null,
    tecnico: input.tecnico ?? null,
    problemaInformado: input.problemaInformado ?? null,
    selectedServices: input.selectedServices ?? '[]',
    observacoes: input.observacoes ?? null,
    dataAtendimento: input.dataAtendimento ?? null,
    horaEntrada: input.horaEntrada ?? null,
    horaSaida: input.horaSaida ?? null,
    responsavel: input.responsavel ?? null,
    signatureData: input.signatureData ?? null,
    hasPdf,
    archived: false,
    status: input.status ?? 'finalizado',
    createdAt: now,
    updatedAt: now,
  };

  const { error } = await supabase.from(TABLE_ORDERS).insert(orderToRow(order));
  if (error) {
    if (hasPdf) await deletePdf(id).catch(() => {});
    throw error;
  }
  return order;
}

/**
 * Insere ou atualiza (por id) uma ordem já existente, preservando datas.
 * Usado pelo import de backup e pela migração dos dados do aparelho.
 */
export async function upsertOrder(
  order: OfflineOrder,
  pdfBlob?: Blob | null
): Promise<void> {
  const supabase = getSupabase();
  const userId = await requireUserId();

  let hasPdf = !!order.hasPdf;
  if (pdfBlob) {
    await savePdf(order.id, pdfBlob);
    hasPdf = true;
  }

  const row = {
    ...orderToRow({ ...order, hasPdf, archived: !!order.archived }),
    user_id: userId,
  };
  const { error } = await supabase.from(TABLE_ORDERS).upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

/**
 * Lista as ordens do técnico logado (mais recentes primeiro).
 * Por padrão não traz a assinatura; passe withSignature para o backup.
 */
export async function listOrders(
  limit = 200,
  opts?: { withSignature?: boolean }
): Promise<OfflineOrder[]> {
  const supabase = getSupabase();
  const columns = opts?.withSignature ? `${LIST_COLUMNS},signature_data` : LIST_COLUMNS;
  const result: OfflineOrder[] = [];

  for (let from = 0; from < limit; from += PAGE_SIZE) {
    const to = Math.min(from + PAGE_SIZE, limit) - 1;
    const { data, error } = await supabase
      .from(TABLE_ORDERS)
      .select(columns)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    const rows = (data ?? []) as unknown as OrderRow[];
    result.push(...rows.map(rowToOrder));
    if (rows.length < to - from + 1) break;
  }
  return result;
}

/** Busca uma ordem pelo id (com assinatura). */
export async function getOrder(id: string): Promise<OfflineOrder | undefined> {
  const { data, error } = await getSupabase()
    .from(TABLE_ORDERS)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToOrder(data as OrderRow) : undefined;
}

/** Atualiza uma ordem existente. */
export async function updateOrder(
  id: string,
  patch: Partial<OfflineOrder>
): Promise<OfflineOrder | undefined> {
  const { id: _ignored, createdAt: _c, ...rest } = patch;
  const row = { ...orderToRow(rest), updated_at: new Date().toISOString() };
  const { data, error } = await getSupabase()
    .from(TABLE_ORDERS)
    .update(row)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data ? rowToOrder(data as OrderRow) : undefined;
}

/** Arquiva (ou desarquiva) uma ordem, sem apagá-la. */
export async function setArchived(
  id: string,
  archived: boolean
): Promise<OfflineOrder | undefined> {
  return updateOrder(id, { archived });
}

/** Exclui uma ordem e o PDF associado. */
export async function deleteOrder(id: string): Promise<void> {
  const { error } = await getSupabase().from(TABLE_ORDERS).delete().eq('id', id);
  if (error) throw error;
  await deletePdf(id).catch(() => {});
}

/** Conta o número de serviços de uma ordem (a partir do JSON armazenado). */
export function countServices(selectedServices?: string): number {
  try {
    return JSON.parse(selectedServices ?? '[]')?.length ?? 0;
  } catch {
    return 0;
  }
}
