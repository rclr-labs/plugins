---
description: Auditoria completa de app vibe-coded — arquitetura, segurança (AppSec), resiliência, observabilidade e testes.
argument-hint: "[caminho opcional do repositório/diretório a auditar]"
---

Siga a skill `vibe-auditor` (carregue-a se ainda não estiver no contexto). Argumentos: $ARGUMENTS

Regras:
1. Sem argumento, audite o repositório atual a partir da raiz.
2. Execute as 4 fases da skill em sequência: descoberta e mapeamento → auditoria dos 5 pilares → matriz de maturidade → geração dos artefatos.
3. Grave `VIBE_AUDIT_REPORT.md` e `REMEDIATION_BACKLOG.md` na raiz do repositório auditado.
4. Encerre com o resumo executivo e a contagem de itens por prioridade no terminal.
