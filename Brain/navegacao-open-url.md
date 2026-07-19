---
name: navegacao-open-url
description: Por que open_url abre uma ABA NOVA (não navega a aba ativa), e por que "Go" NÃO virou botão do look-watch. Ler antes de mexer em navigate.ts ou nos botões do overlay.
camada: back-end
---

`open_url` é a primeira ferramenta do web-eyes que **age** sobre o browser (as demais só olham a aba ativa, read-only). Duas decisões de produto não-óbvias, tomadas pelo usuário:

**1. `open_url` abre uma ABA NOVA (`context.newPage()` + `goto`), nunca navega a aba ativa.**
**Por quê:** o web-eyes conecta no Chrome real do usuário — trocar a URL da aba em foco sequestraria a navegação dele (tirava ele de onde estava). Abrir aba nova é seguro: o Claude alcança a página que precisa (ex: um `localhost:3000` que ele acabou de subir) sem mexer no que o usuário faz. NÃO trocar `newPage()` por `page.goto()` na aba ativa achando que foi descuido — é deliberado.
**Como aplicar:** depois do `goto`, `bringToFront()` deixa a aba nova em foco, então as ferramentas de captura (que usam `pickActivePage`) já a pegam naturalmente.

**2. `open_url` NÃO é um botão do look-watch (só tool + skill `look-go`).**
**Por quê:** no modo escuta o usuário JÁ está na aba que quer mostrar — se quisesse outra URL, ele mesmo navega no Chrome. Um botão "Go" ali seria redundante. `open_url` existe para quando **o Claude toma iniciativa** (não é um clique do usuário), então não cabe no overlay. Só o "Full" (screenshot da página inteira) virou botão novo — porque é uma captura como Text/Image/Dom, sobre a aba que o usuário já está vendo.

**3. Só `http:`/`https:` — `parseHttpUrl()` recusa o resto (2026-07-19).**
**Por quê:** `open_url` é a única tool onde o Claude escolhe o destino, e as capturas leem o que estiver aberto. Sem validação, um `file:///C:/Users/.../.ssh/id_rsa` (ou `chrome://`, `data:`) passava direto pro `page.goto` — o Claude abria e em seguida capturava arquivo local. A validação é de segurança, não cosmética: **não relaxar** pra "aceitar file:// que é útil pra testar".
**A pegadinha (já cometida, não repetir):** a checagem ingênua `/^[a-z][a-z0-9+.-]*:/` marca **`localhost:3000` como tendo esquema** (`localhost:`) e o rejeita — quebrando justamente o caso que a descrição da tool promete. O regex tem que exigir `://`. Esquemas sem barras que importam (`data:`, `javascript:`) caem no caminho de "host nu", viram `http://data:...`, e são recusados de qualquer jeito por não formarem host válido. Coberto por `scripts/test-url.mjs` (14 casos) — se mexer na regra, rode.

Relacionado: [Modo-escuta /look-watch](modo-escuta-watch.md), [Conexão Chrome via CDP](conexao-chrome-cdp.md).
