# BRIEFING do Projeto

> Retrato estável do projeto: stack, objetivo e restrições. Consulte para saber as questões técnicas.

## Objetivo
Um servidor MCP próprio para o Claude Code que, sob gatilho ("olha minha aba"), permite
ao Claude enxergar o conteúdo de uma página aberta no navegador — screenshot, texto e DOM —
para discutir o site junto com o usuário (ex: aprender uma documentação como a da WhatsApp API).
Roda na assinatura do Claude Code (via MCP), sem API paga por fora.

## Stack
- **Linguagem:** TypeScript (Node.js).
- **Protocolo:** MCP (Model Context Protocol) — SDK oficial `@modelcontextprotocol/sdk`.
- **Motor de navegador:** Playwright, conectando via porta de depuração remota (CDP). Se o Chrome
  de depuração não estiver aberto, o MCP o abre sozinho (flag + perfil dedicado `web-eyes-chrome-debug`,
  sob o diretório temp do SO, sobrescrevível com `WEB_EYES_PROFILE_DIR`).
- **Idioma:** o produto publicado (código, ferramentas MCP, mensagens, README, skills) é em **inglês**
  (alvo de divulgação). O ferramental interno (BRIEFING, Brain, conversa) segue em PT.
- **Distribuição:** desenhada para `npx` desde o início (`bin` no package.json); por ora roda
  local/privado, publicação no npm fica para quando amadurecer.

## Restrições
- **Tem que rodar na assinatura do Claude Code** — nada de API paga (Anthropic) por fora.
- **Instalação fácil é requisito de primeira classe** — alvo `npx`/`claude mcp add` de uma linha;
  não pode exigir clonar repo e configurar na mão.
- Conecta no Chrome que o usuário já tem (não baixa Chromium próprio por enquanto).
- As proibições do CLAUDE.md valem (git read-only, nada destrutivo em DB/API externa).

## Convenções e Padrões
- Cada modo de captura (screenshot / texto / DOM) é uma **ferramenta MCP separada** — intuitos
  diferentes, gatilhos diferentes.
- **Skills de gatilho** (ex: `/olha-aba`) por cima das ferramentas, no padrão Agent Skills do projeto.
- TypeScript; nomenclatura e estilo a definir no primeiro código (atualizar esta seção então).
