# vibe-auditor

Auditoria sênior de aplicações "vibe-coded" (geradas aceleradamente via LLM/prompt): funcionam no caminho feliz, mas costumam esconder falhas de arquitetura, segurança, resiliência, observabilidade e testes.

```
/vibe-audit [caminho]
```

Dispara também por reconhecimento de intenção na frase ("audita esse app", "faz um vibe audit aqui"), sem precisar do comando.

## Fluxo

```
Descoberta & Mapeamento → Auditoria dos 5 Pilares → Matriz de Maturidade → Geração dos Artefatos
```

## Os 5 pilares

| Pilar | O que procura |
|---|---|
| Arquitetura | God files, regra de negócio vazada na camada de apresentação, mocks esquecidos em produção, migrations ausentes |
| Segurança (AppSec) | Credenciais hardcoded, IDOR, validação de schema ausente, CORS permissivo, falta de rate limiting |
| Resiliência | `catch` vazio, timeout ausente, retry/circuit breaker, transação ausente, graceful shutdown |
| Observabilidade | Logs não estruturados, métricas/tracing ausentes, health check falso, falta de audit log |
| Testes | Testes que só mockam, zero caso de borda, `any`/`@ts-ignore` em excesso |

Cada pilar recebe nota de 1 (Vibe Prototyping) a 5 (Enterprise-Grade).

## Artefatos gerados

- `VIBE_AUDIT_REPORT.md` — resumo executivo, nota de prontidão (0-100), radar de maturidade, evidência por arquivo/linha.
- `REMEDIATION_BACKLOG.md` — backlog P0-P3, cada item com impacto, esforço, critérios de aceite e prompt pronto para o Claude Code executar.
