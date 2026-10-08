import { PrismaClient } from '@prisma/client';

const g = globalThis as unknown as { prismaBase?: PrismaClient };

const base = g.prismaBase ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') g.prismaBase = base;

/**
 * Garante que as colunas novas existam no banco (Neon) antes de usar as ordens.
 * Só ADICIONA colunas que faltam (IF NOT EXISTS) e roda uma vez por instância.
 * Assim não é preciso rodar migração manual ao publicar uma versão nova.
 */
let ensured: Promise<void> | null = null;

async function addMissingColumns(): Promise<void> {
  const rows = (await base.$queryRawUnsafe(
    `SELECT count(*) AS n FROM information_schema.columns
      WHERE table_name = 'ServiceOrder' AND column_name = 'backupSenha'`
  )) as Array<{ n: bigint | number }>;
  if (Number(rows?.[0]?.n ?? 0) > 0) return;
  await base.$executeRawUnsafe(
    `ALTER TABLE "ServiceOrder"
       ADD COLUMN IF NOT EXISTS "backupMidiaExterna" BOOLEAN NOT NULL DEFAULT false,
       ADD COLUMN IF NOT EXISTS "backupNuvem" BOOLEAN NOT NULL DEFAULT false,
       ADD COLUMN IF NOT EXISTS "backupEmail" TEXT,
       ADD COLUMN IF NOT EXISTS "backupSenha" TEXT`
  );
}

export function ensureSchema(): Promise<void> {
  if (!ensured) {
    ensured = addMissingColumns().catch((err) => {
      ensured = null; // tenta de novo na próxima chamada
      throw err;
    });
  }
  return ensured;
}

export const prisma = base.$extends({
  query: {
    serviceOrder: {
      async $allOperations({ args, query }: any) {
        await ensureSchema();
        return query(args);
      },
    },
  },
});
