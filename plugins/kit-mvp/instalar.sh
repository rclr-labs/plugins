#!/usr/bin/env bash
# instalar.sh - instala a skill novo-mvp-laravel em ~/.claude/skills/
# Alternativa ao caminho de plugin (ver README.md). Idempotente: rodar de novo atualiza.
set -euo pipefail

SKILL="novo-mvp-laravel"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORIGEM="${RAIZ}/skills/${SKILL}"
DESTINO="${HOME}/.claude/skills"

ajuda() {
  cat <<'FIM'
instalar.sh - instala a skill novo-mvp-laravel do Kit MVP

uso:
  ./instalar.sh            instala (ou atualiza) a skill em ~/.claude/skills/
  ./instalar.sh --help     mostra esta ajuda

A instalacao e pessoal: a skill passa a valer em qualquer projeto Laravel
que voce abrir no Claude Code, sem copiar nada de novo.
FIM
}

case "${1:-}" in
  -h|--help|help) ajuda; exit 0 ;;
  "") ;;
  *) echo "erro: flag desconhecida '${1}'. Use --help." >&2; exit 2 ;;
esac

if [[ ! -d "${ORIGEM}" ]]; then
  echo "erro: nao encontrei ${ORIGEM}" >&2
  echo "      rode este script de dentro da pasta do repo kit-mvp." >&2
  exit 1
fi

if [[ ! -f "${ORIGEM}/SKILL.md" ]]; then
  echo "erro: ${ORIGEM} existe mas nao tem SKILL.md - copia incompleta do repo." >&2
  exit 1
fi

ACAO="instalada"
[[ -d "${DESTINO}/${SKILL}" ]] && ACAO="atualizada"

mkdir -p "${DESTINO}"
rm -rf "${DESTINO}/${SKILL}"
cp -R "${ORIGEM}" "${DESTINO}/${SKILL}"

ARQUIVOS="$(find "${DESTINO}/${SKILL}" -type f | wc -l | tr -d ' ')"

cat <<FIM
kit-mvp - instalacao da skill
  skill:   ${SKILL}
  destino: ${DESTINO}/${SKILL}
  status:  ${ACAO} (${ARQUIVOS} arquivos)

help[]:
  Abra o Claude Code num projeto Laravel e diga: "quero comecar um MVP novo"
  Retomar depois:  "vamos continuar o MVP"
  Atualizar:       ./instalar.sh
  Remover:         rm -rf ${DESTINO}/${SKILL}
FIM
