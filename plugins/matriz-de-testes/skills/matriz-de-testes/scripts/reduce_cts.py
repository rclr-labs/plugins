#!/usr/bin/env python3
"""Fase 3: ledger de achados -> casos de teste (CTs). Deterministico, sem LLM.

Le ledger/achados/*.jsonl (um arquivo por lote de subagente), agrupa por
funcionalidade, aplica a tecnica de teste declarada em cada achado e emite
ledger/cts.jsonl com numeracao sequencial por prefixo.

A prioridade sai da rubrica da matriz de referência secao 2, em cascata sobre as flags do
achado — nunca de julgamento no momento da geracao.
"""
import argparse
import glob
import itertools
import json
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pairwise import ipog, verificar  # noqa: E402
from ledger import carregar_achados  # noqa: E402

CRITICOS = ["caminho_feliz", "critico_negocio", "primeira_entrega",
            "alta_prob_falha", "integracao_externa", "seguranca_compliance"]
MEDIOS = ["variacao_fluxo", "excecao_nao_critica", "refatoracao",
          "usabilidade", "integracao_interna_estavel"]
BAIXOS = ["exploratorio", "legado_estavel", "layout_visual",
          "baixa_prob_falha", "infraestrutura"]

TAGS = {"Alta": ["@smoke", "@regressao"], "Média": ["@regressao"], "Baixa": []}


def norm(s):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


# --------------------------------------------------------- nomeacao de cenario

# Marcadores que iniciam complemento: o nucleo verbal termina antes do primeiro
# deles. "Destacar pontos | dentro do limiar configurado" -> "Destacar pontos".
CORTES = {"dentro", "fora", "de", "da", "do", "das", "dos", "em", "no", "na", "nos",
          "nas", "por", "para", "com", "sobre", "entre", "ao", "aos", "a", "as",
          "e", "que", "quando", "conforme", "segundo", "apos", "antes", "partir"}


def _nucleo(frase, min_palavras=2, max_palavras=5):
    """Verbo de acao + objeto direto, cortando o complemento.

    O complemento vira redundante quando a combinacao de parametros entra na
    frase: em um array de 15 linhas o criterio de aceite inteiro produz 15
    cenarios com dezenas de caracteres identicos na frente, e o que distingue o
    CT fica no fim — a pior posicao para escanear uma coluna.
    """
    palavras = [w for w in str(frase or "").split() if w]
    if not palavras:
        return ""
    corte = len(palavras)
    for i, w in enumerate(palavras):
        if i >= min_palavras and norm(w) in CORTES:
            corte = i
            break
    return " ".join(palavras[:min(corte, max_palavras)])


VERBOS_POR_TECNICA = {
    "pairwise": "Validar",
    "equivalencia": "Consultar",
    "transicao_estado": "Executar",
    "tabela_decisao": "Validar",
    "caso_unico": "Validar",
}


