'use client';

import { Check, HardDrive } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BackupInfo } from '@/lib/backup-info';

interface BackupFieldsProps {
  value: BackupInfo;
  onChange: (next: BackupInfo) => void;
}

function CheckRow({
  checked,
  label,
  onClick,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border/50 last:border-b-0 active:bg-muted/50 transition-colors"
    >
      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          checked ? 'bg-primary border-primary' : 'border-muted-foreground/30'
        }`}
      >
        {checked && <Check className="w-3 h-3 text-white" />}
      </div>
      <span className="text-sm text-foreground">{label}</span>
    </button>
  );
}

/** Bloco "Backup": mídia externa / nuvem; se nuvem, pede e-mail e senha do drive. */
export function BackupFields({ value, onChange }: BackupFieldsProps) {
  const set = (patch: Partial<BackupInfo>) => onChange({ ...value, ...patch });

  return (
    <div className="rounded-xl overflow-hidden shadow-sm">
      <div className="w-full flex items-center gap-3 bg-primary text-white px-4 py-3.5">
        <HardDrive className="w-5 h-5" />
        <span className="font-semibold text-sm">Backup</span>
      </div>
      <div className="bg-card border border-t-0 border-border rounded-b-xl">
        <CheckRow
          checked={value.midiaExterna}
          label="Backup em mídia externa"
          onClick={() => set({ midiaExterna: !value.midiaExterna })}
        />
        <CheckRow
          checked={value.nuvem}
          label="Backup em nuvem"
          onClick={() => set({ nuvem: !value.nuvem })}
        />
        {value.nuvem && (
          <div className="px-4 py-3 space-y-3 border-t border-border/50">
            <div className="space-y-1.5">
              <Label htmlFor="backup-email">E-mail do drive criado</Label>
              <Input
                id="backup-email"
                type="email"
                inputMode="email"
                autoComplete="off"
                autoCapitalize="off"
                value={value.email}
                onChange={(e) => set({ email: e.target.value })}
                placeholder="exemplo@gmail.com"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="backup-senha">Senha do drive</Label>
              <Input
                id="backup-senha"
                type="text"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                value={value.senha}
                onChange={(e) => set({ senha: e.target.value })}
                placeholder="Senha do drive"
                className="rounded-xl"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
