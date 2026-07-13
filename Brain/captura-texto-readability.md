---
name: captura-texto-readability
description: Por que o capture_text usa @mozilla/readability injetada no browser, e por que launchChrome checa existsSync antes de spawnar. Ler antes de mexer em text.ts ou launchChrome.
camada: back-end
---

## Texto limpo via Readability (injetada no browser)

`capture_text` (`package/src/tools/text.ts`) usa **@mozilla/readability** (motor do "modo leitura" do Firefox) para extrair só o conteúdo principal da página, descartando menu/rodapé/sidebar.

**Por que Readability e não limpeza por tags:** a primeira tentativa removia `nav/footer/aside` via seletor. FALHOU em sites reais (g1, maioria dos portais BR) porque eles não usam tags semânticas — o menu é um monte de `<div class="...">`. Resultado: o texto ficava igual ou maior. Readability resolve em qualquer site (testado: artigo g1 −55%, busca Google −76%, example.com OK).

**Por que injetada no browser (não jsdom):** Readability roda sobre um DOM. Em vez de parsear o HTML no Node com `jsdom` (pesado, vários MB, +1 dep), injetamos o arquivo standalone `@mozilla/readability/Readability.js` via `page.addScriptTag({ path: require.resolve(...) })` e rodamos no DOM real do Chrome. Uma lib só, leve. O `require.resolve` (via `createRequire`) acha o arquivo onde quer que o pacote esteja instalado (incl. via npx).

**Detalhes que parecem arbitrários mas têm razão:**
- Passa um **clone** do document pro Readability (`document.cloneNode(true)`) porque o `.parse()` MUTA o documento que recebe — sem clone, bagunçaria a página real.
- **Links vêm do conteúdo principal** (`article.content`), não do `document` inteiro — senão voltaria a despejar os ~38 links de menu. Fallback pro body se não for artigo.
- **Fallback** `article?.textContent || document.body.innerText`: Readability retorna null em páginas que não são artigo (apps/dashboards). Na prática quase nunca dispara (ela extrai até de example.com), mas é a rede de segurança.

## Trusted Types / CSP estrito (degradação obrigatória)

Algumas páginas (chrome://new-tab, e sites reais com `require-trusted-types-for 'script'`) **bloqueiam** tanto `addScriptTag` (injetar o `<script>` do Readability) quanto `element.innerHTML`. Por isso o `capture_text` é defensivo em DOIS pontos, e NENHUM é removível:
1. `addScriptTag(...).catch(() => {})` + dentro do `evaluate`, `(window as any).Readability` num try/catch → se o script foi bloqueado, cai no `document.body.innerText`.
2. Os links são extraídos com **`DOMParser().parseFromString(article.content, "text/html")`**, NÃO com `div.innerHTML = ...` — innerHTML dispara TrustedHTML em páginas estritas e quebra tudo.

Sem isso, capturar texto logo após o auto-launch (que abre em chrome://new-tab) ou em qualquer site com Trusted Types lança erro. Não "simplificar" removendo os try/catch nem trocar DOMParser por innerHTML.

## launchChrome: existsSync ANTES do spawn (bug do Windows)

`launchChrome` em `browser.ts` checa `existsSync(CHROME_PATH)` e lança erro orientado ANTES de tentar `spawn`.

**Por que não confiar no evento `error` do spawn:** a versão anterior fazia `child.on("error", reject)` e `resolve()` logo em seguida. No Windows o evento `error` (arquivo não existe) é **assíncrono** e perde a corrida pro `resolve()` — então um path errado NUNCA disparava a mensagem orientada; o usuário só via um erro genérico depois (porta não sobe). Checar `existsSync` primeiro torna o erro confiável e imediato. NÃO "simplificar" de volta pro listener de erro — reintroduz o bug.

Relacionado: [Conexão Chrome via CDP](conexao-chrome-cdp.md).
