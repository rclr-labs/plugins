#!/usr/bin/env python3
"""Testes de pairwise.py. Rode: python3 -m pytest test_pairwise.py -q

O invariante testado e COBERTURA, nao contagem de linhas: IPOG e uma heuristica
gulosa e nao garante o array minimo. Um teste que exigisse exatamente 9 linhas
para 3x3x3 falharia por otimalidade, nao por incorrecao.
"""
import itertools
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pairwise import ipog, verificar  # noqa: E402


def pares_cobertos(nomes, linhas, t=2):
    cob = set()
    for linha in linhas:
        for combo in itertools.combinations(range(len(nomes)), t):
            cob.add((combo, tuple(linha[c] for c in combo)))
    return cob


def test_3x3x3_cobre_todos_os_27_pares():
    params = {"a": ["1", "2", "3"], "b": ["x", "y", "z"], "c": ["p", "q", "r"]}
    nomes, linhas = ipog(params, 2)
    ok, faltando, total = verificar(params, nomes, linhas, 2)
    assert total == 27, "3 pares de parametros x 9 combinacoes = 27 tuplas requeridas"
    assert ok, "pares nao cobertos: {0}".format(faltando)
    assert 9 <= len(linhas) <= 14, "esperado proximo do otimo (9), obtido {0}".format(len(linhas))
    assert len(linhas) < 27, "pairwise tem que reduzir frente ao exaustivo"


def test_caso_real_filtro():
    params = {"insumo": ["Satelite", "Radar", "Modelo", "Estação", "Derivado"],
              "limiar": ["min", "max", "min+max"],
              "variavel": ["temperatura", "umidade", "vento"]}
    nomes, linhas = ipog(params, 2)
    ok, faltando, _ = verificar(params, nomes, linhas, 2)
    assert ok, "pares nao cobertos: {0}".format(faltando)
    assert len(linhas) < 45, "exaustivo seria 45"
    assert len(linhas) >= 15, "limite inferior = maior produto de dois dominios (5x3)"


def test_t3_cobre_todas_as_triplas():
    params = {"a": ["1", "2"], "b": ["x", "y"], "c": ["p", "q"], "d": ["m", "n"]}
    nomes, linhas = ipog(params, 3)
    ok, faltando, total = verificar(params, nomes, linhas, 3)
    assert total == 32, "C(4,3)=4 combos x 8 valores = 32 triplas"
    assert ok, "triplas nao cobertas: {0}".format(faltando)


def test_menos_parametros_que_t_vira_exaustivo():
    params = {"a": ["1", "2"], "b": ["x", "y"]}
    nomes, linhas = ipog(params, 2)
    assert len(linhas) == 4, "2 parametros com t=2 e exaustivo"
    ok, _, _ = verificar(params, nomes, linhas, 2)
    assert ok


def test_parametro_de_valor_unico_nao_quebra():
    params = {"a": ["1", "2", "3"], "ambiente": ["producao"], "b": ["x", "y"]}
    nomes, linhas = ipog(params, 2)
    ok, faltando, _ = verificar(params, nomes, linhas, 2)
    assert ok, "faltando: {0}".format(faltando)
    assert all("producao" in linha for linha in linhas)


def test_vazio_e_degenerado():
    assert ipog({}, 2) == ([], [])
    assert ipog({"a": []}, 2) == ([], [])
    nomes, linhas = ipog({"a": ["1", "2"]}, 2)
    assert len(linhas) == 2, "um parametro so: cada valor uma vez"


def test_verificador_detecta_array_incompleto():
    """O verificador tem que reprovar um array adulterado — senao nao prova nada."""
    params = {"a": ["1", "2", "3"], "b": ["x", "y", "z"]}
    nomes, linhas = ipog(params, 2)
    ok, _, _ = verificar(params, nomes, linhas, 2)
    assert ok
    ok2, faltando2, _ = verificar(params, nomes, linhas[:-1], 2)
    assert not ok2, "remover uma linha de um array exaustivo tem que descobrir um par"
    assert len(faltando2) >= 1


if __name__ == "__main__":
    falhas = 0
    for nome, fn in sorted(globals().items()):
        if nome.startswith("test_") and callable(fn):
            try:
                fn()
                print("ok   " + nome)
            except AssertionError as exc:
                falhas += 1
                print("FALHA {0}: {1}".format(nome, exc))
    print("")
    print("testes: {0} passaram, {1} falharam".format(
        sum(1 for n in globals() if n.startswith("test_")) - falhas, falhas))
    sys.exit(1 if falhas else 0)
