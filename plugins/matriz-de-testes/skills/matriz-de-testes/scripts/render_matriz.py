#!/usr/bin/env python3
"""Fase 4a: cts.jsonl -> Matriz de Cobertura (.md + .docx).

Reproduz as 7 secoes do guia de padronizacao (Matriz de Cobertura de referência).
Os cabecalhos de coluna sao INTERFACE, nao estilo: as paginas da ferramenta de gestão
sao varridas por script via API (matriz de referência secao 7), entao desvio de cabecalho
quebra automacao a jusante. Nao reescreva os textos entre COLUNAS/CHECKLIST.
"""
import argparse
import json
import os
import sys
import zipfile

COLUNAS = ["CT ID", "Cenário", "Prioridade", "Tipo de Testes", "História origem",
           "Última revisão", "Artefatos ID", "Observações"]

# A 9a coluna entra apenas com "recomendar_automacao": true no config. O conjunto
# de colunas e varrido por script via API na ferramenta de gestão (matriz de referência secao 7),
# entao acrescentar coluna e mudanca de interface, nao de estilo.
COL_AUTOMACAO = "Automação"
LEGENDA_AUTOMACAO = ("Automação",
                     "Nível recomendado para automação (API, integração, E2E) ou "
                     "'manual' quando há impedimento. Ver backlog ordenado em "
                     "rastreabilidade.html.")


def colunas(cfg):
    if cfg.get("recomendar_automacao"):
        return COLUNAS[:4] + [COL_AUTOMACAO] + COLUNAS[4:]
    return list(COLUNAS)


def legenda(cfg):
    if cfg.get("recomendar_automacao"):
        return LEGENDA[:4] + [LEGENDA_AUTOMACAO] + LEGENDA[4:]
    return list(LEGENDA)

LEGENDA = [
    ("CT ID", "Identificador único. Prefixo da funcionalidade + sequencial de 3 dígitos (ex: CON-CT001)."),
    ("Cenário", "Descrição curta e objetiva do que será testado, iniciando sempre com verbo de ação."),
    ("Prioridade", "Nível de criticidade definido conforme os critérios da Seção 2 (Alta, Média ou Baixa)."),
    ("Tipo de Testes", "Tags para automação e filtros: @smoke (críticos) e @regressao (estáveis)."),
    ("História origem", "ID do card que originou o cenário para rastreabilidade de requisitos."),
    ("Última revisão", "Data da última alteração ou validação do cenário de teste."),
    ("Artefatos ID", "Link para documentos complementares (Step-by-Step, Gherkin ou Charter)."),
    ("Observações", "Notas técnicas, dependências de ambiente ou pré-condições específicas."),
]

PRIORIZACAO = [
    ["Prioridade", "Critérios Objetivos", "Tipo de Testes (Tag)", "Quando executar"],
    ["Alta",
     "Caminho feliz principal; Funcionalidade crítica ao negócio; Primeira entrega; "
     "Alta probabilidade de falha; Integrações externas; Segurança/Compliance.",
     "@smoke (obrigatório) + @regressao",
     "Smoke test (a cada build) e Regressão (antes de release)."],
    ["Média",
     "Variações do fluxo principal (campos opcionais); Tratamento de exceção não crítico; "
     "Refatorações; Usabilidade; Integrações internas estáveis.",
     "@regressao (recomendado)", "Regressão completa (antes de release)."],
    ["Baixa",
     "Cenários exploratórios; Funcionalidades legadas estáveis; Validação de layout/visual; "
     "Baixa probabilidade de falha; Configurações de infraestrutura.",
     "Sem tag obrigatória", "A critério do QA ou auditoria periódica."],
]

CHECKLIST = [
    "Todos os critérios de aceite da História de Usuário estão cobertos por pelo menos um CT?",
    "O prefixo do CT ID está correto de acordo com a funcionalidade?",
    "A Prioridade foi definida seguindo os critérios objetivos da Seção 2?",
    "Todos os CTs de prioridade Alta possuem a tag @smoke?",
    "O campo História origem contém o link/ID correto para o card da ferramenta de gestão?",
    "Artefatos complexos possuem link para o detalhamento (Step-by-Step/Gherkin)?",
    "A data de Última revisão reflete a data atual da modelagem?",
]


