---
name: modo-escuta-watch
description: Como o /look-watch funciona (botões no Chrome + loop), e as 4 armadilhas resolvidas a ferro e fogo. Ler antes de mexer em watch.ts ou overlay.ts.
camada: back-end
---

O `/look-watch` injeta uma barra de 4 botões (text/image/dom/stop) nas abas do Chrome. O usuário clica → o Claude captura aquele modo → discute → re-escuta. Comando UMA vez; o loop é mantido pela skill `look-watch` (ela instrui o Claude a re-chamar `watch` após cada `WATCH_CLICK`, parando só em `WATCH_STOPPED`).

Arquitetura: `tools/overlay.ts` (UI em Shadow DOM) + `tools/watch.ts` (tool `watch`, bloqueia até o clique) + skill `look-watch` (o loop). O fluxo inverso (browser → Claude) respeita o MCP porque a tool é iniciada pelo Claude; o clique só resolve uma Promise dentro dela.

## As 4 armadilhas resolvidas (NÃO desfazer sem entender)

1. **exposeFunction/Binding, não fetch — por causa de CSP.** Os botões chamam uma função Node exposta via `context.exposeBinding` (canal CDP), NÃO um `fetch` pra servidor local. Muitos sites têm CSP `connect-src 'self'` que bloquearia o fetch. O binding via CDP não passa pela rede, então CSP não afeta. Não introduzir servidor HTTP "pra facilitar" — reintroduz o problema de CSP.

2. **Overlay mantido por POLLING (1s), não por eventos.** `addInitScript` NÃO dispara em abas que o usuário abre manualmente sobre CDP (verificado). Pior: ao digitar uma URL numa aba `chrome://new-tab-page`, o Chrome TROCA o target CDP — a `page` do Playwright fica órfã e seus eventos `load`/`framenavigated` param de disparar. Por isso o overlay sumia ao navegar. Solução: um `setInterval` que varre todas as abas a cada 1s e re-injeta onde o overlay não está. Não trocar por eventos achando que é "mais limpo" — os eventos são engolidos pelo swap de target.

3. **Heartbeat de progresso pra não bater no idle timeout.** A tool `watch` bloqueia esperando o clique. A partir do Claude Code 2.1.187, uma tool sem resposta NEM progresso por 5 min é abortada. Então o `watch` emite `notifications/progress` a cada 30s (via `extra.sendNotification` no index.ts, usando o `progressToken` do request). Mantém a escuta viva indefinidamente, em silêncio. Mesmo em versões antigas (sem o idle timeout) mantemos o heartbeat — robustez pra quando o usuário atualizar.

4. **Captura reusa runText/runScreenshot/runDom — mas recebendo a Page do clique.** No clique, o `watch` chama a função de captura correspondente. Reuso, não duplicação da lógica de Readability/screenshot.

   **CORREÇÃO 2026-07-19 (esta armadilha estava documentada errada — não reverter):** a versão anterior desta linha dizia que a captura "usa getActivePage = aba em foco = a aba clicada". **A premissa é falsa** e era um bug de vazamento: entre o clique e a captura, o `runWatch` descartava a página de origem e reprocurava a aba ativa — e a captura, via `withActivePage`, abria OUTRA conexão CDP e repetia a heurística de novo. Se o usuário trocasse de aba nesse intervalo (que inclui o round-trip do binding e a injeção do overlay), o Claude capturava — e mostrava — o conteúdo de uma aba que o usuário **não** clicou.

   **Como é agora:** a binding preserva a `Page` de origem (`src.page`, o 1º argumento do callback do `exposeBinding`, que antes era ignorado como `_src`) num `SourcedEvent = {event, page}`. `withActivePage(fn, page?)` ganhou um 2º parâmetro opcional: quando vem preenchido, roda direto naquela Page e **pula tanto a conexão nova quanto a heurística**; quando não vem, mantém o comportamento antigo (é o caminho das skills `/look-text` etc., que chamam as tools direto e aí a aba em foco é mesmo a certa). As 4 capturas aceitam `target?: Page` e repassam.

   Dois porquês que não dá pra ler no código: (a) o parâmetro é **opcional** de propósito — obrigatório quebraria as chamadas diretas das skills, que não têm Page nenhuma pra passar; (b) o ganho de reusar a `sharedBrowser` (uma conexão a menos por captura) é **efeito colateral, não o motivo** — o motivo é correção, não performance. Não "simplifique" voltando a derivar a aba ativa dentro da captura: o bug volta, e ele é silencioso (o resultado parece válido, só é da aba errada).

## Caixa de texto no overlay (conversar sem stopar — o porquê arquitetural)

