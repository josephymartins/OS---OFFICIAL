/** Assinatura do técnico logado (guardada nas configurações do usuário). */
import { getSetting, setSetting, deleteSetting } from '@/lib/offline/settings';

export const TECH_SIGNATURE_KEY = 'assinatura_tecnico';

export async function getTechnicianSignature(): Promise<string | null> {
  try {
    const v = await getSetting<string>(TECH_SIGNATURE_KEY);
    return typeof v === 'string' && v.startsWith('data:image') ? v : null;
  } catch {
    return null; // sem internet: gera o PDF sem a assinatura do técnico
  }
}

export const saveTechnicianSignature = (dataUrl: string) => setSetting(TECH_SIGNATURE_KEY, dataUrl);
export const removeTechnicianSignature = () => deleteSetting(TECH_SIGNATURE_KEY);