def linha_ct(ct, cfg=None):
    inicio = [ct["ct_id"], ct["cenario"], ct["prioridade"], " ".join(ct["tags"]) or "-"]
    fim = [str(ct.get("historia") or "-"), ct.get("ultima_revisao") or "-",
           ct.get("artefatos") or "-", ct.get("observacoes") or "-"]
    if (cfg or {}).get("recomendar_automacao"):
        return inicio + [(ct.get("automacao") or {}).get("nivel", "-")] + fim
    return inicio + fim


def agrupar(cts, cfg=None):
    """Agrupa por PREFIXO, nao por nome de funcionalidade.

    Dois nomes diferentes no ledger podem resolver para o mesmo prefixo (a
    resolucao por aproximacao de tokens torna isso comum). Agrupar por nome
    emitiria duas secoes '4.x Funcionalidade:' com CTs do mesmo prefixo — matriz
    visivelmente quebrada. O titulo vem do config quando ele conhece o prefixo;
    senao, do nome mais frequente no grupo.
    """
    por_prefixo, ordem = {}, []
    for ct in cts:
        pfx = ct["prefixo"]
        if pfx not in por_prefixo:
            por_prefixo[pfx] = []
            ordem.append(pfx)
        por_prefixo[pfx].append(ct)

    canonico = {}
    for nome, sigla in ((cfg or {}).get("prefixos") or {}).items():
        canonico.setdefault(sigla, nome)

    saida = []
    for pfx in ordem:
        grupo = por_prefixo[pfx]
        if pfx in canonico:
            titulo = canonico[pfx]
        else:
            contagem = {}
            for ct in grupo:
                contagem[ct["funcionalidade"]] = contagem.get(ct["funcionalidade"], 0) + 1
            titulo = max(contagem, key=lambda k: (contagem[k], k))
        modulo = grupo[0].get("modulo", "")
        saida.append(((modulo, titulo, pfx), grupo))
    return saida


# ------------------------------------------------------------------- markdown

def md_tabela(header, rows):
    out = ["| " + " | ".join(header) + " |",
           "|" + "|".join([" --- "] * len(header)) + "|"]
    for r in rows:
        out.append("| " + " | ".join(str(c).replace("|", "\\|") for c in r) + " |")
    return out


