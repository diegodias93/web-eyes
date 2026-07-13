// SessionStart hook: injeta o BRIEFING e o indice do Brain no contexto.
//
// Roda no inicio de cada sessao. Carrega dois arquivos, cada um independente:
//   - BRIEFING.md      -> stack, objetivo e contexto do projeto
//   - Brain/MEMORY.md  -> indice da memoria persistente
//
// Tambem verifica (sem injetar) a presenca de Brain/_TEMPLATE.md, para que uma
// copia incompleta do molde seja detectada na hora — e nao semanas depois,
// quando alguem usar /new-brain.
//
// Os caminhos sao resolvidos a partir da localizacao deste script
// (.claude/load_brain.js -> ../BRIEFING.md e ../Brain/MEMORY.md), nao do cwd,
// para funcionar independente de onde a sessao foi iniciada.
//
// Node NAO e garantido pelo Claude Code: a instalacao nativa nao traz Node, so a
// instalacao antiga via npm. Em projetos sem Node este hook nao roda — nesse caso,
// importe o contexto direto no CLAUDE.md com "@BRIEFING.md" e "@Brain/MEMORY.md".
// Optamos pelo hook (e nao por @import puro) porque so ele detecta o BRIEFING vazio
// e avisa de arquivos faltando; o @import injeta o conteudo cru, sem essa checagem.
// Onde Node existe, UTF-8 e nativo — sem o problema de encoding que o Python tinha
// no Windows.
//
// Se um arquivo faltar, o outro ainda carrega e um aviso VISIVEL (systemMessage)
// lista o que faltou. Se o BRIEFING ainda estiver so com o template (vazio), o
// mesmo aviso lembra de conduzir o briefing antes de implementar.

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const sections = [];
const missing = [];
const notes = [];

function load(relPath, header) {
  try {
    const body = fs.readFileSync(path.join(root, relPath), "utf8");
    sections.push(header + "\n\n" + body);
    return body;
  } catch {
    missing.push(relPath);
    return null;
  }
}

// So verifica presenca — nao injeta conteudo no contexto.
function requireFile(relPath) {
  if (!fs.existsSync(path.join(root, relPath))) missing.push(relPath);
}

// BRIEFING "vazio" = o template intacto: so headers, comentarios <!-- --> e a
// citacao de intro. Se nada sobra depois de remove-los, ainda nao foi preenchido.
function isEmptyBriefing(body) {
  if (body == null) return false;
  const stripped = body
    .replace(/<!--[\s\S]*?-->/g, "") // comentarios HTML
    .replace(/^\s*#.*$/gm, "") // headers markdown
    .replace(/^\s*>.*$/gm, "") // citacoes
    .trim();
  return stripped.length === 0;
}

const briefing = load(
  "BRIEFING.md",
  "### BRIEFING do projeto (stack, objetivo, restricoes). Leia antes de agir."
);
load(
  "Brain/MEMORY.md",
  "### Brain - indice da memoria do projeto (carregado automaticamente). " +
    "Consulte antes de tarefas relevantes e alimente com decisoes importantes."
);
requireFile("Brain/_TEMPLATE.md");

if (isEmptyBriefing(briefing)) {
  notes.push(
    "BRIEFING.md ainda nao preenchido — conduza o briefing antes de implementar."
  );
}

const out = {};
if (sections.length) {
  out.hookSpecificOutput = {
    hookEventName: "SessionStart",
    additionalContext: sections.join("\n\n---\n\n"),
  };
}

const messages = [];
if (missing.length) {
  messages.push(
    "Atencao: nao carregado(s): " + missing.join(", ") + ". " +
      "Se copiou este molde, confirme que esses arquivos vieram junto com .claude/."
  );
} else {
  messages.push("BRIEFING + Brain carregados.");
}
messages.push(...notes);
out.systemMessage = messages.join(" ");

process.stdout.write(JSON.stringify(out));
