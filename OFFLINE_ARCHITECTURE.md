# AUTOCOM — Arquitetura Offline

Como o aplicativo funciona sem conexão com a internet.

---

## Visão geral

```
┌───────────────────────────────────────────────────────────┐
│                    Dispositivo do usuário                   │
│                                                             │
│   ┌───────────────┐      ┌──────────────────────────────┐  │
│   │  App (PWA)    │      │        Service Worker        │  │
│   │  React UI     │◄────►│  (public/sw.js)              │  │
│   │               │      │  - cache dos arquivos        │  │
│   └──────┬────────┘      │  - serve o app offline       │  │
│          │               └──────────────────────────────┘  │
│          │                                                  │
│          ▼                                                  │
│   ┌───────────────────────────────────────────────────┐   │
│   │                  IndexedDB (local)                  │   │
│   │   autocom_os_offline                                │   │
│   │   - orders   (ordens de serviço)                    │   │
│   │   - pdfs     (PDF gerado, como Blob)                │   │
│   │   - settings (preferências)                         │   │
│   └───────────────────────────────────────────────────┘   │
│                                                             │
│   PDF gerado no navegador (jsPDF)                           │
│   PDF do cliente lido no navegador (pdf.js)                 │
└───────────────────────────────────────────────────────────┘
         (nenhuma chamada a servidor após a 1ª abertura)
```

---

## 1. Service Worker (`public/sw.js`)

É o componente que permite abrir o app sem internet.

### Caches

- `autocom-static-v1` — arquivos fixos do app (HTML base, JS, CSS, fontes,
  ícones, imagens, worker do PDF).
- `autocom-runtime-v1` — respostas capturadas durante o uso (navegações).

### Pré-cache na instalação

Na instalação, o Service Worker já guarda os arquivos essenciais:
`/`, `/historico`, `/offline.html`, `/manifest.json`, o logotipo, os ícones e
os arquivos do leitor de PDF (`/pdf.min.mjs`, `/pdf.worker.min.mjs`).

### Estratégias de cache

| Tipo de requisição                                   | Estratégia          |
|------------------------------------------------------|---------------------|
| Arquivos estáticos (`/_next/static/`, js, css,       | **cache-first**     |
| fontes, imagens, `.mjs`, `.pdf`)                     | (rápido e offline)  |
| Navegações de página e demais GET do mesmo domínio   | **network-first**   |
|                                                      | com retorno ao cache|
| Requisições para outros domínios (terceiros)          | ignoradas offline   |

> A partir da FASE 3, o app **não faz mais** requisições a domínios externos
> (Google Analytics, Google Fonts e script do assistente foram removidos). As
> fontes agora são de sistema e não dependem de internet.

Quando offline e sem cache para a página pedida, o Service Worker devolve a
casca do app (`/`) e, em último caso, `offline.html`.

### Atualização

O Service Worker usa `skipWaiting()` e `clients.claim()` para assumir o controle
assim que é atualizado. Para publicar uma nova versão dos arquivos em cache,
basta alterar a versão no topo de `public/sw.js` (ex.: `v1` → `v2`).

---

## 2. Dados locais — IndexedDB (`lib/offline/`)

Banco `autocom_os_offline` (versão 1), criado automaticamente na primeira
execução no navegador.

- **orders** — cada ordem de serviço (cliente, serviços, datas, responsável,
  assinatura, status). Chave: `id`.
- **pdfs** — o PDF gerado de cada ordem, guardado como `Blob`. Chave: `orderId`.
- **settings** — preferências locais. Chave: `key`.

Operações principais:

- `createOrder(...)` — cria a ordem e grava o PDF (`lib/offline/orders.ts`).
- `getOrders()` / `getOrder(id)` — lista e busca (para o histórico).
- `getPdfBlob(orderId)` / `getPdfObjectUrl(orderId)` — recupera o PDF salvo e
  gera um endereço `blob:` para abrir/baixar, **tudo offline**
  (`lib/offline/files.ts`).

---

## 3. Geração e leitura de PDF (no navegador)

- **Gerar PDF:** `lib/pdf-generator.ts` usa **jsPDF** (empacotado no app, em
  cache) — não envia dados para nenhum servidor.
- **Ler PDF do cliente:** `lib/pdf-parser.ts` usa **pdf.js** carregado a partir
  de `/pdf.min.mjs` e `/pdf.worker.min.mjs` (ambos em cache) — a extração dos
  dados acontece no próprio dispositivo.

---

## 4. Abertura sem servidor

O app não faz mais nenhuma verificação no servidor para abrir:

- não há verificação de sessão/login no servidor;
- não há passo de inicialização que dependa de rede;
- as páginas iniciais (`/` e `/historico`) renderizam direto no dispositivo e
  buscam os dados no IndexedDB local.
