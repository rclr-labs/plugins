# Sinais determinísticos

Carregue só se um sinal do bundle parecer ambíguo ou falso positivo.

O `collect` roda regex de alta precisão **apenas nas linhas adicionadas**. O sinal é uma pista, não um veredito: confirme o caminho real no hunk antes de reportar.

## Como usar

1. Localize a linha no diff (o bundle traz `arquivo:linha` e o trecho).
2. Procure a guarda/validação que pode tornar o sinal inofensivo.
3. Se precisar, peça contexto: `sensei slice --file F --line L`.
4. Se for falso positivo, ignore sem mencionar. Se for real, vira achado com gatilho e impacto.

## Grupos de regras

| Regra | O que indica | Falso positivo comum | Como confirmar |
|---|---|---|---|
| `secret-*` | chave/token/senha literal, URL de banco com credencial | fixture, exemplo documentado, `.env.example` | é valor real? está versionado? |
| `sql-concat`, `sql-template`, `sql-fstring`, `sql-percent` | SQL montado com entrada | entrada é constante interna, não do usuário | a variável vem de request/DB? há bind em volta? |
| `sql-delete-all`, `sql-update-all` | DELETE/UPDATE sem WHERE | operação administrativa intencional | há filtro em outra camada? há backup? |
| `sql-notnull` | `ADD COLUMN NOT NULL` sem default | tabela nova/vazia garantida | a migration roda em tabela com dados? há backfill separado? |
| `sql-drop` | DROP/TRUNCATE | migration de limpeza aprovada | é destrutivo em produção? há rollback? |
| `eval`, `new-function` | execução de código dinâmico | motor de template/regra controlado | a entrada é confiável e validada? |
| `shell-true`, `os-system` | comando com shell | comando fixo sem interpolação | há entrada do usuário no comando? |
| `pickle`, `yaml-load`, `unserialize` | desserialização insegura | dados internos confiáveis | a origem é externa? há Loader seguro? |
| `xss-html`, `xss-bypass` | HTML/script não sanitizado | conteúdo constante/confiável | o valor vem de usuário/DB? há sanitizer? |
| `jwt-decode` | decode sem verificar assinatura | uso só para ler claims após verify | existe verify antes? |
| `verify-false` | TLS desligado | teste local com mock explícito | vai para produção? |
| `jwt-none` | algoritmo `none` aceito | teste unitário | o código de produção aceita? |
| `weak-hash` | MD5/SHA1 para segurança | checksum não-seguro | protege senha/token/assinatura? |
| `math-random` | random não criptográfico | uso cosmético/ID não-secreto | gera token/senha/nonce de segurança? |
| `cors-wildcard` | CORS `*` | API pública sem credenciais | envia cookie/Authorization? |
| `cookie-flags` | cookie sem httpOnly/secure | dev local | cookie de sessão em produção? |
| `empty-catch`, `bare-except` | erro engolido | erro esperado e tratado em outro lugar | o fluxo continua consistente? |
| `debugger`, `suppression` | breakpoint/supressão | supressão justificada | esconde bug real? |
| `unsafe-rust` | bloco unsafe | invariantes documentadas | há prova de segurança? |
| `ssrf-fetch` | URL vinda do cliente | allowlist anterior | o host é validado? |
| `open-redirect` | redirect com entrada | destino é constante | o cliente controla o destino? |
| `path-traversal` | caminho vindo do cliente | path normalizado/base fixa | consegue sair do diretório? |
| `mass-assign` | `req.body` inteiro no objeto | DTO com whitelist | campos sensíveis passam? |
| `csrf-disabled` | CSRF desligado | API stateless com token | usa cookie de sessão? |

## O que o scan não faz

- não analisa fluxo de dados nem semântica; é regex de linha
- não vê código não alterado (o escopo é o diff)
- não substitui a leitura do hunk nem o teste de refutação
- não é exaustivo: ausência de sinal não significa ausência de bug

Se um sinal virar achado, cite o defeito real, não o nome da regra.
