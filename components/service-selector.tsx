'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { serviceCategories, CUSTOM_SERVICE_PREFIX, isCustomService, serviceLabel } from '@/lib/services-config';
import { ChevronDown, Settings, FileText, BarChart3, CircleDot, UtensilsCrossed, Check, Plus, PencilLine } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const iconMap: Record<string, any> = {
  Settings,
  FileText,
  BarChart3,
  CircleDot,
  UtensilsCrossed,
};

interface ServiceSelectorProps {
  selectedServices: string[];
  onToggle: (item: string) => void;
}

export function ServiceSelector({ selectedServices, onToggle }: ServiceSelectorProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const customItems = (selectedServices ?? []).filter(isCustomService);

  const addCustom = () => {
    const text = customText.trim().replace(/\s+/g, ' ');
    if (!text) return;
    const key = CUSTOM_SERVICE_PREFIX + text;
    if (!(selectedServices ?? []).includes(key)) onToggle?.(key);
    setCustomText('');
  };

  return (
    <div className="space-y-3">
      {(serviceCategories ?? []).map((category: any) => {
        const IconComponent = iconMap?.[category?.icon] ?? Settings;
        const isExpanded = expandedCategory === category?.id;
        const categoryItems = category?.items ?? [];
        const selectedCount = categoryItems.filter((item: string) =>
          (selectedServices ?? []).includes(`${category?.id}::${item}`)
        )?.length ?? 0;

        return (
          <div key={category?.id} className="rounded-xl overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setExpandedCategory(isExpanded ? null : category?.id)}
              className="w-full flex items-center justify-between bg-primary text-white px-4 py-3.5 transition-all active:opacity-90"
            >
              <div className="flex items-center gap-3">
                <IconComponent className="w-5 h-5" />
                <span className="font-semibold text-sm">{category?.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {selectedCount > 0 && (
                  <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {selectedCount}
                  </span>
                )}
                <ChevronDown
                  className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="bg-card border border-t-0 border-border rounded-b-xl">
                    {categoryItems.map((item: string, idx: number) => {
                      const uniqueKey = `${category?.id}::${item}`;
                      const isChecked = (selectedServices ?? []).includes(uniqueKey);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onToggle?.(uniqueKey)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border/50 last:border-b-0 active:bg-muted/50 transition-colors"
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              isChecked
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground/30'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-sm text-foreground">{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Serviço não cadastrado: digita e adiciona à OS */}
      <div className="rounded-xl overflow-hidden shadow-sm">
        <div className="w-full flex items-center justify-between bg-primary text-white px-4 py-3.5">
          <div className="flex items-center gap-3">
            <PencilLine className="w-5 h-5" />
            <span className="font-semibold text-sm">Outros serviços</span>
          </div>
          {customItems.length > 0 && (
            <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {customItems.length}
            </span>
          )}
        </div>
        <div className="bg-card border border-t-0 border-border rounded-b-xl">
          {customItems.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onToggle?.(key)}
              title="Toque para remover"
              className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border/50 active:bg-muted/50 transition-colors"
            >
              <div className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 bg-primary border-primary">
                <Check className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm text-foreground">{serviceLabel(key)}</span>
            </button>
          ))}
          <div className="flex items-center gap-2 px-3 py-3">
            <Input
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="Serviço não cadastrado..."
              className="rounded-xl"
              maxLength={160}
            />
            <Button type="button" onClick={addCustom} disabled={!customText.trim()} className="rounded-xl flex-shrink-0">
              <Plus className="w-4 h-4 mr-1" /> Adicionar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
