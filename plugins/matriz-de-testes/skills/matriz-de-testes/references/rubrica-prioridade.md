# Rubrica de priorização

Transcrição dos critérios da Seção 2 da Matriz de Cobertura de referência em campos
booleanos. A prioridade de um CT nunca vem de julgamento no momento da geração:
vem de flags marcadas no achado, cada uma com um trecho literal de evidência.
Isso é o que permite defender uma matriz de 2000 CTs frente ao cliente.

## Os três grupos

Cada flag `true` **exige** uma entrada em `evidencia` com o trecho do documento
e o número de linha (`(L144)`). O validador avisa quando falta.

### `criticos` → Alta

| Flag | Critério da Seção 2 |
|---|---|
| `caminho_feliz` | Caminho feliz principal |
| `critico_negocio` | Funcionalidade crítica ao negócio |
| `primeira_entrega` | Primeira entrega |
| `alta_prob_falha` | Alta probabilidade de falha |
| `integracao_externa` | Integrações externas |
| `seguranca_compliance` | Segurança/Compliance |

### `medios` → Média

| Flag | Critério da Seção 2 |
|---|---|
| `variacao_fluxo` | Variações do fluxo principal (campos opcionais) |
| `excecao_nao_critica` | Tratamento de exceção não crítico |
| `refatoracao` | Refatorações |
| `usabilidade` | Usabilidade |
| `integracao_interna_estavel` | Integrações internas estáveis |

### `baixos` → Baixa

| Flag | Critério da Seção 2 |
|---|---|
| `exploratorio` | Cenários exploratórios |
| `legado_estavel` | Funcionalidades legadas estáveis |
| `layout_visual` | Validação de layout/visual |
| `baixa_prob_falha` | Baixa probabilidade de falha |
| `infraestrutura` | Configurações de infraestrutura |

## Cascata

1. Qualquer `criticos.*` verdadeiro → **Alta**
2. senão, qualquer `medios.*` → **Média**
3. senão, qualquer `baixos.*` → **Baixa**
4. nenhuma flag → **Média** por default, marcado `prioridade_por_default: true`

O caso 4 é uma pendência, não um resultado: aparece no `rastreabilidade.html`
como "atribuído por default" e vira aviso R8 no validador. Um achado sem
nenhuma flag significa que o subagente não achou base no documento para
classificar — alguém precisa olhar.

## Tags derivadas da prioridade

| Prioridade | Tipo de Testes |
|---|---|
| Alta | `@smoke @regressao` |
| Média | `@regressao` |
| Baixa | (sem tag) |

**Alta ⇒ `@smoke` é obrigatório e bloqueante** (regra R1 do validador).

Os exemplos da Seção 4 da matriz de referência violam isso em 5 CTs — `ATE-CT003`,
`ATE-CT006`, `FIL-CT003`, `FIL-CT011`, `FIL-CT012` são Alta com `@regressao`
apenas, enquanto a Seção 2 do mesmo documento diz "@smoke (obrigatório)" e o
checklist da Seção 6 pergunta "Todos os CTs de prioridade Alta possuem a tag
@smoke?". Tratamos os exemplos como erro do documento, não como precedente.

Rodar `validate.py` contra uma transcrição da matriz de referência original tem que
devolver `exit 1` com exatamente essas 5 violações — é o teste de regressão do
validador.

Para manter o smoke enxuto sem afrouxar a regra, o rebaixamento acontece
**antes** das tags: dentro de um array pairwise só o subconjunto t=1 permanece
Alta. Ver `tecnicas-de-teste.md`.
