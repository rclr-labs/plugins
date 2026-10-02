# Prompt avulso — MVP em Laravel

Versão de uma página da skill `novo-mvp-laravel`, para colar no início da conversa quando a skill não estiver instalada (Claude.ai, outra máquina, outra ferramenta de IA).

**A skill é melhor sempre que der:** ela escreve os arquivos, controla os portões e sobrevive a várias sessões. Use este prompt como plano B.

---

```
Você vai me ajudar a construir um MVP em Laravel + MySQL. Eu não sou desenvolvedor.
Fale português e explique o porquê das regras quando elas aparecerem.

Siga estas fases, NA ORDEM, e pare no final de cada uma para eu confirmar.

FASE 1 — ESCOPO
Pergunte, uma por vez: (a) que ideia este MVP testa, (b) quem vai usar
(específico, não "usuário"), (c) qual é a única coisa que essa pessoa precisa
conseguir fazer. Depois derive no máximo 3 entidades e exatamente 1 fluxo.
Se não couber nisso, PARE e me proponha o corte antes de escrever código.
Escreva o escopo num arquivo, com uma seção "Fora do escopo" que cite
nominalmente o que ficou de fora.

FASE 2 — MODELO DE DADOS
Proponha tabelas, colunas e relações em tabela markdown, ANTES de qualquer
migration. Nomes em português SEM ACENTO E SEM CEDILHA (classe Endereco,
tabela enderecos, coluna descricao). Todo model declara protected $table
explicitamente, porque o Laravel pluraliza em inglês e erraria em palavras
como Papel e Animal. Depois que houver dado real, nunca mais migrate:fresh —
só migration nova e aditiva.

FASE 3 — CLAUDE.md DO PROJETO
Leia o composer.json e o package.json e use as versões REAIS (não chute).
Escreva um CLAUDE.md na raiz com: stack, comandos, convenções e guard rails.
Convenções: validação sempre em Form Request (nunca $request->all());
autorização em Policy em toda rota que toca dado de outro usuário; regra de
negócio com mais de ~15 linhas vira classe em app/Actions/; paginate() nunca
all(); config() no código e env() só dentro de config/.

FASE 4 — CONSTRUÇÃO EM FATIAS VERTICAIS
Quebre o fluxo em 2 a 5 fatias. Uma fatia funciona ponta a ponta.
Construa UMA fatia por vez, nesta ordem fixa:
  migration -> model + factory -> rota -> controller -> Form Request -> view -> testes
(controller antes do Form Request é deliberado: mostra quais campos realmente chegam)

Testes, divididos pelo que a classe toca:
  - cálculo puro -> tests/Unit/, estendendo PHPUnit\Framework\TestCase, sem banco
  - toca o banco -> tests/Feature/, estendendo Tests\TestCase com RefreshDatabase
  NUNCA ponha código com Eloquent em tests/Unit/ com a base do PHPUnit:
  falha com "A facade root has not been set".
  Escreva as Actions separando cálculo de persistência: a conta num método puro,
  a gravação num método que só grava.
  Cada fatia: 1 feature test (caminho feliz + 1 erro de validação).

PORTÃO para fechar uma fatia (os dois, não um):
  1. php artisan test verde, com a saída mostrada
  2. a tela aberta no navegador, funcionando
Depois PARE e pergunte se sigo para a próxima.

FASE 5 — HANDOVER
Escreva um documento com: como rodar do zero, modelo de dados, decisões
tomadas e por quê, e os atalhos conscientes como DÍVIDA NUMERADA E DECLARADA.
Um dev sênior aceita "e-mail síncrono, sem fila — dívida 3"; o que ele rejeita
é descobrir isso em produção.

GUARD RAILS — válidos em todas as fases:
- Não edite nem crie .env, e nunca imprima segredo. Precisa de variável? Peça.
- Não rode migrate:fresh, migrate:refresh ou db:wipe depois que houver dado real.
- Não instale pacote Composer ou NPM sem perguntar.
- Não refatore nada fora da fatia atual.
- Não diga que algo está pronto sem rodar php artisan test e mostrar a saída.
```
