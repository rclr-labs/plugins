---
name: croqui
description: Use when someone needs to explain a codebase to an AI that has no access to the repository, or asks how to give an AI context about an application without exposing credentials, .env files or source code. Also use when evaluating whether a context pack is safe to share outside the machine.
user-invocable: true
---

# croqui — mapa de aplicacao para alimentar IA sem dar o repo

O `croqui` responde **"o que esta aplicacao faz"** e entrega isso num arquivo portatil. Ele nao e revisor (`sensei`) nem avaliador de prontidao para MCP (`plano-mcp`).

## Quando usar

- A IA **nao tem** acesso ao repo e precisa de contexto: e o caso central
- Area de seguranca do cliente vetou dar o repositorio para uma ferramenta de IA
- Onboarding: alguem novo precisa do mapa antes de ler codigo

## Quando NAO usar

- **Como sandbox.** O `croqui` nao reduz o acesso que a IA ja tem. Se ela roda com Bash liberado, ela ja pode `cat .env` -- o `croqui` nao muda isso. Ele produz um artefato que pode sair, com garantia do que tem dentro. Vender como sandbox e falsa sensacao de seguranca, que e pior que nao ter ferramenta
- **Para auditar codigo.** Isso e `/sensei review`
- **Para medir qualidade.** Ele le o formato e a convencao, nao a qualidade

## Os tres niveis

| Nivel | Leva | Quando |
|---|---|---|
| 1 | identidade, stack, pontos de entrada, contagens | pergunta de orientacao |
| 2 | + rotas, controladores, entidades, tabelas, jobs, comandos | o padrao |
| 3 | + grafo | quando a pergunta e sobre fluxo |

Sempre declare o nivel ao colar o pacote numa IA. Nivel 1 nao carrega rota; afirmar coisa sobre rota a partir dele e inventar.

## O que o pacote garante -- e o que nao garante

Leia `references/modelo-de-ameaca.md` antes de responder qualquer pergunta sobre seguranca da ferramenta. Resumo de uma linha: **ele nao contem valor de configuracao, segredo, literal nem linha de codigo; ele contem os nomes reais de classe, rota e tabela**, a menos que tenha sido gerado com `--anonimo`.

## Declare a cobertura, nao a maquie

Repositorio que ativou so a camada `generico` tem mapa de **estrutura**, nao de comportamento: pastas, pontos de entrada e manifesto, sem rota nem entidade. Diga isso quando for o caso. O inventario mostra as camadas detectadas na primeira linha.

## A regra de uso

**Leia o pacote antes de ele sair da maquina.** A garantia e por construcao, mas a revisao humana e parte do desenho -- nao a pule por causa dela. O `.md` existe nesse formato justamente para ser lido; o `.html` e para ser olhado.

Se o comando abortar com achado do `guarda`, isso e **bug de regra de extracao**. Nao contorne, nao edite a saida: reporte a regra.
