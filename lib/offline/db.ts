/**
 * Camada de banco de dados LOCAL (IndexedDB) via 'idb'.
 *
 * Substitui o PostgreSQL/Prisma para funcionamento 100% offline.
 * Todos os dados ficam armazenados no próprio dispositivo do usuário.
 *
 * Object stores:
 *  - orders   : ordens de serviço (equivalente ao model ServiceOrder do Prisma)
 *  - pdfs     : PDFs gerados, guardados como Blob (substitui o AWS S3)
 *  - settings : configurações e metadados diversos
 */

import { openDB, type IDBPDatabase } from 'idb';

export const DB_NAME = 'autocom_os_offline';
export const DB_VERSION = 1;

export const STORE_ORDERS = 'orders';
export const STORE_PDFS = 'pdfs';
export const STORE_SETTINGS = 'settings';

/** Registro de uma ordem de serviço armazenada localmente. */
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

let dbPromise: Promise<IDBPDatabase> | null = null;

/** Abre (ou cria) o banco IndexedDB. Seguro para chamar no browser apenas. */
export function getDb(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB só está disponível no navegador');
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_ORDERS)) {
          const store = db.createObjectStore(STORE_ORDERS, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains(STORE_PDFS)) {
          db.createObjectStore(STORE_PDFS, { keyPath: 'orderId' });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

/** Gera um id único simples (substitui o cuid() do Prisma). */
export function generateId(): string {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `os_${Date.now().toString(36)}_${rnd}`;
}
