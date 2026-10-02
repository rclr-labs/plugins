#!/usr/bin/env python3
"""Testes de integracao do pipeline. Rode: python3 test_pipeline.py

Codifica os criterios de aceite da skill como assercoes sobre exit codes e
regras disparadas. Monta todas as fixtures em um diretorio temporario — nao
depende de nada fora da skill.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))
CONFIG = os.path.join(os.path.dirname(AQUI), "assets", "config.exemplo.json")


def rodar(script, *args):
    r = subprocess.run([sys.executable, os.path.join(AQUI, script)] + list(args),
                       capture_output=True, text=True)
    return r.returncode, r.stdout + r.stderr


def escrever_jsonl(caminho, registros):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as fh:
        for r in registros:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")


def achado(id_, func, tecnica, **kw):
    base = {"id": id_, "fonte": "doc.md", "locator": "L10-L20", "modulo": "METEO",
            "funcionalidade": func, "requisito": ["REQ-C1"], "historia": "1001",
            "criterio_aceite": kw.pop("criterio", "Validar " + id_),
            "tecnica": tecnica,
            "criticos": {"caminho_feliz": True}, "medios": {}, "baixos": {},
            "evidencia": {"caminho_feliz": '"trecho" (L14)'}}
    base.update(kw)
    return base


def base_ok():
    return [
        achado("F-0001", "CONSULTA — Busca por identificador", "equivalencia",
               criterio="Exibir dados do ativo ao consultar por identificador",
               dominio={"campo": "identificador", "validos": ["PT-ABC"],
                        "invalidos": ["inexistente", "caracteres especiais"],
                        "limites": ["1 caractere"], "aceita_branco": True}),
        achado("F-0002", "FILTRO — Limiar", "pairwise",
               criterio="Destacar pontos dentro do limiar configurado",
               parametros={"insumo": ["Satélite", "Radar", "Modelo", "Estação", "Derivado"],
                           "limiar": ["min", "max", "min+max"]}),
        achado("F-0003", "CONSULTA — Atendimento Simultâneo", "transicao_estado",
               criterio="Manter atendimentos simultâneos isolados",
               transicoes=[{"de": "nenhum", "para": "A", "evento": "abrir A"},
                           {"de": "A", "para": "A+B", "evento": "abrir B"},
                           {"de": "A+B", "para": "B", "evento": "alternar"},
                           {"de": "A+B", "para": "A", "evento": "fechar B"}]),
    ]


def cenario(tmp, nome, achados):
    d = os.path.join(tmp, nome)
    os.makedirs(d, exist_ok=True)
    shutil.copy(CONFIG, os.path.join(d, "matriz.config.json"))
    escrever_jsonl(os.path.join(d, "ledger", "achados", "lote-01.jsonl"), achados)
    return d


RESULTADOS = []


def checar(nome, cond, detalhe=""):
    RESULTADOS.append((nome, bool(cond), detalhe))
    print("{0} {1}{2}".format("ok  " if cond else "FALHA", nome,
                              "" if cond else "  <- " + detalhe))


def main():
    tmp = tempfile.mkdtemp(prefix="matriz-teste-")
    try:
        # 1 — caminho feliz
        d = cenario(tmp, "ok", base_ok())
        rc, out = rodar("reduce_cts.py", "--ledger", d + "/ledger", "--config", d + "/matriz.config.json")
        checar("reduce gera CTs e sai 0", rc == 0 and "count=0" not in out, out[:200])
        n_cts = int(re.search(r"count=(\d+)", out).group(1))
        checar("equivalencia rende 5 classes (valido+2 invalidos+limite+branco)",
               "equivalencia,5" in out, out[:300])
        checar("transicao_estado rende 4 CTs", "transicao_estado,4" in out, out[:300])
        for script in ("render_matriz.py", "render_ciclo.py", "render_rastreabilidade.py"):
            rc2, o2 = rodar(script, "--ledger", d + "/ledger", "--config",
                            d + "/matriz.config.json", "--out", d + "/saida")
            checar(script + " sai 0", rc2 == 0, o2[:200])
        rc3, o3 = rodar("validate.py", "--ledger", d + "/ledger", "--config", d + "/matriz.config.json")
        checar("validate libera matriz limpa", rc3 == 0 and "erros[0]" in o3, o3[:300])

        # 2 — golden: matriz de referência original tem 5 CTs Alta sem @smoke
        g = os.path.join(tmp, "golden")
        os.makedirs(g, exist_ok=True)
        shutil.copy(CONFIG, os.path.join(g, "matriz.config.json"))
        golden = []
        for pfx, linhas in (("ATE", [("Alta", "@smoke @regressao"), ("Alta", "@smoke @regressao"),
                                     ("Alta", "@regressao"), ("Média", "@regressao"),
                                     ("Média", "@regressao"), ("Alta", "@regressao")]),
                            ("FIL", [("Alta", "@smoke @regressao"), ("Alta", "@smoke @regressao"),
                                     ("Alta", "@regressao"), ("Alta", "@smoke @regressao"),
                                     ("Média", "@regressao"), ("Média", "@regressao"),
                                     ("Média", "@regressao"), ("Média", "@regressao"),
                                     ("Média", "@regressao"), ("Alta", "@smoke @regressao"),
                                     ("Alta", "@regressao"), ("Alta", "@regressao")])):
            for i, (pri, tags) in enumerate(linhas, 1):
                golden.append({"ct_id": "{0}-CT{1:03d}".format(pfx, i), "prefixo": pfx, "seq": i,
                               "modulo": "METEO", "funcionalidade": "x", "cenario": "y",
                               "prioridade": pri, "tags": tags.split(), "historia": "1001",
                               "requisito": [], "ultima_revisao": "2026-07-01", "artefatos": "-",
                               "observacoes": "-", "tecnica": "caso_unico", "combinacao": {},
                               "criterio_aceite": "", "achado_id": "golden",
                               "fonte": "matriz-referencia.docx", "locator": "L1",
                               "criterios_disparados": ["caminho_feliz"],
                               "prioridade_por_default": False,
                               "evidencia": {"caminho_feliz": "transcrito (L1)"}})
        escrever_jsonl(os.path.join(g, "ledger", "cts.jsonl"), golden)
        rc, out = rodar("validate.py", "--ledger", g + "/ledger", "--config", g + "/matriz.config.json")
        n_r1 = out.count("R1-alta-sem-smoke")
        checar("R1 reprova a matriz de referência original com 5 violacoes", rc == 1 and n_r1 == 5,
               "exit={0} R1={1}".format(rc, n_r1))

        # 3 — array adulterado: remover todo um valor de parametro
        a = os.path.join(tmp, "adulterado")
        os.makedirs(a, exist_ok=True)
        shutil.copy(CONFIG, os.path.join(a, "matriz.config.json"))
        escrever_jsonl(os.path.join(a, "ledger", "achados", "lote-01.jsonl"), base_ok())
        shutil.copy(os.path.join(d, "ledger", "cts.jsonl"), os.path.join(a, "ledger", "cts.jsonl"))
        cts = [json.loads(l) for l in open(os.path.join(a, "ledger", "cts.jsonl"), encoding="utf-8")]
        sobrevivem = [c for c in cts if c.get("combinacao", {}).get("insumo") != "Estação"]
        escrever_jsonl(os.path.join(a, "ledger", "cts.jsonl"), sobrevivem)
        rc, out = rodar("validate.py", "--ledger", a + "/ledger", "--config", a + "/matriz.config.json")
        checar("R4 detecta valor de parametro inteiro removido",
               rc == 1 and "R4-pairwise-nao-cobridor" in out, "exit={0}".format(rc) + out[:300])

        # 4 — nenhuma funcionalidade mapeavel: falha, nao sucesso vazio
        z = cenario(tmp, "sem-prefixo",
                    [achado("F-0001", "Gestão de usuários e permissões", "caso_unico")])
        rc, out = rodar("reduce_cts.py", "--ledger", z + "/ledger", "--config", z + "/matriz.config.json")
        checar("zero CTs mapeados sai 1, nao 0",
               rc == 1 and "count=0" in out, "exit={0}".format(rc) + out[:200])

        # 5 — queda parcial: gera o que mapeia, R2 bloqueia o orfao
        pr = cenario(tmp, "parcial",
                     base_ok() + [achado("F-9001", "Gestão de usuários e permissões", "caso_unico",
                                         criterio="Revogar acesso de operador desligado")])
        rc, out = rodar("reduce_cts.py", "--ledger", pr + "/ledger", "--config", pr + "/matriz.config.json")
        checar("queda parcial ainda gera CTs e reporta pendencia",
               rc == 0 and "funcionalidade-sem-prefixo" in out, "exit={0}".format(rc) + out[:200])
        rc, out = rodar("validate.py", "--ledger", pr + "/ledger", "--config", pr + "/matriz.config.json")
        checar("R2 bloqueia criterio de aceite sem CT",
               rc == 1 and "R2-criterio-sem-ct" in out, "exit={0}".format(rc) + out[:300])

        # 6 — forma rala vira aviso visivel
        t = cenario(tmp, "ralo", [
            achado("F-0001", "CONSULTA — Busca por identificador", "equivalencia",
                   dominio={"campo": "identificador", "validos": ["PT-ABC"], "invalidos": [],
                            "limites": [], "aceita_branco": True}),
            achado("F-0002", "CONSULTA — Atendimento Simultâneo", "transicao_estado",
                   transicoes=[{"de": "nenhum", "para": "A", "evento": "abrir"}]),
        ])
        rodar("reduce_cts.py", "--ledger", t + "/ledger", "--config", t + "/matriz.config.json")
        rc, out = rodar("validate.py", "--ledger", t + "/ledger", "--config", t + "/matriz.config.json")
        checar("R9 avisa sobre dominio e transicoes ralos",
               "R9-equivalencia-rala" in out and "R9-transicoes-ralas" in out, out[:400])

        # 7 — prefixo nao pode mudar entre execucoes
        rc, out = rodar("validate.py", "--ledger", d + "/ledger", "--config",
                        d + "/matriz.config.json", "--baseline", os.path.join(g, "ledger", "cts.jsonl"))
        checar("validate aceita --baseline sem quebrar", rc in (0, 1), out[:200])

        # 8 — ids de achado colidem entre lotes (cada subagente comeca em F-0001)
        col = os.path.join(tmp, "colisao")
        os.makedirs(col, exist_ok=True)
        shutil.copy(CONFIG, os.path.join(col, "matriz.config.json"))
        escrever_jsonl(os.path.join(col, "ledger", "achados", "lote-01.jsonl"), [
            achado("F-0001", "FILTRO — Limiar", "pairwise",
                   criterio="Destacar pontos no limiar",
                   parametros={"insumo": ["Satélite", "Radar", "Modelo"],
                               "limiar": ["min", "max"]})])
        escrever_jsonl(os.path.join(col, "ledger", "achados", "lote-02.jsonl"), [
            achado("F-0001", "VISUAL — Plotagens", "pairwise",
                   criterio="Aplicar plotagem no mapa",
                   parametros={"insumo": ["Satélite", "Radar"],
                               "plotagem": ["padrão", "custom"]})])
        rc, out = rodar("reduce_cts.py", "--ledger", col + "/ledger",
                        "--config", col + "/matriz.config.json")
        cts_col = [json.loads(l) for l in
                   open(os.path.join(col, "ledger", "cts.jsonl"), encoding="utf-8")]
        uids = {c["achado_id"] for c in cts_col}
        checar("ids de achado namespacados por lote", len(uids) == 2,
               "uids={0}".format(uids))
        rc, out = rodar("validate.py", "--ledger", col + "/ledger",
                        "--config", col + "/matriz.config.json")
        checar("R4 nao confunde achados homonimos de lotes diferentes",
               rc == 0 and "R4" not in out, "exit={0} ".format(rc) + out[:300])

        # 9 — automacao desligada nao deixa rastro
        a_off = cenario(tmp, "auto-off", base_ok())
        rodar("reduce_cts.py", "--ledger", a_off + "/ledger", "--config", a_off + "/matriz.config.json")
        rodar("render_matriz.py", "--ledger", a_off + "/ledger",
              "--config", a_off + "/matriz.config.json", "--out", a_off + "/saida")
        cts_off = [json.loads(l) for l in
                   open(os.path.join(a_off, "ledger", "cts.jsonl"), encoding="utf-8")]
        md_off = [f for f in os.listdir(a_off + "/saida") if f.endswith(".md")][0]
        texto_off = open(os.path.join(a_off, "saida", md_off), encoding="utf-8").read()
        checar("automacao desligada: sem campo, sem tag, sem coluna",
               not any("automacao" in c for c in cts_off)
               and not any("@automatizavel" in c["tags"] for c in cts_off)
               and "| Automação |" not in texto_off)

        # 10 — automacao ligada: coluna, tag, niveis e ranking
        a_on = os.path.join(tmp, "auto-on")
        os.makedirs(a_on, exist_ok=True)
        cfg_on = json.load(open(CONFIG, encoding="utf-8"))
        cfg_on["recomendar_automacao"] = True
        json.dump(cfg_on, open(os.path.join(a_on, "matriz.config.json"), "w", encoding="utf-8"),
                  ensure_ascii=False)
        escrever_jsonl(os.path.join(a_on, "ledger", "achados", "lote-01.jsonl"), base_ok() + [
            achado("F-0004", "VISUAL — Plotagens", "caso_unico",
                   criterio="Restaurar a plotagem padrão",
                   baixos={"layout_visual": True}, criticos={}),
            achado("F-0006", "CONSULTA — Busca por identificador", "pairwise",
                   criterio="Consultar ativo via serviço externo",
                   parametros={"origem": ["OPMET", "cache local"],
                               "formato": ["lista", "detalhe"]},
                   integracoes=["Banco OPMET"]),
            achado("F-0005", "FILTRO — Limiar", "pairwise",
                   criterio="Aplicar limiar com massa sintética",
                   parametros={"insumo": ["Satélite", "Radar"], "faixa": ["baixa", "alta"]},
                   integracoes=["API satélite"],
                   automacao={"massa_custosa": True},
                   evidencia={"caminho_feliz": '"trecho" (L14)',
                              "massa_custosa": '"gerar massa leva dias" (L22)'}),
        ])
        rc, out = rodar("reduce_cts.py", "--ledger", a_on + "/ledger",
                        "--config", a_on + "/matriz.config.json")
        checar("automacao ligada reporta niveis e coleta de bloqueios",
               rc == 0 and "automacao:" in out and "nivel[" in out and "bloqueios=coletados" in out,
               out[:400])
        cts_on = [json.loads(l) for l in
                  open(os.path.join(a_on, "ledger", "cts.jsonl"), encoding="utf-8")]
        veto = [c for c in cts_on if c["criterio_aceite"] == "Restaurar a plotagem padrão"]
        checar("veto layout_visual vira manual sem tag",
               veto and all(c["automacao"]["nivel"] == "manual"
                            and "@automatizavel" not in c["tags"] for c in veto),
               str([c["automacao"] for c in veto][:1]))
        bloq = [c for c in cts_on if c["criterio_aceite"] == "Aplicar limiar com massa sintética"]
        checar("bloqueio massa_custosa vira manual com motivo",
               bloq and all(c["automacao"]["nivel"] == "manual"
                            and "massa" in c["automacao"]["motivo"] for c in bloq),
               str([c["automacao"] for c in bloq][:1]))
        integ = [c for c in cts_on
                 if c["criterio_aceite"] == "Consultar ativo via serviço externo"]
        checar("pairwise com integracao e sem bloqueio vira API",
               integ and all(c["automacao"]["nivel"] == "API" for c in integ),
               str([c["automacao"]["nivel"] for c in integ][:3]))
        sem_integ = [c for c in cts_on
                     if c["criterio_aceite"] == "Destacar pontos dentro do limiar configurado"]
        checar("pairwise sem integracao vira integração (nao API)",
               sem_integ and all(c["automacao"]["nivel"] == "integração" for c in sem_integ),
               str([c["automacao"]["nivel"] for c in sem_integ][:3]))
        rc, out = rodar("render_matriz.py", "--ledger", a_on + "/ledger",
                        "--config", a_on + "/matriz.config.json", "--out", a_on + "/saida")
        md_on = [f for f in os.listdir(a_on + "/saida") if f.endswith(".md")][0]
        texto_on = open(os.path.join(a_on, "saida", md_on), encoding="utf-8").read()
        checar("matriz ligada tem a 9a coluna e a legenda",
               "| Automação |" in texto_on and "Nível recomendado para automação" in texto_on)
        rc, out = rodar("render_rastreabilidade.py", "--ledger", a_on + "/ledger",
                        "--config", a_on + "/matriz.config.json", "--out", a_on + "/saida")
        htm = open(os.path.join(a_on, "saida", "rastreabilidade.html"), encoding="utf-8").read()
        checar("html tem backlog ordenado e bloco de nao recomendados",
               "Backlog de automação" in htm and "Não recomendados" in htm, out[:200])
        rc, out = rodar("validate.py", "--ledger", a_on + "/ledger",
                        "--config", a_on + "/matriz.config.json")
        checar("validate libera matriz com automacao", rc == 0, out[:300])

        # 11 — R10 reprova tag incoerente com o nivel
        cts_bad = json.loads(json.dumps(cts_on))
        for c in cts_bad:
            if c["automacao"]["nivel"] == "manual":
                c["tags"] = list(c["tags"]) + ["@automatizavel"]
                break
        escrever_jsonl(os.path.join(a_on, "ledger", "cts.jsonl"), cts_bad)
        rc, out = rodar("validate.py", "--ledger", a_on + "/ledger",
                        "--config", a_on + "/matriz.config.json")
        checar("R10 reprova @automatizavel em CT manual",
               rc == 1 and "R10-automatizavel" in out, "exit={0} ".format(rc) + out[:300])

        # 12 — R12 confere a evidencia contra o documento de origem
        ev = os.path.join(tmp, "evidencia")
        os.makedirs(os.path.join(ev, "corpus", "docs"), exist_ok=True)
        shutil.copy(CONFIG, os.path.join(ev, "matriz.config.json"))
        with open(os.path.join(ev, "corpus", "docs", "doc.md"), "w", encoding="utf-8") as fh:
            fh.write("L001: Historia do usuario\n"
                     "L002: o operador consulta a identificador e ve os dados do ativo\n"
                     "L003: fim\n")
        bom = achado("F-0001", "CONSULTA — Busca por identificador", "caso_unico",
                     criterio="Consultar identificador e exibir dados",
                     evidencia={"caminho_feliz":
                                '"o operador consulta a identificador e ve os dados" (L002)'})
        escrever_jsonl(os.path.join(ev, "ledger", "achados", "lote-01.jsonl"), [bom])
        rodar("reduce_cts.py", "--ledger", ev + "/ledger", "--config", ev + "/matriz.config.json")
        rc, out = rodar("validate.py", "--ledger", ev + "/ledger", "--config",
                        ev + "/matriz.config.json", "--corpus", ev + "/corpus")
        checar("R12 aceita evidencia que existe no documento",
               rc == 0 and "R12" not in out, "exit={0} ".format(rc) + out[:300])
        ruim = json.loads(json.dumps(bom))
        ruim["evidencia"]["caminho_feliz"] = '"o sistema emite alerta sonoro" (L002)'
        escrever_jsonl(os.path.join(ev, "ledger", "achados", "lote-01.jsonl"), [ruim])
        rodar("reduce_cts.py", "--ledger", ev + "/ledger", "--config", ev + "/matriz.config.json")
        rc, out = rodar("validate.py", "--ledger", ev + "/ledger", "--config",
                        ev + "/matriz.config.json", "--corpus", ev + "/corpus")
        checar("R12 reprova evidencia inventada",
               rc == 1 and "R12-evidencia-inexistente" in out, "exit={0} ".format(rc) + out[:300])
        rc, out = rodar("validate.py", "--ledger", ev + "/ledger",
                        "--config", ev + "/matriz.config.json")
        checar("R12 nao roda sem --corpus (regra opcional)",
               rc == 0 and "R12" not in out, "exit={0} ".format(rc) + out[:200])

        print("")
        falhas = sum(1 for _, ok, _ in RESULTADOS if not ok)
        print("integracao: {0} passaram, {1} falharam ({2} CTs no cenario feliz)".format(
            len(RESULTADOS) - falhas, falhas, n_cts))
        return 1 if falhas else 0
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
