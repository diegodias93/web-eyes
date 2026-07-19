# 🧠 Brain — Índice

Este é o índice do conhecimento persistente do projeto. **Uma linha por arquivo.**
O Claude lê este arquivo no início de uma tarefa para decidir o que é relevante,
e os arquivos individuais **sob demanda** — só quando a descrição abaixo indicar.

> Regra de ouro: se uma memória existe em `Brain/` mas **não tem linha aqui**, ela é
> invisível. Toda nova memória precisa de uma linha neste índice.

---

## Front-end
<!-- - [Título](arquivo.md) — gancho de uma linha sobre quando isso importa -->

## Back-end
- [Conexão Chrome via CDP](conexao-chrome-cdp.md) — porta 9222, auto-launch do Chrome, e por que o perfil é dedicado (`web-eyes-chrome-debug` sob o temp do SO) e não o normal (segurança: não expor todas as sessões logadas atrás da porta)
- [Estrutura de plugin](estrutura-plugin.md) — estrutura do plugin/marketplace, os 4 nomes sob `diegodias93` (repo/mkt/plugin/npm), por que NÃO empacotar o Chromium, por que o `.mcp.json` usa `node` (não `npx`) — bug #58510 no Windows — e por que `plugin/dist` + `plugin/node_modules` são COMMITADOS (+ o `.gitignore` aninhado que quebrava isso)
- [Captura de texto via Readability](captura-texto-readability.md) — por que capture_text usa @mozilla/readability injetada no browser (não jsdom, não limpeza por tags) e por que launchChrome checa existsSync antes do spawn (bug async do Windows)
- [Captura de PDF](captura-pdf.md) — como capture_text extrai PDF (mesmo gatilho, sem botão novo): detecção por contentType, bytes via page.request (sessão), pdfjs legacy sem worker + pathToFileURL; escaneado avisa e sugere /look-image
- [Modo-escuta /look-watch](modo-escuta-watch.md) — botões no Chrome + loop; as 5 armadilhas (binding-não-fetch por CSP, overlay por polling-não-eventos por swap de target, heartbeat de progresso, captura na Page do clique — NÃO na aba ativa —, teclas em window+capture)
- [Navegação open_url](navegacao-open-url.md) — por que open_url abre ABA NOVA (não navega a ativa: não sequestrar a sessão do usuário), por que "Go" NÃO é botão do look-watch (é iniciativa do Claude, não clique do usuário) e por que só aceita http/https (bloqueia file://; cuidado: `localhost:3000` não é esquema)

## Importante
<!-- Decisões e restrições que valem para todo o projeto, independente de camada -->
- [Brain vs memory nativo](decisao-brain-vs-memory-nativo.md) — por que `autoMemoryEnabled: false` e usamos só o Brain (versionado no git); não religar o nativo sem migrar antes
- [Permissões git no settings](permissoes-git-no-settings.md) — por que o `deny` não inclui `git config`/`remote`/`fetch` (dual-use de leitura); não adicioná-los achando que "faltou"

---

### Como usar
As regras de quando ler, escrever e curar o Brain estão no `CLAUDE.md` (seção 🧠 Brain) — fonte única, para não divergir. Resumo: toda memória precisa de uma linha aqui, senão é invisível.
