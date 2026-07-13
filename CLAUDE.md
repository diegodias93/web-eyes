# CLAUDE.md


## Obrigatório

**Proibições absolutas. Sem exceção, mesmo se parecer óbvio ou conveniente.**
- **Git: read-only.** Só leitura — `status`, `diff`, `log`, `show`, `branch` (sem flags). **Qualquer** comando que altere estado (commit, push, reset, checkout, switch, merge, rebase, stash, add...) é proibido. Não importa o subcomando: se muda o repositório, não faça.
- **Banco de dados:** nada destrutivo — sem `DELETE`, `TRUNCATE`, `DROP`, `UPDATE` em massa ou migrations que apaguem dados. Leitura (`SELECT`) é livre.
- **API externa:** nada que escreva ou mude estado — sem `POST`, `PATCH`, `PUT`, `DELETE`. Leitura (`GET`) é livre.
- Se uma tarefa exigir uma dessas ações proibidas, **pare e descreva o comando exato** para eu executar — não tente contornar.

## 🛑 Antes de Implementar

**`BRIEFING.md` é o retrato do projeto** (stack, objetivo, restrições).
- Se estiver **vazio**, o projeto ainda não foi briefado: na primeira tarefa que eu trouxer, **conduza o briefing** — pergunte só o que falta, **preencha você as seções** conforme eu respondo, mostre o resultado e peça confirmação. Assim que o briefing estiver confirmado, **invoque a skill `sugerir-ferramentas`** para propor skills/plugins/libs atuais que combinem com a stack (apenas proposta, com fontes; nada é instalado/criado sem OK, e recusar tudo é válido — o fluxo segue normal). Só então siga.
- Se estiver **preenchido**, apenas leia como contexto. Não re-briefe; atualize um campo só se eu disser que mudou.

**Regra dura.** A ordem antes de **modificar qualquer arquivo, configuração ou arquitetura** (não só código — inclui docs, settings, skills, Brain) é sempre: **(1)** garantir o `BRIEFING.md` preenchido (preencher se vazio) → **(2)** consultar o Brain (gatilho de leitura) → **(3)** apresentar plano curto → **(4)** AGUARDAR meu OK. Não pule nem inverta esses passos. Não implemente antes da aprovação, mesmo que pareça óbvio. Exceção: tarefas que só leem (responder, ler, buscar) seguem direto.

**Liberdade técnica não é dispensa do protocolo.** Quando eu disser coisas como "pode usar qualquer lib", "manda ver", "fica à vontade", "faz como achar melhor" — isso libera *escolhas técnicas*, **não** dispensa briefing, plano nem OK. Só o meu OK explícito ao plano libera a implementação. Na dúvida sobre se uma fala minha foi aprovação, pergunte.

O plano tem: **entendimento** (1-2 frases do que entendi), **passos**, **decisões e o porquê** (linguagem, libs, persistência, estrutura), e **dúvidas**. Nele:
- Declare premissas. Apresente as interpretações plausíveis — não escolha em silêncio.
- Se existir abordagem mais simples, diga. Se algo está obscuro, nomeie o que confunde.
- Decisão difícil de reverter (apaga dados, muda contrato de API, renomeia algo público) merece destaque no plano.
- Escolha trivial e reversível (nome de variável, ordem de imports) não precisa de pergunta — decida e siga.
- Se o comportamento do código estiver obscuro, não adivinhe — adicione logs para entender antes de mudar.

**Calibre o plano pelo tamanho da tarefa** — o que muda é o tamanho do plano, nunca a necessidade do OK:
- Tarefa trivial e reversível (1 arquivo, mudança pequena): plano de 1-2 linhas basta. Continua exigindo OK.
- Tarefa grande (vários arquivos, decisão de arquitetura, algo difícil de reverter): plano completo, com as decisões e o porquê detalhados.

Perguntar é barato comparado a desfazer a coisa errada. Mas não pergunte o que você verifica sozinho lendo o código.

## 🧠 Brain — Memória do Projeto

A pasta `Brain/` é o conhecimento persistente deste projeto. **Ela não carrega sozinha — você precisa consultá-la e alimentá-la.** Os dois gatilhos abaixo são obrigatórios, não opcionais.