def render_md(cts, cfg):
    sistema = cfg.get("sistema", "Sistema")
    data = cfg.get("data_referencia", "")
    ferramenta = cfg.get("ferramenta_gestao", "a ferramenta de gestão")
    L = []
    L.append("# {0}".format(sistema))
    L.append("")
    L.append("## MATRIZ DE COBERTURA DE TESTES")
    L.append("")
    L.append("Template Operacional e Guia de Padronização para Analistas de Testes")
    L.append("")
    L.append("{0}".format(data))
    L.append("")
    L.append("---")
    L.append("")
    L.append("## 1. TEMPLATE DA MATRIZ DE COBERTURA")
    L.append("")
    L.append("Esta seção apresenta a estrutura padrão da Matriz de Cobertura. A tabela abaixo "
             "deve ser copiada para a subpágina de cada funcionalidade no {0} Docs.".format(ferramenta))
    L.append("")
    exemplo = ["[SIGLA]-CT001", "[Descrição do cenário]", "[Alta/Média/Baixa]",
               "@smoke @regressao"]
    if cfg.get("recomendar_automacao"):
        exemplo.append("[API/integração/E2E/manual]")
    exemplo += ["[ID]", data, "[ID/Link]", "[Notas]"]
    L += md_tabela(colunas(cfg), [exemplo])
    L.append("")
    L.append("### 1.1 Legenda dos Campos")
    L.append("")
    L += md_tabela(["Campo", "Descrição e Regra de Preenchimento"],
                   [[c, d] for c, d in legenda(cfg)])
    L.append("")
    L.append("## 2. CRITÉRIOS DE PRIORIZAÇÃO DE CENÁRIOS DE TESTE")
    L.append("")
    L.append("A priorização deve ser objetiva para garantir que o Smoke Test contenha apenas "
             "o essencial e a Regressão seja abrangente.")
    L.append("")
    L += md_tabela(PRIORIZACAO[0], PRIORIZACAO[1:])
    L.append("")
    L.append("## 3. REGRAS DE NOMENCLATURA E PREFIXOS")
    L.append("")
    prefixos = cfg.get("prefixos") or {}
    L += md_tabela(["Funcionalidade", "Prefixo", "Exemplo de CT ID"],
                   [[f, p, "{0}-CT001".format(p)] for f, p in prefixos.items()])
    L.append("")
    L.append("**Atenção:** O prefixo é definido uma vez por funcionalidade e nunca muda. "
             "A numeração é sequencial e não deve ser reiniciada em novas histórias.")
    L.append("")
    L.append("## 4. MATRIZ DE COBERTURA POR FUNCIONALIDADE")
    L.append("")
    for i, ((modulo, func, prefixo), grupo) in enumerate(agrupar(cts, cfg), 1):
        titulo = "{0} — {1}".format(modulo, func) if modulo and modulo not in func else func
        L.append("### 4.{0} Funcionalidade: {1}".format(i, titulo))
        L.append("")
        n_alta = sum(1 for c in grupo if c["prioridade"] == "Alta")
        tecnicas = sorted({c["tecnica"] for c in grupo})
        L.append("_{0} CTs — {1} de prioridade Alta — técnica(s): {2}_".format(
            len(grupo), n_alta, ", ".join(tecnicas)))
        L.append("")
        L += md_tabela(colunas(cfg), [linha_ct(c, cfg) for c in grupo])
        L.append("")
    L.append("## 5. ESTRUTURA DE PASTAS SUGERIDA NO {0} DOCS".format(ferramenta.upper()))
    L.append("")
    L.append("Para garantir a rastreabilidade e facilitar a varredura da automação via API, "
             "utilize a seguinte hierarquia:")
    L.append("")
    L.append("```")
    L.append("Repositório de Cenários de Testes")
    for (modulo, func, prefixo), grupo in agrupar(cts, cfg):
        L.append("  {0} ({1} — {2} CTs)".format(func, prefixo, len(grupo)))
    L.append("  Ciclos de Execução (páginas geradas pela automação para rodadas específicas)")
    L.append("```")
    L.append("")
    L.append("## 6. CHECKLIST DO ANALISTA DE TESTES")
    L.append("")
    L.append("Antes de considerar a Matriz de Cobertura finalizada, valide os seguintes pontos:")
    L.append("")
    for item in CHECKLIST:
        L.append("- [ ] {0}".format(item))
    L.append("")
    L.append("## 7. INSTRUÇÃO DE COPIAR E COLAR")
    L.append("")
    for n, passo in enumerate([
        "Criar Página: No {0} Docs, crie uma nova página dentro da pasta da "
        "funcionalidade correspondente.".format(ferramenta),
        "Copiar Tabela: Copie a tabela da funcionalidade na Seção 4 e cole na nova página.",
        "Preencher Dados: Garanta que as tags @smoke e @regressao estejam na coluna "
        "\"Tipo de Testes\".",
        "Vincular Card: No campo \"História origem\", insira o ID do card e, se possível, "
        "crie um hyperlink direto para o board.",
        "Indexar para IA: Certifique-se de que a página está em uma pasta pública para que "
        "o script de automação via API consiga realizar a varredura dos dados.",
    ], 1):
        L.append("{0}. {1}".format(n, passo))
    L.append("")
    L.append("---")
    L.append("")
    L.append("_Documento gerado em {0} pela skill `matriz-de-testes`. "
             "Rastreabilidade por CT em `rastreabilidade.html`._".format(data))
    L.append("")
    return "\n".join(L)


# ----------------------------------------------------------------- docx (OOXML)

