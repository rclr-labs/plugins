---
name: novo-mvp-laravel
description: This skill should be used when the user wants to "começar um MVP novo", "criar um MVP", "novo MVP em Laravel", "vamos continuar o MVP", "retomar o MVP", "próxima fatia do MVP", "fechar o MVP" or "fazer o handover do MVP". Conduz da ideia até um MVP entregável em Laravel + MySQL, construído em fatias verticais testadas, gerando o CLAUDE.md do projeto e a documentação de handover para o time de desenvolvimento.
---

# Novo MVP em Laravel

Conduz da ideia a um MVP **entregável** em Laravel + MySQL: construído em fatias verticais testadas, com um `CLAUDE.md` de projeto e documentação de handover que o time de desenvolvimento consiga adotar em vez de reescrever.

**Quem usa:** a pessoa que constrói o MVP, que pode não ser desenvolvedora. Fale sempre em português, sem jargão desnecessário, e explique o *porquê* de cada regra quando ela aparecer pela primeira vez.

**Regra mais importante desta skill:** nunca pule o portão de uma fase. Cada portão existe porque a falha que ele evita custa uma sessão inteira.

## Passo 0 — Decidir o ponto de entrada

Antes de qualquer pergunta, verifique se existe `docs/mvp/01-escopo.md` no projeto atual.

- **Não existe** → é um MVP novo. Siga para a Pré-checagem, depois Fase 0.
- **Existe** → é um MVP em andamento. Leia `docs/mvp/01-escopo.md`, `docs/mvp/02-modelo.md` e `docs/mvp/03-fatias.md`; diga em três linhas onde o MVP parou e qual é a próxima fatia; vá **direto para a Fase 4**. Não recalibre e não reescreva o escopo.

Se a pessoa pedir explicitamente para refazer o escopo, trate como MVP novo — mas avise antes que isso sobrescreve `01-escopo.md` e peça confirmação.

## Pré-checagem do ambiente

Rode e mostre a saída:

```bash
php artisan --version
```

- **Funcionou** → siga para a Fase 0.
- **Falhou ou não existe `artisan`** → o projeto Laravel ainda não existe nesta pasta. Diga isso com clareza e ofereça:
  ```bash
  composer create-project laravel/laravel .
  ```
  Depois rode `php artisan --version` de novo e só siga quando funcionar. **Não avance com o ambiente quebrado** — toda fase seguinte depende dele, e um erro aqui aparece disfarçado de outra coisa três passos adiante.

## Fase 0 — Calibração (só em MVP novo)

Uma pergunta por vez, nesta ordem. Não agrupe perguntas.

1. **Texto livre:** "Que ideia esse MVP vai testar? Uma ou duas frases."
2. **Texto livre:** "Quem é a pessoa que vai usar isso? Seja específico — 'vendedor que fecha pedido na casa do cliente', não 'usuário'."
3. **Texto livre:** "Qual é a *única* coisa que essa pessoa precisa conseguir fazer para o MVP provar a ideia?"
4. **`AskUserQuestion`, multi-select** — "Nos MVPs que você já fez, o que mais travou?"
   - `Escopo inflando` — virou sistema, nunca ficava pronto de mostrar para alguém
   - `Perder o fio com a IA` — sessões longas, padrão mudando, coisa pronta sendo refeita
   - `Banco e migrations` — schema mudando na mão, dado apagado, modelagem que não aguentou a segunda tela
   - `Handover` — código que o time olhou e não quis adotar
   - `Nada em especial / é meu primeiro MVP`
5. **`AskUserQuestion`, single-select** — "Esse MVP vai ser repassado para os desenvolvedores da empresa?"
   - `Sim, provavelmente` → **modo handover ligado**
   - `Não, é só para validar a ideia` → modo handover desligado (a Fase 5 ainda roda, mais curta)

Guarde as respostas de (4) e (5): elas mudam o `CLAUDE.md` gerado na Fase 3. A resposta de (4) não é conversa fiada — é ela que decide quais guard rails ganham destaque.

## Fase 1 — Escopo → `docs/mvp/01-escopo.md`

1. A partir das respostas 1–3, derive: **1 a 3 entidades** e **exatamente 1 fluxo principal**.
2. **Portão de escopo.** Se a jornada exigir mais de 3 entidades ou mais de um fluxo, **pare**. Não escreva arquivo nenhum. Diga o que não cabe, proponha o corte concreto ("deixa relatório e perfil de usuário fora da v1 — só pedido, cliente e produto") e peça a decisão. Só siga com o corte feito.
3. Preencha `templates/01-escopo.md` (nesta pasta de skill) e grave em `docs/mvp/01-escopo.md`. A seção **"Fora do escopo"** é obrigatória e precisa citar nominalmente o que ficou de fora — inclusive o que foi cortado no passo 2.
4. Mostre o arquivo e pergunte: "Tá de pé, ou muda algo?" Ajuste até o ok.

## Fase 2 — Modelo de dados → `docs/mvp/02-modelo.md`

