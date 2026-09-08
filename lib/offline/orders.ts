/**
 * CRUD de Ordens de Serviço usando IndexedDB (offline).
 * Substitui as rotas /api/save-order, /api/orders e /api/orders/[id]/pdf.
 */

import { getDb, generateId, STORE_ORDERS, type OfflineOrder } from './db';
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

/** Cria uma nova ordem localmente. Se pdfBlob for fornecido, guarda o PDF também. */
export async function createOrder(input: CreateOrderInput): Promise<OfflineOrder> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = generateId();

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
    hasPdf: !!input.pdfBlob,
    status: input.status ?? 'finalizado',
    createdAt: now,
    updatedAt: now,
  };

  await db.put(STORE_ORDERS, order);

  if (input.pdfBlob) {
    await savePdf(id, input.pdfBlob);
  }

  return order;
}

/** Lista as ordens (mais recentes primeiro). */
export async function listOrders(limit = 200): Promise<OfflineOrder[]> {
  const db = await getDb();
  const all = (await db.getAll(STORE_ORDERS)) as OfflineOrder[];
  return (all ?? [])
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, limit);
}

/** Busca uma ordem pelo id. */
export async function getOrder(id: string): Promise<OfflineOrder | undefined> {
  const db = await getDb();
  return (await db.get(STORE_ORDERS, id)) as OfflineOrder | undefined;
}

/** Atualiza uma ordem existente. */
export async function updateOrder(
  id: string,
  patch: Partial<OfflineOrder>
): Promise<OfflineOrder | undefined> {
  const db = await getDb();
  const existing = (await db.get(STORE_ORDERS, id)) as OfflineOrder | undefined;
  if (!existing) return undefined;
  const updated: OfflineOrder = {
    ...existing,
    ...patch,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  };
  await db.put(STORE_ORDERS, updated);
  return updated;
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
  const db = await getDb();
  await db.delete(STORE_ORDERS, id);
  await deletePdf(id);
}

/** Conta o número de serviços de uma ordem (a partir do JSON armazenado). */
export function countServices(selectedServices?: string): number {
  try {
    return JSON.parse(selectedServices ?? '[]')?.length ?? 0;
  } catch {
    return 0;
  }
}
