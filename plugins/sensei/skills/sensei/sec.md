# sec — revisão de segurança

Modo para quando a pergunta é "isto é explorável?". Mais estreito e mais fundo que o `review`: aqui **só entra achado com caminho de ataque**, não boa prática.

## A pergunta que separa achado de teatro

Para cada candidato, responda as três e só reporte se as três fecharem:

1. **Quem é o atacante?** Usuário autenticado comum, usuário de outra conta, anônimo na internet, alguém com acesso ao log, ou processo vizinho na máquina?
2. **Por onde a entrada dele chega?** Parâmetro, corpo, cabeçalho, arquivo, nome de arquivo, variável de ambiente, conteúdo de banco gravado antes.
3. **O que ele consegue?** Ler o que não é dele, escrever, apagar, escalar privilégio, negar serviço, ou só poluir log.

Se a resposta de (2) for "entrada que só o próprio código produz", quase sempre **não é achado**.

## Autorização — o primeiro lugar a olhar

Mais vulnerabilidade real nasce aqui do que em injection, e é também onde a revisão automatizada mais ajuda, porque o padrão é reconhecível:

- **Rota nova sem verificação** — autenticação presente, autorização ausente
- **IDOR**: confere a sessão mas não o **dono do recurso**. O teste mental é trocar o id do path pelo id de outra conta
- **Isolamento entre contas**: a consulta filtra por `tenant`/`account`/`organization`, ou confia que o chamador filtrou?
- **Autorização no lugar errado** — na UI, no front, ou no controller enquanto outro caminho chega direto ao serviço
- **Escalada por massa**: `req.body` inteiro atribuído ao objeto, deixando passar `role`, `is_admin`, `owner_id`
- **Verificação por papel global** onde o correto é por recurso

## Injeção

A regra única: **dado nunca vira código**. Em qualquer interpretador.

- **SQL** — concatenação ou interpolação de entrada. Parâmetro, sempre. Nome de tabela/coluna dinâmico exige *allowlist*, porque não há como parametrizar identificador
- **Comando de SO** — shell com interpolação, `shell=True`, `Invoke-Expression`, `eval`
- **LDAP, XPath, NoSQL, template engine** — mesma falha, interpretadores diferentes
- **Desserialização insegura** — `pickle`, `yaml.load` sem loader seguro, `unserialize`, binário de origem externa
- **XSS** — `innerHTML`, `dangerouslySetInnerHTML`, `v-html`, template sem escape, atributo construído por concatenação
- **Prompt injection** — entrada não confiável chegando a um modelo como instrução. Conteúdo vindo do banco ou do usuário é **dado**; se o sistema o concatena no prompt sem delimitar e sem instrução de desconfiança, é a mesma classe de falha

## Segredo e credencial

- **Literal no código** — chave, token, senha, string de conexão. Verifique se já está no histórico do git: trocar o arquivo não revoga nada
- **Em log** — token em log de requisição, corpo inteiro logado, exceção com credencial na mensagem
- **Em erro para o usuário** — stack trace, caminho absoluto, versão de componente, consulta SQL
- **Credencial de serviço onde devia haver a do usuário** — é o que transforma uma ferramenta em superusuário
- **Arquivo `.env` versionado**, ou `.env.example` com valor real

## Transporte e criptografia

- Verificação de TLS desligada (`verify=False`, `rejectUnauthorized: false`, `InsecureSkipVerify`)
- Hash fraco para finalidade de segurança (MD5, SHA-1); senha sem KDF com fator de custo
- Aleatoriedade não criptográfica (`Math.random`, `rand()`) gerando token, nonce ou identificador secreto
- JWT: assinatura não verificada, algoritmo aceito do próprio token, `none` aceito, expiração não checada
- Cookie de sessão sem `HttpOnly`, `Secure`, `SameSite`

## Entrada que vira destino

- **SSRF** — URL vinda do cliente usada em requisição do servidor. Bloquear faixa privada e metadata (`169.254.169.254`), validar após redirecionamento
- **Path traversal** — caminho ou nome de arquivo vindo do cliente. Normalizar e confinar a uma base
- **Open redirect** — destino de redirecionamento controlado pelo cliente
- **Upload** — tipo e tamanho validados no servidor, armazenamento fora do diretório servido, nome de arquivo não reaproveitado

## Negação de serviço

Só reporte com custo concreto no diff:

- Consulta ou laço sem limite sobre entrada do usuário
- Regex com retrocesso catastrófico sobre entrada livre
- Upload sem limite de tamanho; descompressão sem limite (*zip bomb*)
- Operação cara sem autenticação prévia

## O que **não** reportar aqui

- Ausência de cabeçalho de segurança sem contexto de exploração
- Versão de dependência sem CVE conhecido e sem caminho de exploração no diff
- "Boa prática" sem atacante, entrada e impacto — isso é `review`, não `sec`
- Achado de scanner repetido sem confirmar o caminho real no código

## Severidade neste modo

| Nível | Critério |
|---|---|
| **S0** | Explorável por atacante com o acesso que ele já tem; segredo real exposto; authz ausente em rota que toca dado de cliente |
| **S1** | Explorável sob condição plausível, ou falha que amplia o impacto de outra; segredo em log |
| **S2** | Defesa em profundidade ausente, sem caminho de exploração identificado |

Achado de segurança **sem caminho de exploração** não é S0 por precaução. Inflar severidade aqui é como o time aprende a ignorar S0.
