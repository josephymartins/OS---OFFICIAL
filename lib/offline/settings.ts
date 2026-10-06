/** Configurações por usuário (chave/valor), guardadas na nuvem. */

import { api } from './api';

const settingUrl = (key: string) => `/api/settings/${encodeURIComponent(key)}`;

export async function getSetting<T = any>(key: string): Promise<T | undefined> {
  const res = await api(settingUrl(key));
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error('Não foi possível carregar a configuração');
  const data = (await res.json()) as { value: T };
  return data.value ?? undefined;
}

export async function setSetting<T = any>(key: string, value: T): Promise<void> {
  const res = await api(settingUrl(key), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error('Não foi possível salvar a configuração');
}

export async function deleteSetting(key: string): Promise<void> {
  await api(settingUrl(key), { method: 'DELETE' });
}
