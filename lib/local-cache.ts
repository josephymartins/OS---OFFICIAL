/** Cópia local (no aparelho) de dados do usuário, para uso sem internet. */
const PREFIX = 'autocom_cache_';

export function readCache<T>(key: string): T | undefined {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
}

export function writeCache<T>(key: string, value: T | null | undefined): void {
  try {
    if (value === null || value === undefined) window.localStorage.removeItem(PREFIX + key);
    else window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* armazenamento indisponível: segue sem cópia */
  }
}
