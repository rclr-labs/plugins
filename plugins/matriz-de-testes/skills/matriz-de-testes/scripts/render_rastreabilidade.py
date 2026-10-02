#!/usr/bin/env python3
"""Fase 4c: cts.jsonl + manifest -> rastreabilidade.html (autocontido, sem CDN).

Este e o artefato que torna a matriz defensavel: para cada CT, de qual documento
e de qual linha ele veio, e qual criterio objetivo o classificou naquela
prioridade. A Rastreabilidade entregue no workbook original nao tinha coluna de
documento de origem — sem ela ninguem audita uma matriz gerada.
"""
import argparse
import html
import json
import os
import sys

CRITERIOS_LABEL = {
    "caminho_feliz": "caminho feliz principal",
    "critico_negocio": "crítico ao negócio",
    "primeira_entrega": "primeira entrega",
    "alta_prob_falha": "alta probabilidade de falha",
    "integracao_externa": "integração externa",
    "seguranca_compliance": "segurança/compliance",
    "variacao_fluxo": "variação do fluxo principal",
    "excecao_nao_critica": "exceção não crítica",
    "refatoracao": "refatoração",
    "usabilidade": "usabilidade",
    "integracao_interna_estavel": "integração interna estável",
    "exploratorio": "exploratório",
    "legado_estavel": "legado estável",
    "layout_visual": "layout/visual",
    "baixa_prob_falha": "baixa probabilidade de falha",
    "infraestrutura": "infraestrutura",
}

CSS = """
*{box-sizing:border-box}
body{margin:0;font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
 color:#1c1917;background:#faf9f7}
header{background:#1c1917;color:#fafaf9;padding:28px 32px}
header h1{margin:0 0 4px;font-size:22px;letter-spacing:-.01em}
header p{margin:0;color:#a8a29e;font-size:13px}
main{padding:24px 32px 64px;max-width:1800px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:0 0 28px}
.kpi{background:#fff;border:1px solid #e7e5e4;border-radius:8px;padding:14px 16px}
.kpi b{display:block;font-size:26px;font-weight:650;letter-spacing:-.02em;line-height:1.1}
.kpi span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.06em;
 color:#78716c;margin-top:5px}
h2{font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:#57534e;
 margin:36px 0 12px;padding-bottom:7px;border-bottom:1px solid #e7e5e4}
.controls{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;align-items:center}
input[type=search],select{font:13px inherit;padding:7px 10px;border:1px solid #d6d3d1;
 border-radius:6px;background:#fff;color:inherit}
input[type=search]{min-width:280px}
.count{font-size:12px;color:#78716c;margin-left:auto}
.wrap{overflow-x:auto;background:#fff;border:1px solid #e7e5e4;border-radius:8px}
table{border-collapse:collapse;width:100%;font-size:12.5px}
th{background:#f5f5f4;text-align:left;padding:9px 11px;font-weight:600;white-space:nowrap;
 border-bottom:1px solid #e7e5e4;position:sticky;top:0;z-index:1}
td{padding:9px 11px;border-bottom:1px solid #f5f5f4;vertical-align:top}
tr:last-child td{border-bottom:none}
tr:hover td{background:#fafaf9}
code{font:11.5px ui-monospace,SFMono-Regular,Menlo,monospace;background:#f5f5f4;
 padding:1px 5px;border-radius:4px;white-space:nowrap}
.pri{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600}
.pri-alta{background:#fee2e2;color:#991b1b}
.pri-media{background:#fef3c7;color:#92400e}
.pri-baixa{background:#e7e5e4;color:#57534e}
.tag{font:11px ui-monospace,monospace;color:#1d4ed8;margin-right:5px;white-space:nowrap}
.niv{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600}
.niv-api{background:#dcfce7;color:#166534}
.niv-integracao{background:#dbeafe;color:#1e40af}
.niv-e2e{background:#fef3c7;color:#92400e}
.niv-manual{background:#e7e5e4;color:#57534e}
.score{font:11.5px ui-monospace,monospace;color:#1c1917;font-weight:600}
.rank{color:#a8a29e;font:11.5px ui-monospace,monospace}
.crit{display:block;font-size:11px;color:#57534e}
.ev{color:#57534e;font-style:italic;max-width:340px}
.cen{min-width:260px}
.src{font-size:11.5px;color:#57534e;max-width:220px;word-break:break-word}
.alerta{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;
 margin:0 0 20px}
.alerta b{display:block;margin-bottom:6px;font-size:13px}
.alerta ul{margin:0;padding-left:20px;font-size:12.5px;color:#57534e}
.ok{background:#f0fdf4;border-color:#bbf7d0}
footer{padding:20px 32px 40px;color:#a8a29e;font-size:11.5px}
.hide{display:none}
"""

