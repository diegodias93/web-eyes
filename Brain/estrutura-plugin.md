---
name: estrutura-plugin
description: Como o web-eyes vira plugin do Claude Code, e por que NÃO precisa empacotar o Chromium do Playwright (cliente CDP puro). Ler antes de mexer no empacotamento/publicação.
camada: back-end
---

O `web-eyes` é distribuído como **plugin do Claude Code**. Estrutura mínima validada:
- `plugin/.claude-plugin/plugin.json` — manifesto (name, version, description).
- `plugin/.mcp.json` — registra o servidor: `node ${CLAUDE_PLUGIN_ROOT}/dist/index.js`. A variável `${CLAUDE_PLUGIN_ROOT}` é expandida pelo Claude Code para o diretório do plugin.
- `plugin/skills/` — as skills de gatilho (look-chrome, look-text, look-image, look-dom, look-watch).
- Marketplace na raiz do repo: `web-eyes/.claude-plugin/marketplace.json`, com `source: ./plugin` (relativo ao diretório do marketplace). Instala via `/plugin marketplace add <caminho>` (local) ou `diegodias93/web-eyes` (repo).

**Por que NÃO precisa empacotar o Chromium (decisão não-óbvia):** Playwright normalmente baixa um Chromium próprio (~150MB), o que seria um pesadelo de empacotamento num plugin. Mas aqui o Playwright age só como **cliente CDP** — `connectOverCDP` no Chrome do usuário. Ele não inicia browser nenhum, então **não precisa do binário do Chromium**. Não tente bundlar Chromium "porque é Playwright" — não é necessário e só inflaria o pacote.

**Pegadinha do cache (relevante só ao PUBLICAR via marketplace remoto):** plugins de marketplace são **copiados** para `~/.claude/plugins/cache`, não usados in-place. Isso significa que `dist/` (compilado) e `node_modules` precisam viajar JUNTO no pacote — não dá pra contar com `npm install`/`build` na máquina do usuário. A doc sugere `${CLAUDE_PLUGIN_DATA}` para `node_modules` que devem persistir entre versões. Para teste local via `--plugin-dir` ou marketplace local, isso não morde (usa os arquivos no lugar). Resolver só na etapa de publicação.

**Validação sem reiniciar:** dá pra provar o plugin por CLI simulando o que o Claude Code faz — expandir `${CLAUDE_PLUGIN_ROOT}` no comando do `.mcp.json`, subir via stdio e falar o protocolo MCP (initialize → tools/list → tools/call). Foi assim que validamos sem depender de reinício de sessão.

## Nomenclatura final (não confundir os 4 nomes)

São quatro coisas distintas (naming canônico confirmado 2026-07-10 — a fonte da verdade são os arquivos, não descrições antigas):
- **Repo GitHub:** `diegodias93/web-eyes` (era `Pkdiego`, usuário renomeado).
- **Marketplace** (a "loja"): `name: "newlevel"` no `web-eyes/.claude-plugin/marketplace.json` (marca do autor, newlevel.com.br).
- **Plugin** (o produto): `name: "web-eyes"` no `web-eyes/plugin/.claude-plugin/plugin.json`.
- **Pacote npm:** `@diegodias93/web-eyes` (escopo = username npm).

O marketplace aponta pro repo (`diegodias93/web-eyes`), NÃO pro profile — é de lá que o Claude Code clona o `marketplace.json`. O título mostrado (`newlevel`) é o nome do marketplace; a URL é a fonte.

## Múltiplos plugins (quando criar o 2º)

Um marketplace abriga N plugins. Para adicionar outro, basta uma nova entrada no array `plugins[]` do `marketplace.json`:
- `source: "./outra-pasta"` → plugin numa subpasta do mesmo repo (monorepo).
- `source: "https://github.com/diegodias93/outro-repo"` → plugin em repo separado.

No `/plugin` aparecem aninhados: marketplace `newlevel` → cada plugin com seu switch independente. Usuário adiciona o marketplace UMA vez e vê todos. Se virar muitos plugins, considerar renomear o repo `web-eyes` → algo genérico (`claude-plugins`) para a loja não ficar amarrada a um produto só. Decisão futura, não urgente.

## Publicação (npm + GitHub)

