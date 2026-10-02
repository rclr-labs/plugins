#!/usr/bin/env bash
# instalar.sh - instala as skills dos plugins deste repo em ~/.claude/skills/
# Alternativa ao caminho de plugin (ver README.md). Idempotente: rodar de novo atualiza.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESTINO="${HOME}/.claude/skills"

ajuda() {
  cat <<'FIM'
instalar.sh - instala as skills dos plugins RCLR Labs em ~/.claude/skills/

uso:
  ./instalar.sh                  instala (ou atualiza) as skills de todos os plugins
  ./instalar.sh <plugin>         instala só as skills desse plugin
  ./instalar.sh --listar         mostra os plugins e skills disponíveis
  ./instalar.sh --help           mostra esta ajuda

A instalação é pessoal: as skills passam a valer em qualquer projeto que você
abrir no Claude Code, sem copiar nada de novo.
FIM
}

listar_skills() {   # $1 = dir do plugin; imprime "plugin/skill|caminho"
  local plugin dir
  plugin="$(basename "$1")"
  if [[ -d "$1/skills" ]]; then
    for dir in "$1"/skills/*/; do
      [[ -f "${dir}SKILL.md" ]] && echo "${plugin}/$(basename "$dir")|${dir%/}"
    done
  fi
}

todos_plugins() {
  local d
  for d in "${RAIZ}"/plugins/*/; do [[ -d "$d" ]] && echo "${d%/}"; done
}

ALVO=""
case "${1:-}" in
  -h|--help|help) ajuda; exit 0 ;;
  -l|--listar|listar)
    echo "plugins RCLR Labs - disponíveis neste repo"
    # while-read em vez de $(...) sem quotes: o caminho do repo pode ter espaços
    while IFS= read -r p; do
      n=0
      while IFS='|' read -r nome _; do [[ -n "$nome" ]] && { echo "  ${nome}"; n=$((n+1)); }; done < <(listar_skills "$p")
      [[ $n -eq 0 ]] && echo "  $(basename "$p")  (sem skills)"
    done < <(todos_plugins)
    echo ""
    echo "help[]:"
    echo "  ./instalar.sh                 instala tudo"
    echo "  ./instalar.sh <plugin>        instala só um"
    exit 0 ;;
  "") ;;
  -*) echo "erro: flag desconhecida '${1}'. Use --help." >&2; exit 2 ;;
  *) ALVO="$1" ;;
esac

if [[ -n "$ALVO" && ! -d "${RAIZ}/plugins/${ALVO}" ]]; then
  echo "erro: plugin '${ALVO}' não existe neste repo." >&2
  echo "      use ./instalar.sh --listar para ver os disponíveis." >&2
  exit 1
fi

PLUGINS=()
if [[ -n "$ALVO" ]]; then PLUGINS=("${RAIZ}/plugins/${ALVO}"); else
  while IFS= read -r p; do PLUGINS+=("$p"); done < <(todos_plugins)
fi

mkdir -p "${DESTINO}"
INSTALADAS=0; ATUALIZADAS=0; LINHAS=""
for p in "${PLUGINS[@]}"; do
  while IFS='|' read -r nome origem; do
    [[ -z "$nome" ]] && continue
    skill="${nome#*/}"
    acao="instalada"
    [[ -d "${DESTINO}/${skill}" ]] && acao="atualizada"
    rm -rf "${DESTINO}/${skill}"
    cp -R "$origem" "${DESTINO}/${skill}"
    find "${DESTINO}/${skill}" -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null || true
    arqs="$(find "${DESTINO}/${skill}" -type f | wc -l | tr -d ' ')"
    LINHAS="${LINHAS}  ${skill},${acao},${arqs}
"
    [[ "$acao" == "instalada" ]] && INSTALADAS=$((INSTALADAS+1)) || ATUALIZADAS=$((ATUALIZADAS+1))
  done < <(listar_skills "$p")
done

TOTAL=$((INSTALADAS+ATUALIZADAS))
if [[ $TOTAL -eq 0 ]]; then
  echo "skills: count=0 - nenhuma skill encontrada nos plugins selecionados"
  echo "help[]:"
  echo "  ./instalar.sh --listar"
  exit 1
fi

echo "skills: total=${TOTAL} instaladas=${INSTALADAS} atualizadas=${ATUALIZADAS} destino=${DESTINO}"
printf 'skills[%d]{skill,acao,arquivos}:\n' "$TOTAL"
printf '%s' "$LINHAS"
echo "help[]:"
echo "  reinicie o Claude Code para ele reindexar as skills"
echo "  atualizar:  ./instalar.sh"
echo "  remover:    rm -rf ${DESTINO}/<skill>"
