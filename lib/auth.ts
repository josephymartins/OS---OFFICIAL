import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'E-mail e senha',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.password) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).id = token.id;
      return session;
    },
  },
};

/**
 * Administradores: role = 'admin' no banco OU e-mail listado em ADMIN_EMAILS
 * (variável de ambiente na Vercel, separada por vírgula).
 */
export function isAdminUser(u: { email: string; role?: string | null }): boolean {
  const list = (process.env.ADMIN_EMAILS ?? '')
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return u.role === 'admin' || list.includes((u.email ?? '').toLowerCase());
}

export interface CurrentUser {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
}

/** Usuário logado com a flag de administrador (ou null). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const id = await requireUserId();
  if (!id) return null;
  const u = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!u) return null;
  return { id: u.id, name: u.name, email: u.email, isAdmin: isAdminUser(u) };
}

/** Retorna o id do usuário logado, ou null se não houver sessão. */
export async function requireUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return ((session?.user as any)?.id as string | undefined) ?? null;
}