def esc(t):
    return (str(t).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;"))


def p(texto="", bold=False, size=20, heading=None):
    rpr = "<w:rPr>"
    if bold:
        rpr += "<w:b/>"
    rpr += '<w:sz w:val="{0}"/><w:szCs w:val="{0}"/></w:rPr>'.format(size)
    ppr = '<w:pPr><w:pStyle w:val="{0}"/></w:pPr>'.format(heading) if heading else ""
    return ('<w:p>{0}<w:r>{1}<w:t xml:space="preserve">{2}</w:t></w:r></w:p>'
            .format(ppr, rpr, esc(texto)))


def tabela(header, rows):
    borda = ('<w:tblBorders>' + "".join(
        '<w:{0} w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>'.format(b)
        for b in ("top", "left", "bottom", "right", "insideH", "insideV")) + '</w:tblBorders>')
    out = ['<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>{0}</w:tblPr>'.format(borda)]
    out.append("<w:tblGrid>" + "".join('<w:gridCol w:w="1200"/>' for _ in header) + "</w:tblGrid>")

    def tr(cells, bold):
        row = ["<w:tr>"]
        for c in cells:
            row.append('<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>')
            row.append(p(c, bold=bold, size=18))
            row.append("</w:tc>")
        row.append("</w:tr>")
        return "".join(row)

    out.append(tr(header, True))
    for r in rows:
        out.append(tr([str(x) for x in r], False))
    out.append("</w:tbl>")
    return "".join(out)


STYLES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr>
<w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="40"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr>
<w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr>
<w:spacing w:before="180" w:after="100"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style>
</w:styles>"""

CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>"""

RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

DOC_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>"""


def render_docx(cts, cfg, destino):
    sistema = cfg.get("sistema", "Sistema")
    data = cfg.get("data_referencia", "")
    ferramenta = cfg.get("ferramenta_gestao", "a ferramenta de gestão")
    B = []
    B.append(p(sistema, heading="Title"))
    B.append(p("MATRIZ DE COBERTURA DE TESTES", bold=True, size=28))
    B.append(p("Template Operacional e Guia de Padronização para Analistas de Testes"))
    B.append(p(data))
    B.append(p("1. TEMPLATE DA MATRIZ DE COBERTURA", heading="Heading1"))
    B.append(p("Esta seção apresenta a estrutura padrão da Matriz de Cobertura. A tabela abaixo "
               "deve ser copiada para a subpágina de cada funcionalidade no {0} Docs.".format(ferramenta)))
    ex = ["[SIGLA]-CT001", "[Descrição do cenário]", "[Alta/Média/Baixa]", "@smoke @regressao"]
    if cfg.get("recomendar_automacao"):
        ex.append("[API/integração/E2E/manual]")
    ex += ["[ID]", data, "[ID/Link]", "[Notas]"]
    B.append(tabela(colunas(cfg), [ex]))
    B.append(p("1.1 Legenda dos Campos", heading="Heading2"))
    B.append(tabela(["Campo", "Descrição e Regra de Preenchimento"],
                    [[c, d] for c, d in legenda(cfg)]))
    B.append(p("2. CRITÉRIOS DE PRIORIZAÇÃO DE CENÁRIOS DE TESTE", heading="Heading1"))
    B.append(p("A priorização deve ser objetiva para garantir que o Smoke Test contenha apenas "
               "o essencial e a Regressão seja abrangente."))
    B.append(tabela(PRIORIZACAO[0], PRIORIZACAO[1:]))
    B.append(p("3. REGRAS DE NOMENCLATURA E PREFIXOS", heading="Heading1"))
    B.append(tabela(["Funcionalidade", "Prefixo", "Exemplo de CT ID"],
                    [[f, pr, "{0}-CT001".format(pr)] for f, pr in (cfg.get("prefixos") or {}).items()]))
    B.append(p("Atenção: O prefixo é definido uma vez por funcionalidade e nunca muda. "
               "A numeração é sequencial e não deve ser reiniciada em novas histórias.", bold=True))
    B.append(p("4. MATRIZ DE COBERTURA POR FUNCIONALIDADE", heading="Heading1"))
    for i, ((modulo, func, prefixo), grupo) in enumerate(agrupar(cts, cfg), 1):
        titulo = "{0} — {1}".format(modulo, func) if modulo and modulo not in func else func
        B.append(p("4.{0} Funcionalidade: {1}".format(i, titulo), heading="Heading2"))
        B.append(p("{0} CTs — {1} de prioridade Alta — técnica(s): {2}".format(
            len(grupo), sum(1 for c in grupo if c["prioridade"] == "Alta"),
            ", ".join(sorted({c["tecnica"] for c in grupo})))))
        B.append(tabela(colunas(cfg), [linha_ct(c, cfg) for c in grupo]))
    B.append(p("5. ESTRUTURA DE PASTAS SUGERIDA NO {0} DOCS".format(ferramenta.upper()),
               heading="Heading1"))
    B.append(p("Repositório de Cenários de Testes"))
    for (modulo, func, prefixo), grupo in agrupar(cts, cfg):
        B.append(p("    {0} ({1} — {2} CTs)".format(func, prefixo, len(grupo))))
    B.append(p("    Ciclos de Execução (páginas geradas pela automação)"))
    B.append(p("6. CHECKLIST DO ANALISTA DE TESTES", heading="Heading1"))
    for item in CHECKLIST:
        B.append(p("☐ " + item))
    B.append(p("7. INSTRUÇÃO DE COPIAR E COLAR", heading="Heading1"))
    for n, passo in enumerate([
            "Criar Página no {0} Docs dentro da pasta da funcionalidade.".format(ferramenta),
            "Copiar a tabela da funcionalidade na Seção 4 e colar na nova página.",
            "Garantir que as tags @smoke e @regressao estejam na coluna \"Tipo de Testes\".",
            "Vincular o card no campo \"História origem\".",
            "Deixar a página em pasta pública para a varredura via API."], 1):
        B.append(p("{0}. {1}".format(n, passo)))
    B.append(p("Documento gerado em {0} pela skill matriz-de-testes.".format(data)))

    doc = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
           '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
           '<w:body>' + "".join(B) +
           '<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>'
           '<w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr>'
           '</w:body></w:document>')

    with zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES)
        z.writestr("_rels/.rels", RELS)
        z.writestr("word/document.xml", doc)
        z.writestr("word/styles.xml", STYLES)
        z.writestr("word/_rels/document.xml.rels", DOC_RELS)


def main(argv):
    ap = argparse.ArgumentParser(prog="render_matriz.py",
                                 description="cts.jsonl -> Matriz de Cobertura (.md + .docx)")
    ap.add_argument("--ledger")
    ap.add_argument("--config")
    ap.add_argument("--out", default="saida")
    ap.add_argument("--sem-docx", action="store_true")
    args = ap.parse_args(argv)

    if not args.ledger or not args.config:
        print("render_matriz.py — cts.jsonl -> Matriz de Cobertura (.md + .docx)")
        print("exec: " + os.path.abspath(__file__))
        print("")
        print("uso: render_matriz.py --ledger ledger --config matriz.config.json --out saida")
        print("")
        print("help[]:")
        print("  render_matriz.py --ledger ledger --config matriz.config.json --out saida")
        print("  render_ciclo.py --ledger ledger --config matriz.config.json --out saida")
        return 0

    cfg = json.load(open(args.config, encoding="utf-8"))
    caminho = os.path.join(args.ledger, "cts.jsonl")
    if not os.path.exists(caminho):
        print(json.dumps({"erro": "cts-inexistente", "caminho": caminho,
                          "proximo": "rode reduce_cts.py primeiro"}))
        return 1
    cts = [json.loads(l) for l in open(caminho, encoding="utf-8") if l.strip()]
    if not cts:
        print("matriz: cts=0 — nada a renderizar")
        return 1

    os.makedirs(args.out, exist_ok=True)
    sistema = cfg.get("sistema", "Sistema")
    md_path = os.path.join(args.out, "Matriz de Cobertura — {0}.md".format(sistema))
    with open(md_path, "w", encoding="utf-8") as fh:
        fh.write(render_md(cts, cfg))
    gerados = [md_path]
    if not args.sem_docx:
        docx_path = os.path.join(args.out, "Matriz de Cobertura — {0}.docx".format(sistema))
        render_docx(cts, cfg, docx_path)
        gerados.append(docx_path)

    print("matriz: cts={0} funcionalidades={1} alta={2} arquivos={3}".format(
        len(cts), len(agrupar(cts, cfg)),
        sum(1 for c in cts if c["prioridade"] == "Alta"), len(gerados)))
    print("arquivos[{0}]{{caminho,bytes}}:".format(len(gerados)))
    for g in gerados:
        print("  {0},{1}".format(os.path.basename(g), os.path.getsize(g)))
    print("help[]:")
    print("  render_ciclo.py --ledger {0} --config {1} --out {2}".format(
        args.ledger, args.config, args.out))
    print("  validate.py --ledger {0} --config {1}".format(args.ledger, args.config))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
