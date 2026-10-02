#!/usr/bin/env python3
"""Geracao de arrays de cobertura t-way (IPOG) + verificador independente.

Por que script e nao LLM: um modelo produz um conjunto de combinacoes plausivel
mas nao-cobridor, e nada detecta. Aqui a geracao e deterministica e a cobertura
e re-provada por enumeracao exaustiva de tuplas em `verificar()`, que nao
compartilha codigo com o gerador.

Uso como biblioteca:  from pairwise import ipog, verificar
"""
import argparse
import itertools
import json
import os
import sys


def _tuplas_requeridas(valores, t):
    """Todas as tuplas t-way que um array de cobertura precisa conter."""
    req = set()
    k = len(valores)
    for combo in itertools.combinations(range(k), t):
        for vs in itertools.product(*[valores[c] for c in combo]):
            req.add((combo, vs))
    return req


def _cobertas_por(test, t, k):
    out = set()
    for combo in itertools.combinations(range(k), t):
        vs = tuple(test[c] for c in combo)
        if any(v is None for v in vs):
            continue
        out.add((combo, vs))
    return out


def ipog(parametros, t=2):
    """parametros: dict ordenado {nome: [valores]} ou lista de (nome, [valores]).

    Retorna (nomes, linhas) com linhas completamente preenchidas.
    """
    if isinstance(parametros, dict):
        itens = list(parametros.items())
    else:
        itens = list(parametros)
    itens = [(n, list(v)) for n, v in itens if v]
    if not itens:
        return [], []
    # parametros com mais valores primeiro: reduz o tamanho do array
    ordem = sorted(range(len(itens)), key=lambda i: -len(itens[i][1]))
    itens = [itens[i] for i in ordem]
    nomes = [n for n, _ in itens]
    valores = [v for _, v in itens]
    k = len(itens)
    t = max(1, min(t, k))

    if k <= t:
        return nomes, [list(c) for c in itertools.product(*valores)]

    tests = [list(c) for c in itertools.product(*valores[:t])]

    for i in range(t, k):
        pi = valores[i]
        # tuplas que envolvem o parametro i e t-1 dos anteriores
        uncovered = set()
        for combo in itertools.combinations(range(i), t - 1):
            for vs in itertools.product(*[valores[c] for c in combo]):
                for v in pi:
                    uncovered.add((combo + (i,), vs + (v,)))

        def cobrir(test):
            for combo in itertools.combinations(range(i + 1), t):
                if combo[-1] != i:
                    continue
                vs = tuple(test[c] for c in combo)
                if any(x is None for x in vs):
                    continue
                uncovered.discard((combo, vs))

        # crescimento horizontal: estende cada teste existente com o melhor valor
        for test in tests:
            test.append(None)
            melhor_v, melhor_cov = pi[0], -1
            for v in pi:
                cov = 0
                for combo in itertools.combinations(range(i), t - 1):
                    vs = tuple(test[c] for c in combo)
                    if any(x is None for x in vs):
                        continue
                    if (combo + (i,), vs + (v,)) in uncovered:
                        cov += 1
                if cov > melhor_cov:
                    melhor_cov, melhor_v = cov, v
            test[i] = melhor_v
            cobrir(test)

        # crescimento vertical: tuplas restantes entram em testes compativeis
        for combo, vs in sorted(uncovered, key=lambda x: (x[0], tuple(map(str, x[1])))):
            if (combo, vs) not in uncovered:
                continue
            alvo = [None] * (i + 1)
            for pos, c in enumerate(combo):
                alvo[c] = vs[pos]
            encaixou = False
            for test in tests:
                if all(alvo[p] is None or test[p] is None or test[p] == alvo[p]
                       for p in range(i + 1)):
                    for p in range(i + 1):
                        if alvo[p] is not None:
                            test[p] = alvo[p]
                    cobrir(test)
                    encaixou = True
                    break
            if not encaixou:
                tests.append(alvo)
                cobrir(alvo)

    # preenche don't-cares com o primeiro valor do parametro
    for test in tests:
        for p in range(k):
            if test[p] is None:
                test[p] = valores[p][0]

    # remove linhas duplicadas preservando ordem
    vistos, final = set(), []
    for test in tests:
        chave = tuple(test)
        if chave not in vistos:
            vistos.add(chave)
            final.append(test)
    return nomes, final


