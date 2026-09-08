'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="text-lg font-display font-bold mb-2">Algo deu errado</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Ocorreu um erro inesperado. Tente recarregar a página.
        </p>
        <div className="flex flex-col gap-3">
          <Button onClick={reset} className="w-full h-12 rounded-xl font-semibold">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
            className="w-full h-12 rounded-xl font-semibold"
          >
            Voltar ao início
          </Button>
        </div>
      </div>
    </div>
  );
}