1. Proponha as entidades em tabela: nome da tabela, colunas com tipo, e as relações entre elas. **Antes** de qualquer migration.
2. Aplique as regras de idioma de `references/convencoes-pt-br.md` (nesta pasta de skill) ao nomear tudo: português **sem acento e sem cedilha** em identificador.
3. Mostre, explique cada relação em uma frase, pergunte "faz sentido?" e ajuste.
4. Grave em `docs/mvp/02-modelo.md` a partir de `templates/02-modelo.md`.
5. Diga em voz alta a regra que evita a dor mais cara, porque ela vale a partir de agora: **depois que existir dado real no banco, nunca mais `migrate:fresh` — só migration nova.**

## Fase 3 — `CLAUDE.md` do projeto

Este é o arquivo de maior alavancagem de todo o MVP: é o único que o Claude Code relê em **toda** sessão futura.

1. **Leia as versões reais.** Abra `composer.json` (versão de `laravel/framework` e o `php` exigido) e `package.json` (o que há no front). Use os valores encontrados — nunca chute. Um `CLAUDE.md` que diz "Laravel 11" num projeto Laravel 12 faz o agente gerar sintaxe errada com confiança total.
2. **Monte o arquivo** a partir de `templates/CLAUDE.md.template`, preenchendo nome do MVP, stack e comandos.
3. **Aplique a ênfase condicional** conforme a dor marcada na Fase 0, pergunta 4:

   | Dor marcada | O que muda no `CLAUDE.md` |
   |---|---|
   | Perder o fio com a IA | Acrescente o bloco **Regras de sessão** de `references/guard-rails.md` |
   | Banco e migrations | Acrescente o bloco **Migrations** expandido, com o exemplo de migration aditiva |
   | Handover | Mova **Convenções** e **Testes** para o topo do arquivo, antes de Comandos |
   | Escopo inflando | Repita o limite "1 fluxo, no máximo 3 entidades" dentro do `CLAUDE.md`, não só no escopo |
   | Nada em especial | Use o template como está |

4. **Localização pt_BR — pergunte antes de instalar.** `faker_locale => 'pt_BR'` funciona sozinho e faz as factories gerarem CPF, CEP e nomes brasileiros; configure. Em Laravel 11+ o `config/app.php` é enxuto, então a chave talvez precise ser **adicionada**, não editada. Já `locale => 'pt_BR'` **não traduz as mensagens de validação por si**: o Laravel não embarca tradução pt_BR e cai no inglês em silêncio. Então pergunte:

   > "Quer que eu instale o pacote `laravel-lang/lang` para as mensagens de erro saírem em português? São mensagens que o usuário do seu MVP vai ler."

   - Sim → instale e configure `locale`.
   - Não → deixe em inglês e **registre como dívida declarada** no `04-handover.md`. Não deixe isso virar mistério.
5. Mostre o arquivo final e confirme.

## Fase 4 — Construção em fatias verticais → `docs/mvp/03-fatias.md`

1. **Se `03-fatias.md` não existir:** quebre o fluxo principal em 2 a 5 fatias. Uma fatia é um pedaço da jornada que funciona **ponta a ponta** — nunca "o banco todo" nem "todas as telas". Grave o checklist a partir de `templates/03-fatias.md`.
2. **Construa UMA fatia**, na ordem fixa de `references/fatia-vertical.md`:

   ```
   migration -> model + factory -> rota -> controller -> Form Request -> view -> testes
   ```

   A ordem não é negociável. `controller` antes de `Form Request` é deliberado: escrever o controller primeiro mostra quais campos realmente chegam, e aí a validação cobre o que existe em vez de um contrato imaginado.
3. **Portão de fatia** — os dois, não um:
   - `php artisan test` verde. Rode e **mostre a saída**.
   - A tela aberta no navegador, funcionando. Diga à pessoa qual URL abrir.
4. Marque a fatia como concluída em `03-fatias.md`, **pare**, e pergunte se quer seguir para a próxima. Nunca encadeie duas fatias sem passar por aqui.

## Fase 5 — Handover → `docs/mvp/04-handover.md`

Rode quando as fatias acabarem, ou quando a pessoa pedir ("fechar o MVP", "fazer o handover").

1. Preencha `templates/04-handover.md`: como rodar o projeto do zero, o modelo de dados final, as decisões tomadas e o porquê.
2. **Atalhos conscientes viram dívida numerada e declarada** — incluindo o que ficou de fora na Fase 1 e a recusa de pacote na Fase 3. Um desenvolvedor sênior aceita "envio de e-mail síncrono, sem fila — dívida nº 3"; o que ele rejeita é descobrir isso sozinho em produção.
3. Se o modo handover estiver **ligado**, acrescente a seção "O que falta para produção" e rode `php artisan test` uma última vez, colando a saída no documento como prova de que a suíte passa.

## Regras válidas em todas as fases

- **Uma fatia por vez.** Nada de trabalho fora da fatia atual.
- **Nunca** edite nem crie `.env`, e nunca imprima segredo. Precisa de variável nova? Peça para a pessoa adicionar e referencie via `config()`.
- **Nunca** rode `migrate:fresh`, `migrate:refresh` ou `db:wipe` depois que houver dado real.
- **Nunca** instale pacote Composer ou NPM sem perguntar.
- **Nunca** refatore o que não faz parte da fatia atual.
- **Nunca** afirme que algo está pronto sem rodar `php artisan test` e mostrar a saída. A falha mais cara num MVP não é o bug — é um "pronto" sobre algo que nunca rodou, descoberto na frente do usuário-teste.
