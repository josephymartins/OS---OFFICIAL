import { HomeClient } from '@/components/home-client';

// Página inicial 100% offline: renderiza direto, sem sessão/servidor.
export default function HomePage() {
  return <HomeClient userName="Técnico" />;
}
