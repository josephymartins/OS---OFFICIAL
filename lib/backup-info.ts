/** Marcação de backup do banco de dados do cliente (Serviço Executado). */
export interface BackupInfo {
  midiaExterna: boolean;
  nuvem: boolean;
  email: string;
  senha: string;
}

export const EMPTY_BACKUP: BackupInfo = { midiaExterna: false, nuvem: false, email: '', senha: '' };

/** Lê os campos salvos de uma OS. */
export function backupFromOrder(o: any): BackupInfo {
  return {
    midiaExterna: !!o?.backupMidiaExterna,
    nuvem: !!o?.backupNuvem,
    email: o?.backupEmail ?? '',
    senha: o?.backupSenha ?? '',
  };
}

/** Converte para os campos do banco (e-mail/senha só quando for nuvem). */
export function backupToFields(b: BackupInfo) {
  return {
    backupMidiaExterna: !!b.midiaExterna,
    backupNuvem: !!b.nuvem,
    backupEmail: b.nuvem ? b.email.trim() || null : null,
    backupSenha: b.nuvem ? b.senha || null : null,
  };
}

/** Mensagem de erro se faltar algo obrigatório; null se estiver ok. */
export function backupError(b: BackupInfo): string | null {
  if (b.nuvem && !b.email.trim()) return 'Backup em nuvem: informe o e-mail do drive';
  if (b.nuvem && !b.senha) return 'Backup em nuvem: informe a senha do drive';
  return null;
}

export function hasBackup(b?: BackupInfo | null): boolean {
  return !!b && (b.midiaExterna || b.nuvem);
}
