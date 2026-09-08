/**
 * Client-side PDF generation using jsPDF ONLY (no html2canvas).
 * Works entirely offline on any device including iPhone Safari.
 * Layout matches the AUTOCOM OS original PDF format.
 */

import jsPDF from 'jspdf';

export interface PdfGenerationData {
  selectedServices: string[];
  observacoes: string;
  signatureData: string | null;
  responsavel: string;
  dataAtendimento: string;
  horaEntrada: string;
  horaSaida: string;
  extractedData: any;
  uploadedFileName?: string;
}

const LM = 25;           // left margin
const RM = 25;           // right margin
const PW = 210;          // A4 width
const CW = PW - LM - RM; // content width = 160mm
const LW = 28;           // label col width in table rows
const RH = 5.5;          // default row height
const MY = 275;          // max Y before page break

function np(doc: jsPDF, y: number, need: number = 8): number {
  if (y + need > MY) { doc.addPage(); return 14; }
  return y;
}

function wrText(doc: jsPDF, text: string, x: number, y: number, w: number, lh: number): number {
  if (!text) return y;
  const lines = doc.splitTextToSize(text, w) as string[];
  for (const l of lines) {
    y = np(doc, y, lh);
    doc.text(l, x, y);
    y += lh;
  }
  return y;
}

function tblRow(doc: jsPDF, lbl: string, val: string, y: number): number {
  const vw = CW - LW - 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const vLines = doc.splitTextToSize(val || '', vw) as string[];
  const rh = Math.max(RH, vLines.length * 3.5 + 2);
  y = np(doc, y, rh);
  // bg + borders
  doc.setFillColor(245, 245, 245);
  doc.rect(LM, y, LW, rh, 'F');
  doc.setDrawColor(180, 180, 180);
  doc.rect(LM, y, LW, rh, 'S');
  doc.rect(LM + LW, y, CW - LW, rh, 'S');
  // label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text(lbl, LM + 2, y + RH / 2 + 1);
  // value
  doc.setFont('helvetica', 'normal');
  let ty = y + 3.5;
  for (const vl of vLines) {
    doc.text(vl, LM + LW + 2, ty);
    ty += 3.5;
  }
  return y + rh;
}