def verificar(parametros, nomes, linhas, t=2):
    """Prova independente de cobertura. Retorna (ok, faltando, total_requerido).

    Nao reaproveita nada do gerador: enumera o requerido a partir dos parametros
    de entrada e o coberto a partir das linhas de saida.
    """
    if isinstance(parametros, dict):
        itens = list(parametros.items())
    else:
        itens = list(parametros)
    itens = [(n, list(v)) for n, v in itens if v]
    if not itens:
        return True, [], 0
    por_nome = dict(itens)
    valores = [por_nome[n] for n in nomes]
    k = len(nomes)
    t = max(1, min(t, k))
    requerido = _tuplas_requeridas(valores, t)
    coberto = set()
    for linha in linhas:
        coberto |= _cobertas_por(linha, t, k)
    faltando = requerido - coberto
    legivel = [
        {nomes[c]: vs[idx] for idx, c in enumerate(combo)}
        for combo, vs in sorted(faltando, key=lambda x: (x[0], tuple(map(str, x[1]))))
    ]
    return not faltando, legivel, len(requerido)


def main(argv):
    ap = argparse.ArgumentParser(
        prog="pairwise.py",
        description="Gera array de cobertura t-way (IPOG) e prova a cobertura.")
    ap.add_argument("--params", help='JSON inline: {"insumo":["Satelite","Radar"],...}')
    ap.add_argument("--arquivo", help="arquivo JSON com o dict de parametros")
    ap.add_argument("--t", type=int, default=2, help="forca da cobertura (default 2 = pairwise)")
    ap.add_argument("--json", action="store_true", help="saida em JSON em vez de TOON")
    args = ap.parse_args(argv)

    if not args.params and not args.arquivo:
        print("pairwise.py — array de cobertura t-way com prova de cobertura")
        print("exec: " + os.path.abspath(__file__))
        print("")
        print('uso: pairwise.py --params \'{"insumo":["Satelite","Radar"],"limiar":["min","max"]}\'')
        print("     pairwise.py --arquivo params.json --t 2")
        print("")
        print("help[]:")
        print('  pairwise.py --params \'{"a":["1","2","3"],"b":["x","y","z"],"c":["p","q","r"]}\'')
        print("  pairwise.py --arquivo params.json --t 3   # triplas em vez de pares")
        return 0

    try:
        raw = json.loads(args.params) if args.params else json.load(open(args.arquivo))
    except (json.JSONDecodeError, OSError) as exc:
        print(json.dumps({"erro": "params-invalidos", "detalhe": str(exc)}))
        return 1
    if not isinstance(raw, dict) or not raw:
        print(json.dumps({"erro": "params-vazio", "esperado": "dict nome -> lista de valores"}))
        return 1

    nomes, linhas = ipog(raw, args.t)
    ok, faltando, total = verificar(raw, nomes, linhas, args.t)
    exaustivo = 1
    for v in raw.values():
        exaustivo *= max(1, len(v))

    if args.json:
        print(json.dumps({"t": args.t, "nomes": nomes, "linhas": linhas, "cobertura_ok": ok,
                          "tuplas_requeridas": total, "faltando": faltando,
                          "testes": len(linhas), "exaustivo": exaustivo},
                         ensure_ascii=False, indent=1))
        return 0 if ok else 1

    print("cobertura: t={0} testes={1} exaustivo={2} reducao={3:.0f}% tuplas={4} ok={5}".format(
        args.t, len(linhas), exaustivo,
        100 * (1 - len(linhas) / exaustivo) if exaustivo else 0, total, str(ok).lower()))
    print("linhas[{0}]{{{1}}}:".format(len(linhas), ",".join(nomes)))
    for linha in linhas:
        print("  " + ",".join(str(v).replace(",", ";") for v in linha))
    if not ok:
        print("faltando[{0}]:".format(len(faltando)))
        for f in faltando[:20]:
            print("  " + json.dumps(f, ensure_ascii=False))
        print("ERRO: array nao cobridor — nao use este resultado")
        return 1
    print("help[]:")
    print("  cada linha vira um CT; nomeie o cenario a partir dos valores da linha")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
