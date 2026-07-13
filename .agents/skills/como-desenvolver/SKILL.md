---
name: como-desenvolver
description: Como desenvolver neste projeto — simplicidade, modularização, mudanças cirúrgicas e execução orientada a objetivos. Invoque ao escrever ou editar código para garantir qualidade. Não cobre segurança nem o protocolo de briefing (isso é sempre obrigatório, vive no AGENTS.md).
---

# Como Desenvolver

Aplique ao escrever ou editar código.

## 1. Simplicidade Primeiro

**Mínimo de código que resolve o problema. Nada especulativo.**

- Sem funcionalidades além do que foi pedido.
- Sem abstrações para código de uso único.
- Sem "flexibilidade" ou "configurabilidade" que ninguém pediu.
- Sem tratamento de erro para cenários impossíveis.
- Se escreveu 200 linhas e dava em 50, reescreva.

O teste: *"Um engenheiro sênior diria que isso está complicado demais?"* Se sim, simplifique.

> Simplicidade e modularização (Seção 2) não brigam. Você **divide o que já existe e cresce** — não cria camadas para um futuro hipotético. Extrair um módulo de algo que repete é simplificar; criar um módulo "por via das dúvidas" é a complexidade especulativa que esta seção proíbe.

## 2. Modularização e Componentização

**Prefira peças pequenas e com responsabilidade única a um monólito grande.** Vale para qualquer código — front-end, back-end, scripts.

Um arquivo ou função que faz coisa demais é difícil de ler, testar, reusar e mudar sem quebrar o resto. Quando algo cresce, divida:

- **Uma responsabilidade por unidade.** Um arquivo, uma função, um componente deve ter um motivo só para mudar. Se você descreve o que ele faz usando "e" várias vezes, ele faz coisa demais.
- **Separe as camadas.** Não misture lógica de negócio, acesso a dados e apresentação no mesmo lugar. Cada uma muda por razões diferentes.
- **Extraia o que repete ou o que cresce** — só depois que existe de fato (ver Seção 1). A regra prática: na **segunda** vez que o mesmo trecho aparece, considere extrair; na terceira, extraia.
- **No front-end:** quebre telas/páginas grandes em componentes menores e nomeados. Um componente que rola por centenas de linhas quase sempre é vários componentes disfarçados.

O teste: *"Eu preciso rolar muito para entender esta unidade, ou guardar várias coisas na cabeça ao mesmo tempo?"* Se sim, divida.

**Mas não fragmente à toa.** Dividir em peças minúsculas demais cria o problema oposto — saltar entre dez arquivos para seguir uma linha de raciocínio. Divida quando a unidade carrega mais de uma responsabilidade, não para perseguir uma contagem de linhas.

## 3. Mudanças Cirúrgicas

**Toque apenas no necessário. Limpe apenas sua própria bagunça.**

Ao editar código existente:
- Não "melhore" código adjacente, comentários ou formatação que não fazem parte da tarefa.
- Não refatore o que não está quebrado.
- Mantenha o estilo existente, mesmo que você faria diferente.
- Viu código morto não relacionado? **Mencione — não delete.**

Quando suas mudanças criam órfãos:
- Remova imports/variáveis/funções que **suas** mudanças tornaram inúteis.
- Não remova código morto pré-existente sem ser solicitado.

O teste: cada linha alterada deve rastrear diretamente à solicitação do usuário.

## 4. Execução Orientada a Objetivos

**Defina critérios de sucesso. Itere até verificar.**

Transforme tarefas vagas em objetivos verificáveis:
- "Adicionar validação" → "Escreva testes para entradas inválidas, depois faça-os passar."
- "Corrigir o bug" → "Escreva um teste que o reproduza, depois faça-o passar."
- "Refatorar X" → "Garanta que os testes passem antes e depois."

Para tarefas com múltiplos passos, declare um plano breve:
```
1. [Passo] → verificar: [checagem]
2. [Passo] → verificar: [checagem]
3. [Passo] → verificar: [checagem]
```

Critérios fortes deixam você iterar sozinho. Critérios fracos ("faça funcionar") forçam esclarecimentos constantes.