def nome_cenario(tecnica, criterio_aceite, funcionalidade, detalhe):
    """Compoe a coluna 'Cenario' da matriz.

    Regra da matriz de referência secao 1.1: "descricao curta e objetiva do que sera
    testado, iniciando sempre com verbo de acao". Esse texto e o que o cliente
    le em cada linha da entrega, entao legibilidade aqui importa mais que
    qualquer outra decisao de formatacao.

    tecnica          -- pairwise | equivalencia | transicao_estado |
                        tabela_decisao | caso_unico
    criterio_aceite  -- frase do requisito de origem, ex.:
                        "Destacar pontos dentro do limiar configurado"
    funcionalidade   -- ex.: "FILTRO — Limiar"
    detalhe          -- o que distingue este CT dos irmaos:
                        pairwise        -> {"insumo": "Satelite", "limiar": "min"}
                        equivalencia    -> {"classe": "invalido",
                                            "valor": "caracteres especiais",
                                            "campo": "identificador"}
                        transicao_estado-> {"de": "atendimento A",
                                            "para": "atendimento B",
                                            "evento": "alternar aba"}
                        tabela_decisao  -> {"regra": "R3",
                                            "condicoes": {...},
                                            "resultado": "bloqueia envio"}
                        caso_unico      -> {}

    Retorna uma linha unica, idealmente <= 80 caracteres.
    """
    base = re.sub(r"\s+", " ", str(criterio_aceite or funcionalidade or "")).strip().rstrip(".")

    if tecnica == "pairwise" and detalhe:
        combo = " / ".join(str(v) for v in detalhe.values())
        nucleo = _nucleo(base) or "Validar"
        return _encurtar("{0} com {1}".format(nucleo, combo))

    if tecnica == "equivalencia" and detalhe:
        campo = detalhe.get("campo", "campo")
        classe = detalhe.get("classe", "")
        valor = detalhe.get("valor", "")
        rotulos = {"valido": "valido", "invalido": "invalido",
                   "limite": "no limite", "branco": "em branco"}
        qualificador = rotulos.get(classe, classe)
        if valor and classe not in ("branco",):
            return _encurtar("Consultar {0} {1} ({2})".format(campo, qualificador, valor))
        return _encurtar("Consultar {0} {1}".format(campo, qualificador))

    if tecnica == "transicao_estado" and detalhe:
        evento = detalhe.get("evento", "transicao")
        de, para = detalhe.get("de", ""), detalhe.get("para", "")
        if de and para:
            return _encurtar("Executar {0} de {1} para {2}".format(evento, de, para))
        return _encurtar("Executar {0}".format(evento))

    if tecnica == "tabela_decisao" and detalhe:
        resultado = detalhe.get("resultado", "")
        condicoes = " e ".join("{0}={1}".format(k, v)
                               for k, v in (detalhe.get("condicoes") or {}).items())
        if resultado and condicoes:
            return _encurtar("Validar {0} quando {1}".format(resultado, condicoes))
        return _encurtar("Validar regra {0}".format(detalhe.get("regra", "")))

    if base and not re.match(r"^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(ar|er|ir|r)\b", base):
        verbo = VERBOS_POR_TECNICA.get(tecnica, "Validar")
        return _encurtar("{0} {1}".format(verbo, base[0].lower() + base[1:]))
    return _encurtar(base or "Validar comportamento")


def _encurtar(txt, limite=90):
    txt = re.sub(r"\s+", " ", txt).strip()
    if len(txt) <= limite:
        return txt
    corte = txt[:limite].rsplit(" ", 1)[0]
    return corte + "..."


# ------------------------------------------------------------------ prioridade

def prioridade(achado):
    """Cascata da rubrica da matriz de referência secao 2. Retorna (nivel, disparados, default?)."""
    for grupo, nivel in ((CRITICOS, "Alta"), (MEDIOS, "Média"), (BAIXOS, "Baixa")):
        chave = {"Alta": "criticos", "Média": "medios", "Baixa": "baixos"}[nivel]
        flags = achado.get(chave) or {}
        disparados = [k for k in grupo if flags.get(k)]
        if disparados:
            return nivel, disparados, False
    # sem nenhuma flag: Média como default conservador, marcado como pendencia
    return "Média", [], True


# ------------------------------------------------- geradores de CT por tecnica

def _params_uteis(achado):
    p = achado.get("parametros") or {}
    return {k: list(v) for k, v in p.items() if isinstance(v, list) and len(v) >= 1}


