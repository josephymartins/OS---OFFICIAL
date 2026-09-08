'use client';

// Sem autenticação: o app funciona 100% offline e abre direto na tela principal.
// Mantido como wrapper simples para preservar a estrutura do layout.
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
