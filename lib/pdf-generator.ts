/**
 * Geração do PDF da OS no navegador, só com jsPDF (sem html2canvas).
 * Funciona offline em qualquer aparelho, inclusive iPhone/Safari.
 *
 * IMPORTANTE: os rótulos ("O.S.:", "Cliente:", "Fantasia:", "Endereço:",
 * "CPF/CNPJ:", "Cidade:", "CEP:", "Tel:", "E-mail:", "Equipamento:",
 * "Técnico:", "Data Atend.:", "Entrada/Saída:", "Responsável:") são lidos
 * por lib/pdf-parser.ts quando um PDF gerado aqui é anexado de novo.
 * Mantenha os textos e a ordem rótulo → valor.
 */

import jsPDF from 'jspdf';
import { hasBackup, type BackupInfo } from '@/lib/backup-info';

export interface PdfGenerationData {
  selectedServices: string[];
  observacoes: string;
  signatureData: string | null;
  responsavel: string;
  dataAtendimento: string;
  horaEntrada: string;
  horaSaida: string;
  extractedData: any;
  backup?: BackupInfo;
  uploadedFileName?: string;
  /** Opcional: logo já preparado (data URL). Se ausente, carrega /logo-autocom.png. */
  logoDataUrl?: string | null;
}

// ---------- Paleta e medidas ----------
type RGB = [number, number, number];
const BRAND: RGB = [0, 102, 204];       // azul AUTOCOM (um pouco mais escuro para impressão)
const BRAND_DARK: RGB = [0, 66, 133];
const BRAND_LIGHT: RGB = [234, 242, 252];
const INK: RGB = [28, 30, 34];
const MUTED: RGB = [100, 106, 115];
const LINE: RGB = [206, 212, 220];
const LABEL_BG: RGB = [245, 247, 250];
const WARN_BG: RGB = [255, 248, 234];
const WARN: RGB = [196, 122, 0];
const WARN_DARK: RGB = [128, 78, 0];
const RED: RGB = [180, 0, 0];

const PW = 210;          // largura A4
const PH = 297;          // altura A4
const LM = 16;           // margem esquerda
const RM = 16;           // margem direita
const CW = PW - LM - RM; // largura útil = 178mm
const TOP = 16;          // topo das páginas seguintes
const MY = 276;          // limite do conteúdo (rodapé abaixo)

const fill = (d: jsPDF, c: RGB) => d.setFillColor(c[0], c[1], c[2]);
const stroke = (d: jsPDF, c: RGB) => d.setDrawColor(c[0], c[1], c[2]);
const ink = (d: jsPDF, c: RGB) => d.setTextColor(c[0], c[1], c[2]);