- **🔓 GATILHO DE LEITURA — antes de planejar qualquer tarefa que mexa no projeto (código OU config/arquitetura), ANTES de propor o plano:** verifique o índice `Brain/MEMORY.md`. Se houver entrada relacionada à área que vou mexer, abra o `.md` e **respeite a decisão registrada** — não a contradiga sem me avisar. Diga no plano: "Brain consultado: [entrada relevante / nada relacionado]". (Perguntas e leituras triviais seguem sem isso.)
- **🔒 GATILHO DE ESCRITA — ao concluir uma implementação, ANTES de dizer que terminei:** responda explicitamente este checklist: *"Alguma decisão teve porquê não-óbvio (passa no teste abaixo)? Se sim — gravei em `Brain/` e indexei? Liste o que gravei. Se não — confirme que nada se aplica."* Não declare a tarefa concluída sem essa linha.
- **Como gravar:** crie `Brain/<slug>.md` a partir de `Brain/_TEMPLATE.md` **e** adicione a linha no índice, na camada certa (`front-end`, `back-end` ou `importante`).
- **Critério — o teste:** vai pro Brain só o que, se esquecido, levaria alguém a desfazer e quebrar algo. Pergunte: *"olhando só o código, sem lembrar desta conversa, dá pra entender por que foi feito assim?"* Se **sim**, não grave — o código já conta. Se **não** (a razão é externa/contra-intuitiva: um sistema legado, uma exigência de compliance, um limite de API, um número mágico), grave.
- **O que NÃO vai pro Brain:** stack e contexto do projeto (isso é o `BRIEFING.md`); e decisões triviais/óbvias de implementação (ex: "persisti em JSON num app simples"). Brain não é diário de tudo que foi feito — é só o que precisa ser relembrado.
- **Sempre que eu disser "guarde isso", "lembre disso" ou similar:** é uma ordem direta de gravar no Brain.
- **Curadoria:** se encontrar uma memória obsoleta ou errada, corrija arquivo e índice — ou me avise se a remoção não for óbvia.

## 🧩 Brain vs Skill

Duas peças, dois propósitos. Antes de criar algo reutilizável, pergunte qual é.

- **Brain** = *o que eu preciso **saber*** — um fato, uma decisão, um porquê. Não executa nada. Vive em `Brain/`.
- **Skill** = *como eu faço algo* — um procedimento que vira `/<nome>`. Vive em `.claude/skills/<nome>/SKILL.md` (uma pasta — pode levar scripts junto). Nome em minúsculas, números e hífens (padrão Agent Skills).

O teste rápido: *É um procedimento que se executa?* → Skill. *Ninguém executa, é só saber?* → Brain.

**Quem invoca a skill** (commands foram unificados em skills — não existe mais a distinção "command = você dispara, skill = eu aplico"; tudo é skill, e o controle é por frontmatter):
- Por padrão, **eu posso invocar sozinho** quando a tarefa combina, **e** você pode disparar com `/<nome>`.
- Se a skill **tem efeito colateral** (escreve arquivos, muda estado) e você quer controlar o timing, marque `disable-model-invocation: true` — aí só você dispara. É o caso de `/new-brain`.
- Skills antigas em `.claude/commands/<nome>.md` ainda funcionam, mas o formato preferido é `.claude/skills/`. Não crie novas em `commands/`.

**Tudo é por projeto e versionado** — skills moram em `.claude/` deste repo, não no global. Capacidade específica do sistema fica com o sistema.

Não crie skill especulativa (vale a regra de Simplicidade). Crie quando houver uma repetição real ou um procedimento que valha automatizar — não antes.

## Como desenvolver

Simplicidade, modularização, mudanças cirúrgicas e execução orientada a objetivos vivem na skill **`como-desenvolver`** (`.claude/skills/`). **Ao escrever ou editar código, invoque a skill `como-desenvolver` e siga-a** — não dependa de eu lembrar de cor. Você também pode chamar `/como-desenvolver` a qualquer momento.

---

**Estas diretrizes estão funcionando se:** houver menos mudanças desnecessárias nos diffs, menos reescritas por complicação excessiva, e perguntas de esclarecimento vierem antes da implementação — não após os erros.