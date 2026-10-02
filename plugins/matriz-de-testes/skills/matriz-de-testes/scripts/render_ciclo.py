#!/usr/bin/env python3
"""Fase 4b: cts.jsonl -> pagina de Ciclo de Execucao (padrao documento de Ciclo de Execução).

Nomenclatura obrigatoria (documento de Ciclo de Execução secao 2.2):
    [TIPO] — [NOME_DA_FEATURE/RELEASE] — [AMBIENTE] — [DATA]

Selecao de CTs por tipo de ciclo (documento de Ciclo de Execução secao 4):
    Funcional  -> todos os CTs da feature          (regra: 100% dos Alta devem passar)
    Regressão  -> CTs com @regressao               (regra: falha exige mitigacao aceita pelo PO)
    Smoke      -> CTs com @smoke                   (regra: 100% de sucesso ou rollback)
"""
import argparse
import json
import os
import re
import sys
import unicodedata

REGRAS = {
    "Funcional": "100% dos CTs de Prioridade Alta devem estar como \"Passou\".",
    "Regressão": "Nenhum CT de regressão pode falhar sem um plano de mitigação ou bug de "
                 "baixa prioridade aceito pelo PO.",
    "Smoke": "100% de sucesso. Qualquer falha exige rollback ou hotfix imediato.",
}
OBJETIVOS = {
    "Funcional": "Validar critérios de aceite da história.",
    "Regressão": "Garantir que novas implementações não afetaram o legado.",
    "Smoke": "Validar o \"caminho feliz\" e funções vitais.",
}
QUANDO = {
    "Funcional": "Após entrega do PR e disponibilidade em Dev.",
    "Regressão": "Após merge na release branch.",
    "Smoke": "Imediatamente após o deploy em Produção.",
}
COLUNAS = ["CT ID", "Cenário", "Prioridade", "Tipo de Testes", "Status", "Bugs ID", "Observações"]


def norm(s):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def selecionar(cts, tipo, feature):
    sel = cts
    if feature:
        nf = norm(feature)
        sel = [c for c in sel if nf in norm(c["funcionalidade"]) or nf == norm(c["prefixo"])]
    if tipo == "Smoke":
        sel = [c for c in sel if "@smoke" in c["tags"]]
    elif tipo == "Regressão":
        sel = [c for c in sel if "@regressao" in c["tags"]]
    return sel


def md_tabela(header, rows):
    out = ["| " + " | ".join(header) + " |",
           "|" + "|".join([" --- "] * len(header)) + "|"]
    for r in rows:
        out.append("| " + " | ".join(str(c).replace("|", "\\|") for c in r) + " |")
    return out


def render(cts, cfg, tipo, ambiente, feature, release, branch, responsavel, matriz_link):
    data = cfg.get("data_referencia", "")
    ferramenta = cfg.get("ferramenta_gestao", "a ferramenta de gestão")
    rotulo = release or feature or cfg.get("sistema", "Release")
    titulo = "{0} — {1} — {2} — {3}".format(tipo, rotulo, ambiente, data)
    historias = sorted({str(c.get("historia")) for c in cts if c.get("historia")})

    L = ["# " + titulo, ""]
    L.append("## Cabeçalho da Página (Metadados)")
    L.append("")
    for campo, valor in [
        ("Tipo de Ciclo", tipo),
        ("Ambiente", ambiente),
        ("Feature/Release", rotulo),
        ("Branch/Tag", branch or "[preencher]"),
        ("Data de Execução", data),
        ("Responsável", responsavel or "[preencher]"),
        ("História Origem", ", ".join(historias) or "[preencher]"),
        ("Matriz de Cobertura Referenciada", matriz_link or "[link direto]"),
        ("Resumo do Resultado", "0 P / 0 F / 0 B / {0} NE".format(len(cts))),
    ]:
        L.append("- **{0}:** {1}".format(campo, valor))
    L.append("")
    L.append("## Tabela de Execução")
    L.append("")
    L += md_tabela(COLUNAS, [[c["ct_id"], c["cenario"], c["prioridade"],
                              " ".join(c["tags"]) or "-", "Não Executado", "-",
                              c.get("observacoes") or "-"] for c in cts])
    L.append("")
    L.append("**Legenda de Status:** Passou (resultado conforme esperado) · "
             "Falhou (divergência — exige abertura de Bug) · "
             "Não Executado (pendente no ciclo) · Bloqueado (impedimento impede a execução). "
             "O campo Bugs ID é obrigatório para Falhou e Bloqueado.")
    L.append("")
    L.append("## Resumo e Parecer")
    L.append("")
    n_alta = sum(1 for c in cts if c["prioridade"] == "Alta")
    L.append("**Resumo Quantitativo:**")
    L.append("")
    L.append("Total de CTs: {0:02d} | Passaram: 00 (0%) | Falharam: 00 (0%) | "
             "Bloqueados: 00 (0%) | Não Executados: {1:02d} (100%)".format(len(cts), len(cts)))
    L.append("")
    L.append("_Dos {0} CTs deste ciclo, {1} são de prioridade Alta._".format(len(cts), n_alta))
    L.append("")
    L.append("**Regra de Aprovação ({0}):** {1}".format(tipo, REGRAS.get(tipo, "")))
    L.append("")
    L.append("**Quando executar:** {0}".format(QUANDO.get(tipo, "")))
    L.append("")
    L.append("**Objetivo:** {0}".format(OBJETIVOS.get(tipo, "")))
    L.append("")
    L.append("**Parecer do Analista:**")
    L.append("")
    L.append("> [preencher após a execução: estabilidade observada, bugs críticos, "
             "recomendação de GO/NO-GO]")
    L.append("")
    L.append("**Próximos Passos:**")
    L.append("")
    L.append("1. [preencher]")
    L.append("2. [preencher]")
    L.append("3. [preencher]")
    L.append("")
    L.append("## Fluxo de Trabalho do Analista de Testes")
    L.append("")
    for n, passo in enumerate([
            "Acessar a Matriz de Cobertura correspondente no Docs.",
            "Criar a página de Ciclo de Execução na pasta correta da Release.",
            "Importar os CTs (manualmente ou via script de automação).",
            "Executar os testes e atualizar a coluna Status em tempo real.",
            "Em caso de falha, abrir o Bug no {0} e referenciar o ID na tabela.".format(ferramenta),
            "Finalizar com o Resumo Quantitativo e Parecer.",
            "Notificar o time sobre o resultado (Aprovado / Reprovado)."], 1):
        L.append("{0}. {1}".format(n, passo))
    L.append("")
    return titulo, "\n".join(L)