function np(doc: jsPDF, y: number, need: number = 8): number {
  if (y + need > MY) { doc.addPage(); return TOP; }
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

/** Faixa de título de seção: fundo azul claro com barra lateral da marca. */
function secHdr(doc: jsPDF, title: string, y: number): number {
  y = np(doc, y, 14);
  fill(doc, BRAND_LIGHT);
  doc.rect(LM, y, CW, 6.2, 'F');
  fill(doc, BRAND);
  doc.rect(LM, y, 1.3, 6.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  ink(doc, BRAND_DARK);
  doc.text(title.toUpperCase(), LM + 4, y + 4.2);
  doc.setFont('helvetica', 'normal');
  return y + 9.5;
}

interface Cell { label: string; value: string; span: number }

/** Linha de tabela com 1+ células "rótulo | valor" (span = fração da largura). */
function gridRow(doc: jsPDF, cells: Cell[], y: number, labelW = 25): number {
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  let x = LM;
  const laid = cells.map((c) => {
    const w = CW * c.span;
    const lines = doc.splitTextToSize(c.value || '', w - labelW - 4) as string[];
    const item = { c, x, w, lines };
    x += w;
    return item;
  });
  const maxLines = Math.max(1, ...laid.map((l) => l.lines.length));
  const rh = Math.max(6.4, maxLines * 3.5 + 2.9);
  y = np(doc, y, rh);

  doc.setLineWidth(0.2);
  for (const { c, x: cx, w, lines } of laid) {
    fill(doc, LABEL_BG);
    doc.rect(cx, y, labelW, rh, 'F');
    stroke(doc, LINE);
    doc.rect(cx, y, w, rh, 'S');
    doc.line(cx + labelW, y, cx + labelW, y + rh);
    // rótulo e depois o valor (ordem lida pelo parser)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    ink(doc, MUTED);
    doc.text(c.label, cx + 2, y + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    ink(doc, INK);
    let ty = y + 4.2;
    for (const vl of lines) { doc.text(vl, cx + labelW + 2, ty); ty += 3.5; }
  }
  return y + rh;
}

/** Caixa com fundo, borda e barra lateral; desenha o conteúdo via callback. */
function box(
  doc: jsPDF,
  y: number,
  height: number,
  bg: RGB,
  accent: RGB | null,
  draw: (top: number) => void
): number {
  y = np(doc, y, height + 2);
  fill(doc, bg);
  stroke(doc, LINE);
  doc.setLineWidth(0.2);
  doc.roundedRect(LM, y, CW, height, 1.2, 1.2, 'FD');
  if (accent) {
    fill(doc, accent);
    doc.rect(LM, y + 0.6, 1.3, height - 1.2, 'F');
  }
  draw(y);
  return y + height;
}

/** Caixinha de marcação; y é a linha de base do texto ao lado. */
function checkBox(doc: jsPDF, x: number, y: number, checked: boolean) {
  const s = 2.8;
  const top = y - 2.3;
  const lw = doc.getLineWidth();
  doc.setLineWidth(0.25);
  if (checked) {
    fill(doc, BRAND);
    stroke(doc, BRAND);
    doc.rect(x, top, s, s, 'FD');
    // "✓" desenhado em branco
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(x + 0.6, top + 1.5, x + 1.2, top + 2.2);
    doc.line(x + 1.2, top + 2.2, x + 2.3, top + 0.7);
  } else {
    stroke(doc, MUTED);
    doc.rect(x, top, s, s, 'S');
  }
  doc.setLineWidth(lw);
}

/** Linha "Backup: [ ] Mídia externa  [ ] Nuvem" + e-mail/senha do drive se nuvem. */
function backupLine(doc: jsPDF, b: BackupInfo, y: number): number {
  y = np(doc, y, b.nuvem ? 13 : 7);
  const x0 = LM + 3;
  doc.setFontSize(7.5);
  ink(doc, INK);
  doc.setFont('helvetica', 'bold');
  doc.text('Backup:', x0, y);
  let x = x0 + doc.getTextWidth('Backup:') + 4;
  doc.setFont('helvetica', 'normal');
  checkBox(doc, x, y, b.midiaExterna);
  x += 4.2;
  doc.text('Mídia externa', x, y);
  x += doc.getTextWidth('Mídia externa') + 8;
  checkBox(doc, x, y, b.nuvem);
  x += 4.2;
  doc.text('Nuvem', x, y);
  y += 4.6;
  if (b.nuvem) {
    const parts: Array<[string, string]> = [
      ['E-mail do drive:', b.email || ''],
      ['Senha do drive:', b.senha || ''],
    ];
    for (const [lbl, val] of parts) {
      y = np(doc, y, 4);
      doc.setFont('helvetica', 'bold');
      ink(doc, MUTED);
      doc.text(lbl, x0, y);
      const lx = x0 + 25;
      doc.setFont('helvetica', 'normal');
      ink(doc, INK);
      const lines = doc.splitTextToSize(val, CW - 6 - 25) as string[];
      for (const l of lines) { doc.text(l, lx, y); y += 3.7; }
    }
  }
  return y;
}

// ---------- Logo ----------
let logoPromise: Promise<string | null> | null = null;

/** Carrega o logo, recorta o círculo sobre fundo branco e reduz (PDF leve). */
function loadLogo(): Promise<string | null> {
  if (logoPromise) return logoPromise;
  logoPromise = (async () => {
    try {
      if (typeof document === 'undefined' || typeof fetch === 'undefined') return null;
      const res = await fetch('/logo-autocom.png');
      if (!res.ok) return null;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      try {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('logo'));
          img.src = url;
        });
        const size = 320;
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');
        if (!ctx) return null;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        // o logo é um "botão" redondo centralizado (raio ~41% da imagem)
        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size * 0.41, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, 0, 0, size, size);
        ctx.restore();
        return c.toDataURL('image/jpeg', 0.9);
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch {
      return null;
    }
  })();
  // se falhar, permite tentar de novo na próxima geração
  logoPromise.then((v) => { if (!v) logoPromise = null; });
  return logoPromise;
}

export async function generatePdfLocally(data: PdfGenerationData): Promise<Blob> {
  const { selectedServices, observacoes, signatureData, responsavel,
    dataAtendimento, horaEntrada, horaSaida, extractedData, backup } = data;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const tw = CW - 6; // largura de texto corrido com folga para acentos

  // === CABEÇALHO ===
  const logo = data.logoDataUrl !== undefined ? data.logoDataUrl : await loadLogo();
  let y = 12;
  const logoSize = 19;
  if (logo) {
    try { doc.addImage(logo, 'JPEG', LM - 1.5, y - 1, logoSize, logoSize); } catch { /* sem logo */ }
  }
  const tx = logo ? LM + logoSize + 1.5 : LM;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  ink(doc, INK);
  doc.text('AUTOCOM_MANHUACU', tx, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  ink(doc, MUTED);
  doc.text('AVENIDA DR JORGE HANNAS, 3901, PONTE DA ALDEIA', tx, y + 10);
  doc.text('MANHUAÇU - MG  |  TELEFONE: 08005913107', tx, y + 13.5);

  // Caixa da O.S. à direita
  const osNum = extractedData?.numero_os ?? '';
  const bw = 54;
  const bx = PW - RM - bw;
  stroke(doc, BRAND);
  doc.setLineWidth(0.4);
  doc.roundedRect(bx, y, bw, 16, 1.5, 1.5, 'S');
  fill(doc, BRAND);
  doc.roundedRect(bx, y, bw, 5.2, 1.5, 1.5, 'F');
  doc.rect(bx, y + 2.5, bw, 2.7, 'F'); // deixa só os cantos de cima arredondados
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);
  doc.text('ORDEM DE SERVIÇO', bx + bw / 2, y + 3.6, { align: 'center' });
  ink(doc, BRAND_DARK);
  if (osNum) {
    doc.setFontSize(12);
    doc.text('O.S.: ' + osNum, bx + bw / 2, y + 12, { align: 'center' });
  } else {
    doc.setFontSize(8);
    ink(doc, MUTED);
    doc.text('Uso Externo', bx + bw / 2, y + 11.5, { align: 'center' });
  }
  y += logoSize + 2;

  fill(doc, BRAND);
  doc.rect(LM, y, CW, 0.8, 'F');
  y += 5;

  // === DADOS DO CLIENTE ===
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

  /** Junta células em pares (meia largura) e completa a última se sobrar. */
  const pairRows = (cells: Array<[string, string]>) => {
    const present = cells.filter(([, v]) => !!v);
    for (let i = 0; i < present.length; i += 2) {
      const a = present[i];
      const b = present[i + 1];
      y = gridRow(
        doc,
        b
          ? [{ label: a[0], value: a[1], span: 0.5 }, { label: b[0], value: b[1], span: 0.5 }]
          : [{ label: a[0], value: a[1], span: 1 }],
        y
      );
    }
  };

  if (cn) {
    y = secHdr(doc, 'Dados do Cliente', y);
    y = gridRow(doc, [{ label: 'Cliente:', value: cn + (cpf ? ' ' + cpf : ''), span: 1 }], y);
    if (fan) y = gridRow(doc, [{ label: 'Fantasia:', value: fan, span: 1 }], y);
    if (end) y = gridRow(doc, [{ label: 'Endereço:', value: end, span: 1 }], y);
    const cidVal = cid || cep ? (cid && cep ? cid + '    CEP: ' + cep : cid || 'CEP: ' + cep) : '';
    pairRows([
      ['CPF/CNPJ:', cnpj],
      ['Tel:', tel],
      ['Cidade:', cidVal],
      ['E-mail:', email],
    ]);
  }

  if (equip || tec) {
    if (!cn) y = secHdr(doc, 'Atendimento', y);
    // "Técnico:" aparece sempre, mesmo vazio (como no modelo original)
    y = gridRow(
      doc,
      equip
        ? [{ label: 'Equipamento:', value: equip, span: 0.5 }, { label: 'Técnico:', value: tec, span: 0.5 }]
        : [{ label: 'Técnico:', value: tec, span: 1 }],
      y
    );
  }
  y += 3;

  // === AVISO ===
  {
    doc.setFontSize(6.2);
    const t1 = doc.splitTextToSize('DEFEITOS OCULTOS OU NÃO RELATADOS SÃO DE RESPONSABILIDADE DO CLIENTE, NÃO NOS RESPONSABILIZAMOS POR PERDA DE ARQUIVOS NO HD/OUTRO MEIO DE ARMAZENAMENTO, EM CASO DE INSTALAÇÃO DE SOFTWARE A RESPONSABILIDADE DA LICENÇA É DO CLIENTE.', tw - 4) as string[];
    doc.setFont('helvetica', 'bold');
    const t2 = doc.splitTextToSize('***EQUIPAMENTOS NÃO RECOLHIDOS APÓS 6 MESES SERÃO DESCARTADOS OU VENDIDOS PARA COBRIR AS DESPESAS.***', tw - 4) as string[];
    const h = (t1.length + t2.length) * 2.8 + 4.4;
    y = box(doc, y, h, [248, 249, 250], null, (top) => {
      let ty = top + 3.6;
      doc.setFont('helvetica', 'normal');
      ink(doc, MUTED);
      for (const l of t1) { doc.text(l, LM + 3, ty); ty += 2.8; }
      doc.setFont('helvetica', 'bold');
      ink(doc, INK);
      for (const l of t2) { doc.text(l, LM + 3, ty); ty += 2.8; }
      doc.setFont('helvetica', 'normal');
    });
    y += 5;
  }

  // === PROBLEMA INFORMADO ===
  if (prob || det) {
    y = secHdr(doc, 'Problema Informado', y);
    doc.setFontSize(7.5);
    ink(doc, INK);
    if (prob) { y = wrText(doc, prob, LM + 3, y, tw, 3.5); y += 1.2; }
    if (det) { y = wrText(doc, det, LM + 3, y, tw, 3.5); y += 1.2; }
    y += 1.5;
  }

  // === CONTRATO / PAGAMENTO ===
  if (cont || pag) {
    y = np(doc, y, 10);
    doc.setFontSize(7.5);
    ink(doc, INK);
    if (cont) { y = wrText(doc, cont, LM + 3, y, tw, 3.5); y += 1.2; }
    if (pag) {
      doc.setFont('helvetica', 'bold');
      ink(doc, RED);
      y = wrText(doc, 'FORMA DE PAGAMENTO: ' + pag, LM + 3, y, tw, 3.5);
      doc.setFont('helvetica', 'normal');
      ink(doc, INK);
      y += 1.2;
    }
    y += 2.5;
  }

  // === SERVIÇO EXECUTADO ===
  const svcs = (selectedServices ?? []).map((s: string) => {
    const p = s.split('::');
    return p.length > 1 ? p.slice(1).join('::') : s;
  });

  if (svcs.length > 0 || hasBackup(backup)) {
    y = secHdr(doc, 'Serviço Executado', y);
    doc.setFontSize(7.5);
    ink(doc, INK);
    const half = Math.ceil(svcs.length / 2);
    const cols = [svcs.slice(0, half), svcs.slice(half)];
    const colW = CW / 2 - 8;
    const sy = y;
    const ends = cols.map((col, ci) => {
      const cx = LM + 3 + ci * (CW / 2);
      let cy = sy;
      for (const s of col) {
        cy = np(doc, cy, 4);
        fill(doc, BRAND);
        doc.rect(cx, cy - 1.9, 1.3, 1.3, 'F');
        const ls = doc.splitTextToSize(s, colW) as string[];
        for (const l of ls) { doc.text(l, cx + 3, cy); cy += 3.6; }
        cy += 0.4;
      }
      return cy;
    });
    y = svcs.length > 0 ? Math.max(...ends) + 1 : sy;

    // Marcação de backup (sempre mostra as duas opções)
    y = np(doc, y, 8);
    stroke(doc, LINE);
    doc.setLineWidth(0.2);
    doc.line(LM + 3, y - 0.5, PW - RM - 3, y - 0.5);
    y += 3.6;
    y = backupLine(doc, backup ?? { midiaExterna: false, nuvem: false, email: '', senha: '' }, y);
    y += 2;
  }

  // === OBSERVAÇÕES ===
  if (observacoes) {
    y = secHdr(doc, 'Observações', y);
    doc.setFontSize(7.5);
    ink(doc, INK);
    y = wrText(doc, observacoes, LM + 3, y, tw, 3.5);
    y += 3;
  }

  // === IMPORTANTE: BACKUP ===
  {
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    const txt = doc.splitTextToSize('Reconheço que, recebi as devidas orientações sobre o Armazenamento de Backup_Dados, seja ele Local, em Mídia Externa ou em Drivers/nuvem, à sua conferência bem como a responsabilidades supracitadas no contrato firmado.', tw - 6) as string[];
    const h = txt.length * 3 + 8.2;
    y = box(doc, y, h, WARN_BG, WARN, (top) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      ink(doc, WARN_DARK);
      doc.text('IMPORTANTE - Backup Banco de Dados Software:', LM + 4.5, top + 4.2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      ink(doc, INK);
      let ty = top + 7.6;
      for (const l of txt) { doc.text(l, LM + 4.5, ty); ty += 3; }
    });
    y += 5;
  }

  // === ATENDIMENTO ===
  y = np(doc, y, 10);
  y = gridRow(doc, [
    { label: 'Data Atend.:', value: dataAtendimento, span: 0.3 },
    { label: 'Entrada/Saída:', value: (horaEntrada || '') + ' / ' + (horaSaida || ''), span: 0.3 },
    { label: 'Responsável:', value: responsavel, span: 0.4 },
  ], y, 21);
  y += 6;

  // === ASSINATURAS ===
  y = np(doc, y, 36);
  const sw = CW / 2 - 10;
  const lineY = y + 22;
  const leftX = LM + 2;
  const sx = PW / 2 + 6;

  if (signatureData) {
    try {
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = signatureData;
      });
      const imgW = img.naturalWidth || 300;
      const imgH = img.naturalHeight || 100;
      const ratio = Math.min(sw / imgW, 20 / imgH);
      const drawW = imgW * ratio;
      const drawH = imgH * ratio;
      doc.addImage(signatureData, 'JPEG', sx + (sw - drawW) / 2, lineY - drawH - 1, drawW, drawH);
    } catch { /* ignora erro de imagem */ }
  }

  stroke(doc, INK);
  doc.setLineWidth(0.3);
  doc.line(leftX, lineY, leftX + sw, lineY);
  doc.line(sx, lineY, sx + sw, lineY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  ink(doc, INK);
  doc.text('AUTOCOM_MANHUACU', leftX + sw / 2, lineY + 4, { align: 'center' });
  doc.text(cn || 'Cliente', sx + sw / 2, lineY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  ink(doc, MUTED);
  doc.text('Técnico / Empresa', leftX + sw / 2, lineY + 7.5, { align: 'center' });
  doc.text('Cliente', sx + sw / 2, lineY + 7.5, { align: 'center' });

  // === RODAPÉ EM TODAS AS PÁGINAS ===
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    stroke(doc, LINE);
    doc.setLineWidth(0.2);
    doc.line(LM, PH - 15, PW - RM, PH - 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    ink(doc, MUTED);
    doc.text('eSistemLoja - A Solução Completa na medida certa! (0800 591 3107)', LM, PH - 11);
    doc.text(`Página ${i} de ${pages}`, PW - RM, PH - 11, { align: 'right' });
  }

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
