/**
 * Client-side PDF text extraction and parsing.
 * Uses pdfjs-dist to extract text, then regex to parse AUTOCOM OS fields.
 * Works offline, no API calls, no credits consumed.
 */

/* pdfjs-dist is loaded from /public to bypass webpack chunking issues */
let pdfjsLib: any = null;

export interface ExtractedPdfData {
  numero_os: string;
  nome_cliente: string;
  cpf_cliente: string;
  fantasia: string;
  cnpj: string;
  endereco_cliente: string;
  cidade_cliente: string;
  cep: string;
  telefone_cliente: string;
  email_cliente: string;
  data_abertura: string;
  hora_abertura: string;
  equipamento: string;
  tecnico: string;
  problema_informado: string;
  detalhes_sistema: string;
  contrato: string;
  pagamento: string;
}

/**
 * Load pdfjs-dist from public folder (bypasses webpack completely).
 * Uses Function constructor to create a dynamic import that webpack cannot analyze.
 */
async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  try {
    // Use Function() to bypass webpack static analysis entirely
    const dynamicImport = new Function('url', 'return import(url)');
    pdfjsLib = await dynamicImport('/pdf.min.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  } catch (err) {
    console.error('Failed to load pdfjs-dist:', err);
    throw new Error('Não foi possível carregar o leitor de PDF');
  }
  return pdfjsLib;
}

export async function extractTextFromPdf(file: File): Promise<string> {
  await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Join with pipe to preserve field boundaries from the PDF layout
    const pageText = content.items
      .map((item: any) => item.str ?? '')
      .join('|');
    textParts.push(pageText);
  }

  return textParts.join('\n');
}

/**
 * Parse extracted text from AUTOCOM OS PDFs (label-anchored).
 *
 * Handles the two PDF layouts the system produces:
 *  - "Format A" (label-then-value): `O.S.: 5100000777`, `Cliente:|NAME`, ...
 *  - "Format B" (value-then-label): `5100000765|O.S.:`, `NAME|Cliente:`, ...
 *
 * Strategy: normalize the pipe-delimited text into a token array, then for each
 * field locate its LABEL token and take the value that follows (or, for Format B
 * fields, precedes) it, stopping at the next known label. This prevents fields
 * from being filled by position/order (which mis-mapped headers, shifted fields
 * and dumped whole blocks into a single field).
 *
 * Validation applied: a field is never filled with another field's label; the
 * O.S. number can never equal the company phone (08005913107); the
 * Problema/Detalhes/Contrato block is split on its own markers so payment,
 * service list, backup text and footer never leak into Problema Informado.
 */
