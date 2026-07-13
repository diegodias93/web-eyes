# DD_SystemSkills — Molde de Arquitetura de Instruções

Este projeto é o **molde** da arquitetura de instruções para Claude Code.
Aqui a estrutura é desenhada e validada; depois é replicada nos projetos reais.

## As partes

| Parte | O que é |
|---|---|
| `CLAUDE.md` | As regras de comportamento (como o Claude trabalha) |
| `BRIEFING.md` | Retrato do projeto (stack, objetivo, restrições). O Claude conduz o briefing e preenche; depois é só consulta |
| `Brain/` | Memória persistente do projeto (índice `MEMORY.md` + entradas) |
| `.claude/` | O hook que carrega BRIEFING + Brain na abertura (`settings.json` + `load_brain.js`), mais as skills do projeto |

## O que vem incluso

Além das quatro partes, o `.claude/` traz automações já prontas:

| Tipo | Nome | O que faz |
|---|---|---|
| Skill | `como-desenvolver` | Princípios de implementação (simplicidade, modularização, mudanças cirúrgicas, execução por objetivos). O Claude aplica sozinho ao escrever código; você também pode chamar `/como-desenvolver`. |
| Skill | `/new-brain <slug> <camada>` | Cria uma memória no Brain a partir do template e já a indexa no `MEMORY.md`. Só você dispara (`disable-model-invocation`). |
| Skill | `/lint-brain` | Lista memórias em `Brain/` que ficaram fora do índice `MEMORY.md`. |

## Replicando para outro projeto

**Copie as quatro partes juntas — elas dependem uma da outra:**
`CLAUDE.md`, `BRIEFING.md`, `Brain/` e `.claude/`.

Copiar parcial quebra o sistema em silêncio: sem o `.claude/`, o hook não roda,
o BRIEFING e o Brain não carregam, e as regras de consultá-los viram letra morta.

Depois de copiar:
1. **Reinicie o Claude Code** no projeto novo — o hook `SessionStart` só dispara na abertura.
2. Confirme o aviso **"BRIEFING + Brain carregados."**. Se aparecer "Atencao: nao carregado(s)...", faltou copiar algo; se aparecer "BRIEFING.md ainda nao preenchido...", siga para o passo 4.
3. **Revise o `CLAUDE.md` para este projeto.** As proibições (git/DB/API read-only) são um padrão sensato, não lei universal — ajuste ou remova o que não se aplica (ex: projeto sem banco, ou onde o Claude deve commitar).
4. Preencha o `BRIEFING.md` com o contexto do projeto.

## Versão

**Molde v1.5.0** — ao derivar um projeto, anote esta versão nele para saber de qual geração do molde ele nasceu.

### CHANGELOG
- **1.5.0** — skill `boas-praticas` renomeada para `como-desenvolver` (o nome agora diz o propósito: "como desenvolver"); referências atualizadas no `CLAUDE.md`, neste README e no `settings.local.json`. Conteúdo revisado por inteiro e ganhou a seção **Modularização e Componentização** (genérica, qualquer stack) — prefira peças pequenas de responsabilidade única a um monólito, sem fragmentar à toa, sem brigar com a regra anti-abstração-especulativa da Seção 1.
- **1.4.0** — skill `boas_praticas` renomeada para `boas-praticas` (kebab-case, alinhando ao padrão de naming que o próprio `CLAUDE.md` define); referências atualizadas no `CLAUDE.md` e neste README. A pasta `.claude/commands/` (vazia desde a 1.3.0) foi removida. `.gitignore` perde o bloco Python, resíduo da versão antiga do hook (o projeto não tem `.py`).
- **1.3.0** — `new-brain` e `lint-brain` migram de `.claude/commands/` para `.claude/skills/` (formato preferido); a pasta `commands/` é removida. O hook documenta que Node **não** é garantido pelo Claude Code (instalação nativa não traz Node) e o fallback via `@import` no `CLAUDE.md`. `git branch` no allow passa a ser `Bash(git branch)` sem `:*`, para flags de escrita (`-D`/`-m`) caírem em "perguntar".
- **1.2.0** — fecha a lacuna entre o `CLAUDE.md` e o `deny` do `settings.json` (mais git de escrita hard-bloqueados); o hook valida a presença do `_TEMPLATE.md` e avisa quando o `BRIEFING.md` ainda está vazio; README documenta as skills e commands inclusos; `.gitattributes` normaliza fim de linha; template usa link markdown real no lugar de `[[slug]]`.
- **1.1.0** — corrige o nome do template (`_TAMPLATE.md` → `_TEMPLATE.md`) e suas três referências; link do índice do Brain em minúsculas, casando a caixa exata do arquivo (não quebra mais em Linux/Mac/GitHub); nota para revisar o `CLAUDE.md` por projeto; passa a versionar o molde.
- **1.0.0** — versão estável inicial: `CLAUDE.md`, `BRIEFING.md`, Brain (`MEMORY.md` + template) e `.claude/` (hook `load_brain.js` + `settings.json`), skill `boas_praticas`, commands `new-brain` e `lint-brain`.
