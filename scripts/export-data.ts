/**
 * Script de EXPORTAÇÃO dos dados atuais (PostgreSQL/Prisma) para JSON.
 *
 * Objetivo: preservar todo o histórico existente ANTES da migração offline,
 * gerando um arquivo JSON que poderá ser importado no IndexedDB posteriormente.
 *
 * Uso:
 *   cd nextjs_space
 *   yarn tsx --require dotenv/config scripts/export-data.ts
 *
 * Saída: scripts/export/dados-exportados-<timestamp>.json
 *
 * Este script NÃO altera nem apaga nenhum dado. Apenas lê e grava um JSON local.
 *
 * NOTA (FASE 3 - app 100% offline): O Prisma/PostgreSQL foi removido das
 * dependências do aplicativo. Este script é LEGADO e só é necessário caso você
 * precise re-exportar dados de um banco PostgreSQL antigo. A exportação já foi
 * realizada e o resultado está preservado em scripts/export/.
 * Para executá-lo novamente, reinstale temporariamente o Prisma:
 *   yarn add -D prisma @prisma/client && yarn prisma generate
 * (defina DATABASE_URL apontando para o banco antigo) e então rode o comando de uso acima.
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando exportação dos dados atuais...');

  const [users, serviceOrders, accounts, sessions] = await Promise.all([
    prisma.user.findMany().catch(() => []),
    prisma.serviceOrder.findMany().catch(() => []),
    prisma.account.findMany().catch(() => []),
    prisma.session.findMany().catch(() => []),
  ]);

  // Remove campos sensíveis dos usuários (senha hash, tokens) — não são necessários offline
  const safeUsers = (users ?? []).map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    counts: {
      users: safeUsers.length,
      serviceOrders: (serviceOrders ?? []).length,
      accounts: (accounts ?? []).length,
      sessions: (sessions ?? []).length,
    },
    data: {
      users: safeUsers,
      serviceOrders: serviceOrders ?? [],
    },
  };

  const outDir = join(__dirname, 'export');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = join(outDir, `dados-exportados-${stamp}.json`);
  writeFileSync(outPath, JSON.stringify(exportPayload, null, 2), 'utf-8');

  console.log('Exportação concluída com sucesso!');
  console.log('Registros exportados:', exportPayload.counts);
  console.log('Arquivo salvo em:', outPath);
}

main()
  .catch((e) => {
    console.error('Erro na exportação:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
