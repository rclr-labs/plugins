#!/usr/bin/env bash
# Instala a skill plano-mcp no Claude Code (e no DeepSeek Harness, se usado).
# Uso: ./install.sh [--scope user|project] [--copy] [--uninstall] [--force]
set -euo pipefail

SCOPE="user"
MODE="symlink"
UNINSTALL=0
FORCE=0

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILL_NAME="plano-mcp"

usage() {
  cat <<'USAGE'
plano-mcp — instalador

uso: ./install.sh [opções]
  --scope user|project   user (default): ~/.claude/skills e ~/.agents/skills
                         project: .claude/skills e .agents/skills do diretório atual
  --copy                 copia a skill em vez de criar symlink (Windows/sem dev mode)
  --uninstall            remove o que este instalador criou
  --force                substitui destino existente que não seja nosso
  -h, --help             esta ajuda

Depois de instalar, abra uma nova sessão para o catálogo de skills atualizar.
Verifique com: node <skill>/scripts/mcpx.mjs doctor
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    --scope) SCOPE="${2:-}"; shift 2 ;;
    --copy) MODE="copy"; shift ;;
    --uninstall) UNINSTALL=1; shift ;;
    --force) FORCE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "erro: opção desconhecida: $1" >&2; usage >&2; exit 2 ;;
  esac
done

case "$SCOPE" in
  user) TARGETS=("$HOME/.claude/skills" "$HOME/.agents/skills") ;;
  project) TARGETS=("$PWD/.claude/skills" "$PWD/.agents/skills") ;;
  *) echo "erro: --scope aceita user ou project" >&2; exit 2 ;;
esac

installed=0
for base in "${TARGETS[@]}"; do
  dest="$base/$SKILL_NAME"

  if [ "$UNINSTALL" -eq 1 ]; then
    if [ -L "$dest" ] || [ -d "$dest" ]; then
      rm -rf "$dest"
      echo "removido: $dest"
      installed=$((installed + 1))
    fi
    continue
  fi

  mkdir -p "$base"
  if [ -e "$dest" ] || [ -L "$dest" ]; then
    if [ -L "$dest" ] && [ "$(readlink "$dest")" = "$SKILL_DIR" ]; then
      echo "já instalado: $dest"
      installed=$((installed + 1))
      continue
    fi
    if [ "$FORCE" -eq 0 ]; then
      echo "erro: $dest já existe e não é nosso — use --force para substituir" >&2
      exit 1
    fi
    rm -rf "$dest"
  fi

  if [ "$MODE" = "copy" ]; then
    cp -R "$SKILL_DIR" "$dest"
    echo "copiado: $dest"
  else
    ln -s "$SKILL_DIR" "$dest"
    echo "symlink: $dest -> $SKILL_DIR"
  fi
  installed=$((installed + 1))
done

if [ "$installed" -eq 0 ]; then
  echo "nada a fazer: 0 destinos afetados"
  exit 0
fi

if [ "$UNINSTALL" -eq 0 ]; then
  echo
  echo "verifique: node \"$SKILL_DIR/scripts/mcpx.mjs\" doctor"
  echo "abra uma nova sessão para o catálogo de skills atualizar."
fi
