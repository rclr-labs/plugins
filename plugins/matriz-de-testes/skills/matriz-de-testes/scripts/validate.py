#!/usr/bin/env python3
"""Fase 5: validador bloqueante da matriz gerada.

exit 0 = valida | exit 1 = erros encontrados | exit 2 = uso incorreto

Regras 1-6 sao ERRO (bloqueiam a entrega), 7-8 sao AVISO.
A regra 1 (Alta => @smoke) e deliberadamente mais rigida que os exemplos da
Matriz de Cobertura de referência secao 4, que tem 5 CTs Alta com apenas @regressao
(ATE-CT003, ATE-CT006, FIL-CT003, FIL-CT011, FIL-CT012). A Secao 2 do mesmo
documento diz "@smoke (obrigatorio)" — os exemplos sao o erro, nao a regra.
"""
import argparse
import glob
import json
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pairwise import verificar  # noqa: E402
from ledger import carregar_achados  # noqa: E402


def norm(s):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def main(argv):
    ap = argparse.ArgumentParser(prog="validate.py",
                                 description="Valida a matriz gerada. exit 0 ok / 1 erros / 2 uso.")
    ap.add_argument("--ledger")
    ap.add_argument("--config")
    ap.add_argument("--baseline", help="cts.jsonl de execucao anterior (estabilidade de prefixo)")
    ap.add_argument("--corpus", help="diretorio do corpus, para checar a evidencia (R12)")
    ap.add_argument("--json", action="store_true")
    try:
        args = ap.parse_args(argv)
    except SystemExit:
        return 2

    if not args.ledger or not args.config:
        print("validate.py — validador bloqueante da matriz de cobertura gerada")
        print("exec: " + os.path.abspath(__file__))
        print("")
        print("uso: validate.py --ledger ledger --config matriz.config.json [--baseline antigo/cts.jsonl]")
        print("")
        print("regras: 1-6 erro (bloqueiam) · 7-8 aviso")
        print("  1 todo CT Alta tem @smoke")
        print("  2 todo critério de aceite do ledger tem >=1 CT")
        print("  3 CT ID casa com o padrão, sequencial, sem buracos nem duplicatas")
        print("  4 conjuntos pairwise re-verificados (todos os pares cobertos)")
        print("  5 todo CT tem fonte + locator")
        print("  6 prefixo estável frente ao baseline")
        print("  7 toda flag true tem evidência com número de linha")
        print("  8 todo CT tem ao menos uma flag de criticidade")
        print("  9 campo de forma da tecnica nao esta ralo (dominio/transicoes/regras)")
        print(" 10 tag @automatizavel coerente com o nivel recomendado")
        print(" 11 bloqueio de automacao marcado tem evidencia")
        print(" 12 o trecho de evidencia existe no documento de origem (exige --corpus)")
        print("")
        print("help[]:")
        print("  validate.py --ledger ledger --config matriz.config.json")
        return 0

    try:
        cfg = json.load(open(args.config, encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(json.dumps({"erro": "config-invalido", "detalhe": str(exc)}))
        return 2

    caminho = os.path.join(args.ledger, "cts.jsonl")
    if not os.path.exists(caminho):
        print(json.dumps({"erro": "cts-inexistente", "caminho": caminho}))
        return 2
    cts = [json.loads(l) for l in open(caminho, encoding="utf-8") if l.strip()]

    achados, _mal, _lotes = carregar_achados(args.ledger)
    achados_por_id = {a["_uid"]: a for a in achados}
    erros, avisos = [], []

    # 1 — Alta => @smoke
    for c in cts:
        if c.get("prioridade") == "Alta" and "@smoke" not in (c.get("tags") or []):
            erros.append(("R1-alta-sem-smoke", c.get("ct_id", "?"),
                          "prioridade Alta exige @smoke (matriz de referência secao 2)"))

    # 2 — todo criterio de aceite coberto
    cobertos = {norm(c.get("criterio_aceite")) for c in cts if c.get("criterio_aceite")}
    for a in achados:
        crit = a.get("criterio_aceite")
        if crit and norm(crit) not in cobertos:
            erros.append(("R2-criterio-sem-ct", a["_uid"],
                          "critério de aceite sem nenhum CT: " + str(crit)[:70]))

    # 3 — CT ID: padrao, sequencia, duplicatas
    padrao = cfg.get("padrao_ct_id", "{PREFIXO}-CT{NNN}")
    rx = re.compile("^" + re.escape(padrao)
                    .replace(re.escape("{PREFIXO}"), r"(?P<prefixo>[A-Z]{2,6})")
                    .replace(re.escape("{NNN}"), r"(?P<seq>\d{3,})") + "$")
    vistos, por_prefixo = {}, {}
    for c in cts:
        ct_id = c.get("ct_id", "")
        m = rx.match(ct_id)
        if not m:
            erros.append(("R3-ct-id-fora-do-padrao", ct_id, "esperado " + padrao))
            continue
        if ct_id in vistos:
            erros.append(("R3-ct-id-duplicado", ct_id, "aparece mais de uma vez"))
        vistos[ct_id] = True
        por_prefixo.setdefault(m.group("prefixo"), []).append(int(m.group("seq")))
    for prefixo, seqs in por_prefixo.items():
        seqs.sort()
        esperado = list(range(1, len(seqs) + 1))
        if seqs != esperado:
            faltando = sorted(set(esperado) - set(seqs))
            erros.append(("R3-sequencia-com-buraco", prefixo,
                          "numeração não sequencial; faltando {0}".format(faltando[:10])))

    # 4 — re-verificacao dos arrays pairwise
    grupos = {}
    for c in cts:
        if c.get("tecnica") == "pairwise":
            grupos.setdefault((c["funcionalidade"], c.get("achado_id")), []).append(c)
    t = int(cfg.get("forca_cobertura", 2))
    for (func, achado_id), grupo in grupos.items():
        # Os dominios vem do achado de ORIGEM, nunca das linhas sob verificacao.
        # Derivar os dominios da saida faria o conjunto requerido encolher junto
        # com qualquer valor perdido — o verificador passaria sempre.
        achado = achados_por_id.get(achado_id)
        if achado is None:
            avisos.append(("R4-achado-nao-encontrado", "{0}/{1}".format(func, achado_id),
                           "sem achado de origem no ledger; cobertura nao verificavel"))
            continue
        declarados = {k: [str(x) for x in v]
                      for k, v in (achado.get("parametros") or {}).items()
                      if isinstance(v, list) and len(v) >= 2}
        if len(declarados) < 2:
            avisos.append(("R4-sem-parametros-declarados", "{0}/{1}".format(func, achado_id),
                           "achado marcado pairwise sem >=2 parametros multivalorados"))
            continue
        nomes = [n for n in (grupo[0].get("combinacao") or {}) if n in declarados]
        faltam_nomes = sorted(set(declarados) - set(nomes))
        if faltam_nomes:
            erros.append(("R4-parametro-ausente-nos-cts", "{0}/{1}".format(func, achado_id),
                          "parametro(s) declarado(s) ausente(s) dos CTs: {0}".format(faltam_nomes)))
            continue
        linhas = [[str(c["combinacao"].get(n)) for n in nomes] for c in grupo]
        params = {n: declarados[n] for n in nomes}
        ok, faltando, total_t = verificar(params, nomes, linhas, t)
        if not ok:
            erros.append(("R4-pairwise-nao-cobridor", "{0}/{1}".format(func, achado_id),
                          "{0} de {1} tupla(s) t={2} nao cobertas".format(
                              len(faltando), total_t, t)))

    # 5 — fonte + locator
    for c in cts:
        if not c.get("fonte") or not c.get("locator"):
            erros.append(("R5-sem-rastreio", c.get("ct_id", "?"),
                          "falta fonte e/ou locator — CT nao auditavel"))

    # 6 — estabilidade de prefixo
    if args.baseline and os.path.exists(args.baseline):
        antes = {}
        for linha in open(args.baseline, encoding="utf-8"):
            if linha.strip():
                b = json.loads(linha)
                antes[norm(b.get("funcionalidade"))] = b.get("prefixo")
        for c in cts:
            k = norm(c["funcionalidade"])
            if k in antes and antes[k] != c["prefixo"]:
                erros.append(("R6-prefixo-mudou", c["funcionalidade"],
                              "era {0}, agora {1} — o prefixo nunca muda "
                              "(matriz de referência secao 3)".format(antes[k], c["prefixo"])))

    # 7 — evidencia com numero de linha
    for c in cts:
        ev = c.get("evidencia") or {}
        for k in (c.get("criterios_disparados") or []):
            trecho = ev.get(k) if isinstance(ev, dict) else None
            if not trecho:
                avisos.append(("R7-flag-sem-evidencia", c.get("ct_id", "?"),
                               "criterio '{0}' sem trecho literal".format(k)))
            elif not re.search(r"L\d+", str(trecho)):
                avisos.append(("R7-evidencia-sem-linha", c.get("ct_id", "?"),
                               "evidencia de '{0}' nao cita numero de linha".format(k)))

    # 8 — CT sem nenhuma flag
    for c in cts:
        if c.get("prioridade_por_default") or not (c.get("criterios_disparados") or []):
            if c.get("prioridade_por_default"):
                avisos.append(("R8-prioridade-por-default", c.get("ct_id", "?"),
                               "nenhum criterio objetivo disparou — classifique manualmente"))

    # 9 — forma rala: campo de tecnica preenchido pela metade gera matriz
    # plausivel mas sub-coberta, e nenhuma das regras 1-8 percebe.
    for a in achados:
        tec = a.get("tecnica")
        alvo = "{0}/{1}".format(a.get("funcionalidade", "?"), a["_uid"])
        if tec == "equivalencia":
            dom = a.get("dominio") or {}
            n = (len(dom.get("validos") or []) + len(dom.get("invalidos") or []) +
                 len(dom.get("limites") or []) + (1 if dom.get("aceita_branco") else 0))
            if n < 3:
                avisos.append(("R9-equivalencia-rala", alvo,
                               "{0} classe(s) no dominio; um campo de entrada costuma "
                               "render 4+ (valido/invalido/limite/branco)".format(n)))
        elif tec == "transicao_estado":
            n = len(a.get("transicoes") or [])
            if n < 3:
                avisos.append(("R9-transicoes-ralas", alvo,
                               "{0} transicao(oes); um fluxo com estados costuma "
                               "render 4-6".format(n)))
        elif tec == "tabela_decisao":
            n = len(a.get("regras") or [])
            if n < 2:
                avisos.append(("R9-regras-ralas", alvo,
                               "{0} regra(s); uma tabela de decisao precisa de >=2".format(n)))

    # 10 — a tag @automatizavel nao pode conviver com nivel manual
    for c in cts:
        auto = c.get("automacao") or {}
        tem_tag = "@automatizavel" in (c.get("tags") or [])
        if tem_tag and auto.get("nivel") == "manual":
            erros.append(("R10-automatizavel-com-nivel-manual", c.get("ct_id", "?"),
                          "tag @automatizavel em CT com impedimento: " + str(auto.get("motivo"))))
        if tem_tag and not auto.get("recomendado"):
            erros.append(("R10-automatizavel-nao-recomendado", c.get("ct_id", "?"),
                          "tag @automatizavel em CT nao recomendado"))
        if auto.get("recomendado") and not tem_tag:
            erros.append(("R10-recomendado-sem-tag", c.get("ct_id", "?"),
                          "CT recomendado sem a tag @automatizavel"))

    # 11 — bloqueio de automacao marcado sem evidencia
    for a in achados:
        bloq = a.get("automacao") or {}
        ev = a.get("evidencia") or {}
        for k, v in bloq.items():
            if v and not (isinstance(ev, dict) and ev.get(k)):
                avisos.append(("R11-bloqueio-sem-evidencia", a["_uid"],
                               "bloqueio '{0}' marcado sem trecho literal".format(k)))

    # 12 — a evidencia citada existe de fato no documento de origem.
    # Opcional (exige --corpus). E a unica regra que confere o ledger contra a
    # realidade: todas as outras checam coerencia interna, e um subagente que
    # inventa trecho passa por elas sem ruido.
    if args.corpus:
        docs_dir = os.path.join(args.corpus, "docs")
        cache = {}

        def texto_do_doc(fonte):
            if fonte in cache:
                return cache[fonte]
            alvo = None
            base = os.path.splitext(os.path.basename(str(fonte)))[0]
            if os.path.isdir(docs_dir):
                for nome in os.listdir(docs_dir):
                    if os.path.splitext(nome)[0] == base:
                        alvo = os.path.join(docs_dir, nome)
                        break
                if alvo is None:
                    alvos = [n for n in os.listdir(docs_dir) if base and base in n]
                    alvo = os.path.join(docs_dir, alvos[0]) if len(alvos) == 1 else None
            conteudo = None
            if alvo and os.path.exists(alvo):
                conteudo = open(alvo, encoding="utf-8", errors="replace").read()
            cache[fonte] = conteudo
            return conteudo

        def normaliza_trecho(t):
            return re.sub(r"\s+", " ", re.sub(r"[\"\u201c\u201d\u2018\u2019']", "", str(t))).strip().lower()

        for a in achados:
            conteudo = texto_do_doc(a.get("fonte"))
            if conteudo is None:
                avisos.append(("R12-fonte-nao-encontrada", a["_uid"],
                               "documento '{0}' nao localizado em {1}".format(
                                   a.get("fonte"), docs_dir)))
                continue
            corpo = normaliza_trecho(conteudo)
            for flag, trecho in (a.get("evidencia") or {}).items():
                nucleo = re.sub(r"\(L\d+(?:-L?\d+)?\)\s*$", "", str(trecho)).strip()
                nucleo = normaliza_trecho(nucleo)
                if len(nucleo) < 12:
                    continue
                if nucleo not in corpo:
                    erros.append(("R12-evidencia-inexistente", a["_uid"],
                                  "trecho de '{0}' nao existe em {1}: {2}".format(
                                      flag, a.get("fonte"), str(trecho)[:60])))

    if args.json:
        print(json.dumps({"erros": [dict(zip(("regra", "alvo", "detalhe"), x)) for x in erros],
                          "avisos": [dict(zip(("regra", "alvo", "detalhe"), x)) for x in avisos],
                          "cts": len(cts), "achados": len(achados)},
                         ensure_ascii=False, indent=1))
        return 1 if erros else 0

    print("validacao: cts={0} achados={1} erros={2} avisos={3}".format(
        len(cts), len(achados), len(erros), len(avisos)))
    if erros:
        print("erros[{0}]{{regra,alvo,detalhe}}:".format(len(erros)))
        for r, alvo, det in erros[:60]:
            print("  {0},{1},{2}".format(r, str(alvo).replace(",", ";"), det.replace(",", ";")))
        if len(erros) > 60:
            print("  ... e mais {0} (use --json para a lista completa)".format(len(erros) - 60))
    else:
        print("erros[0]: nenhum — matriz valida")
    if avisos:
        print("avisos[{0}]{{regra,alvo,detalhe}}:".format(len(avisos)))
        for r, alvo, det in avisos[:30]:
            print("  {0},{1},{2}".format(r, str(alvo).replace(",", ";"), det.replace(",", ";")))
        if len(avisos) > 30:
            print("  ... e mais {0}".format(len(avisos) - 30))
    else:
        print("avisos[0]: nenhum")
    print("help[]:")
    if erros:
        print("  corrija o ledger (fase 2) ou o config e rode reduce_cts.py de novo")
    else:
        print("  entrega liberada: saida/*.docx saida/*.md saida/rastreabilidade.html")
    return 1 if erros else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
