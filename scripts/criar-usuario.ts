/**
 * Cria (ou atualiza a senha de) um usuário.
 * Uso:  npx tsx scripts/criar-usuario.ts email@exemplo.com "Nome do Técnico" "senha"
 */
import { config } from 'dotenv';
config({ path: '.env' });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

async function main() {
  const [emailArg, name, password] = process.argv.slice(2);
  if (!emailArg || !name || !password) {
    console.error('Uso: npx tsx scripts/criar-usuario.ts <email> "<nome>" "<senha>"');
    process.exit(1);
  }
  const email = emailArg.trim().toLowerCase();
  const hash = await bcrypt.hash(password, 10);

  const prisma = new PrismaClient();
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, password: hash },
    create: { email, name, password: hash },
  });
  console.log(`Usuário pronto: ${user.email} (${user.name})`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
