'use client';

import { useCallback, useEffect, useState } from 'react';
import { CloudOff, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { countPending, syncPending } from '@/lib/offline/queue';

/** Aviso de OS guardadas no aparelho; envia sozinho quando volta a internet. */
export function SyncStatus() {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setPending(await countPending());
    } catch {
      setPending(0);
    }
  }, []);

  const run = useCallback(async (manual: boolean) => {
    setSyncing(true);
    const { sent, remaining } = await syncPending();
    setSyncing(false);
    setPending(remaining);
    if (sent > 0) {
      toast.success(sent === 1 ? '1 OS enviada!' : `${sent} OS enviadas!`);
    } else if (manual && remaining > 0) {
      toast.error('Não foi possível enviar agora. Tente de novo com internet.');
    }
  }, []);

  useEffect(() => {
    refresh();
    run(false);
    const onOnline = () => {
      run(false);
    };
    const onChanged = () => {
      refresh();
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('os-queue-changed', onChanged);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('os-queue-changed', onChanged);
    };
  }, [refresh, run]);

  if (pending === 0) return null;

  return (
    <div className="max-w-lg mx-auto px-4 pt-3">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <span className="flex items-center gap-2">
          <CloudOff className="w-4 h-4 flex-shrink-0" />
          {pending === 1 ? '1 OS aguardando envio' : `${pending} OS aguardando envio`}
        </span>
        <button
          type="button"
          onClick={() => run(true)}
          disabled={syncing}
          className="flex items-center gap-1 rounded-lg border border-amber-400 bg-white px-2 py-1 text-xs font-medium disabled:opacity-60"
        >
          {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Enviar agora
        </button>
      </div>
    </div>
  );
}
