# AUTOCOM — Ordem de Serviço (Aplicativo 100% Offline / PWA)

Aplicativo de **Ordem de Serviço de uso externo** da AUTOCOM. Funciona como um
**PWA (aplicativo instalável)** que, após a primeira abertura com internet, roda
**totalmente offline** — sem servidor, sem banco de dados online e sem serviços
externos.

## Principais características

- **100% offline** após a primeira abertura (Wi‑Fi e dados móveis podem ficar desligados).
- **Dados no próprio dispositivo** via **IndexedDB** (banco local do navegador).
- **PDF gerado localmente** com jsPDF e **PDF do cliente lido localmente** com pdf.js.
- **Instalável** na tela inicial (Android/iOS/desktop) via Service Worker + manifest.
- **Sem login** — abre direto na tela principal.
- **Sem dependências externas** em tempo de execução (sem Abacus, sem PostgreSQL,
  sem AWS/Azure, sem Google OAuth/Analytics/Fonts).

## Como funciona (arquitetura)

| Recurso | Implementação local |
|---|---|
| Armazenamento de ordens | `lib/offline/orders.ts` (IndexedDB) |
| Armazenamento de PDFs | `lib/offline/files.ts` (Blob no IndexedDB) |
| Configurações | `lib/offline/settings.ts` |
| Geração de PDF | `lib/pdf-generator.ts` (jsPDF) |
| Leitura de PDF | `lib/pdf-parser.ts` (pdf.js) |
| Offline/instalação | `public/sw.js`, `public/manifest.json`, `components/sw-register.tsx` |

Banco local `autocom_os_offline` — stores: `orders`, `pdfs`, `settings`.

## Rodando em desenvolvimento

```bash
cd nextjs_space
yarn install
yarn dev
```

## Verificar dependências offline

Script que procura por referências externas/rede que quebrariam o modo offline:

```bash
node scripts/check-offline-dependencies.js
```

## Variáveis de ambiente

O aplicativo **não precisa de nenhuma variável de ambiente** para funcionar.
Consulte `.env.example` — as únicas variáveis citadas são usadas apenas pelo
script **legado e opcional** `scripts/export-data.ts`.

## Documentação

- `OFFLINE_MIGRATION.md` — histórico da migração (Fases 1 a 3).
- `OFFLINE_ARCHITECTURE.md` — detalhes da arquitetura offline.
- `OFFLINE_SETUP.md` — como instalar/usar no dispositivo.
- `OBSOLETE.md` — arquivos e dependências removidos.

## Stack

PWA + React + IndexedDB + Service Worker + pdf.js + jsPDF — tudo local.