JS = """
const q=document.getElementById('q'),fFunc=document.getElementById('fFunc'),
 fPri=document.getElementById('fPri'),fTec=document.getElementById('fTec'),
 fNiv=document.getElementById('fNiv'),
 rows=[...document.querySelectorAll('#tbl tbody tr')],cnt=document.getElementById('cnt');
function filtrar(){
 const t=q.value.toLowerCase(),f=fFunc.value,p=fPri.value,c=fTec.value,
  nv=fNiv?fNiv.value:'';let n=0;
 for(const r of rows){
  const ok=(!f||r.dataset.func===f)&&(!p||r.dataset.pri===p)&&(!c||r.dataset.tec===c)
   &&(!nv||r.dataset.niv===nv)&&(!t||r.textContent.toLowerCase().includes(t));
  r.classList.toggle('hide',!ok); if(ok)n++;
 }
 cnt.textContent=n+' de '+rows.length+' CTs';
}
[q,fFunc,fPri,fTec,fNiv].filter(Boolean).forEach(e=>e.addEventListener('input',filtrar));
filtrar();
"""


def e(t):
    return html.escape(str(t if t is not None else ""))


SLUG_NIVEL = {"API": "api", "integração": "integracao", "E2E": "e2e", "manual": "manual"}


def backlog_automacao(cts):
    """Agrupa por achado e ordena por score.

    O item de backlog e o GRUPO, nao o CT: automatizar um array pairwise de 15
    linhas e um teste data-driven, um item — nao quinze linhas identicas na
    lista.
    """
    grupos = {}
    for c in cts:
        info = c.get("automacao") or {}
        chave = (c["achado_id"], info.get("nivel", "?"))
        g = grupos.setdefault(chave, {
            "funcionalidade": c["funcionalidade"], "nivel": info.get("nivel", "?"),
            "esforco": info.get("esforco", "-"), "score": -1,
            "motivo": "", "recomendado": info.get("recomendado", False),
            "cts": [], "criterio": c.get("criterio_aceite", "")})
        g["cts"].append(c["ct_id"])
        # O score do grupo e o MAIOR entre seus CTs: se qualquer um roda a cada
        # build, o teste automatizado roda a cada build. Depender da ordem das
        # linhas daria o resultado certo por acidente.
        if info.get("score", 0) > g["score"]:
            g["score"] = info.get("score", 0)
            g["motivo"] = info.get("motivo", "")
    for g in grupos.values():
        g["score"] = max(g["score"], 0)
        g["cts"].sort()
        g["faixa"] = (g["cts"][0] if len(g["cts"]) == 1
                      else "{0}..{1}".format(g["cts"][0], g["cts"][-1]))
    rec = sorted((g for g in grupos.values() if g["recomendado"]),
                 key=lambda g: (-g["score"], g["faixa"]))
    nao = sorted((g for g in grupos.values() if not g["recomendado"]),
                 key=lambda g: g["faixa"])
    return rec, nao


