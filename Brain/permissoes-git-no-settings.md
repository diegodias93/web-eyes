---
name: permissoes-git-no-settings
description: Por que o deny git do settings.json não inclui config/remote/fetch/submodule
camada: importante
---

O `deny` em `.claude/settings.json` hard-bloqueia os comandos git que **alteram
estado** (commit, push, reset, rebase, merge, checkout, switch, restore, stash,
clean, cherry-pick, add, rm, mv, tag, worktree, pull, apply, am, revert,
update-ref, filter-branch, fast-import). Isso reflete a regra do `CLAUDE.md`:
"qualquer git que mude estado é proibido".

**Por quê** `git config`, `git remote`, `git fetch` e `git submodule` ficam **de
fora** do deny: todos têm uso de leitura — `git config --get/--list`,
`git remote -v`, `git fetch` e `git submodule status/summary`. Bloquear com `:*`
quebraria essa leitura legítima. Eles caem no padrão "perguntar", que já basta.
Nota: `git fetch` **não** toca o working tree, mas **altera estado do repo** (refs
remotas, `FETCH_HEAD`); fica fora do deny por ser dual-use, não por ser inócuo.

**`git branch` no allow é `Bash(git branch)` sem `:*`** — de propósito. `git branch`
puro lista (leitura), mas `git branch -D`/`-m` apaga/renomeia (escrita). Com `:*` o
allow autorizaria as duas; sem `:*` só o comando exato passa, e qualquer flag cai em
"perguntar". Não troque de volta para `git branch:*`.

**Como aplicar:** não adicione `config`/`remote`/`fetch`/`submodule` ao `deny`
achando que "faltou cobrir" — é deliberado. Se um dia precisar endurecer, prefira
confirmação a hard-block, para não inutilizar os usos de leitura.