def gerar(achado, cfg, avisos):
    """Retorna lista de dicts parciais de CT (sem ct_id)."""
    tecnica = achado.get("tecnica") or _inferir_tecnica(achado)
    func = achado.get("funcionalidade", "")
    crit = achado.get("criterio_aceite", "")
    saida = []

    if tecnica == "pairwise":
        params = {k: v for k, v in _params_uteis(achado).items() if len(v) >= 2}
        if len(params) < 2:
            tecnica = _inferir_tecnica(achado, sem_pairwise=True)
        else:
            t = int(cfg.get("forca_cobertura", 2))
            nomes, linhas = ipog(params, t)
            ok, faltando, total = verificar(params, nomes, linhas, t)
            if not ok:
                raise SystemExit(
                    "ERRO: array nao cobridor para {0} (achado {1}); faltando {2} tuplas. "
                    "Nao e seguro gerar CTs.".format(func, achado.get("id"), len(faltando)))
            teto = int(cfg.get("teto_cts_por_funcionalidade", 40))
            if len(linhas) > teto:
                avisos.append(
                    "teto-excedido,{0},{1} CTs pairwise > teto {2} — cobertura mantida; "
                    "reduza o dominio dos parametros no ledger se quiser menos".format(
                        func, len(linhas), teto))
            # subconjunto de smoke: cobertura t=1, reordenado para o inicio
            idx_smoke = set(_subconjunto_t1(nomes, linhas))
            ordenadas = ([linhas[i] for i in range(len(linhas)) if i in idx_smoke] +
                         [linhas[i] for i in range(len(linhas)) if i not in idx_smoke])
            n_smoke = len(idx_smoke)
            for pos, linha in enumerate(ordenadas):
                combo = {nomes[i]: linha[i] for i in range(len(nomes))}
                no_smoke = pos < n_smoke
                saida.append({"tecnica": "pairwise", "combinacao": combo,
                              "faixa_smoke": no_smoke,
                              "cenario": nome_cenario("pairwise", crit, func, combo),
                              "observacoes": "pairwise t={0} ({1} de {2} combinacoes){3}".format(
                                  t, len(linhas), _produto(params),
                                  "" if no_smoke else " — variação de parâmetro")})
            return saida

    if tecnica == "equivalencia":
        dom = achado.get("dominio") or {}
        campo = dom.get("campo") or next(iter(_params_uteis(achado)), "campo")
        classes = []
        for valor in dom.get("validos") or []:
            classes.append(("valido", valor))
        for valor in dom.get("invalidos") or []:
            classes.append(("invalido", valor))
        for valor in dom.get("limites") or []:
            classes.append(("limite", valor))
        if dom.get("aceita_branco") is not False:
            classes.append(("branco", ""))
        if not classes:
            unico = next(iter(_params_uteis(achado).values()), [])
            classes = [("valido", v) for v in unico] or [("valido", "")]
        for classe, valor in classes:
            det = {"campo": campo, "classe": classe, "valor": valor}
            saida.append({"tecnica": "equivalencia", "combinacao": det,
                          "faixa_smoke": (classe == "valido"
                                          if cfg.get("smoke_apenas_classe_valida", True)
                                          else True),
                          "cenario": nome_cenario("equivalencia", crit, func, det),
                          "observacoes": {"valido": "Fluxo principal",
                                          "invalido": "Validacao de campo",
                                          "limite": "Analise de valor limite",
                                          "branco": "Obrigatoriedade"}[classe]})
        return saida

    if tecnica == "transicao_estado":
        for tr in achado.get("transicoes") or []:
            det = {"de": tr.get("de", ""), "para": tr.get("para", ""),
                   "evento": tr.get("evento", "transicao")}
            saida.append({"tecnica": "transicao_estado", "combinacao": det,
                          "cenario": nome_cenario("transicao_estado", crit, func, det),
                          "observacoes": tr.get("observacao") or "Transicao de estado"})
        if saida:
            return saida

    if tecnica == "tabela_decisao":
        for i, regra in enumerate(achado.get("regras") or [], 1):
            det = {"regra": regra.get("id") or "R{0}".format(i),
                   "condicoes": regra.get("condicoes") or {},
                   "resultado": regra.get("resultado", "")}
            saida.append({"tecnica": "tabela_decisao", "combinacao": det,
                          "cenario": nome_cenario("tabela_decisao", crit, func, det),
                          "observacoes": "Tabela de decisao"})
        if saida:
            return saida

    return [{"tecnica": "caso_unico", "combinacao": {},
             "cenario": nome_cenario("caso_unico", crit, func, {}),
             "observacoes": achado.get("observacao") or "-"}]