Decisão: distribuir via **npm público** (`@diegodias93/web-eyes`) + **plugin no GitHub** (`diegodias93/web-eyes`), em **um repo único**:
- `web-eyes/.claude-plugin/marketplace.json` (raiz) → `source: ./plugin`.
- `web-eyes/package/` → o pacote npm (código TS). `files: ["dist"]` (allowlist) garante que só o compilado vai pro npm — pacote fica ~4kB.
- `web-eyes/plugin/` → o plugin do Claude Code. **Não é mais "leve"** desde a mudança abaixo — ver seção seguinte.

**Pegadinhas não-óbvias gravadas pra não repetir:**
1. **`playwright` → `playwright-core`:** o pacote `playwright` baixa ~150MB de browsers no install. Como só usamos `connectOverCDP` (cliente CDP, não iniciamos browser), trocamos por `playwright-core` (mesmo motor, sem download). NÃO voltar pro `playwright`.
2. **Nome do `bin` tem que bater com o nome do pacote SEM escopo:** pacote `@diegodias93/web-eyes` → bin precisa ser `web-eyes` (não `web-eyes-mcp`). Senão `npx @diegodias93/web-eyes` não acha o binário.
3. **`files: ["dist"]` exige `dist/` compilado no publish:** o `prepublishOnly: "npm run build"` cobre isso automaticamente.

Validação sem publicar: `npm pack` → instalar o `.tgz` num dir limpo → rodar o bin e fazer handshake MCP. Foi assim que confirmamos que o `npx` funciona antes de publicar.

## `.mcp.json` do plugin: `node` direto, NÃO `npx` (revisão 2026-07-09)

**Mudança de decisão, com motivo não-óbvio — não reverter para `npx` sem reler isto.**

O plugin usava `"command": "npx", "args": ["-y", "@diegodias93/web-eyes@latest"]` (plugin "leve", baixava o pacote do npm em runtime). Isso **quebra no Windows** com `spawn ENOENT`, mesmo com Node/npm corretamente instalados e no PATH — não é erro de configuração do usuário, é um **bug aberto do próprio Claude Code**: [issue #58510](https://github.com/anthropics/claude-code/issues/58510). No Windows, `npx` é `npx.cmd` (shim batch), e `child_process.spawn` do Node só resolve `.cmd`/`.bat` via PATHEXT quando `shell: true` está ativo. O Claude Code spawna servidores MCP **sem** `shell: true`, então qualquer plugin com `command: "npx"` falha no Windows. (O mesmo bug já foi corrigido para o spawn de LSP — issue #17312 — mas o fix não foi replicado no caminho de spawn do MCP.)

**Correção adotada:** `.mcp.json` agora usa `"command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/dist/index.js"]`. `node.exe` é um binário real (não um shim), então `spawn` funciona sem `shell:true` em qualquer SO — não depende da Anthropic corrigir o bug.

**Custo aceito:** o plugin deixou de ser leve — agora carrega `dist/` (compilado) **e** `node_modules` de produção embutidos (~70MB, maioria `playwright-core` + `pdfjs-dist`). Isso significa:
- **A cada release**, além de publicar no npm, é preciso recompilar (`npm run build` em `package/`) e recopiar `dist/` + reinstalar `node_modules` (`npm install --omit=optional --omit=dev`) dentro de `web-eyes/plugin/`, e commitar isso no repo. Não é mais "só publica no npm e pronto".
- **`--omit=optional` é obrigatório** ao gerar o `node_modules` do plugin: `pdfjs-dist` traz `@napi-rs/canvas` como dependency opcional, que por sua vez tem ~11 binários nativos por SO/arquitetura (`win32-x64-msvc`, `darwin-arm64`, `linux-x64-gnu`, ...). O código (`pdf.ts`) já usa deliberadamente o build "legacy" do pdfjs (sem canvas/worker) — essa lib nunca roda — mas um `npm install` normal ainda a baixaria, trazendo só o binário da plataforma de quem rodou o install (inútil, ou pior, incompatível se for a plataforma errada). Sem `--omit=optional`, o plugin ficaria não-portável de novo, por outro motivo.
- Reversível: se a Anthropic corrigir #58510 (spawn de MCP com `shell:true` no Windows), dá pra voltar ao modelo leve com `npx` e reduzir o plugin a ~poucos KB de novo.

Relacionado: [Conexão Chrome via CDP](conexao-chrome-cdp.md).
