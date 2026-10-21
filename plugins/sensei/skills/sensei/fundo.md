# fundo — revisão por especialistas, com verificação independente

Segunda opção de revisão, não a padrão. O `review` faz **uma passada** com auto-refutação; aqui são **vários especialistas em paralelo** e um **verificador independente** que tenta derrubar cada candidato.

A diferença que justifica o custo: na passada única, quem levanta a hipótese é quem a refuta — e o mesmo modelo está enviesado a confirmar o que acabou de propor. Aqui, quem verifica **não viu o raciocínio** de quem propôs.

## Quando usar

- `risk=high` no `collect`, ou diff grande
- Mudança em autenticação, autorização, dado financeiro, migration ou fila
- Antes de release, ou em PR que já voltou do review humano mais de uma vez
- Quando um defeito escapou da passada única e você quer saber se foi escopo ou profundidade

## Quando **não** usar

- Diff pequeno: o custo da releitura não se paga
- Documentação: use `docs`
- Por padrão, em todo PR — é assim que o orçamento acaba em duas semanas

## O custo, antes de começar

Cada especialista e o verificador **releem o bundle**. Com 4 especialistas + 1 verificador, o contexto é ~5× o de uma passada única.

**Diga isso ao usuário antes de rodar**, com o número do `collect` na mão: "o bundle tem 15k; o modo fundo vai custar ~75k de contexto. Sigo?" Em `risk=high` a resposta costuma ser sim; em diff trivial, não.

## 1. Despachar os especialistas

Um subagente por dimensão, **todos sobre o mesmo bundle**, em paralelo. Cada um carrega **um** arquivo de regras — a mesma disciplina do roteador:

| Especialista | Carrega | Procura |
|---|---|---|
| **Segurança** | `sec.md` | Caminho de ataque: authz, injeção, segredo, transporte, entrada que vira destino |
| **Correção** | `review.md` (seções 1 e 2) + a camada da linguagem | Casos de borda e tratamento de erro |
| **Dados** | `sql.md` quando há SQL ou migration; senão `review.md` (seção 1) | Semântica de consulta, transação, idempotência, concorrência |
| **Contrato** | `review.md` (seções 3 a 5) + a camada da linguagem | Shape de resposta, compatibilidade retroativa, nome que mente, duplicação de regra |

Cada especialista devolve **candidatos**, não achados — e cada candidato traz: arquivo, linha, defeito, gatilho, impacto, correção proposta e severidade sugerida.

**Nenhum especialista reporta direto ao usuário.** Quem fala com o usuário é a agregação.

## 2. Verificar — o passo que dá o nome ao modo

Um subagente **verificador**, que recebe o bundle e a lista de candidatos **sem o raciocínio** de quem os propôs. A tarefa dele é **derrubar**, não confirmar:

Para cada candidato, ele responde:

1. **O gatilho é alcançável?** Existe entrada, estado ou sequência real que ative isso? Ou depende de um caminho que o código não tem?
2. **Há guarda a montante?** Validação, tipo, middleware, constraint de banco, teste que já cobre?
3. **O impacto se sustenta?** Ou é consequência especulativa, descrita em condicional?
4. **A correção resolve a causa**, ou só o sintoma?

Veredito por candidato: **confirmado** · **rebaixado** (vira S2, com a suposição declarada) · **descartado** (com o motivo).

O verificador **não acrescenta achado novo.** Se ele vir algo, registra à parte como observação — misturar os papéis é o que faz o passo de verificação virar mais uma passada de revisão.

## 3. Agregar

- Deduplicar: o mesmo defeito achado por dois especialistas é **um** achado, com a melhor descrição dos dois
- Ordenar S0 → S1 → S2; dentro do nível, por confiança
- Cortar: no máximo **8**, igual à passada única. Modo fundo acha mais candidatos, não entrega mais ruído
- Descartado **não aparece** no relatório. Se o usuário perguntar, a lista existe

## 4. Reportar e registrar

Abra com uma linha dizendo o que rodou:

```
fundo · 4 especialistas + verificador · 11 candidatos → 6 confirmados, 2 rebaixados, 3 descartados
```

Essa linha é o produto mais útil do modo: **a taxa de descarte diz se o escopo está bom.** Descarte acima de metade significa que os especialistas estão largos demais — estreite o escopo antes de culpar o modelo.

Depois, os achados no formato do `SKILL.md`. E registre com o número **real** de passadas:

```
node "<SKILL_DIR>/scripts/sensei.mjs" record --findings N --severity S0:a,S1:b,S2:c --agents 5
```

Omitir o `--agents` registra o run como passada única e **subestima o custo** — é a única forma de a conta mentir. O `stats` mostra o fan-out na linha própria, e a economia vai aparecer negativa: isso está correto, é o preço da arquitetura.

## O que este modo não resolve

- **Escopo ruim.** Quatro especialistas com escopo largo produzem quatro vezes mais ruído, não mais sinal
- **Falta de contexto de produto.** Nenhum especialista sabe o que "em aberto" significa no seu sistema
- **Código não alterado.** O escopo continua sendo o diff
