import { withAuth } from 'next-auth/middleware';

export default withAuth({ pages: { signIn: '/login' } });

// Protege as páginas. /login e /cadastro são públicas; as rotas /api verificam a sessão por conta própria.
export const config = {
  matcher: [
    '/((?!api|login|cadastro|_next/static|_next/image|favicon.ico|sw.js|manifest.json|manifest.webmanifest|icons|.*\\.(?:png|jpg|jpeg|svg|ico|webp|js|css|json)$).*)',
  ],
};
