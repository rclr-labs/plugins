# Guard rails

Proibições **nomeadas**, não princípios. Um agente consegue verificar se está violando "não rode `migrate:fresh`"; não consegue verificar se está "sendo cuidadoso com o banco".

## Sempre válidos

### `.env` é intocável

Não editar, não criar, não imprimir conteúdo. Precisa de variável nova? Peça para a pessoa adicionar e referencie via `config()`.

**Por quê:** `.env` guarda senha de banco e chaves de serviço. Além do risco óbvio, é o arquivo que não está no git — uma alteração automática ali é invisível no diff e irreproduzível em outra máquina.

### Banco: nada destrutivo depois que houver dado real

Proibidos a partir do momento em que existir qualquer dado que alguém se importe em perder:

```
php artisan migrate:fresh
php artisan migrate:refresh
php artisan db:wipe
```

Toda mudança de schema passa a ser **migration nova e aditiva**. Migration já rodada em ambiente com dado **não se edita** — cria-se outra.

**Por quê:** `migrate:fresh` é o comando mais útil do primeiro dia e o mais caro do décimo. Um usuário-teste que preencheu 20 pedidos e perdeu tudo não volta.

### Pacote novo exige permissão

Nenhum `composer require` nem `npm install` sem perguntar. Diga o que o pacote resolve, o que entra junto e qual é a alternativa de não instalar.

**Por quê:** cada dependência é uma coisa que o time da empresa vai herdar, auditar e atualizar. Num MVP, metade delas não se justifica.

### Nada de refatorar fora da fatia

Não mexer em código que não faz parte da fatia atual, mesmo vendo algo melhorável. Anote e siga.

**Por quê:** refatoração oportunista num MVP destrói a única coisa que faz o progresso visível — saber exatamente o que mudou desde que funcionava.

### "Pronto" exige prova

Antes de afirmar que algo funciona: rodar `php artisan test` e **mostrar a saída**.

**Por quê:** a falha mais cara num MVP não é o bug — é um "pronto" sobre código que nunca rodou, descoberto na frente do usuário-teste.

## Bloco "Regras de sessão"

Acrescente ao `CLAUDE.md` quando a dor marcada na calibração for **"perder o fio com a IA"**:

```markdown
## Regras de sessão

- No início de toda sessão, leia `docs/mvp/03-fatias.md` antes de qualquer coisa.
- Trabalhe em UMA fatia por vez. Se algo fora da fatia precisar de atenção,
  anote no diário de sessão e siga.
- Não reescreva arquivo que já passou no portão de uma fatia anterior sem me avisar
  e dizer por quê.
- Ao final da sessão, atualize o diário em `03-fatias.md` com uma linha:
  o que foi feito e onde parou.
```

## Bloco "Migrations" expandido

Acrescente ao `CLAUDE.md` quando a dor marcada for **"banco e migrations"**:

```markdown
## Migrations

Toda mudança de schema é uma migration NOVA. Nunca editar migration já rodada,
nunca `migrate:fresh` com dado real dentro.

Exemplo de migration aditiva — acrescentar uma coluna a uma tabela que já existe:

    php artisan make:migration adiciona_observacao_em_pedidos --table=pedidos

    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->text('observacao')->nullable()->after('total');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn('observacao');
        });
    }

Coluna nova em tabela com dado existente nasce `nullable()` ou com `default()` —
senão a migration falha nas linhas que já estão lá.
Sempre escreva o `down()`: é ele que permite voltar atrás sem apagar o banco.
```
