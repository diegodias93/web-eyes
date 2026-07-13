---
name: captura-pdf
description: Como o capture_text extrai PDF (detecção por contentType, bytes via page.request, pdfjs legacy). Ler antes de mexer em pdf.ts ou no ramo PDF do text.ts.
camada: back-end
---

## capture_text também lê PDF (ramo separado, antes do Readability)

Quando a aba é o visualizador de PDF do Chrome, `document.body.innerText` vem **vazio** — o PDFium renderiza fora do DOM. Então o Readability do `capture_text` devolveria nada. Por isso `runText` (`package/src/tools/text.ts`) tem um ramo PDF **no início**, antes de injetar o Readability: `isPdfPage` → `extractPdf` (ambos em `package/src/tools/pdf.ts`). Página normal pula esse ramo e segue o fluxo Readability intocado.

Não há botão/tool de PDF separado (decisão de UX do usuário): é o mesmo gatilho `capture_text` / botão **Text** do `/look-watch`. O watch herda de graça porque reusa `runText` (ver [Modo-escuta /look-watch](modo-escuta-watch.md), armadilha 4).

## As 3 decisões não-óbvias (NÃO desfazer sem entender)

1. **Detecção por `document.contentType === "application/pdf"`.** Verificado numa aba real: o PDF vem com esse contentType, `innerText.length === 0`, e o `embed`/viewer **nem aparece** no DOM raiz (`querySelector("embed")` é null, `outerHTML` tem ~260 chars). Ou seja, procurar `<embed>`/`<pdf-viewer>` NÃO funciona — o contentType é o único sinal confiável.

2. **Bytes via `page.request.get(url)`, NÃO `fetch` no Node.** `page.request` reusa os cookies/sessão da aba, então PDF atrás de login/sessão funciona. Um `fetch` do Node perderia a sessão e pegaria um HTML de login (ou 403). Verificado: `page.request.get` trouxe 1,1 MB com magic `%PDF-` de um edital público; o mesmo caminho cobre os protegidos.

3. **pdfjs-dist build LEGACY + `disableWorker` + `pathToFileURL`.**
   - **legacy** (`pdfjs-dist/legacy/build/pdf.mjs`) + **`disableWorker:true`** roda em Node puro, sem Web Worker nem canvas — só extração de texto (`getTextContent`), nunca renderiza. Mantém leve (sem deps nativas). A build padrão assume ambiente de browser.
   - **`pathToFileURL(require.resolve(...))`**: o `import()` dinâmico **rejeita caminho Windows cru** (`c:\...` → `ERR_UNSUPPORTED_ESM_URL_SCHEME`); precisa de `file://`. Isso já causou um bug real aqui — o `require.resolve` acha o arquivo (funciona via npx), mas sem converter pra URL o import quebra em produção no Windows. NÃO voltar pra `import(caminhoResolvido)`.
   - **`verbosity:0`**: o pdfjs cospe `Warning: TT: undefined function` (quirks de fonte) no console; sem silenciar, vazaria pra saída MCP.

## PDF escaneado (só-imagem) → avisa, sem OCR

Se `extractPdf` volta texto vazio (PDF sem camada de texto, ex: digitalização), `capture_text` retorna uma mensagem orientando a usar `/look-image` (screenshot). Decisão do usuário: **sem OCR** — evita peso (tesseract) e API paga, fora do escopo "leve". Pode ser revisto depois se necessário.

Relacionado: [Captura de texto via Readability](captura-texto-readability.md).
