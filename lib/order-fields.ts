/** Campos de uma OS que o cliente pode gravar. */
export const ORDER_FIELDS = [
  'clientName',
  'clientCpf',
  'clientFantasia',
  'clientCnpj',
  'clientEndereco',
  'clientCidade',
  'clientCep',
  'clientTelefone',
  'clientEmail',
  'numeroOs',
  'equipamento',
  'tecnico',
  'problemaInformado',
  'selectedServices',
  'observacoes',
  'detalhesSistema',
  'contrato',
  'pagamento',
  'backupMidiaExterna',
  'backupNuvem',
  'backupEmail',
  'backupSenha',
  'pdfFileName',
  'dataAtendimento',
  'horaEntrada',
  'horaSaida',
  'responsavel',
  'signatureData',
  'status',
  'archived',
] as const;

export function pickOrderFields(body: Record<string, any>) {
  const data: Record<string, any> = {};
  for (const key of ORDER_FIELDS) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (data.archived !== undefined) data.archived = !!data.archived;
  if (data.backupMidiaExterna !== undefined) data.backupMidiaExterna = !!data.backupMidiaExterna;
  if (data.backupNuvem !== undefined) data.backupNuvem = !!data.backupNuvem;
  return data;
}

/** Converte o registro do banco para o formato OfflineOrder usado pelo app. */
export function serializeOrder(order: any) {
  const { userId, pdf, user, createdAt, updatedAt, ...rest } = order;
  return {
    ...rest,
    ownerId: userId,
    ownerName: user ? user.name || user.email : undefined,
    hasPdf: !!pdf,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

export const withPdfFlag = { pdf: { select: { orderId: true } } } as const;

/** Igual a withPdfFlag, trazendo também o nome do técnico (visão do admin). */
export const withPdfAndOwner = {
  pdf: { select: { orderId: true } },
  user: { select: { name: true, email: true } },
} as const;
