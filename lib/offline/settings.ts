/**
 * Preferências locais do aparelho (localStorage).
 * Uso genérico chave/valor; não são dados das ordens de serviço.
 */

const PREFIX = 'autocom_os_';

export async function getSetting<T = any>(key: string): Promise<T | undefined> {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
}

export async function setSetting<T = any>(key: string, value: T): Promise<void> {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* armazenamento indisponível: ignora */
  }
}

export async function deleteSetting(key: string): Promise<void> {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignora */
  }
}
