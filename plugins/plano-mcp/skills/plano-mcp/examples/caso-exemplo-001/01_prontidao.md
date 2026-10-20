# Prontidão — ACME

> ⚠️ EXEMPLO SINTÉTICO. `ACME` é o sistema fictício usado nos exemplos da casa: gestão de contratos, serviços e eventos de atendimento com apuração de SLA.

**Veredito: PRONTO COM RESSALVAS — 10/12**

| # | Eixo | Nota | Evidência |
|---|---|---|---|
| 1 | Camada de serviço | `2` | FATO: `src/services/` e `src/repositories/` separados; `AtendimentoService` com autorização em `src/services/atendimentos.ts:51` |
| 2 | Identidade | `2` | FATO: JWT em `src/middleware/auth.ts:14`; `req.user` usado em 22 pontos de `src/routes/atendimentos.ts` |
| 3 | Superfície de leitura | `2` | FATO: `GET` em `src/routes/atendimentos.ts` com sinal de paginação |
| 4 | Isolamento entre contas | `2` | FATO: `contrato_id` aplicado em `src/services/atendimentos.ts:33` (11 ocorrências) |
| 5 | Ambiente verificável | `1` | INFERÊNCIA: existe homologação (7 variáveis de ambiente declaradas), mas não confirmamos dado realista nem um ID conferível |
| 6 | Evidência | `1` | FATO: `npm run test` detectado. LACUNA: não há forma confirmada de ver a chamada registrada no produto |

## Ressalvas (cada uma vira issue antes da fatia que depende dela)

- **Eixo 5** — sem um registro de homologação com ID conferível, a fatia 4 não tem como provar que leu dado real. Destrava com: um evento de atendimento de teste conhecido, ou o adaptador de fixtures gêmeo.
- **Eixo 6** — sem registro de auditoria visível, a evidência da chamada fica só no cliente MCP. Destrava com: log de acesso por usuário em homologação.

## Lacunas (pergunta, não suposição)

| Lacuna | Pergunta | Dono sugerido | Prioridade |
|---|---|---|---|
| "meus atendimentos" | É `responsavel_id = usuário autenticado`, `solicitante_id`, ou os dois? | Produto | P1 |
| "em aberto" | Quais dos estados reais contam como aberto? | Produto | P1 |
| Dado de homologação | Existe evento de teste estável com ID que podemos conferir na interface? | Infra | P1 |
| `query-raw` em `sla_snapshot.ts:88` | É entrada de usuário concatenada? (não está no caminho do MCP, mas precisa de resposta) | Backend | P2 |

## Escopo aprovado para o primeiro ciclo

Somente **leitura**, transporte **stdio**, **2 ferramentas** (`listar_atendimentos`, `obter_atendimento`). Escrita, transporte remoto e autenticação de cliente externo ficam na fatia 7.
