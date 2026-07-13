---
name: conexao-chrome-cdp
description: Por que o MCP conecta na porta 9222 e por que abrir o Chrome com a flag exige fechar TODOS os processos antes.
camada: back-end
---

O `web-eyes` conecta no Chrome do usuário via `chromium.connectOverCDP("http://localhost:9222")` (Playwright). A porta `9222` é convenção do Chrome DevTools Protocol; está hard-coded em `package/src/browser.ts`, junto com `CHROME_PATH` (`C:\Program Files\Google\Chrome\Application\chrome.exe`) e `USER_DATA_DIR` — hoje `join(tmpdir(), "web-eyes-chrome-debug")` (portável, sob o temp do SO), sobrescrevível via `WEB_EYES_PROFILE_DIR`.

**Auto-launch:** `getActivePage()` checa a porta (`fetch /json/version`); se estiver fria, dá `spawn` no Chrome com a flag + perfil dedicado, faz polling até subir (15s) e conecta. Por isso o usuário não roda nada manual — era requisito dele ("nunca quero fazer algo manual, ideal é um gatilho que o Claude já faz tudo").

**Pegadinha não-óbvia (Windows):** abrir o Chrome com `--remote-debugging-port=9222` **NÃO funciona se já houver um Chrome rodando COM O MESMO PERFIL** — o comando só abre uma aba na instância existente e ignora a flag, então a porta nunca abre. É exatamente por isso que usamos um **`--user-data-dir` dedicado** (`web-eyes-chrome-debug`, sob o temp do SO): perfil separado roda em paralelo ao Chrome normal do usuário sem conflito, então o auto-launch é confiável. Custo: esse perfil abre "limpo" na primeira vez (sem os logins do perfil principal) — o usuário loga uma vez e persiste.

**Por quê perfil separado e não o normal (decisão de segurança):** a porta de depuração dá controle total do navegador a qualquer processo local. Com o perfil normal, TODAS as sessões logadas (banco, email) ficariam expostas atrás da porta. Com o perfil dedicado, só o que o usuário logar nele de propósito fica exposto — estrago contido. Não trocar pro perfil normal por conveniência.

**Detecção de aba ativa (CUIDADO — armadilha já cometida):** `getActivePage()` identifica a aba ativa pela ordem do endpoint CDP `http://localhost:9222/json/list` — ele lista os targets por **uso mais recente**, então o primeiro `type === "page"` é a aba em foco. Casa esse `id` com a `page` do Playwright via **`targetId`** (`Target.getTargetInfo`), que bate exatamente com o `id` do `/json/list`. Fallback: primeira página se não casar.

**NÃO usar `document.visibilityState` nem `document.hasFocus()` para isso.** Foi a primeira tentativa e estava ERRADA: acessadas via CDP, **todas as abas reportam `visible` e `hasFocus=true`** ao mesmo tempo, então o código pegava sempre a primeira da lista (a que abriu com o projeto), ignorando a aba realmente em foco. Diagnosticado com dados reais (3 abas, todas `visible:true hasFocus:true`). A fonte de verdade do foco é o CDP (`/json/list`), não as APIs do DOM.

**Casamento aba ativa → Playwright page (otimização v1.0.0):** o `/json/list` traz `id` E `url` do target ativo. Casamos por **URL primeiro** (barato, sem CDP session); só quando há URLs duplicadas OU a URL não casa é que comparamos `targetId` (custa uma `newCDPSession` por página). **O fallback de targetId é OBRIGATÓRIO, não removível:** páginas `chrome://` têm URL divergente entre CDP (`chrome://newtab/`) e Playwright (`chrome://new-tab-page/`), então só o targetId casa nesses casos. Não "simplificar" removendo o fallback achando que URL basta — reintroduz o bug de pegar a aba errada em chrome://.
