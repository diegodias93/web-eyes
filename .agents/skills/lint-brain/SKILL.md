---
name: lint-brain
description: Verifique quais arquivos em `Brain/` não estão indexados em `Brain/MEMORY.md`.
---

# Lint do Brain

Verifique quais arquivos em `Brain/` não estão indexados em `Brain/MEMORY.md`.

Passos:
1. Liste todos os arquivos `.md` em `Brain/` (não recursivo).
2. Ignore `MEMORY.md` e `_TEMPLATE.md`.
3. Para cada arquivo restante, verifique se o nome do arquivo aparece em alguma linha de `Brain/MEMORY.md`.
4. Reporte:
   - "Tudo indexado." se não houver pendências.
   - Lista dos arquivos não indexados, com caminho relativo, se houver algum.

Não altere nenhum arquivo. Apenas reporte.
