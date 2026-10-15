# ENTRADAS.md — O que a skill precisa e como você fornece

Não existe integração, login, API ou instalação: **a entrada é texto e arquivo**. Você cria a pasta do caso, coloca o material em `00_entrada/` e pede a fase. A skill **lê e copia** — nunca edita o material bruto, porque ele é a prova do que o cliente e o time disseram.

## Quadro por fase

| Fase | Precisa (obrigatório) | Melhora muito | Se faltar |
|---|---|---|---|
| `preparar` | **O chamado** — texto, e-mail, print, link ou ID | Documentação do sistema + checklist do time | Sem chamado, faz 3 perguntas de escopo antes de gerar. Sem documentação, marca tudo como "não verificado" e sobe as perguntas de contexto |
| `esqueleto` | Nada novo (usa o dossiê) | Anexos que o cliente mandou (planilha, print) | Gera a partir das mesmas entradas da fase 1 |
| `avaliar` | **A transcrição da reunião** | Ata/anotações e lista de participantes | **Para e explica o que falta** — nunca infere a reunião |
| `qualificar` | **O documento escrito pelo participante** | Dossiê e relatório de cobertura, para cruzar | Sem o documento, roda só a cobertura |
| `ideal` | O que existir acima | Sessão de líder (nunca junto do participante) | Gera hipótese antes da reunião e consolida depois |

## Três formas de fornecer

1. **Pasta do caso (recomendado).** Crie `validacao-clientes/<AAAA-MM-DD>-<slug>/` e salve o material em `00_entrada/` com nomes previsíveis (tabela abaixo). A skill reconhece pelo prefixo do nome.
2. **Colar no chat.** Cole o chamado ou a transcrição na conversa e peça a fase. A skill salva em `00_entrada/` para manter o rastro.
3. **Apontar o caminho.** "A documentação está na pasta de Downloads" ou "em `documentos/wiki.pdf`". Vale caminho de Windows, Linux ou macOS — a skill lê de onde estiver e copia para a pasta do caso.

### Nomes que a skill reconhece

| Padrão do arquivo | O que é | Usado em |
|---|---|---|
| `chamado*` | pedido do cliente (qualquer formato) | 1, 2 |
| `documentacao*` · `doc-*` · `wiki-*` | documentação do sistema | 1, 2 |
| `checklist*` | checklist do time (substitui a embutida) | 1, 3 |
| `transcricao*` · `ata*` · `notas*` | transcrição ou registro da reunião | 3 |
| `documento-participante*` · `requisitos-*` | documento escrito pelo participante | 3, 4 |
| `anexo-*` | planilha, print ou arquivo que o cliente mandou | 1 |

Qualquer outro nome funciona: a skill lê tudo o que estiver em `00_entrada/` e classifica pelo conteúdo. Nome previsível só evita perguntas.

## Formatos

| Formato | Como funciona |
|---|---|
| `.md` `.txt` `.csv` `.vtt` `.srt` | Ideal — leitura direta, inclusive legenda de reunião com timestamp |
| `.docx` `.pdf` | Funciona. PDF escaneado (imagem) não é lido: a skill avisa e pede o texto |
| Print/imagem | Serve como referência; para virar requisito, o essencial precisa estar em texto |
| `.xlsx` `.csv` | Lê estrutura, colunas e números — útil para a planilha que o cliente já usa |
| Áudio/vídeo | **Não é lido diretamente.** Use a transcrição que a ferramenta da reunião já gera |
| Link | Abre se você tiver acesso; se não, cole o conteúdo |

## Dados sensíveis

- Transcrição e documentação frequentemente contêm **nome, CPF, dado de cliente e cláusula contratual**.
- A pasta do caso fica em local de acesso restrito; `00_entrada/` e `_interno/` **nunca são entregues** a quem escreve o documento.
- Ao citar trechos em relatório ou feedback, use o mínimo necessário e **mascare dado pessoal** (ex.: `CPF ***.***.***-**`).
- Se o material precisar circular fora do time, aplique a política de privacidade da casa **antes** de rodar a fase.

## O que a skill nunca faz com as entradas

- Não edita nada em `00_entrada/`.
- Não inventa o que não está no material: lacuna vira pergunta, não suposição.
- Não infere reunião sem transcrição; sem trecho citável, a classificação é `Não coberto`.