def main(argv):
    ap = argparse.ArgumentParser(prog="render_ciclo.py",
                                 description="cts.jsonl -> pagina de Ciclo de Execucao (documento de Ciclo de Execução)")
    ap.add_argument("--ledger")
    ap.add_argument("--config")
    ap.add_argument("--out", default="saida")
    ap.add_argument("--tipo", default="Funcional", choices=["Funcional", "Regressão", "Smoke"])
    ap.add_argument("--ambiente", default=None)
    ap.add_argument("--feature", default=None, help="filtra por funcionalidade ou prefixo")
    ap.add_argument("--release", default=None)
    ap.add_argument("--branch", default=None)
    ap.add_argument("--responsavel", default=None)
    ap.add_argument("--matriz-link", default=None)
    ap.add_argument("--todos-os-tipos", action="store_true",
                    help="gera um ciclo para cada tipo (Funcional/Regressão/Smoke)")
    args = ap.parse_args(argv)

    if not args.ledger or not args.config:
        print("render_ciclo.py — cts.jsonl -> pagina de Ciclo de Execucao (documento de Ciclo de Execução)")
        print("exec: " + os.path.abspath(__file__))
        print("")
        print("uso: render_ciclo.py --ledger ledger --config matriz.config.json --out saida \\")
        print("       [--tipo Funcional|Regressão|Smoke] [--ambiente Dev] [--feature VOL]")
        print("")
        print("help[]:")
        print("  render_ciclo.py --ledger ledger --config matriz.config.json --todos-os-tipos")
        print("  render_ciclo.py --ledger ledger --config matriz.config.json --tipo Smoke --ambiente Produção")
        return 0

    cfg = json.load(open(args.config, encoding="utf-8"))
    caminho = os.path.join(args.ledger, "cts.jsonl")
    if not os.path.exists(caminho):
        print(json.dumps({"erro": "cts-inexistente", "caminho": caminho,
                          "proximo": "rode reduce_cts.py primeiro"}))
        return 1
    cts = [json.loads(l) for l in open(caminho, encoding="utf-8") if l.strip()]
    ambientes = cfg.get("ambientes") or ["Desenvolvimento"]
    default_amb = {"Funcional": ambientes[0],
                   "Regressão": ambientes[1] if len(ambientes) > 1 else ambientes[0],
                   "Smoke": ambientes[-1]}

    pedidos = (["Funcional", "Regressão", "Smoke"] if args.todos_os_tipos else [args.tipo])
    os.makedirs(args.out, exist_ok=True)
    gerados, vazios = [], []

    for tipo in pedidos:
        amb = args.ambiente or default_amb.get(tipo, ambientes[0])
        sel = selecionar(cts, tipo, args.feature)
        if not sel:
            vazios.append("{0},{1},0 CTs selecionados".format(tipo, amb))
            continue
        titulo, texto = render(sel, cfg, tipo, amb, args.feature, args.release,
                               args.branch, args.responsavel, args.matriz_link)
        nome = re.sub(r"[/\\:]", "-", titulo) + ".md"
        destino = os.path.join(args.out, nome)
        with open(destino, "w", encoding="utf-8") as fh:
            fh.write(texto)
        gerados.append((nome, len(sel)))

    if not gerados:
        print("ciclos: count=0 — nenhum CT selecionado pelos filtros")
        if vazios:
            print("vazios[{0}]{{tipo,ambiente,motivo}}:".format(len(vazios)))
            for v in vazios:
                print("  " + v)
        print("help[]:")
        print("  remova --feature, ou confira se ha CTs com a tag exigida pelo tipo")
        return 1

    print("ciclos: count={0} cts_total={1}".format(len(gerados), len(cts)))
    print("ciclos[{0}]{{arquivo,cts}}:".format(len(gerados)))
    for nome, n in gerados:
        print("  {0},{1}".format(nome.replace(",", ";"), n))
    if vazios:
        print("vazios[{0}]{{tipo,ambiente,motivo}}:".format(len(vazios)))
        for v in vazios:
            print("  " + v)
    print("saida: " + os.path.abspath(args.out))
    print("help[]:")
    print("  render_rastreabilidade.py --ledger {0} --config {1} --out {2}".format(
        args.ledger, args.config, args.out))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
