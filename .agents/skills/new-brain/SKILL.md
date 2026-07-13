---
name: new-brain
description: Cria uma nova memória no Brain a partir do template. Invoque com /new-brain <slug> <camada>.
disable-model-invocation: true
argument-hint: <slug> <camada>
---

# Nova memória do Brain

Cria `Brain/<slug>.md` a partir do template e o indexa em `Brain/MEMORY.md`.

**Entrada esperada:** `$ARGUMENTS` no formato `<slug> <camada>`
- `slug`: nome do arquivo em kebab-case (ex: `limite-api-sheets`). Pode conter espaços — serão convertidos em hífens.
- `camada`: `front-end`, `back-end` ou `importante`. É **sempre a última palavra** de `$ARGUMENTS`; tudo que vier antes é o `slug`.

**Passos:**

1. Separe e valide os argumentos:
   - A `camada` é o **último** token de `$ARGUMENTS`; o `slug` é todo o resto (que pode ter espaços).
   - Normalize o `slug`: converta para minúsculas e substitua espaços e underscores por hífens (ex: "Limite API" → `limite-api`, "minha_memoria" → `minha-memoria`).
   - Se `slug` ou `camada` estiverem ausentes, informe o uso correto (`/new-brain <slug> <camada>`) e pare.
   - Se `camada` não for um dos três valores válidos, informe e pare.
   - Se `Brain/<slug>.md` já existir, avise e pare.

2. Leia `Brain/_TEMPLATE.md` e crie `Brain/<slug>.md` com o conteúdo do template, substituindo:
   - `slug-em-kebab-case` → valor de `slug`
   - `front-end | back-end | importante` → valor de `camada`

3. Leia `Brain/MEMORY.md` e insira uma nova linha na seção correspondente à `camada`:
   ```
   - [slug](slug.md) — descreva quando esta memória importa
   ```
   A linha deve ser inserida após o comentário HTML da seção (linha `<!-- ... -->`).

4. Confirme: "Memória `Brain/<slug>.md` criada e indexada em `MEMORY.md` (seção `<camada>`). Edite a descrição placeholder na linha do índice."
