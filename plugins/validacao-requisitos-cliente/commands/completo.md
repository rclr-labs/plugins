---
description: Encadeia as fases do ciclo de validação de requisitos que já têm entrada disponível na pasta do caso (preparar → esqueleto → avaliar → qualificar → ideal).
argument-hint: [pasta do caso]
---

Caso: $ARGUMENTS

Siga a skill `validacao-requisitos-cliente` e execute, na ordem, **apenas as fases cujas entradas já existem** em `00_entrada/`:

| Se existir | Rode |
|---|---|
| chamado (e documentação) | `preparar`, depois `esqueleto` |
| transcrição | `avaliar` |
| documento do participante | `qualificar` |
| as anteriores | `ideal` (só em sessão de líder) |

Regras:

1. **Diga o plano antes de executar** e pare em `ideal` se o atendimento ao participante ainda estiver em curso.
2. Fase sem entrada é **pulada com uma linha de aviso**, não inventada.
3. Ao final, resuma em até 8 linhas: arquivos gerados, cobertura dos P1, nota (se houver) e a próxima ação.