export function parseOsData(text: string): ExtractedPdfData {
  const result: ExtractedPdfData = {
    numero_os: '', nome_cliente: '', cpf_cliente: '', fantasia: '', cnpj: '',
    endereco_cliente: '', cidade_cliente: '', cep: '', telefone_cliente: '',
    email_cliente: '', data_abertura: '', hora_abertura: '', equipamento: '',
    tecnico: '', problema_informado: '', detalhes_sistema: '', contrato: '', pagamento: '',
  };
  try {
    // Normalize: collapse whitespace-padded pipe runs into a single pipe delimiter.
    const norm = text
      .replace(/\r/g, '')
      .replace(/\n/g, '|')
      .replace(/\s*\|\s*/g, '|')
      .replace(/\|{2,}/g, '|')
      .replace(/^\|+|\|+$/g, '');
    const tokens = norm.split('|').map((s) => s.trim());

    // Boundary labels used to know where a field value ends.
    const LABELS = [
      /^O\.S\.:/i, /^DADOS DO CLIENTE$/i, /^Cliente:$/i, /^Fantasia:$/i,
      /^Endereço:$/i, /^ENDERECO:$/i, /^CPF\/CNPJ:$/i, /^Cidade:$/i, /^CIDADE:$/i,
      /^CEP:/i, /^Tel:$/i, /^TELEFONE:$/i, /^E-?mail:$/i, /^Equipamento:$/i,
      /^Técnico:$/i, /^Tecnico:$/i, /^TECNICO:/i, /^DATA:$/i,
      /^PROBLEMA INFORMADO:?$/i, /^FORMA DE PAGAMENTO:?/i, /^SERVIÇO EXECUTADO:?$/i,
      /^OBSERVAÇÕES$/i, /^IMPORTANTE/i, /^Backup Banco/i, /^Data Atend/i,
      /^Data Atendimento:/i, /^Entrada\/Saída:/i, /^Hora entrada/i,
      /^Responsável:/i, /^Final:$/i, /^Valor do servico:/i, /^LEVAR:/i,
      /^CLIENTE:/i, /^AUTOCOM/i, /^REFERENTE AOS SISTEMAS:?/i,
      // aviso padrão logo após "Técnico:" (evita usá-lo como nome do técnico)
      /^DEFEITOS OCULTOS/i, /^\*\*\*EQUIPAMENTOS/i, /^ORDEM DE SERVIÇO$/i,
    ];
    const isLabel = (tk: string) => LABELS.some((r) => r.test((tk || '').trim()));
    const isPhone = (tk: string) => /^\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}$/.test((tk || '').trim());
    const isDate = (tk: string) => /\d{2}\/\d{2}\/\d{4}/.test(tk || '');
    const idx = (re: RegExp, from = 0) => { for (let i = from; i < tokens.length; i++) if (re.test(tokens[i])) return i; return -1; };
    const cleanName = (s: string) => (s || '')
      .replace(/^[\d][\d.\/-]*\s+/, '')       // leading doc number prefix
      .replace(/\s+[\d][\d.\/-]{5,}$/, '')     // trailing doc number
      .trim();

    // === O.S. number ===
    let m = norm.match(/O\.S\.:\s*(\d{6,})/i);       // format A: number after label
    if (!m) m = norm.match(/(\d{6,})\|O\.S\.:/i);      // format B: number before label
    if (m && m[1] !== '08005913107') result.numero_os = m[1];

    // === Cliente (name) ===
    const ci = idx(/^Cliente:$/i);
    if (ci >= 0) {
      const after = tokens[ci + 1] || '';
      const before = tokens[ci - 1] || '';
      if (after && !isLabel(after)) result.nome_cliente = cleanName(after);       // format A
      else if (before && !isLabel(before)) result.nome_cliente = cleanName(before); // format B
    }

    // === Fantasia ===
    const fi = idx(/^Fantasia:$/i);
    if (fi >= 0) {
      const after = tokens[fi + 1] || '';
      const before = tokens[fi - 1] || '';
      let cand = '';
      if (after && !isLabel(after) && !isPhone(after) && !isDate(after)) cand = after;
      else if (before && !isLabel(before) && !isPhone(before) && !isDate(before)) cand = before;
      cand = cleanName(cand);
      if (cand && cand !== result.nome_cliente) result.fantasia = cand;
    }

    // === Endereço (client) ===
    const ei = idx(/^Endereço:$/i);
    if (ei >= 0) { const v = tokens[ei + 1] || ''; if (v && !isLabel(v)) result.endereco_cliente = v; }

    // === CPF/CNPJ ===
    const di = idx(/^CPF\/CNPJ:$/i);
    if (di >= 0) {
      const v = (tokens[di + 1] || '').trim();
      const digits = v.replace(/\D/g, '');
      if (digits.length > 11) result.cnpj = v;
      else if (digits.length >= 11) result.cpf_cliente = v;
    }

    // === CEP ===
    const cep = norm.match(/CEP:\s*\|?\s*(\d{5,8})/i);
    if (cep) result.cep = cep[1];

    // === Cidade ===
    const cdi = idx(/^Cidade:$/i);
    if (cdi >= 0) {
      const n1 = tokens[cdi + 1] || '';
      if (/^CEP:/i.test(n1)) {
        // format B: Cidade | CEP: | NUM | CITY
        let j = cdi + 2;
        if (/^\d{5,8}$/.test((tokens[j] || '').trim())) j++;
        const city = tokens[j] || '';
        if (city && !isLabel(city)) result.cidade_cliente = city;
      } else if (n1 && !isLabel(n1)) {
        result.cidade_cliente = n1; // format A
      }
    }

    // === Telefone ===
    const ti = idx(/^Tel:$/i);
    if (ti >= 0) {
      const after = tokens[ti + 1] || '';
      const before = tokens[ti - 1] || '';
      if (isPhone(after)) result.telefone_cliente = after;
      else if (isPhone(before)) result.telefone_cliente = before;
    }

    // === E-mail ===
    const mi = idx(/^E-?mail:$/i);
    if (mi >= 0) { const v = tokens[mi + 1] || ''; if (v.includes('@')) result.email_cliente = v; }
    if (!result.email_cliente) {
      const all = norm.match(/[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/g);
      if (all) result.email_cliente = Array.from(new Set(all.map((e: string) => e.toUpperCase()))).join(' / ');
    }

    // === Equipamento ===
    const qi = idx(/^Equipamento:$/i);
    if (qi >= 0) { const v = tokens[qi + 1] || ''; if (v && !isLabel(v)) result.equipamento = v; }

    // === Técnico ===
    const kA = idx(/^Técnico:$/i); // format A (accented)
    if (kA >= 0) { const v = tokens[kA + 1] || ''; if (v && !isLabel(v) && !v.includes('__')) result.tecnico = v; }
    if (!result.tecnico) { const mt = norm.match(/TECNICO:\s*([A-Za-zÀ-ú][A-Za-zÀ-ú ]*)/); if (mt) result.tecnico = mt[1].trim(); }

    // === Problema / Detalhes / Contrato block ===
    // Region between PROBLEMA INFORMADO and FORMA DE PAGAMENTO, parsed as one string
    // so markers that appear inline within a token (format A) are handled too.
    const pStart = idx(/^PROBLEMA INFORMADO:?$/i);
    if (pStart >= 0) {
      const payIdx = idx(/^FORMA DE PAGAMENTO:?/i, pStart);
      const end = payIdx >= 0 ? payIdx : tokens.length;
      const blockStr = tokens.slice(pStart + 1, end)
        .filter((t: string) => t && !/^={3,}$/.test(t))
        .join(' ')
        .replace(/={3,}/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const clean = (s: string) => s.replace(/\*+/g, '').replace(/\s+/g, ' ').replace(/^[\s:\-]+|[\s\-]+$/g, '').trim();
      const refPos = blockStr.search(/REFERENTE AOS SISTEMAS/i);
      const conPos = blockStr.search(/CONTRATO REFERENTE/i);
      const levPos = blockStr.search(/LEVAR:/i);
      const markers = [refPos, conPos, levPos].filter((x: number) => x >= 0).sort((a: number, b: number) => a - b);
      const firstMarker = markers.length ? markers[0] : blockStr.length;
      result.problema_informado = clean(blockStr.slice(0, firstMarker));
      if (refPos >= 0) {
        const stops = [conPos, levPos].filter((x: number) => x > refPos).sort((a: number, b: number) => a - b);
        const stop = stops.length ? stops[0] : blockStr.length;
        result.detalhes_sistema = clean(blockStr.slice(refPos, stop));
      }
      if (conPos >= 0) {
        const stop = levPos > conPos ? levPos : blockStr.length;
        result.contrato = clean(blockStr.slice(conPos, stop));
      }
    }

    // === Forma de pagamento ===
    // Value may be inline (format A) or split across tokens (format B).
    const payI = idx(/^FORMA DE PAGAMENTO:?/i);
    if (payI >= 0) {
      const inline = tokens[payI].replace(/^FORMA DE PAGAMENTO:?/i, '').trim();
      const parts = [];
      if (inline) parts.push(inline);
      for (let j = payI + 1; j < tokens.length; j++) {
        const tk = tokens[j];
        if (!tk) continue;
        if (isLabel(tk) || /^SERVIÇO EXECUTADO/i.test(tk)) break;
        if (/^\*{2,}/.test(tk)) continue; // skip note lines like **** ... ****
        parts.push(tk);
      }
      result.pagamento = parts.join(' ')
        .replace(/-{2,}/g, '—')
        .replace(/—\s*—/g, '—')
        .replace(/\s+/g, ' ')
        .replace(/\s*—\s*/g, ' — ')
        .trim();
    }

    // === Data / Hora ===
    let dm = norm.match(/Data Atend(?:imento)?\.?:?\s*\|?\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (dm) result.data_abertura = dm[1];
    let hm = norm.match(/(?:Entrada\/Saída|Hora entrada[^|]*):?\s*\|?\s*([\d:]{4,5})?\s*\/\s*([\d:]{4,5})/i);
    if (hm) result.hora_abertura = [hm[1], hm[2]].filter(Boolean).join(' / ');
  } catch (err) {
    console.error('Parse error:', err);
  }
  return result;
}

/**
 * Full extraction pipeline: read file → extract text → parse fields.
 */
export async function extractPdfData(file: File): Promise<ExtractedPdfData> {
  const text = await extractTextFromPdf(file);
  return parseOsData(text);
}
