# Caso de exemplo 001 — `acme-chamados`

Repositório fictício de um sistema de chamados (`Cliente Exemplo Ltda.`, sistema `ACME`), com as saídas que o `croqui` produz a partir dele. Serve para três coisas:

1. **Comparar** com o que você gerou no seu repositório
2. **Ver o formato** antes de rodar em código de cliente
3. **Golden test** contra regressão de formato — `examples_test.go` regenera e compara

## O que tem aqui

| Arquivo | |
|---|---|
| `acme-chamados/` | o repositório fictício: 5 rotas (4 com controller, 1 closure), 2 models, 1 job, 1 migration |
| `01_pacote.md` | nível 3 — o pacote completo, com grafo mermaid |
| `02_visual.html` | o mapa visual, que abre offline |
| `03_pacote_anonimo.md` | nível 2 com `--anonimo`, para comparar lado a lado |

```sh
croqui pacote --root ./acme-chamados --nivel 3
croqui visual --root ./acme-chamados --nivel 3
croqui pacote --root ./acme-chamados --nivel 2 --anonimo
```

## O que este caso demonstra de propósito

**`.env.example` aparece em "recusados na leitura", não no conteúdo.** Ele existe no fixture justamente para a linha de recusados não ficar vazia.

**`config/servicos.php` tem um valor sensível em posição não-declarativa** — `env('ACME_API_TOKEN')` dentro de um array. Nenhuma regra de extração aponta para literal de string, então ele não alcança o pacote. Confira: `grep ACME_API_TOKEN 01_pacote.md` não devolve nada.

**`GET /saude` usa closure**, sem controller. No pacote ela aparece com travessão nas colunas de controlador e método — "não há" é um fato declarado, não um buraco disfarçado.

**O `--anonimo` preserva a estrutura e perde a identidade.** Compare `01_pacote.md` com `03_pacote_anonimo.md`: as cinco rotas continuam cinco, o controlador continua sendo o mesmo nos quatro lugares (`Classe_01`), mas `chamados` virou `tabela_01`. Os segmentos canônicos de framework (`app`, `Http`, `Controllers`, `routes`) passam verbatim, senão o mapa não ensinaria nada.
