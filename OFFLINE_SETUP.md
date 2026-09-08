# AUTOCOM — Instalação e Teste Offline

Guia rápido para instalar o aplicativo no celular e conferir que ele funciona
sem internet.

---

## Instalar o app (PWA) no celular

### Android (Chrome)

1. Abra o endereço do aplicativo no **Chrome** (com internet, na primeira vez).
2. Toque no menu (⋮) e escolha **"Instalar app"** ou **"Adicionar à tela inicial"**.
3. Confirme. O ícone da AUTOCOM aparecerá na tela inicial.
4. Abra o app pelo ícone — ele roda em tela cheia, como um aplicativo normal.

### iPhone/iPad (Safari)

1. Abra o endereço do aplicativo no **Safari** (com internet, na primeira vez).
2. Toque no botão **Compartilhar** (quadrado com seta para cima).
3. Escolha **"Adicionar à Tela de Início"** e confirme.
4. Abra o app pelo ícone criado.

> **Importante:** abra o app **pelo menos uma vez com internet**. Nesse primeiro
> acesso o app baixa e guarda todos os arquivos necessários para funcionar offline.

---

## Como testar que funciona sem internet

1. Abra o app uma vez **com internet** e aguarde alguns segundos (para o cache
   ser concluído).
2. **Desligue o Wi‑Fi e os dados móveis** (ou ative o Modo Avião).
3. **Feche e reabra** o app pelo ícone.
4. Confira que é possível, totalmente offline:
   - abrir o app e ver a tela inicial;
   - navegar entre as telas;
   - selecionar serviços e observações;
   - assinar na tela de assinatura;
   - (opcional) importar um PDF do cliente para extrair os dados;
   - gerar o PDF da ordem de serviço;
   - a ordem ser salva no aparelho;
   - abrir o **Histórico** e ver a ordem criada;
   - abrir/baixar o PDF salvo.

---

## Verificação técnica realizada

O fluxo completo foi testado com a **rede realmente desligada** (não apenas
"modo avião simulado"), confirmando:

- Service Worker ativo e no controle da página;
- app abrindo e navegando offline;
- criação de ordem de serviço offline (seleção, assinatura, finalização);
- **importação e leitura** do PDF do cliente offline;
- **geração** do PDF da ordem offline;
- gravação da ordem e do PDF no armazenamento local (IndexedDB);
- histórico exibindo a nova ordem offline;
- **abertura do PDF salvo** offline (endereço `blob:`).

---

## Atualizar o app

Quando houver uma nova versão, basta abrir o app **uma vez com internet**. O
Service Worker baixa a atualização em segundo plano; feche e reabra o app para
usar a versão nova.

---

## Observações

- A **primeira abertura** precisa de internet (uma única vez).
- Depois disso, o app funciona **sem Wi‑Fi e sem dados móveis**.
- Os dados ficam **no próprio aparelho**. Limpar os dados do navegador/app
  apaga o histórico local — use o botão de exportação/baixar PDF para guardar
  cópias externas quando necessário.
