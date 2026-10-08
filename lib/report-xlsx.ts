/** Relatório das OS em Excel (.xlsx). A biblioteca só é carregada ao exportar. */
import type { OfflineOrder } from '@/lib/offline/db';
import { serviceLabel } from '@/lib/services-config';
import { orderDate } from '@/lib/periodo';

function services(o: OfflineOrder): string[] {
  try {
    const arr = JSON.parse(o.selectedServices ?? '[]');
    return Array.isArray(arr) ? arr.map((s: string) => serviceLabel(String(s))) : [];
  } catch {
    return [];
  }
}

export async function buildOrdersXlsx(
  orders: OfflineOrder[],
  info: { periodo: string; geradoPor?: string | null }
): Promise<Blob> {
  const mod: any = await import('exceljs');
  const ExcelJS = mod.default ?? mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'AUTOCOM OS';
  wb.created = new Date();

  const sorted = [...orders].sort(
    (a, b) => (orderDate(a)?.getTime() ?? 0) - (orderDate(b)?.getTime() ?? 0)
  );

  // ---------- Aba OS ----------
  const ws = wb.addWorksheet('Ordens de Serviço', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'Data', key: 'data', width: 12 },
    { header: 'Nº O.S.', key: 'os', width: 14 },
    { header: 'Cliente', key: 'cliente', width: 32 },
    { header: 'Fantasia', key: 'fantasia', width: 26 },
    { header: 'CPF/CNPJ', key: 'doc', width: 18 },
    { header: 'Cidade', key: 'cidade', width: 18 },
    { header: 'Técnico', key: 'tecnico', width: 22 },
    { header: 'Responsável', key: 'resp', width: 20 },
    { header: 'Entrada', key: 'entrada', width: 9 },
    { header: 'Saída', key: 'saida', width: 9 },
    { header: 'Qtde serviços', key: 'qtd', width: 10 },
    { header: 'Serviços executados', key: 'servicos', width: 60 },
    { header: 'Backup mídia externa', key: 'bmidia', width: 12 },
    { header: 'Backup nuvem', key: 'bnuvem', width: 10 },
    { header: 'E-mail do drive', key: 'bemail', width: 28 },
    { header: 'Observações', key: 'obs', width: 40 },
    { header: 'Status', key: 'status', width: 11 },
  ];

  for (const o of sorted) {
    const svc = services(o);
    const d = orderDate(o);
    ws.addRow({
      // data "pura" em UTC para o Excel não mudar o dia por causa do fuso
      data: d ? new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) : '',
      os: o.numeroOs ?? '',
      cliente: o.clientName ?? '',
      fantasia: o.clientFantasia ?? '',
      doc: o.clientCnpj || o.clientCpf || '',
      cidade: o.clientCidade ?? '',
      tecnico: o.ownerName || o.tecnico || '',
      resp: o.responsavel ?? '',
      entrada: o.horaEntrada ?? '',
      saida: o.horaSaida ?? '',
      qtd: svc.length,
      servicos: svc.join('\n'),
      bmidia: o.backupMidiaExterna ? 'Sim' : 'Não',
      bnuvem: o.backupNuvem ? 'Sim' : 'Não',
      bemail: o.backupNuvem ? o.backupEmail ?? '' : '',
      obs: o.observacoes ?? '',
      status: o.archived ? 'Arquivada' : o.status === 'finalizado' ? 'Finalizada' : o.status,
    });
  }

  const header = ws.getRow(1);
  header.height = 22;
  header.eachCell((c: any) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  ws.getColumn('data').numFmt = 'dd/mm/yyyy';
  ['servicos', 'obs', 'cliente', 'fantasia'].forEach((k) => {
    ws.getColumn(k).alignment = { wrapText: true, vertical: 'top' };
  });
  ws.eachRow((row: any, n: number) => {
    if (n === 1) return;
    row.alignment = { ...(row.alignment ?? {}), vertical: 'top' };
    if (n % 2 === 0) {
      row.eachCell({ includeEmpty: true }, (c: any) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F7FC' } };
      });
    }
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };

  // ---------- Aba Resumo ----------
  const rs = wb.addWorksheet('Resumo');
  rs.columns = [{ width: 30 }, { width: 14 }, { width: 16 }, { width: 14 }];
  rs.addRow(['Relatório de Ordens de Serviço – AUTOCOM']).font = { bold: true, size: 14 };
  rs.addRow([`Período: ${info.periodo}`]);
  rs.addRow([`Gerado em: ${new Date().toLocaleString('pt-BR')}${info.geradoPor ? ` por ${info.geradoPor}` : ''}`]);
  rs.addRow([]);
  const h = rs.addRow(['Técnico', 'Nº de OS', 'Serviços', 'Com backup']);
  h.eachCell((c: any) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } };
  });
  const byTech = new Map<string, { os: number; svc: number; bkp: number }>();
  for (const o of sorted) {
    const k = o.ownerName || o.tecnico || 'Sem técnico';
    const v = byTech.get(k) ?? { os: 0, svc: 0, bkp: 0 };
    v.os += 1;
    v.svc += services(o).length;
    if (o.backupMidiaExterna || o.backupNuvem) v.bkp += 1;
    byTech.set(k, v);
  }
  let tot = { os: 0, svc: 0, bkp: 0 };
  for (const [k, v] of [...byTech.entries()].sort((a, b) => b[1].os - a[1].os)) {
    rs.addRow([k, v.os, v.svc, v.bkp]);
    tot = { os: tot.os + v.os, svc: tot.svc + v.svc, bkp: tot.bkp + v.bkp };
  }
  const t = rs.addRow(['Total', tot.os, tot.svc, tot.bkp]);
  t.font = { bold: true };

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
