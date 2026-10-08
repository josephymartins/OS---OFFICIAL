/** Assinatura do técnico logado (configurações do usuário + cópia no aparelho para uso offline). */
import { getSetting, setSetting, deleteSetting } from '@/lib/offline/settings';
import { readCache, writeCache } from '@/lib/local-cache';

export const TECH_SIGNATURE_KEY = 'assinatura_tecnico';

const valid = (v: unknown): v is string => typeof v === 'string' && v.startsWith('data:image');

export async function getTechnicianSignature(): Promise<string | null> {
  try {
    const v = await getSetting<string>(TECH_SIGNATURE_KEY);
    const sig = valid(v) ? v : null;
    writeCache(TECH_SIGNATURE_KEY, sig);
    return sig;
  } catch {
    // sem internet: usa a cópia guardada no aparelho
    const c = readCache<string>(TECH_SIGNATURE_KEY);
    return valid(c) ? c : null;
  }
}

export async function saveTechnicianSignature(dataUrl: string): Promise<void> {
  await setSetting(TECH_SIGNATURE_KEY, dataUrl);
  writeCache(TECH_SIGNATURE_KEY, dataUrl);
}

export async function removeTechnicianSignature(): Promise<void> {
  await deleteSetting(TECH_SIGNATURE_KEY);
  writeCache(TECH_SIGNATURE_KEY, null);
}