O Claude Code **não suporta tool MCP não-bloqueante** (issue #18617 fechada como not-planned; MCP Tasks/elicitation não suportado como cliente). Consequência dura: enquanto `watch` está pendente, o Claude está preso dentro dela e NÃO ouve o terminal. Logo, digitar no terminal sem Esc é impossível, e dar Esc **mata o turno onde o loop vive** (o loop é a skill re-chamando `watch`, não o servidor). A ÚNICA forma de "conversar sem stopar" com MCP síncrono é a mensagem chegar como **mais um evento do mesmo loop**, igual a um clique: a caixa de texto no overlay chama a mesma binding CDP com `{kind:"message", text}`, o `watch` resolve, o Claude responde e re-arma. Não trocar isso por "deixar digitar no terminal" — não funciona no Claude Code.

Detalhes que não podem ser desfeitos: a binding agora recebe um **evento discriminado** (`WatchEvent = {kind:"action",action} | {kind:"message",text}`), não mais só a string da ação — uma binding só (re-expor é a armadilha 1). `WATCH_MSG` **não captura nada** (decisão do usuário) — Claude responde do contexto. O sweep (1s) só re-injeta se o overlay não existe — então NÃO recria a caixa enquanto você digita (não rouba foco nem apaga o texto).

### Armadilha 5 — teclas não podem vazar pros atalhos do site (window + capture, NÃO document)
Digitar na caixa NÃO pode disparar os atalhos do site (espaço pausa YouTube, "/" foca busca, j/k/l seek). `stopPropagation` no textarea ou no shadowRoot **NÃO resolve** — verificado num preview que simula um listener capture no document (como o YouTube). Por quê: a fase de **captura desce window → document → … → alvo**, e os sites registram os atalhos em **`document`/capture no load**, ANTES do overlay existir. Logo o document SEMPRE vê a tecla primeiro; qualquer listener nosso abaixo dele (document, shadow) perde a corrida. **Solução que funciona:** registrar o swallow em **`window` + capture** (window captura antes do document) e dar `stopImmediatePropagation()` nas teclas vindas do overlay (`e.target === host`, por retargeting do shadow). Cobre keydown/keyup/keypress. Como `buildOverlay` re-roda (sweep/navegação), o cleanup anterior é guardado em `window.__webEyesKeyCleanup` e chamado no início (e no `removeOverlay`/stop) pra não vazar listeners. NÃO trocar window→document achando que "tanto faz" — o bug volta. Enter envia+limpa; Shift+Enter quebra linha (handler separado no textarea, sem stopPropagation porque o window-swallow já isola).

## Fluxo Esc → conversa → volta (estado persiste entre ciclos — NÃO fazer tear-down por clique)

O loop re-entra em `watch` uma vez por clique. Para conversar no meio da escuta o usuário aperta **Esc**, fala, e o Claude re-arma `watch`. Para isso funcionar sem perder cliques, **NÃO** destruímos nada por ciclo (o `watch` antigo fazia `removeOverlay` + `browser.close()` a cada retorno — isso foi removido de propósito). O que persiste entre re-arms:

- **Conexão CDP compartilhada** (`sharedBrowser`/`closeSharedBrowser` em browser.ts): uma só conexão pro loop inteiro; fecha só no **stop**. Reconectar por clique custava latência e fazia o overlay piscar. `close()` em conexão CDP só DESCONECTA — nunca fecha o Chrome do usuário.
- **Overlay deixado no ar** entre ciclos; removido só no `stop` (`stopWatch`). Por isso um clique nunca cai num gap sem botão.
- **Clique no gap é bufferizado** (`bufferedClick`): se o usuário clica enquanto nenhum `waitForClick` está ativo (ex: logo após Esc), guarda e entrega no próximo `watch`. A binding fica exposta o loop todo e roteia pro `pendingResolve` atual ou pro buffer.
- **Re-expor binding por conexão, não "uma vez global"** (`boundBrowser !== browser`): se a conexão cai e `sharedBrowser` reconecta, a binding precisa ser re-exposta na conexão nova — senão os botões da nova conexão ficam mortos. Não trocar por um booleano `exposedOnce`.
- **Esc usa `extra.signal`** (AbortSignal do SDK, threaded até `waitForClick`): no abort, limpa os `setInterval` (poll/heartbeat) e o `pendingResolve` órfão. Sem isso, vaza intervalos e um clique posterior resolveria uma Promise morta. A binding/conexão/overlay continuam vivos (é o que permite re-armar após Esc).

Animação "…" (feedback de captura): `setOverlayBusy` no overlay.ts põe "…" pulsando no botão clicado e dim/disable nos outros; keyframes vivem no Shadow DOM (CSS do site não alcança). Limpo pelo sweep no próximo re-arm.

Overlay NÃO aparece nas capturas: o overlay é a superfície de controle do usuário, não conteúdo da página — então `runWatch` o esconde ao redor de QUALQUER captura (`setOverlayHiddenOn(page, true)` → captura → `false`). Dois porquês não-óbvios: (1) usa `visibility:hidden`, NÃO `remove` — se removesse, o sweep (1s) re-injetaria um overlay novo no meio; com hidden o `getElementById` ainda acha o elemento e o sweep não mexe. (2) Escondo só no instante da captura e mostro logo após, então o "…" continua visível durante o processamento do Claude (some só nos ms do print). Detalhe: o screenshot roda em conexão CDP própria (`withActivePage`), diferente da `sharedBrowser` — funciona porque o overlay vive no DOM da aba, compartilhado entre conexões.

Relacionado: [Conexão Chrome via CDP](conexao-chrome-cdp.md), [Captura de texto via Readability](captura-texto-readability.md).
