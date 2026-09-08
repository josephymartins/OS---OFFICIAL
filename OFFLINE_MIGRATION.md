# AUTOCOM — Migração para Aplicativo Offline (PWA)

Este documento descreve a migração do aplicativo AUTOCOM (Ordem de Serviço)
para funcionar **100% offline**, sem depender de servidor, banco de dados online
ou serviços externos após a primeira abertura.

> A migração é feita **por fases**, com testes entre cada fase.

---

## FASE 1 — Camada de dados local (concluída)

Substituição do banco de dados online (PostgreSQL) e do armazenamento de arquivos
na nuvem (S3) por uma camada de dados **local no próprio dispositivo**, usando
**IndexedDB** (via biblioteca `idb`).

- `lib/offline/db.ts` — abertura/criação do banco local `autocom_os_offline`
  (stores: `orders`, `pdfs`, `settings`).
- `lib/offline/orders.ts` — criar, listar, buscar e excluir ordens de serviço.
- `lib/offline/files.ts` — salvar e recuperar o PDF gerado (Blob) localmente.
- `lib/offline/settings.ts` — preferências locais.

O PDF é **gerado no próprio navegador** (jsPDF) e o PDF do cliente é **lido no
próprio navegador** (pdf.js), sem enviar nada para servidores.

---

## FASE 2 — Abrir e funcionar offline como PWA (concluída)

Objetivo: depois de aberto **uma vez com internet**, o aplicativo abre e funciona
totalmente **sem conexão** (Wi‑Fi e dados móveis desligados).

### O que foi implementado

1. **manifest.json** (`public/manifest.json`) — permite instalar o app na tela
   inicial (nome AUTOCOM, ícones, cor tema, modo tela cheia `standalone`).
2. **Service Worker** (`public/sw.js`) — faz o cache de todos os arquivos de
   inicialização e serve o app offline.
3. **Registro do Service Worker** (`components/sw-register.tsx`) — registra o SW
   automaticamente quando o app abre.
4. **Página de fallback offline** (`public/offline.html`).
5. **Ícones do app** (`public/icon-192.png`, `icon-512.png`,
   `icon-maskable-512.png`, `apple-touch-icon.png`).
6. **Remoção da barreira de login no servidor** — o app abria com uma verificação
   de sessão no servidor, o que impedia a abertura offline. Essa verificação foi
   removida para permitir o funcionamento sem conexão.

### Arquivos criados

- `public/manifest.json`
- `public/sw.js`
- `public/offline.html`
- `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/apple-touch-icon.png`
- `components/sw-register.tsx`
- `OFFLINE_MIGRATION.md`, `OFFLINE_ARCHITECTURE.md`, `OFFLINE_SETUP.md`

### Arquivos modificados

- `app/layout.tsx` — link do manifesto, metas de PWA, cor tema (viewport),
  ícone Apple e registro do Service Worker.
- `app/page.tsx` — removida a verificação de sessão no servidor.
- `app/historico/page.tsx` — removida a verificação de sessão no servidor.
- `components/providers.tsx` — removido o provedor de sessão (não é mais necessário).
- `components/home-client.tsx` — removido o botão de sair (logout).
- Removido `middleware.ts` (fazia a verificação de login que bloqueava o offline).

### Dependências

- Adicionadas: nenhuma nova nesta fase (o `idb` foi adicionado na Fase 1).
- Removidas: nenhuma ainda (a limpeza de dependências não usadas está prevista
  para a Fase 3).

---

## FASE 3 — Limpeza de dependências externas (concluída)

Remoção de tudo que não é mais usado no modo offline: autenticação (NextAuth/
Google OAuth), banco online (Prisma/PostgreSQL), armazenamento em nuvem
(AWS S3 / Azure), Google Analytics, Google Fonts, script externo do assistente
(Abacus `appllm-lib.js`) e as rotas de API antigas.

### O que foi feito

1. **Autenticação removida** — sem login; o app abre direto na tela principal.
2. **Banco online removido** — Prisma/PostgreSQL substituídos 100% pelo IndexedDB.
3. **Nuvem removida** — AWS S3/Azure substituídos pelo armazenamento local de PDFs.
4. **Rastreamento removido** — Google Analytics e script externo retirados.
5. **Fontes locais** — `next/font/google` substituído por fontes de sistema; o app
   não depende mais de baixar fontes da internet.
6. **Dependências e variáveis de ambiente obsoletas removidas** (ver OBSOLETE.md).
7. **Script de verificação** `scripts/check-offline-dependencies.js` criado.

> A lista completa de arquivos removidos/modificados está em **OBSOLETE.md**.

---

## Limitações atuais

- **A primeira abertura precisa de internet** (uma única vez) para baixar e
  armazenar os arquivos do app. Depois disso, funciona totalmente offline.
- Backup dos dados do PostgreSQL antigo preservado em
  `scripts/export/dados-exportados-*.json` (caso seja necessário importar o
  histórico antigo para o IndexedDB futuramente).
