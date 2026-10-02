# Modelo de dados — [NOME DO MVP]

**Definido em:** [AAAA-MM-DD] · Escopo: ver `01-escopo.md`

Identificadores em português **sem acento e sem cedilha**. Todo model declara `protected $table`.

## Tabelas

### `[nome_da_tabela]` → model `[Nome]`

| Coluna | Tipo | Nulo? | Observação |
|---|---|---|---|
| `id` | bigint auto | não | do Laravel |
| `[coluna]` | [tipo] | [sim/não] | [regra, default, unicidade] |
| `created_at` / `updated_at` | timestamp | sim | do Laravel |

## Relações

- `[Nome]` **tem muitos** `[Outro]` — [por quê, em uma frase]
- `[Outro]` **pertence a** `[Nome]`

## Regras do banco a partir daqui

- **Dado real no banco = fim do `migrate:fresh`.** Toda mudança de schema passa a ser uma **migration nova e aditiva**. Apagar e recriar o banco é barato no primeiro dia e caríssimo depois que existe um usuário-teste com dado dentro.
- Migration já rodada em ambiente com dado **não se edita** — cria-se outra.
