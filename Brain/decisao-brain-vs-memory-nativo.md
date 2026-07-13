---
name: decisao-brain-vs-memory-nativo
description: Por que autoMemoryEnabled está false e usamos só o Brain
camada: importante
---

O memory nativo do Claude Code (`~/.claude/projects/<projeto>/memory/`) faz a
mesma função do `Brain/`: índice + arquivos .md com decisões. São redundantes.

Escolhemos manter **só o Brain** e desligar o nativo com `autoMemoryEnabled: false`
no `.claude/settings.json`.

**Por quê:** o Brain vive **dentro do repo** — versionado no git e compartilhável
com o time. O memory nativo fica num diretório central do Claude, **local da
máquina, fora do git, invisível para o time**. Para memória de projeto que deve
viajar com o código, o nativo não serve. Ter os dois ligados causaria colisão
(decidir toda vez onde gravar, risco de não cruzar as duas fontes).

**Como aplicar:**
- A flag está no settings **do projeto** (vai junto ao replicar o molde), não no
  global — outros projetos que já usam o memory nativo continuam intactos.
- Não religar o nativo sem antes decidir migrar o Brain; senão volta a colisão.
