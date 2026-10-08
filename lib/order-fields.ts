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
  const { userId, pdf, createdAt, updatedAt, ...rest } = order;
  return {
    ...rest,
    hasPdf: !!pdf,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

export const withPdfFlag = { pdf: { select: { orderId: true } } } as const;
