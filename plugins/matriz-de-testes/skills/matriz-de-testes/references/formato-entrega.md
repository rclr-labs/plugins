# Formato da entrega

Os cabeçalhos abaixo são **interface, não estilo**. A Seção 7 da Matriz de
Cobertura v2 e a Seção 7 da documento de Ciclo de Execução estabelecem que as páginas da ferramenta de gestão
Docs são varridas por script via API ("Indexar para IA: certifique-se de que a
página está em uma pasta pública para que o script de automação via API consiga
realizar a varredura dos dados"). Desvio de cabeçalho quebra automação a
jusante. Não reescreva os textos entre `COLUNAS`, `LEGENDA`, `PRIORIZACAO` e
`CHECKLIST` em `render_matriz.py`.

## 1. Matriz de Cobertura — `render_matriz.py`

Saída: `saida/Matriz de Cobertura — <sistema>.md` e `.docx`.

Sete seções, na ordem do guia original:

1. **TEMPLATE DA MATRIZ DE COBERTURA** + 1.1 Legenda dos Campos
2. **CRITÉRIOS DE PRIORIZAÇÃO DE CENÁRIOS DE TESTE** (tabela das três faixas)
3. **REGRAS DE NOMENCLATURA E PREFIXOS** (gerada do `prefixos` do config)
4. **MATRIZ DE COBERTURA POR FUNCIONALIDADE** (4.1, 4.2… uma tabela por funcionalidade)
5. **ESTRUTURA DE PASTAS SUGERIDA NA FERRAMENTA DE GESTÃO**
6. **CHECKLIST DO ANALISTA DE TESTES** (7 itens)
7. **INSTRUÇÃO DE COPIAR E COLAR** (5 passos)

Colunas da tabela, nesta ordem exata:

```
CT ID | Cenário | Prioridade | Tipo de Testes | História origem | Última revisão | Artefatos ID | Observações
```

O `.docx` é montado escrevendo o zip OOXML direto (`[Content_Types].xml`,
`_rels/.rels`, `word/document.xml`, `word/styles.xml`,
`word/_rels/document.xml.rels`) — sem `python-docx`, que não é garantido no
ambiente. Página em paisagem, porque 8 colunas não cabem em retrato.

## 2. Ciclo de Execução — `render_ciclo.py`

Saída: `saida/<TIPO> — <FEATURE/RELEASE> — <AMBIENTE> — <YYYY-MM-DD>.md`

Nomenclatura obrigatória da documento de Ciclo de Execução Seção 2.2. Conteúdo:

- cabeçalho de metadados (9 campos da Seção 3.1)
- tabela de execução: `CT ID | Cenário | Prioridade | Tipo de Testes | Status | Bugs ID | Observações`
- Status inicial `Não Executado` em todas as linhas (é um plano, não um registro)
- resumo quantitativo + regra de aprovação do tipo + parecer + próximos passos
- fluxo de trabalho do analista (7 passos)

Seleção de CTs por tipo (Seção 4): `Funcional` = todos da feature ·
`Regressão` = CTs com `@regressao` · `Smoke` = CTs com `@smoke`.

Regras de aprovação, por tipo:

| Tipo | Ambiente default | Regra |
|---|---|---|
| Funcional | 1º do `ambientes` | 100% dos CTs Alta devem estar "Passou" |
| Regressão | 2º do `ambientes` | Nenhum CT de regressão falha sem mitigação aceita pelo PO |
| Smoke | último do `ambientes` | 100% de sucesso; falha exige rollback ou hotfix |

## 3. Rastreabilidade — `render_rastreabilidade.py`

Saída: `saida/rastreabilidade.html` — autocontido, sem CDN, sem dependência.

Não existia na entrega original: a aba `Rastreabilidade` do workbook mapeava
História → Funcionalidade → CT → Requisito, mas **sem coluna de documento de
origem**. Sem ela ninguém audita uma matriz gerada automaticamente.

Conteúdo:

- KPIs: total de CTs, % Alta, funcionalidades, técnicas, CTs no smoke,
  documentos lidos, não parseáveis
- bloco de pendências (ou confirmação explícita de que não há)
- cobertura por funcionalidade: CTs, distribuição de prioridade, técnicas,
  histórias, requisitos
- tabela filtrável por funcionalidade / prioridade / técnica / busca livre, com
  uma linha por CT: documento de origem + localizador de linha + trecho de
  evidência + critério objetivo que determinou a prioridade
- inventário do corpus: todo documento com situação `parsed` / `truncated` /
  `unparseable:<motivo>`

## Convenção de CT ID

`{PREFIXO}-CT{NNN}` — ex. `CON-CT001`. Padrão da matriz de referência, que é o guia
normativo do engajamento.

**Não** herde a convenção de um repositório de testes anterior (do tipo
`CT-<sigla>-001`): planilhas legadas costumam ser inconsistentes entre abas — a
mesma funcionalidade aparece com dois padrões diferentes em duas abas, e o
validador não tem como escolher entre eles.

O prefixo é definido uma vez por funcionalidade e **nunca muda** (Seção 3). A
numeração é sequencial por prefixo e não reinicia em novas histórias. O
validador bloqueia mudança de prefixo contra um `--baseline`.
