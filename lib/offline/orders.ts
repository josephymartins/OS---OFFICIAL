/**
 * CRUD de Ordens de Serviço via API (dados na nuvem, separados por usuário).
 * Mantém as mesmas funções exportadas da versão offline.
 */

import type { OfflineOrder } from './db';
import { savePdf } from './files';
import { api, readJson } from './api';

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
  detalhesSistema?: string | null;
  contrato?: string | null;
  pagamento?: string | null;
  backupMidiaExterna?: boolean;
  backupNuvem?: boolean;
  backupEmail?: string | null;
  backupSenha?: string | null;
  pdfFileName?: string | null;
  dataAtendimento?: string | null;
  horaEntrada?: string | null;
  horaSaida?: string | null;
  responsavel?: string | null;
  signatureData?: string | null;
  status?: string;
  pdfBlob?: Blob | null;
}

/** Cria uma nova ordem. Se pdfBlob for fornecido, envia o PDF também. */
export async function createOrder(input: CreateOrderInput): Promise<OfflineOrder> {
  const { pdfBlob, ...fields } = input;
  const res = await api('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  const order = await readJson<OfflineOrder>(res, 'Não foi possível salvar a ordem de serviço');

  if (pdfBlob) {
    await savePdf(order.id, pdfBlob);
    order.hasPdf = true;
  }
  return order;
}

/** Lista as ordens do usuário (mais recentes primeiro). */
export async function listOrders(
  limit = 200,
  opts?: { all?: boolean }
): Promise<OfflineOrder[]> {
  const res = await api(`/api/orders?limit=${limit}${opts?.all ? '&scope=all' : ''}`);
  return readJson<OfflineOrder[]>(res, 'Não foi possível carregar as ordens');
}

/** Busca uma ordem pelo id. */
export async function getOrder(id: string): Promise<OfflineOrder | undefined> {
  const res = await api(`/api/orders/${encodeURIComponent(id)}`);
  if (res.status === 404) return undefined;
  return readJson<OfflineOrder>(res, 'Não foi possível carregar a ordem');
}

/** Atualiza uma ordem existente. */
export async function updateOrder(
  id: string,
  patch: Partial<OfflineOrder>
): Promise<OfflineOrder | undefined> {
  const res = await api(`/api/orders/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (res.status === 404) return undefined;
  return readJson<OfflineOrder>(res, 'Não foi possível atualizar a ordem');
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
  const res = await api(`/api/orders/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Não foi possível excluir a ordem');
}

/** Conta o número de serviços de uma ordem (a partir do JSON armazenado). */
export function countServices(selectedServices?: string): number {
  try {
    return JSON.parse(selectedServices ?? '[]')?.length ?? 0;
  } catch {
    return 0;
  }
}