def _subconjunto_t1(nomes, linhas):
    """Indices das linhas que formam o menor subconjunto com cobertura t=1.

    t=1 significa: cada valor de cada parametro aparece ao menos uma vez. Esse
    subconjunto e o que vai para o smoke — exercita todo valor sem carregar as
    combinacoes, que ficam para a regressao. Set cover guloso: escolhe sempre a
    linha que cobre mais pares (parametro, valor) ainda descobertos, com empate
    resolvido pelo menor indice (deterministico).
    """
    restante = {(i, linha[i]) for i in range(len(nomes)) for linha in linhas}
    disponiveis = list(range(len(linhas)))
    escolhidos = []
    while restante and disponiveis:
        melhor, melhor_cov = None, 0
        for idx in disponiveis:
            cov = sum(1 for i in range(len(nomes)) if (i, linhas[idx][i]) in restante)
            if cov > melhor_cov:
                melhor_cov, melhor = cov, idx
        if melhor is None:
            break
        escolhidos.append(melhor)
        disponiveis.remove(melhor)
        for i in range(len(nomes)):
            restante.discard((i, linhas[melhor][i]))
    return escolhidos


def _produto(params):
    n = 1
    for v in params.values():
        n *= max(1, len(v))
    return n


def _inferir_tecnica(achado, sem_pairwise=False):
    params = _params_uteis(achado)
    multi = {k: v for k, v in params.items() if len(v) >= 2}
    if achado.get("transicoes"):
        return "transicao_estado"
    if achado.get("regras"):
        return "tabela_decisao"
    if achado.get("dominio"):
        return "equivalencia"
    if not sem_pairwise and len(multi) >= 2:
        return "pairwise"
    if len(multi) == 1:
        return "equivalencia"
    return "caso_unico"


# ------------------------------------------------------------------- automacao

BLOQUEIOS = ["oraculo_dificil", "massa_custosa", "dependencia_hardware",
             "ui_instavel", "requer_ambiente_especial"]
VETOS = ["layout_visual", "exploratorio"]

ROTULO_IMPEDIMENTO = {
    "layout_visual": "validação de layout/visual",
    "exploratorio": "cenário exploratório",
    "oraculo_dificil": "oráculo não assertável por código",
    "massa_custosa": "massa de teste custosa de gerar",
    "dependencia_hardware": "dependência de hardware",
    "ui_instavel": "interface instável",
    "requer_ambiente_especial": "exige ambiente fora do pipeline",
}

PESO_ESFORCO = {"API": 1, "integração": 2, "E2E": 3}
FREQUENCIA = [("@smoke", 3), ("@regressao", 2)]


def _frequencia(tags):
    for tag, peso in FREQUENCIA:
        if tag in tags:
            return peso, {"@smoke": "roda a cada build",
                          "@regressao": "roda por release"}[tag]
    return 1, "execução ad hoc"


