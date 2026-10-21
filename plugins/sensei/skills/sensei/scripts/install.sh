#!/usr/bin/env bash
# Instala a skill sensei no Claude Code e no DeepSeek Harness.
# Uso: ./install.sh [--scope user|project] [--copy] [--bin] [--uninstall] [--force]
set -euo pipefail

SCOPE="user"
MODE="symlink"
UNINSTALL=0
WITH_BIN=0
FORCE=0

usage() {
  cat <<'EOF'
sensei — instalador

uso: ./install.sh [opções]
  --scope user|project   user (default) instala em ~/.agents e ~/.claude;
                         project instala em .agents/skills e .claude/skills do cwd
  --copy                 copia a skill em vez de criar symlink
  --bin                  cria ~/.local/bin/sensei apontando para o CLI
  --uninstall            remove os symlinks criados por este instalador
  --force                substitui destino existente que não seja nosso
  -h, --help             esta ajuda

O DeepSeek Harness lê ~/.agents/skills (rank 500) e ~/.dsh/skills (rank 400).
O Claude Code lê ~/.claude/skills e o plugin instalado via marketplace.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --scope) SCOPE="$2"; shift 2 ;;
    --copy) MODE="copy"; shift ;;
    --bin) WITH_BIN=1; shift ;;
    --uninstall) UNINSTALL=1; shift ;;
    --force) FORCE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "error: opcao desconhecida: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [ "$SCOPE" != "user" ] && [ "$SCOPE" != "project" ]; then
  echo "error: --scope deve ser user ou project" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PLUGIN_DIR="$(cd "$SKILL_DIR/../.." && pwd)"

if [ ! -f "$SKILL_DIR/SKILL.md" ] || [ ! -f "$SKILL_DIR/scripts/sensei.mjs" ]; then
  echo "error: pacote incompleto em $SKILL_DIR" >&2
  exit 1
fi

if [ "$SCOPE" = "project" ]; then
  BASE="$(pwd)"
  AGENTS_DIR="$BASE/.agents/skills"
  CLAUDE_DIR="$BASE/.claude/skills"
else
  AGENTS_DIR="$HOME/.agents/skills"
  CLAUDE_DIR="$HOME/.claude/skills"
fi

points_here() {
  dest="$1"
  [ -L "$dest" ] || return 1
  target="$(readlink "$dest")"
  case "$target" in
    /*) resolved="$target" ;;
    *) resolved="$(cd "$(dirname "$dest")" && cd "$target" 2>/dev/null && pwd || true)" ;;
  esac
  [ "$resolved" = "$SKILL_DIR" ]
}

install_one() {
  dest="$1"
  label="$2"

  if [ -L "$dest" ] && points_here "$dest"; then
    if [ "$UNINSTALL" = "1" ]; then
      rm "$dest"
      echo "removido $label ($dest)"
    else
      echo "ok      $label ($dest)"
    fi
    return 0
  fi

  if [ "$UNINSTALL" = "1" ]; then
    if [ -e "$dest" ] || [ -L "$dest" ]; then
      echo "skip    $label ($dest existe e nao e nosso)"
    else
      echo "skip    $label (nao instalado)"
    fi
    return 0
  fi

  if [ -e "$dest" ] || [ -L "$dest" ]; then
    if [ "$FORCE" != "1" ]; then
      echo "warn    $label: destino existe e nao e nosso -> $dest (use --force)" >&2
      return 0
    fi
    rm -rf "$dest"
  fi

  mkdir -p "$(dirname "$dest")"
  if [ "$MODE" = "copy" ]; then
    cp -R "$SKILL_DIR" "$dest"
    echo "copiado $label ($dest)"
  else
    ln -s "$SKILL_DIR" "$dest"
    echo "link    $label ($dest -> $SKILL_DIR)"
  fi
}

if ! command -v node >/dev/null 2>&1; then
  echo "error: node nao encontrado (requer Node 18+)" >&2
  exit 1
fi
MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$MAJOR" -lt 18 ]; then
  echo "error: Node $MAJOR encontrado; requer 18+" >&2
  exit 1
fi
chmod +x "$SKILL_DIR/scripts/sensei.mjs" 2>/dev/null || true

if [ "$SCOPE" = "project" ]; then
  LABEL_AGENTS="DeepSeek Harness (./.agents)"
  LABEL_CLAUDE="Claude Code (./.claude)"
else
  LABEL_AGENTS="DeepSeek Harness (~/.agents)"
  LABEL_CLAUDE="Claude Code (~/.claude)"
fi

echo "sensei · scope=$SCOPE · mode=$MODE"
install_one "$AGENTS_DIR/sensei" "$LABEL_AGENTS"
install_one "$CLAUDE_DIR/sensei" "$LABEL_CLAUDE"

BIN_DIR="$HOME/.local/bin"
BIN="$BIN_DIR/sensei"
bin_is_ours() {
  [ -L "$BIN" ] || return 1
  [ "$(readlink "$BIN")" = "$SKILL_DIR/scripts/sensei.mjs" ]
}
if [ "$UNINSTALL" = "1" ]; then
  if bin_is_ours; then rm "$BIN"; echo "removido CLI ($BIN)"; else echo "skip    CLI ($BIN)"; fi
elif [ "$WITH_BIN" = "1" ]; then
  mkdir -p "$BIN_DIR"
  if [ -e "$BIN" ] && ! bin_is_ours; then
    echo "warn    CLI: $BIN existe e nao e nosso (use --force)" >&2
  else
    rm -f "$BIN"
    ln -s "$SKILL_DIR/scripts/sensei.mjs" "$BIN"
    chmod +x "$SKILL_DIR/scripts/sensei.mjs"
    echo "link    CLI ($BIN -> $SKILL_DIR/scripts/sensei.mjs)"
  fi
fi

if [ "$UNINSTALL" = "1" ]; then
  echo "Pronto. Abra uma nova sessão para o catálogo refletir a remoção."
  exit 0
fi

if [ "$SCOPE" = "user" ]; then
  echo
  echo "Próximo passo: abra uma nova sessão e use /sensei review (ou peça \"revise o diff\")."
  echo "Histórico: sensei stats --last 5   (se --bin não foi usado: node \"$SKILL_DIR/scripts/sensei.mjs\" stats)"
else
  echo
  echo "Próximo passo: neste repositório, abra uma nova sessão e use /sensei review."
fi
