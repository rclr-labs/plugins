PLATAFORMAS := darwin/arm64 darwin/amd64 linux/amd64 linux/arm64 windows/amd64
VERSAO ?= 0.1.0
DIST := dist

.PHONY: test fechamento build dist limpa

test:
	go test ./...

# A garantia central, enunciavel para a area de seguranca do cliente.
fechamento:
	@if go list -deps ./cmd/croqui | grep -xE 'net|net/http|net/smtp|os/exec'; then \
		echo "FALHOU: pacote proibido no fechamento do binario"; exit 1; \
	else \
		echo "fechamento limpo: sem rede, sem subprocesso"; \
	fi

build:
	go build -trimpath -ldflags "-s -w" -o croqui ./cmd/croqui

dist: test fechamento
	@rm -rf $(DIST) && mkdir -p $(DIST)
	@for p in $(PLATAFORMAS); do \
		os=$${p%/*}; arch=$${p#*/}; ext=""; \
		[ "$$os" = "windows" ] && ext=".exe"; \
		echo "  $$os/$$arch"; \
		CGO_ENABLED=0 GOOS=$$os GOARCH=$$arch go build -trimpath \
			-ldflags "-s -w" -o $(DIST)/croqui-$$os-$$arch$$ext ./cmd/croqui; \
	done
	@cd $(DIST) && shasum -a 256 croqui-* > SHA256SUMS && cat SHA256SUMS

limpa:
	rm -rf $(DIST) croqui