def classificar_automacao(ct, achado, n_irmaos):
    """Nivel da piramide, esforco (proxy) e score de ROI. Ver references/automacao.md."""
    baixos = achado.get("baixos") or {}
    vetos = [k for k in VETOS if baixos.get(k)]
    bloq = achado.get("automacao") or {}
    bloqueios = [k for k in BLOQUEIOS if bloq.get(k)]

    if vetos or bloqueios:
        return {"nivel": "manual", "esforco": "-", "score": 0.0,
                "recomendado": False,
                "motivo": "; ".join(ROTULO_IMPEDIMENTO.get(k, k) for k in vetos + bloqueios),
                "vetos": vetos, "bloqueios": bloqueios}

    if achado.get("integracoes"):
        nivel = "API"
    elif ct["tecnica"] == "transicao_estado":
        nivel = "E2E"
    elif ct["tecnica"] in ("pairwise", "equivalencia", "tabela_decisao"):
        nivel = "integração"
    else:
        # caso_unico sem integracao: sem base para supor testavel abaixo da UI.
        # A suposicao conservadora e a mais caro, o que empurra o CT para baixo
        # no ranking em vez de prometer um quick win inexistente.
        nivel = "E2E"

    peso, rotulo_freq = _frequencia(ct["tags"])
    esforco = {"API": "baixo", "integração": "médio", "E2E": "alto"}[nivel]
    score = round(peso * max(1, n_irmaos) / PESO_ESFORCO[nivel], 2)
    motivo = "{0}; {1} CT(s) do mesmo fluxo; nível {2}".format(rotulo_freq, n_irmaos, nivel)
    return {"nivel": nivel, "esforco": esforco, "score": score, "recomendado": True,
            "motivo": motivo, "vetos": [], "bloqueios": []}


def aplicar_automacao(cts, achados_por_uid):
    """Anota cada CT e devolve (n_recomendados, bloqueios_coletados)."""
    irmaos = {}
    for ct in cts:
        irmaos[ct["achado_id"]] = irmaos.get(ct["achado_id"], 0) + 1
    coletados = any("automacao" in (a or {}) for a in achados_por_uid.values())
    n = 0
    for ct in cts:
        achado = achados_por_uid.get(ct["achado_id"]) or {}
        info = classificar_automacao(ct, achado, irmaos[ct["achado_id"]])
        info["bloqueios_coletados"] = coletados
        ct["automacao"] = info
        if info["recomendado"]:
            ct["tags"] = list(ct["tags"]) + ["@automatizavel"]
            n += 1
    return n, coletados


# ---------------------------------------------------------------- orquestracao

STOPWORDS = {"de", "da", "do", "das", "dos", "e", "em", "no", "na", "por", "para",
             "com", "a", "o", "as", "os", "um", "uma", "ao", "aos", "the"}


def _tokens(txt):
    """Tokens significativos truncados em 6 caracteres, para absorver plural e
    flexao: 'atendimentos' e 'atendimento' colapsam em 'atendi'."""
    return {t[:6] for t in norm(txt).split() if len(t) > 3 and t not in STOPWORDS}


def resolver_prefixo(func, cfg, pendencias, aproximacoes):
    """Resolve a sigla da funcionalidade contra o mapa `prefixos` do config.

    Quatro tentativas, da mais segura para a mais frouxa. A quarta exige um
    vencedor ESTRITO (sobreposicao maior que a do segundo colocado) e e sempre
    registrada em `aproximacoes` — mapeamento aproximado silencioso e como um CT
    aterrissa sob o prefixo errado sem ninguem notar.
    """
    prefixos = cfg.get("prefixos") or {}
    if func in prefixos:
        return prefixos[func]
    nf = norm(func)
    for chave, sigla in prefixos.items():
        if norm(chave) == nf:
            return sigla
    for chave, sigla in prefixos.items():
        nk = norm(chave)
        if nk and (nk in nf or nf in nk):
            return sigla

    tf = _tokens(func)
    if tf:
        pontos = sorted(((len(tf & _tokens(chave)), chave, sigla)
                         for chave, sigla in prefixos.items()), reverse=True)
        if pontos and pontos[0][0] > 0 and (len(pontos) == 1 or pontos[0][0] > pontos[1][0]):
            _, chave, sigla = pontos[0]
            aproximacoes.append("{0} -> {1} ({2})".format(func, sigla, chave))
            return sigla

    pendencias.append("funcionalidade-sem-prefixo,{0}".format(func))
    return None


