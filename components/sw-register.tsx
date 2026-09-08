'use client';

import { useEffect } from 'react';

/**
 * Registra o Service Worker que torna o aplicativo disponível offline.
 * O SW faz cache dos assets (HTML/JS/CSS/fontes/ícones) na primeira visita
 * com internet; depois disso o app abre sem rede.
 */
export function SwRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // Procura atualizações do SW quando o app volta ao foco.
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.error('Falha ao registrar o Service Worker:', err);
        });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
