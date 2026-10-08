'use client';

import { useEffect, useState } from 'react';
import { Bookmark, Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSetting, setSetting } from '@/lib/offline/settings';

export interface ServiceTemplate {
  nome: string;
  servicos: string[];
}

const KEY = 'modelos_servicos';

interface Props {
  selectedServices: string[];
  onApply: (services: string[]) => void;
}

/** Modelos de atendimento do técnico: aplica uma lista pronta de serviços. */
export function ServiceTemplates({ selectedServices, onApply }: Props) {
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSetting<ServiceTemplate[]>(KEY)
      .then((v) => setTemplates(Array.isArray(v) ? v : []))
      .catch(() => setTemplates([]))
      .finally(() => setLoaded(true));
  }, []);

  const persist = async (next: ServiceTemplate[]) => {
    setSaving(true);
    try {
      await setSetting(KEY, next);
      setTemplates(next);
      return true;
    } catch {
      toast.error('Não foi possível salvar o modelo. Verifique a internet.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveCurrent = async () => {
    const nome = name.trim();
    if (!nome) return;
    if ((selectedServices ?? []).length === 0) {
      toast.error('Marque os serviços antes de salvar o modelo');
      return;
    }
    const others = templates.filter((t) => t.nome.toLowerCase() !== nome.toLowerCase());
    if (await persist([...others, { nome, servicos: [...selectedServices] }])) {
      toast.success(`Modelo "${nome}" salvo`);
      setName('');
      setNaming(false);
    }
  };

  const remove = async (t: ServiceTemplate) => {
    if (!window.confirm(`Excluir o modelo "${t.nome}"?`)) return;
    if (await persist(templates.filter((x) => x.nome !== t.nome))) toast.success('Modelo excluído');
  };

  return (
    <div className="mb-4 rounded-xl bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Bookmark className="h-3.5 w-3.5 text-primary" /> Modelos de atendimento
        </span>
        {!naming && (
          <button
            type="button"
            onClick={() => setNaming(true)}
            className="flex items-center gap-1 text-xs font-medium text-primary"
          >
            <Plus className="h-3.5 w-3.5" /> Salvar seleção como modelo
          </button>
        )}
      </div>

      {naming && (
        <div className="mb-2 flex items-center gap-2">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveCurrent(); } }}
            placeholder="Nome do modelo (ex.: Implantação)"
            className="h-9 rounded-lg text-sm"
            maxLength={40}
          />
          <Button size="sm" className="rounded-lg" disabled={!name.trim() || saving} onClick={saveCurrent}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
          <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => { setNaming(false); setName(''); }}>
            Cancelar
          </Button>
        </div>
      )}

      {!loaded ? (
        <p className="text-xs text-muted-foreground">Carregando…</p>
      ) : templates.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Marque os serviços de um tipo de atendimento e salve como modelo para usar depois com um toque.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <span
              key={t.nome}
              className="inline-flex items-center overflow-hidden rounded-full border border-primary/30 bg-primary/5 text-xs"
            >
              <button
                type="button"
                className="px-3 py-1.5 font-medium text-primary"
                onClick={() => {
                  onApply([...t.servicos]);
                  toast.success(`Modelo "${t.nome}" aplicado (${t.servicos.length} serviços)`);
                }}
              >
                {t.nome}
              </button>
              <button
                type="button"
                aria-label={`Excluir modelo ${t.nome}`}
                className="border-l border-primary/20 px-2 py-1.5 text-muted-foreground"
                onClick={() => remove(t)}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