def main(argv):
    ap = argparse.ArgumentParser(
        prog="reduce_cts.py",
        description="Ledger de achados -> CTs numerados. Fase 3 da skill matriz-de-testes.")
    ap.add_argument("--ledger", help="diretorio do ledger (contem achados/)")
    ap.add_argument("--config", help="matriz.config.json do engajamento")
    ap.add_argument("--out", help="arquivo de saida (default <ledger>/cts.jsonl)")
    args = ap.parse_args(argv)

    if not args.ledger or not args.config:
        print("reduce_cts.py — achados do ledger -> casos de teste numerados")
        print("exec: " + os.path.abspath(__file__))
        print("")
        print("uso: reduce_cts.py --ledger ledger --config matriz.config.json")
        print("")
        print("help[]:")
        print("  reduce_cts.py --ledger ledger --config matriz.config.json")
        print("  validate.py --ledger ledger --config matriz.config.json   # depois")
        return 0

    try:
        cfg = json.load(open(args.config, encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(json.dumps({"erro": "config-invalido", "detalhe": str(exc)}))
        return 1

    padrao = cfg.get("padrao_ct_id", "{PREFIXO}-CT{NNN}")
    data_ref = cfg.get("data_referencia", "")

    achados, mal_formados, arquivos = carregar_achados(args.ledger)

    if not achados:
        print("cts: count=0 — nenhum achado em {0}/achados/*.jsonl".format(args.ledger))
        print("lotes encontrados: {0}".format(len(arquivos)))
        print("help[]:")
        print("  rode a Fase 2 (subagentes de mapeamento) antes desta")
        return 1

    pendencias, avisos, aproximacoes = [], [], []
    por_prefixo = {}
    cts = []

    # ordem estavel: funcionalidade, depois id do achado
    achados.sort(key=lambda a: (norm(a.get("funcionalidade")), a["_uid"]))

    for achado in achados:
        func = achado.get("funcionalidade") or ""
        prefixo = resolver_prefixo(func, cfg, pendencias, aproximacoes)
        if not prefixo:
            continue
        nivel, disparados, por_default = prioridade(achado)
        if por_default:
            pendencias.append("prioridade-por-default,{0},{1}".format(
                achado.get("id"), func))
        for parcial in gerar(achado, cfg, avisos):
            # Um achado Alta nao transforma toda combinacao gerada em smoke: so o
            # subconjunto com cobertura t=1 fica Alta; o resto e variacao -> Media.
            # Sem isso o smoke vira a suite inteira, contrariando a Secao 2
            # ("o Smoke Test deve conter apenas o essencial").
            nivel_ct, rebaixado = nivel, False
            if nivel == "Alta" and parcial.get("faixa_smoke") is False:
                nivel_ct, rebaixado = "Média", True
            seq = por_prefixo.get(prefixo, 0) + 1
            por_prefixo[prefixo] = seq
            ct_id = padrao.replace("{PREFIXO}", prefixo).replace(
                "{NNN}", "{0:03d}".format(seq))
            cts.append({
                "ct_id": ct_id, "prefixo": prefixo, "seq": seq,
                "modulo": achado.get("modulo", ""), "funcionalidade": func,
                "cenario": parcial["cenario"], "prioridade": nivel_ct,
                "tags": TAGS[nivel_ct], "historia": achado.get("historia", ""),
                "requisito": achado.get("requisito") or [],
                "ultima_revisao": data_ref, "artefatos": "-",
                "observacoes": parcial["observacoes"],
                "tecnica": parcial["tecnica"], "combinacao": parcial["combinacao"],
                "criterio_aceite": achado.get("criterio_aceite", ""),
                "achado_id": achado["_uid"], "fonte": achado.get("fonte", ""),
                "locator": achado.get("locator", ""),
                "criterios_disparados": disparados,
                "prioridade_por_default": por_default,
                "rebaixado_de_alta": rebaixado,
                "prioridade_do_achado": nivel,
                "evidencia": achado.get("evidencia") or {},
            })

    n_auto, bloq_coletados = 0, False
    if cfg.get("recomendar_automacao"):
        achados_por_uid = {a["_uid"]: a for a in achados}
        n_auto, bloq_coletados = aplicar_automacao(cts, achados_por_uid)

    out = args.out or os.path.join(args.ledger, "cts.jsonl")
    with open(out, "w", encoding="utf-8") as fh:
        for ct in cts:
            fh.write(json.dumps(ct, ensure_ascii=False) + "\n")

    n_alta = sum(1 for c in cts if c["prioridade"] == "Alta")
    por_tec = {}
    for c in cts:
        por_tec[c["tecnica"]] = por_tec.get(c["tecnica"], 0) + 1

    n_smoke = sum(1 for c in cts if "@smoke" in c["tags"])
    n_rebaixados = sum(1 for c in cts if c.get("rebaixado_de_alta"))
    print("cts: count={0} alta={1} media={2} baixa={3} funcionalidades={4} achados={5}".format(
        len(cts), n_alta,
        sum(1 for c in cts if c["prioridade"] == "Média"),
        sum(1 for c in cts if c["prioridade"] == "Baixa"),
        len(por_prefixo), len(achados)))
    print("suites: smoke={0} regressao={1} rebaixados_de_alta={2}".format(
        n_smoke, sum(1 for c in cts if "@regressao" in c["tags"]), n_rebaixados))
    if cfg.get("recomendar_automacao"):
        por_nivel = {}
        for c in cts:
            nv = (c.get("automacao") or {}).get("nivel", "?")
            por_nivel[nv] = por_nivel.get(nv, 0) + 1
        print("automacao: recomendados={0} manual={1} bloqueios={2}".format(
            n_auto, por_nivel.get("manual", 0),
            "coletados" if bloq_coletados else "NAO COLETADOS (Fase 2 sem o campo)"))
        print("nivel[{0}]{{nivel,cts}}:".format(len(por_nivel)))
        for k in sorted(por_nivel):
            print("  {0},{1}".format(k, por_nivel[k]))
    print("tecnica[{0}]{{tecnica,cts}}:".format(len(por_tec)))
    for k in sorted(por_tec):
        print("  {0},{1}".format(k, por_tec[k]))
    print("prefixo[{0}]{{prefixo,cts}}:".format(len(por_prefixo)))
    for k in sorted(por_prefixo):
        print("  {0},{1}".format(k, por_prefixo[k]))
    print("saida: " + out)
    if mal_formados:
        print("jsonl-mal-formado[{0}]: {1}".format(len(mal_formados), "; ".join(mal_formados[:10])))
    if aproximacoes:
        print("prefixo-por-aproximacao[{0}]{{funcionalidade,sigla,chave-do-config}}:".format(
            len(aproximacoes)))
        for ap in aproximacoes[:25]:
            print("  " + ap.replace(",", ";"))
        print("  CONFIRME cada linha acima: o nome no ledger nao e identico ao do config.")
    if pendencias:
        print("pendencias[{0}]{{tipo,detalhe}}:".format(len(pendencias)))
        for p in pendencias[:25]:
            print("  " + p)
    if avisos:
        print("avisos[{0}]:".format(len(avisos)))
        for a in avisos[:25]:
            print("  " + a)
    if not pendencias and not avisos:
        print("pendencias[0]: nenhuma")
    print("help[]:")
    if not cts:
        print("  nenhum CT gerado a partir de {0} achado(s): preencha 'prefixos' no config".format(
            len(achados)))
        print("  as funcionalidades listadas em pendencias[] sao os nomes vistos no ledger")
        return 1
    print("  render_matriz.py --ledger {0} --config {1} --out saida".format(
        args.ledger, args.config))
    print("  validate.py --ledger {0} --config {1}".format(args.ledger, args.config))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
