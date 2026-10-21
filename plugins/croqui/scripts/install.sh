#!/usr/bin/env sh
# Instalador do croqui. A REDE aqui e do INSTALADOR, nao da ferramenta: o
# binario instalado nao importa net nem os/exec, e isso e verificavel com
# `make fechamento` no codigo-fonte. A distincao esta no README.
set -eu

VERSAO="${CROQUI_VERSAO:-0.1.1}"
DESTINO="${CROQUI_DESTINO:-$HOME/.local/bin}"
BASE="https://github.com/rclr-labs/plugins/releases/download/croqui-v${VERSAO}"

os=$(uname -s | tr '[:upper:]' '[:lower:]')
arch=$(uname -m)
case "$arch" in
  x86_64|amd64) arch=amd64 ;;
  arm64|aarch64) arch=arm64 ;;
  *) echo "arquitetura nao suportada: $arch" >&2; exit 1 ;;
esac

bin="croqui-${os}-${arch}"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

echo "baixando $bin ..."
curl -fsSL "$BASE/$bin" -o "$tmp/$bin"
curl -fsSL "$BASE/SHA256SUMS" -o "$tmp/SHA256SUMS"

# Conferir o checksum nao e cerimonia: a ferramenta inteira se vende por
# garantia do que ela faz, e instalar binario sem conferir contradiz isso.
echo "conferindo checksum ..."
esperado=$(grep " $bin\$" "$tmp/SHA256SUMS" | awk '{print $1}')
if [ -z "$esperado" ]; then
  echo "SHA256SUMS nao tem entrada para $bin" >&2; exit 1
fi
if command -v shasum >/dev/null 2>&1; then
  obtido=$(shasum -a 256 "$tmp/$bin" | awk '{print $1}')
else
  obtido=$(sha256sum "$tmp/$bin" | awk '{print $1}')
fi
if [ "$esperado" != "$obtido" ]; then
  echo "CHECKSUM NAO BATE. Nao instalado." >&2
  echo "  esperado: $esperado" >&2
  echo "  obtido:   $obtido" >&2
  exit 1
fi

mkdir -p "$DESTINO"
install -m 0755 "$tmp/$bin" "$DESTINO/croqui"
echo "instalado: $DESTINO/croqui"
echo "rode 'croqui' dentro de um repositorio para ver o inventario."
