#!/usr/bin/env python3
"""Carregamento do ledger de achados, compartilhado entre as fases.

Existe por um motivo: cada subagente da Fase 2 numera seus achados a partir de
F-0001, entao dois lotes colidem em todos os ids. Sem namespace por lote, o R4
verifica a cobertura pairwise contra os `parametros` do achado errado e o
agrupamento de automacao junta CTs de funcionalidades diferentes.

O id namespacado (`_uid`) e o que vai para o campo `achado_id` do CT.
"""
import glob
import json
import os


def uid(arquivo, id_achado):
    lote = os.path.splitext(os.path.basename(arquivo))[0]
    return "{0}#{1}".format(lote, id_achado or "sem-id")


def carregar_achados(ledger_dir):
    """Retorna (achados, mal_formados, lotes).

    Cada achado ganha `_uid` (namespacado pelo lote) e `_lote`.
    """
    arquivos = sorted(glob.glob(os.path.join(ledger_dir, "achados", "*.jsonl")))
    achados, mal_formados = [], []
    for caminho in arquivos:
        with open(caminho, encoding="utf-8") as fh:
            for n, linha in enumerate(fh, 1):
                linha = linha.strip()
                if not linha:
                    continue
                try:
                    a = json.loads(linha)
                except json.JSONDecodeError:
                    mal_formados.append("{0}:{1}".format(os.path.basename(caminho), n))
                    continue
                if not isinstance(a, dict):
                    mal_formados.append("{0}:{1}".format(os.path.basename(caminho), n))
                    continue
                a["_uid"] = uid(caminho, a.get("id"))
                a["_lote"] = os.path.splitext(os.path.basename(caminho))[0]
                achados.append(a)
    return achados, mal_formados, arquivos


def carregar_cts(ledger_dir):
    caminho = os.path.join(ledger_dir, "cts.jsonl")
    if not os.path.exists(caminho):
        return None
    with open(caminho, encoding="utf-8") as fh:
        return [json.loads(l) for l in fh if l.strip()]
