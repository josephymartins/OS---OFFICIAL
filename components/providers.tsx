'use client';

import { AuthGate } from '@/components/auth-gate';

// Todo o app fica atrás do login (Supabase Auth).
export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
