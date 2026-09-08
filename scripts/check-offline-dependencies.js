#!/usr/bin/env node
/*
 * check-offline-dependencies.js
 * ---------------------------------------------------------------
 * Verifica se o codigo do aplicativo contem referencias a servicos
 * externos / rede que quebrariam o funcionamento 100% offline.
 *
 * Uso:
 *   node scripts/check-offline-dependencies.js
 *
 * O script distingue chamadas LOCAIS (ex.: fetch de arquivos do
 * proprio app como /manifest.json, blobs, IndexedDB) de chamadas
 * EXTERNAS (URLs http(s):// para dominios de terceiros). Ele NAO
 * marca todo fetch como erro.
 * ---------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['app', 'components', 'lib', 'hooks'];
const EXTS = ['.ts', '.tsx', '.js', '.jsx'];

// Padroes claramente EXTERNOS / que dependem de rede -> ERRO
const FORBIDDEN = [
  { re: /https?:\/\/apps\.abacus\.ai/i, label: 'Abacus AI (apps.abacus.ai)' },
  { re: /abacus\.ai/i, label: 'Abacus AI' },
  { re: /chatllm|appllm-lib/i, label: 'Abacus ChatLLM / appllm-lib' },
  { re: /ABACUSAI_API_KEY/i, label: 'Chave da API Abacus' },
  { re: /@prisma\/client|PrismaClient/i, label: 'Prisma (banco remoto)' },
  { re: /DATABASE_URL/i, label: 'DATABASE_URL (PostgreSQL remoto)' },
  { re: /postgres(ql)?:\/\//i, label: 'PostgreSQL remoto' },
  { re: /@aws-sdk|aws-config|s3-request-presigner/i, label: 'AWS SDK / S3' },
  { re: /@azure\/storage-blob/i, label: 'Azure Blob Storage' },
  { re: /next-auth|@next-auth|getServerSession|NextAuth/i, label: 'NextAuth' },
  { re: /GoogleProvider|GOOGLE_CLIENT_ID|GOOGLE_CLIENT_SECRET/i, label: 'Google OAuth' },
  { re: /googletagmanager|gtag\(|NEXT_PUBLIC_GA_MEASUREMENT_ID/i, label: 'Google Analytics' },
  { re: /next\/font\/google/i, label: 'Google Fonts (next/font/google)' },
  { re: /fonts\.(googleapis|gstatic)\.com/i, label: 'Google Fonts (CDN)' },
];

// Chamadas de rede que precisam de inspecao manual (nao sao erro automatico)
const NETWORK_HINTS = [
  { re: /\bfetch\s*\(/, label: 'fetch()' },
  { re: /\baxios\b/, label: 'axios' },
  { re: /XMLHttpRequest/, label: 'XMLHttpRequest' },
  { re: /new WebSocket/, label: 'WebSocket' },
  { re: /navigator\.sendBeacon/, label: 'sendBeacon' },
];

// URLs consideradas LOCAIS/seguras (nao dependem de internet)
function isLocalUrl(str) {
  return (
    str.startsWith('/') ||
    str.startsWith('./') ||
    str.startsWith('../') ||
    str.startsWith('blob:') ||
    str.startsWith('data:') ||
    str.includes('createObjectURL') ||
    str.includes('URL.createObjectURL')
  );
}

function walk(dir, files = []) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return files;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.build') continue;
      walk(rel, files);
    } else if (EXTS.includes(path.extname(entry.name))) {
      files.push(rel);
    }
  }
  return files;
}

let errors = 0;
let warnings = 0;
const files = SCAN_DIRS.flatMap((d) => walk(d));

for (const rel of files) {
  const content = fs.readFileSync(path.join(ROOT, rel), 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, i) => {
    const ln = i + 1;

    for (const rule of FORBIDDEN) {
      if (rule.re.test(line)) {
        console.log(`  [ERRO]  ${rel}:${ln}  -> ${rule.label}`);
        console.log(`          ${line.trim()}`);
        errors++;
      }
    }

    for (const hint of NETWORK_HINTS) {
      if (hint.re.test(line)) {
        // tenta extrair uma URL literal da linha
        const urlMatch = line.match(/["'`]([^"'`]+)["'`]/);
        const arg = urlMatch ? urlMatch[1] : '';
        if (arg && isLocalUrl(arg)) {
          // chamada local -> OK, apenas informativo
          console.log(`  [OK]    ${rel}:${ln}  -> ${hint.label} local: ${arg}`);
        } else if (/https?:\/\//i.test(line)) {
          console.log(`  [ERRO]  ${rel}:${ln}  -> ${hint.label} para URL EXTERNA`);
          console.log(`          ${line.trim()}`);
          errors++;
        } else {
          console.log(`  [AVISO] ${rel}:${ln}  -> ${hint.label} (verificar destino manualmente)`);
          console.log(`          ${line.trim()}`);
          warnings++;
        }
      }
    }
  });
}

console.log('\n============================================================');
console.log(`Arquivos verificados: ${files.length}`);
console.log(`Erros (dependencias externas): ${errors}`);
console.log(`Avisos (verificar manualmente): ${warnings}`);
console.log('============================================================');

if (errors > 0) {
  console.log('\nFALHOU: foram encontradas dependencias externas que quebram o modo offline.');
  process.exit(1);
} else {
  console.log('\nOK: nenhuma dependencia externa obrigatoria encontrada. App pronto para offline.');
  process.exit(0);
}
