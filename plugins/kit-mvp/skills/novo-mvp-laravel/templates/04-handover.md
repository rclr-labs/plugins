# Handover — [NOME DO MVP]

**Para:** time de desenvolvimento · **De:** [quem construiu] · **Data:** [AAAA-MM-DD]

Este MVP foi construído para testar uma hipótese, não para operar em produção. Este documento diz o que ele é, o que ele não é, e o que falta — para que a decisão de adotar, evoluir ou descartar seja informada.

## O que ele faz

[A jornada que funciona, em 3 a 5 linhas. Ver `01-escopo.md` para o racional.]

## Como rodar do zero

```bash
git clone [URL]
cd [pasta]
composer install
npm install && npm run build
cp .env.example .env
php artisan key:generate
# ajuste DB_DATABASE, DB_USERNAME, DB_PASSWORD no .env
php artisan migrate --seed
php artisan serve
```

## Stack e versões

Laravel [versão] · PHP [versão] · MySQL [versão] · [front]

## Modelo de dados

Ver `02-modelo.md`. Resumo: [entidades e relações em 2 linhas].

## Decisões tomadas e por quê

| Decisão | Alternativa descartada | Por quê |
|---|---|---|
| [o que foi feito] | [o que não foi] | [razão — prazo, escopo, simplicidade] |

## Dívida declarada

Atalhos **conscientes**. Nenhum deles é acidente, e nenhum deveria ser descoberto em produção.

| nº | Atalho | Consequência se escalar | Como resolver |
|---|---|---|---|
| 1 | [ex: envio de e-mail síncrono, sem fila] | [request lento sob carga] | [mover para job em fila] |
| 2 | [ex: mensagens de validação em inglês] | [usuário final lê inglês] | [instalar `laravel-lang/lang`] |

## O que falta para produção

- [ ] [item — ex: autorização revisada em todas as rotas]
- [ ] [item — ex: índices nas colunas usadas em filtro]
- [ ] [item — ex: tratamento de erro amigável nas telas]
- [ ] [item — ex: backup e política de retenção]

## Suíte de testes

```
[cole aqui a saída de `php artisan test`]
```

Convenções seguidas: ver `CLAUDE.md` na raiz do projeto. Elas foram escolhidas para que este código seja legível por quem não o escreveu.