def main(argv):
    ap = argparse.ArgumentParser(prog="render_rastreabilidade.py",
                                 description="cts.jsonl -> rastreabilidade.html auditavel")
    ap.add_argument("--ledger")
    ap.add_argument("--config")
    ap.add_argument("--out", default="saida")
    ap.add_argument("--corpus", help="diretorio do corpus (para o inventario de documentos)")
    args = ap.parse_args(argv)

    if not args.ledger or not args.config:
        print("render_rastreabilidade.py — cts.jsonl -> relatorio HTML de rastreabilidade")
        print("exec: " + os.path.abspath(__file__))
        print("")
        print("uso: render_rastreabilidade.py --ledger ledger --config matriz.config.json \\")
        print("       --out saida [--corpus corpus]")
        print("")
        print("help[]:")
        print("  render_rastreabilidade.py --ledger ledger --config matriz.config.json --corpus corpus")
        return 0

    cfg = json.load(open(args.config, encoding="utf-8"))
    caminho = os.path.join(args.ledger, "cts.jsonl")
    if not os.path.exists(caminho):
        print(json.dumps({"erro": "cts-inexistente", "caminho": caminho,
                          "proximo": "rode reduce_cts.py primeiro"}))
        return 1
    cts = [json.loads(l) for l in open(caminho, encoding="utf-8") if l.strip()]
    if not cts:
        print("rastreabilidade: cts=0 — nada a renderizar")
        return 1

    manifest = {}
    if args.corpus:
        mp = os.path.join(args.corpus, "manifest.json")
        if os.path.exists(mp):
            manifest = json.load(open(mp, encoding="utf-8"))

    sistema = cfg.get("sistema", "Sistema")
    cliente = cfg.get("cliente", "")
    data = cfg.get("data_referencia", "")

    tem_automacao = any(c.get("automacao") for c in cts)
    n_alta = sum(1 for c in cts if c["prioridade"] == "Alta")
    funcs = sorted({c["funcionalidade"] for c in cts})
    tecs = sorted({c["tecnica"] for c in cts})
    sem_fonte = [c for c in cts if not c.get("fonte") or not c.get("locator")]
    por_default = [c for c in cts if c.get("prioridade_por_default")]
    alta_sem_smoke = [c for c in cts if c["prioridade"] == "Alta" and "@smoke" not in c["tags"]]

    H = []
    H.append("<!doctype html><html lang=pt-BR><head><meta charset=utf-8>")
    H.append("<meta name=viewport content='width=device-width,initial-scale=1'>")
    H.append("<title>Rastreabilidade de Testes — {0}</title>".format(e(sistema)))
    H.append("<style>{0}</style></head><body>".format(CSS))
    H.append("<header><h1>Rastreabilidade de Testes — {0}</h1>".format(e(sistema)))
    H.append("<p>{0}{1} · gerado em {2} pela skill <code style='background:#44403c;"
             "color:#e7e5e4'>matriz-de-testes</code></p></header>".format(
                 e(cliente), " · " if cliente else "", e(data)))
    H.append("<main>")

    H.append("<div class=kpis>")
    for valor, rotulo in [
        (len(cts), "casos de teste"),
        ("{0} ({1:.0f}%)".format(n_alta, 100 * n_alta / len(cts)), "prioridade Alta"),
        (len(funcs), "funcionalidades"),
        (len(tecs), "técnicas aplicadas"),
        (sum(1 for c in cts if "@smoke" in c["tags"]), "no smoke"),
    ] + ([
        (sum(1 for c in cts if (c.get("automacao") or {}).get("recomendado")),
         "automatizáveis"),
    ] if tem_automacao else []) + [
        (manifest.get("parsed", "—"), "documentos lidos"),
        (manifest.get("unparseable", "—"), "não parseáveis"),
    ]:
        H.append("<div class=kpi><b>{0}</b><span>{1}</span></div>".format(e(valor), e(rotulo)))
    H.append("</div>")

    problemas = []
    if alta_sem_smoke:
        problemas.append("{0} CT(s) de prioridade Alta sem a tag @smoke — "
                         "viola a regra obrigatória da Seção 2".format(len(alta_sem_smoke)))
    if sem_fonte:
        problemas.append("{0} CT(s) sem documento de origem ou sem localizador de linha — "
                         "não auditáveis".format(len(sem_fonte)))
    if por_default:
        problemas.append("{0} CT(s) com prioridade atribuída por default (nenhum critério "
                         "objetivo disparou) — precisam de classificação manual".format(len(por_default)))
    if manifest.get("unparseable"):
        nomes = [d["file"] for d in manifest.get("docs", [])
                 if str(d.get("status", "")).startswith("unparseable")]
        problemas.append("{0} documento(s) do corpus não foram lidos: {1}".format(
            len(nomes), "; ".join(nomes[:6]) + ("…" if len(nomes) > 6 else "")))
    if problemas:
        H.append("<div class=alerta><b>Pendências desta geração</b><ul>")
        for p in problemas:
            H.append("<li>{0}</li>".format(e(p)))
        H.append("</ul></div>")
    else:
        H.append("<div class='alerta ok'><b>Nenhuma pendência</b><ul><li>Todos os CTs têm "
                 "documento de origem, localizador e critério objetivo de priorização.</li>"
                 "</ul></div>")

    H.append("<h2>Cobertura por funcionalidade</h2>")
    H.append("<div class=wrap><table><thead><tr><th>Funcionalidade</th><th>Prefixo</th>"
             "<th>CTs</th><th>Alta</th><th>Média</th><th>Baixa</th><th>Técnica(s)</th>"
             "<th>Histórias</th><th>Requisitos</th></tr></thead><tbody>")
    for f in funcs:
        g = [c for c in cts if c["funcionalidade"] == f]
        reqs = sorted({r for c in g for r in (c.get("requisito") or [])})
        hists = sorted({str(c.get("historia")) for c in g if c.get("historia")})
        H.append("<tr><td>{0}</td><td><code>{1}</code></td><td>{2}</td><td>{3}</td><td>{4}</td>"
                 "<td>{5}</td><td>{6}</td><td>{7}</td><td>{8}</td></tr>".format(
                     e(f), e(g[0]["prefixo"]), len(g),
                     sum(1 for c in g if c["prioridade"] == "Alta"),
                     sum(1 for c in g if c["prioridade"] == "Média"),
                     sum(1 for c in g if c["prioridade"] == "Baixa"),
                     e(", ".join(sorted({c["tecnica"] for c in g}))),
                     e(", ".join(hists) or "—"), e(", ".join(reqs) or "—")))
    H.append("</tbody></table></div>")

    if tem_automacao:
        rec, nao = backlog_automacao(cts)
        coletados = any((c.get("automacao") or {}).get("bloqueios_coletados") for c in cts)
        H.append("<h2>Backlog de automação</h2>")
        H.append("<p style='margin:0 0 14px;color:#57534e;font-size:12.5px;max-width:860px'>"
                 "Ordenado por retorno: <code>frequência × nº de CTs do grupo ÷ esforço</code>. "
                 "O item é o <b>grupo</b>, não o CT — automatizar um array de 15 combinações é "
                 "um teste data-driven, um item de backlog. O esforço é um "
                 "<b>proxy do nível</b>, não estimativa em horas."
                 + ("" if coletados else
                    " <b style='color:#92400e'>Bloqueios técnicos não foram coletados</b> "
                    "(a Fase 2 rodou sem o campo <code>automacao</code>): a recomendação é "
                    "cega para oráculo difícil, massa custosa e dependência de hardware.")
                 + "</p>")
        if rec:
            H.append("<div class=wrap><table><thead><tr><th>#</th><th>Score</th>"
                     "<th>Nível</th><th>Esforço</th><th>CTs</th><th>Faixa</th>"
                     "<th>Funcionalidade</th><th>Comportamento</th><th>Motivo</th>"
                     "</tr></thead><tbody>")
            for i, g in enumerate(rec, 1):
                H.append("<tr><td class=rank>{0}</td><td class=score>{1}</td>"
                         "<td><span class='niv niv-{2}'>{3}</span></td><td>{4}</td>"
                         "<td>{5}</td><td><code>{6}</code></td><td>{7}</td>"
                         "<td>{8}</td><td class=ev>{9}</td></tr>".format(
                             i, e(g["score"]), SLUG_NIVEL.get(g["nivel"], "manual"),
                             e(g["nivel"]), e(g["esforco"]), len(g["cts"]), e(g["faixa"]),
                             e(g["funcionalidade"]), e(g["criterio"][:70]), e(g["motivo"])))
            H.append("</tbody></table></div>")
        else:
            H.append("<div class=alerta><b>Nenhum grupo recomendado para automação</b>"
                     "<ul><li>Todos os CTs têm veto ou impedimento registrado.</li></ul></div>")
        if nao:
            H.append("<h2 style='font-size:13px;text-transform:none;letter-spacing:0;"
                     "border:0;margin:20px 0 8px'>Não recomendados ({0} grupos)</h2>".format(
                         len(nao)))
            H.append("<div class=wrap><table><thead><tr><th>Faixa</th><th>CTs</th>"
                     "<th>Funcionalidade</th><th>Motivo</th></tr></thead><tbody>")
            for g in nao:
                H.append("<tr><td><code>{0}</code></td><td>{1}</td><td>{2}</td>"
                         "<td class=ev>{3}</td></tr>".format(
                             e(g["faixa"]), len(g["cts"]), e(g["funcionalidade"]),
                             e(g["motivo"])))
            H.append("</tbody></table></div>")

    H.append("<h2>Rastreabilidade por caso de teste</h2>")
    H.append("<div class=controls>")
    H.append("<input type=search id=q placeholder='Buscar CT, cenário, requisito, documento…'>")
    H.append("<select id=fFunc><option value=''>Todas as funcionalidades</option>" +
             "".join("<option>{0}</option>".format(e(f)) for f in funcs) + "</select>")
    H.append("<select id=fPri><option value=''>Todas as prioridades</option>"
             "<option>Alta</option><option>Média</option><option>Baixa</option></select>")
    H.append("<select id=fTec><option value=''>Todas as técnicas</option>" +
             "".join("<option>{0}</option>".format(e(t)) for t in tecs) + "</select>")
    if tem_automacao:
        niveis = sorted({(c.get("automacao") or {}).get("nivel", "-") for c in cts})
        H.append("<select id=fNiv><option value=''>Todos os níveis</option>" +
                 "".join("<option>{0}</option>".format(e(n)) for n in niveis) + "</select>")
    H.append("<span class=count id=cnt></span></div>")

    H.append("<div class=wrap><table id=tbl><thead><tr>"
             "<th>CT ID</th><th>Funcionalidade</th><th>Cenário</th><th>Prioridade</th>"
             "<th>Tipo de Testes</th>" + ("<th>Automação</th>" if tem_automacao else "") +
             "<th>Técnica</th><th>Critério que classificou</th>"
             "<th>História</th><th>Requisito</th><th>Documento de origem</th>"
             "<th>Evidência</th></tr></thead><tbody>")
    for c in cts:
        crit = c.get("criterios_disparados") or []
        crit_html = ("".join("<span class=crit>• {0}</span>".format(e(CRITERIOS_LABEL.get(k, k)))
                             for k in crit)
                     if crit else "<span class=crit>— atribuído por default</span>")
        if c.get("rebaixado_de_alta"):
            crit_html += ("<span class=crit style='color:#92400e'>↓ fora do subconjunto de smoke "
                          "(cobertura t=1) — rebaixado de Alta</span>")
        ev = c.get("evidencia") or {}
        ev_txt = " · ".join("{0}: {1}".format(CRITERIOS_LABEL.get(k, k), v)
                            for k, v in ev.items()) if isinstance(ev, dict) else str(ev)
        fonte = c.get("fonte") or "—"
        loc = c.get("locator") or ""
        auto = c.get("automacao") or {}
        H.append("<tr data-func='{0}' data-pri='{1}' data-tec='{2}' data-niv='{3}'>".format(
            e(c["funcionalidade"]), e(c["prioridade"]), e(c["tecnica"]),
            e(auto.get("nivel", ""))))
        H.append("<td><code>{0}</code></td>".format(e(c["ct_id"])))
        H.append("<td>{0}</td>".format(e(c["funcionalidade"])))
        H.append("<td class=cen>{0}</td>".format(e(c["cenario"])))
        H.append("<td><span class='pri pri-{0}'>{1}</span></td>".format(
            {"Alta": "alta", "Média": "media", "Baixa": "baixa"}.get(c["prioridade"], "media"),
            e(c["prioridade"])))
        H.append("<td>{0}</td>".format(
            "".join("<span class=tag>{0}</span>".format(e(t)) for t in c["tags"]) or "—"))
        if tem_automacao:
            H.append("<td><span class='niv niv-{0}'>{1}</span></td>".format(
                SLUG_NIVEL.get(auto.get("nivel"), "manual"), e(auto.get("nivel", "-"))))
        H.append("<td>{0}</td>".format(e(c["tecnica"])))
        H.append("<td>{0}</td>".format(crit_html))
        H.append("<td>{0}</td>".format(e(c.get("historia") or "—")))
        H.append("<td>{0}</td>".format(e(", ".join(c.get("requisito") or []) or "—")))
        H.append("<td class=src>{0}{1}</td>".format(
            e(fonte), " <code>{0}</code>".format(e(loc)) if loc else ""))
        H.append("<td class=ev>{0}</td>".format(e(ev_txt or "—")))
        H.append("</tr>")
    H.append("</tbody></table></div>")

    if manifest.get("docs"):
        H.append("<h2>Inventário do corpus analisado</h2>")
        H.append("<div class=wrap><table><thead><tr><th>Documento</th><th>Tipo</th>"
                 "<th>Caracteres</th><th>Situação</th></tr></thead><tbody>")
        for d in manifest["docs"]:
            H.append("<tr><td class=src>{0}</td><td>{1}</td><td>{2}</td><td>{3}</td></tr>".format(
                e(d.get("file")), e(d.get("type")), e(d.get("chars")), e(d.get("status"))))
        H.append("</tbody></table></div>")

    H.append("</main>")
    H.append("<footer>Gerado pela skill <code>matriz-de-testes</code>. Cada CT desta tabela "
             "aponta o documento e a linha que o originaram, e o critério objetivo da "
             "Seção 2 da Matriz de Cobertura que determinou sua prioridade.</footer>")
    H.append("<script>{0}</script></body></html>".format(JS))

    os.makedirs(args.out, exist_ok=True)
    destino = os.path.join(args.out, "rastreabilidade.html")
    with open(destino, "w", encoding="utf-8") as fh:
        fh.write("\n".join(H))

    print("rastreabilidade: cts={0} funcionalidades={1} pendencias={2} bytes={3}".format(
        len(cts), len(funcs), len(problemas), os.path.getsize(destino)))
    if problemas:
        print("pendencias[{0}]:".format(len(problemas)))
        for p in problemas:
            print("  " + p.replace(",", ";"))
    else:
        print("pendencias[0]: nenhuma")
    print("saida: " + os.path.abspath(destino))
    print("help[]:")
    print("  open '{0}'".format(os.path.abspath(destino)))
    print("  validate.py --ledger {0} --config {1}".format(args.ledger, args.config))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
