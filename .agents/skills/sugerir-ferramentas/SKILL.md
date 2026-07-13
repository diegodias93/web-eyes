---
name: sugerir-ferramentas
description: Pesquisa na web e propõe skills do Codex, plugins/MCP servers e libs/ferramentas atuais que combinem com a stack do projeto. Valida cada candidato (existe? mantido? casa com a stack e as restrições?) e apresenta uma proposta. Apenas propõe — nada é instalado/criado sem OK. Invoque após concluir o briefing, ou manualmente com /sugerir-ferramentas.
---

# Sugerir ferramentas para o projeto

Pesquisa **informação atualizada** e propõe ferramentas que podem fazer diferença neste projeto, em três categorias: **skills do Codex**, **plugins/MCP servers** e **libs/ferramentas do ecossistema**.

> **Esta skill só PROPÕE.** Não instala MCP, não cria skill, não adiciona dependência. Qualquer um desses passos depois exige plano + OK, conforme o `AGENTS.md`. Aqui não há escrita de arquivo, nem `POST/PUT/PATCH/DELETE` — só leitura e busca na web.
>
> **A proposta é opcional.** O usuário avalia e escolhe o que (se algo) adotar. Se ele recusar tudo, **não insista** — o fluxo padrão da arquitetura segue normalmente, sem fricção. Recusar é uma resposta válida e esperada.

## Passos

### 1. Auto-referência — entenda o que JÁ existe (antes de buscar qualquer coisa)

Não sugira o que o projeto já tem. Levante o inventário:

- **Stack, objetivo e restrições:** leia `BRIEFING.md`. As **restrições** são filtro duro — uma sugestão que as viola precisa ser marcada como tal (ou descartada).
- **Skills já existentes:** liste `.Codex/skills/` (cada subpasta com `SKILL.md`) e `.Codex/commands/` se houver. Leia os `description` para saber o que já está coberto.
- **Plugins/MCP já configurados:** leia `.Codex/settings.json` e `.Codex/settings.local.json` (se existir) procurando MCP servers ou plugins já ligados.
- **Brain:** confira `Brain/MEMORY.md` — pode haver uma decisão registrada que já rejeitou alguma ferramenta (ex: "não usar X por motivo Y"). Respeite isso.

Se o `BRIEFING.md` estiver vazio, **pare e avise**: a skill depende da stack para fazer sentido. Peça para briefar primeiro.

### 2. Pesquise (WebSearch / WebFetch) — informação atual, ancorada na stack

Para cada uma das três categorias, faça buscas ancoradas na stack do briefing **e na data atual** (para pegar o que é novo, não o desatualizado). Inclua o ano corrente nas queries quando ajudar.

- **Skills do Codex:** procedimentos `/<nome>` que valham a pena para esta stack (ex: deploy, testes, migrations, geração de código repetitivo). Considere também skills/coleções públicas da comunidade como referência de ideia.
- **Plugins / MCP servers:** servidores MCP e integrações que ampliem o Codex para esta stack (ex: MCP de banco, de provider de nuvem, de design, de issue tracker). Prefira fontes oficiais (Anthropic, mantenedor do servidor).
- **Libs / ferramentas do ecossistema:** bibliotecas, CLIs e ferramentas de dev relevantes à stack (linter, ORM, framework de teste, bundler etc.).

Use **WebFetch** para abrir a fonte de um candidato promissor e ler de perto (repo, release notes, doc oficial).

### 3. Valide cada candidato — verificação adversarial leve

Para todo candidato que pretende propor, responda — com base em fonte, não em memória:

- **Existe de fato?** Há repo/doc/pacote oficial? (link)
- **É mantido?** Último release ou commit recente? (Sinal de abandono → descarte ou marque como risco.)
- **Casa com a stack?** É compatível com as linguagens/frameworks do briefing?
- **Respeita as restrições?** Confronte com as **restrições** do `BRIEFING.md`. Se conflita (ex: "sem novas dependências", "precisa rodar offline"), **marque explicitamente** — não esconda.
- **Já não temos?** Confronte com o inventário do passo 1. Se já existe equivalente, não proponha (ou explique por que o novo é melhor).

Candidato que não passa: **descarte e diga por quê** em uma linha. Não infle a lista.

### 4. Apresente a proposta

Uma tabela curta **por categoria** (omita categoria sem candidato válido). Colunas:

| Ferramenta | O que resolve aqui | Fonte/link | Manutenção | Cabe? / Ressalvas |
|---|---|---|---|---|

- "Cabe?" indica encaixe com a stack e **destaca conflito com restrição** quando houver.
- Seja honesto sobre confiança: se a manutenção é incerta, diga.
- Feche com uma linha de fechamento clara: *"Quer que eu detalhe/planeje a adoção de alguma? Ou seguimos sem nenhuma — o fluxo continua normal."*

### 5. Depois da proposta — respeite a escolha

- O usuário escolhe o que adotar (talvez nada).
- **Adotar qualquer item** (instalar MCP, criar skill, adicionar lib) é uma nova tarefa que **mexe no projeto** → exige plano curto + OK, e o gatilho de leitura do Brain, conforme o `AGENTS.md`. Esta skill não pula esse protocolo.
- Se o usuário recusar, encerre sem insistir.
