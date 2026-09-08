/**
 * Configurações e metadados locais (IndexedDB).
 * Uso genérico chave/valor para preferências do app offline.
 */

import { getDb, STORE_SETTINGS } from './db';

export async function getSetting<T = any>(key: string): Promise<T | undefined> {
  const db = await getDb();
  const record = (await db.get(STORE_SETTINGS, key)) as { key: string; value: T } | undefined;
  return record?.value;
}

export async function setSetting<T = any>(key: string, value: T): Promise<void> {
  const db = await getDb();
  await db.put(STORE_SETTINGS, { key, value });
}

export async function deleteSetting(key: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_SETTINGS, key);
}