function secHdr(doc: jsPDF, title: string, y: number): number {
  y = np(doc, y, 8);
  doc.setFillColor(230, 230, 230);
  doc.rect(LM, y, CW, 5.5, 'F');
  doc.setDrawColor(180, 180, 180);
  doc.rect(LM, y, CW, 5.5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(title.toUpperCase(), LM + 3, y + 3.8);
  doc.setFont('helvetica', 'normal');
  return y + 9;
}

export async function generatePdfLocally(data: PdfGenerationData): Promise<Blob> {
  const { selectedServices, observacoes, signatureData, responsavel,
    dataAtendimento, horaEntrada, horaSaida, extractedData } = data;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const tw = CW - 10; // text width with safe inner padding for accented chars
  let y = 12;

  // === HEADER ===
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('AUTOCOM_MANHUACU', PW / 2, y, { align: 'center' });
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(60, 60, 60);
  doc.text('AVENIDA DR JORGE HANNAS, 3901, PONTE DA ALDEIA', PW / 2, y, { align: 'center' });
  y += 3;
  doc.text('MANHUA\u00c7U - MG  |  TELEFONE: 08005913107', PW / 2, y, { align: 'center' });
  y += 4;

  const osNum = extractedData?.numero_os ?? '';
  if (osNum) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('O.S.: ' + osNum, PW / 2, y, { align: 'center' });
    y += 4;
  }

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(LM, y, PW - RM, y);
  y += 4;

  // === CLIENT DATA ===
  const cn = extractedData?.nome_cliente ?? '';
  const cpf = extractedData?.cpf_cliente ?? '';
  const fan = extractedData?.fantasia ?? '';
  const cnpj = extractedData?.cnpj ?? '';
  const end = extractedData?.endereco_cliente ?? '';
  const cid = extractedData?.cidade_cliente ?? '';
  const cep = extractedData?.cep ?? '';
  const tel = extractedData?.telefone_cliente ?? '';
  const email = extractedData?.email_cliente ?? '';
  const equip = extractedData?.equipamento ?? '';
  const tec = extractedData?.tecnico ?? responsavel ?? '';
  const prob = extractedData?.problema_informado ?? '';
  const det = extractedData?.detalhes_sistema ?? '';
  const cont = extractedData?.contrato ?? '';
  const pag = extractedData?.pagamento ?? '';

  if (cn) {
    y = secHdr(doc, 'Dados do Cliente', y);
    y = tblRow(doc, 'Cliente:', cn + (cpf ? ' ' + cpf : ''), y);
    if (fan) y = tblRow(doc, 'Fantasia:', fan, y);
    if (end) y = tblRow(doc, 'Endereço:', end, y);
    if (cnpj) y = tblRow(doc, 'CPF/CNPJ:', cnpj, y);
    if (cid || cep) {
      const cv = cid && cep ? cid + '    CEP: ' + cep : cid || 'CEP: ' + cep;
      y = tblRow(doc, 'Cidade:', cv, y);
    }
    if (tel) y = tblRow(doc, 'Tel:', tel, y);
    if (email) y = tblRow(doc, 'E-mail:', email, y);
    y += 2;
  }

  if (equip || tec) {
    if (equip) y = tblRow(doc, 'Equipamento:', equip, y);
    y = tblRow(doc, 'Técnico:', tec, y);
    y += 3;
  }

  // === DISCLAIMER ===
  y = np(doc, y, 14);
  doc.setFontSize(6);
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'normal');
  y = wrText(doc, 'DEFEITOS OCULTOS OU NÃO RELATADOS SÃO DE RESPONSABILIDADE DO CLIENTE, NÃO NOS RESPONSABILIZAMOS POR PERDA DE ARQUIVOS NO HD/OUTRO MEIO DE ARMAZENAMENTO, EM CASO DE INSTALAÇÃO DE SOFTWARE A RESPONSABILIDADE DA LICENÇA É DO CLIENTE.', LM + 2, y, tw, 2.8);
  y += 1;
  doc.setFont('helvetica', 'bold');
  y = wrText(doc, '***EQUIPAMENTOS NÃO RECOLHIDOS APÓS 6 MESES SERÃO DESCARTADOS OU VENDIDOS PARA COBRIR AS DESPESAS.***', LM + 2, y, tw, 2.8);
  doc.setFont('helvetica', 'normal');
  y += 3;

  // === PROBLEM ===
  if (prob || det) {
    y = secHdr(doc, 'Problema Informado', y);
    doc.setFontSize(7);
    doc.setTextColor(20, 20, 20);
    if (prob) { y = wrText(doc, prob, LM + 2, y, tw, 3.2); y += 1; }
    if (det) { y = wrText(doc, det, LM + 2, y, tw, 3.2); y += 1; }
    y += 2;
  }

  // === CONTRACT / PAYMENT ===
  if (cont || pag) {
    y = np(doc, y, 10);
    doc.setFontSize(7);
    doc.setTextColor(20, 20, 20);
    if (cont) { y = wrText(doc, cont, LM + 2, y, tw, 3.2); y += 1; }
    if (pag) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 0, 0);
      y = wrText(doc, 'FORMA DE PAGAMENTO: ' + pag, LM + 2, y, tw, 3.2);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(20, 20, 20);
      y += 1;
    }
    y += 2;
  }

  // === SERVICES ===
  const svcs = (selectedServices ?? []).map((s: string) => {
    const p = s.split('::');
    return p.length > 1 ? p.slice(1).join('::') : s;
  });

  if (svcs.length > 0) {
    y = secHdr(doc, 'Serviço Executado', y);
    doc.setFontSize(7);
    doc.setTextColor(20, 20, 20);
    const half = Math.ceil(svcs.length / 2);
    const c1 = svcs.slice(0, half);
    const c2 = svcs.slice(half);
    const colW = CW / 2 - 6; // symmetric column width
    const colIndent = 3; // same indent for both columns
    const sy = y;

    let y1 = sy;
    for (const s of c1) {
      y1 = np(doc, y1, 4);
      const ls = doc.splitTextToSize('• ' + s, colW) as string[];
      for (const l of ls) { doc.text(l, LM + colIndent, y1); y1 += 3.5; }
    }

    let y2 = sy;
    for (const s of c2) {
      y2 = np(doc, y2, 4);
      const ls = doc.splitTextToSize('• ' + s, colW) as string[];
      for (const l of ls) { doc.text(l, LM + CW / 2 + colIndent, y2); y2 += 3.5; }
    }
    y = Math.max(y1, y2) + 3;
  }

  // === OBSERVATIONS ===
  if (observacoes) {
    y = secHdr(doc, 'Observações', y);
    doc.setFontSize(7);
    doc.setTextColor(20, 20, 20);
    y = wrText(doc, observacoes, LM + 2, y, tw, 3.2);
    y += 3;
  }

  // === BACKUP NOTICE ===
  y = np(doc, y, 16);
  doc.setDrawColor(180, 180, 180);
  const bsy = y;
  doc.setFontSize(6.5);
  doc.setTextColor(40, 40, 40);
  y += 2;
  doc.setFont('helvetica', 'bold');
  y = wrText(doc, 'IMPORTANTE - Backup Banco de Dados Software:', LM + 2, y, tw, 2.8);
  doc.setFont('helvetica', 'normal');
  y = wrText(doc, 'Reconheço que, recebi as devidas orientações sobre o Armazenamento de Backup_Dados, seja ele Local, em Mídia Externa ou em Drivers/nuvem, à sua conferência bem como a responsabilidades supracitadas no contrato firmado.', LM + 2, y, tw, 2.8);
  y += 1;
  doc.rect(LM, bsy, CW, y - bsy + 1, 'S');
  y += 4;

  // === ATTENDANCE ===
  y = np(doc, y, 20);
  y = tblRow(doc, 'Data Atend.:', dataAtendimento, y);
  y = tblRow(doc, 'Entrada/Saída:', horaEntrada + ' / ' + horaSaida, y);
  y = tblRow(doc, 'Responsável:', responsavel, y);
  y += 6;

  // === SIGNATURES ===
  y = np(doc, y, 32);
  const sw = CW / 2 - 10; // signature block width
  const lineY = y + 22; // Y position of the signature line

  // Left: AUTOCOM
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(LM, lineY, LM + sw, lineY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text('AUTOCOM_MANHUACU', LM + sw / 2, lineY + 4, { align: 'center' });

  // Right: Client — signature image sits directly above the line
  const sx = PW / 2 + 5;
  if (signatureData) {
    try {
      // Load image to get real dimensions and maintain aspect ratio
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = signatureData;
      });
      const imgW = img.naturalWidth || 300;
      const imgH = img.naturalHeight || 100;
      // Fit signature within the block width, max height 20mm
      const maxW = sw;
      const maxH = 20;
      const ratio = Math.min(maxW / imgW, maxH / imgH);
      const drawW = imgW * ratio;
      const drawH = imgH * ratio;
      // Center horizontally over the signature line, bottom edge touches lineY - 1
      const drawX = sx + (sw - drawW) / 2;
      const drawY = lineY - drawH - 1;
      doc.addImage(signatureData, 'JPEG', drawX, drawY, drawW, drawH);
    } catch { /* ignore image errors */ }
  }
  doc.line(sx, lineY, sx + sw, lineY);
  doc.text(cn || 'Cliente', sx + sw / 2, lineY + 4, { align: 'center' });
  y = lineY + 10;

  // === FOOTER ===
  y = np(doc, y, 6);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.line(LM, y, PW - RM, y);
  y += 3;
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text('eSistemLoja - A Solução Completa na medida certa! (0800 591 3107)', PW / 2, y, { align: 'center' });

  return doc.output('blob');
}

export async function generateAndGetPdf(
  data: PdfGenerationData
): Promise<{ blob: Blob; fileName: string }> {
  const blob = await generatePdfLocally(data);
  const cn = data.extractedData?.nome_cliente ?? '';
  const base = data.uploadedFileName
    ? data.uploadedFileName.replace(/\.pdf$/i, '')
    : 'OS_' + (cn || 'cliente');
  return { blob, fileName: base + '.pdf' };
}
