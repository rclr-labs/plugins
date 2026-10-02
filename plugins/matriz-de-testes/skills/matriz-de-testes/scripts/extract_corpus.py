#!/usr/bin/env python3
"""Fase 1 do pipeline matriz-de-testes: corpus de documentos -> markdown numerado.

Nenhum LLM envolvido. Deterministico e reexecutavel.
Saida: <out>/docs/<slug>.md (uma linha por linha de origem, prefixada LNNN:)
       <out>/manifest.toon (inventario com agregados pre-computados)
"""
import argparse
import hashlib
import html
import json
import os
import re
import subprocess
import sys
import unicodedata
import zipfile
import xml.etree.ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
S = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
PKG_R = "{http://schemas.openxmlformats.org/package/2006/relationships}"

SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", ".next", "dist", "build"}
SKIP_NAMES = {".DS_Store", "Thumbs.db"}
BINARY_MEDIA = {".mp4", ".mov", ".avi", ".mkv", ".mp3", ".wav", ".m4a", ".png", ".jpg",
                ".jpeg", ".gif", ".svg", ".webp", ".ico", ".zip", ".gz", ".tar", ".xlsb",
                ".ttf", ".otf", ".woff", ".woff2", ".pyc", ".so", ".dylib"}
TEXTISH = {".md", ".txt", ".csv", ".tsv", ".json", ".yaml", ".yml", ".log", ".rst", ".adoc"}


class Unparseable(Exception):
    """Fonte reconhecida mas nao extraivel. Vira uma linha no manifest, nunca silencio."""


# ---------------------------------------------------------------- extratores

def _para(p):
    return "".join(t.text or "" for t in p.iter(W + "t"))


def _docx_blocks(el, out):
    for child in el:
        tag = child.tag
        if tag == W + "p":
            out.append(_para(child))
        elif tag == W + "tbl":
            for tr in child.findall(W + "tr"):
                cells = []
                for tc in tr.findall(W + "tc"):
                    cells.append(" ".join(_para(p) for p in tc.findall(W + "p")).strip())
                out.append("| " + " | ".join(cells) + " |")
        elif tag in (W + "sdt", W + "sdtContent"):
            _docx_blocks(child, out)


def from_docx(path):
    with zipfile.ZipFile(path) as z:
        if "word/document.xml" not in z.namelist():
            raise Unparseable("docx-sem-document.xml")
        root = ET.fromstring(z.read("word/document.xml"))
    body = root.find(W + "body")
    if body is None:
        raise Unparseable("docx-sem-body")
    lines = []
    _docx_blocks(body, lines)
    return "\n".join(lines)


def from_xlsx(path):
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        strings = []
        if "xl/sharedStrings.xml" in names:
            sroot = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in sroot:
                strings.append("".join(t.text or "" for t in si.iter(S + "t")))
        if "xl/workbook.xml" not in names:
            raise Unparseable("xlsx-sem-workbook.xml")
        wb = ET.fromstring(z.read("xl/workbook.xml"))
        rels = {}
        if "xl/_rels/workbook.xml.rels" in names:
            rroot = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
            for rel in rroot:
                rels[rel.get("Id")] = rel.get("Target")
        out = []
        sheets = wb.find(S + "sheets")
        for sheet in (sheets if sheets is not None else []):
            title = sheet.get("name") or "sheet"
            target = rels.get(sheet.get(R + "id"), "")
            member = ("xl/" + target.lstrip("/")) if target else ""
            if member not in names:
                continue
            out.append("")
            out.append("## Aba: " + title)
            sroot = ET.fromstring(z.read(member))
            data = sroot.find(S + "sheetData")
            for row in (data if data is not None else []):
                cells = []
                for c in row.findall(S + "c"):
                    ctype = c.get("t")
                    if ctype == "inlineStr":
                        inline = c.find(S + "is")
                        val = "".join(t.text or "" for t in inline.iter(S + "t")) if inline is not None else ""
                    else:
                        v = c.find(S + "v")
                        val = v.text or "" if v is not None else ""
                        if ctype == "s" and val.isdigit():
                            idx = int(val)
                            val = strings[idx] if idx < len(strings) else ""
                    cells.append(val.strip())
                while cells and not cells[-1]:
                    cells.pop()
                if cells:
                    out.append("| " + " | ".join(cells) + " |")
    return "\n".join(out)


def from_pptx(path):
    with zipfile.ZipFile(path) as z:
        slides = sorted(
            (n for n in z.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", n)),
            key=lambda n: int(re.search(r"(\d+)", n.rsplit("/", 1)[1]).group(1)),
        )
        if not slides:
            raise Unparseable("pptx-sem-slides")
        out = []
        for n in slides:
            num = re.search(r"(\d+)", n.rsplit("/", 1)[1]).group(1)
            out.append("")
            out.append("## Slide " + num)
            root = ET.fromstring(z.read(n))
            for p in root.iter(A + "p"):
                text = "".join(t.text or "" for t in p.iter(A + "t")).strip()
                if text:
                    out.append(text)
    return "\n".join(out)


def from_pdf(path):
    try:
        res = subprocess.run(["pdftotext", "-layout", path, "-"],
                             capture_output=True, text=True, timeout=120)
    except FileNotFoundError:
        raise Unparseable("pdf-sem-pdftotext")
    except subprocess.TimeoutExpired:
        raise Unparseable("pdf-timeout")
    if res.returncode != 0:
        raise Unparseable("pdf-erro-pdftotext")
    if len(res.stdout.strip()) < 20:
        raise Unparseable("pdf-provavelmente-escaneado")
    return res.stdout


def from_html(path):
    raw = open(path, encoding="utf-8", errors="replace").read()
    raw = re.sub(r"(?is)<(script|style|head)\b.*?</\1>", " ", raw)
    raw = re.sub(r"(?i)</(p|div|tr|li|h[1-6]|br)\s*/?>", "\n", raw)
    raw = re.sub(r"(?i)</t[dh]>", " | ", raw)
    raw = re.sub(r"<[^>]+>", "", raw)
    raw = html.unescape(raw)
    return "\n".join(ln.strip() for ln in raw.splitlines())


def from_text(path):
    return open(path, encoding="utf-8", errors="replace").read()


EXTRACTORS = {".docx": from_docx, ".xlsx": from_xlsx, ".pptx": from_pptx,
              ".pdf": from_pdf, ".html": from_html, ".htm": from_html}


# ---------------------------------------------------------------- utilitarios

def slugify(relpath):
    base = relpath.replace(os.sep, "__")
    base = unicodedata.normalize("NFKD", base).encode("ascii", "ignore").decode()
    base = re.sub(r"[^A-Za-z0-9._-]+", "-", base).strip("-")
    stem = base.rsplit(".", 1)[0] if "." in base else base
    return (stem[:110] or "doc")


def clean(text):
    lines = [re.sub(r"[ \t]+", " ", ln).rstrip() for ln in text.replace("\r\n", "\n").split("\n")]
    out, blanks = [], 0
    for ln in lines:
        if ln:
            blanks = 0
            out.append(ln)
        else:
            blanks += 1
            if blanks == 1:
                out.append("")
    while out and not out[0]:
        out.pop(0)
    while out and not out[-1]:
        out.pop()
    return out


def toon_cell(v):
    return str(v).replace(",", ";").replace("\n", " ")


def main(argv):
    ap = argparse.ArgumentParser(
        prog="extract_corpus.py",
        description="Converte um corpus de documentos em markdown numerado por linha, "
                    "com manifest de inventario. Fase 1 da skill matriz-de-testes.")
    ap.add_argument("entrada", nargs="?", help="diretorio (ou arquivo) de origem")
    ap.add_argument("--out", help="diretorio de saida do corpus extraido")
    ap.add_argument("--limite-docs", type=int, default=0,
                    help="processa no maximo N documentos (0 = sem limite)")
    ap.add_argument("--max-chars", type=int, default=400_000,
                    help="truncagem por documento (default 400000)")
    args = ap.parse_args(argv)

    if not args.entrada or not args.out:
        print("extract_corpus.py — corpus de documentos -> markdown numerado + manifest")
        print("exec: " + os.path.abspath(__file__))
        print("")
        print("uso: extract_corpus.py <dir-entrada> --out <dir-corpus> [--limite-docs N]")
        print("formatos: docx xlsx pptx pdf html md txt csv tsv json yaml log")
        print("")
        print("help[]:")
        print("  extract_corpus.py ./documentos --out corpus")
        print("  extract_corpus.py ./documentos --out corpus --limite-docs 20   # amostra")
        return 0

    root = os.path.abspath(args.entrada)
    if not os.path.exists(root):
        print(json.dumps({"erro": "entrada-inexistente", "caminho": root}))
        return 1
    outdir = os.path.abspath(args.out)
    docsdir = os.path.join(outdir, "docs")
    os.makedirs(docsdir, exist_ok=True)

    candidates = []
    if os.path.isfile(root):
        candidates.append((os.path.basename(root), root))
        root = os.path.dirname(root)
    else:
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS and not d.startswith("."))
            for fn in sorted(filenames):
                if fn in SKIP_NAMES or fn.startswith("~$") or fn.startswith("."):
                    continue
                full = os.path.join(dirpath, fn)
                candidates.append((os.path.relpath(full, root), full))

    candidates.sort(key=lambda p: p[0])
    if args.limite_docs:
        candidates = candidates[: args.limite_docs]

    rows, used_slugs = [], {}
    n_parsed = n_unparseable = total_chars = 0

    for relpath, full in candidates:
        ext = os.path.splitext(relpath)[1].lower()
        row = {"file": relpath, "type": ext.lstrip(".") or "sem-ext", "chars": 0,
               "status": "", "slug": ""}
        try:
            if ext in BINARY_MEDIA:
                raise Unparseable("midia-binaria")
            if ext in EXTRACTORS:
                text = EXTRACTORS[ext](full)
            elif ext in TEXTISH:
                text = from_text(full)
            else:
                raise Unparseable("extensao-nao-suportada")
            lines = clean(text)
            if not lines:
                raise Unparseable("documento-vazio")
            truncated = False
            if sum(len(x) for x in lines) > args.max_chars:
                acc, kept = 0, []
                for ln in lines:
                    acc += len(ln) + 1
                    if acc > args.max_chars:
                        truncated = True
                        break
                    kept.append(ln)
                lines = kept
            width = max(3, len(str(len(lines))))
            numbered = ["L{0:0{1}d}: {2}".format(i, width, ln) for i, ln in enumerate(lines, 1)]
            header = ["<!-- fonte: " + relpath + " -->",
                      "<!-- linhas: " + str(len(lines)) +
                      (" (TRUNCADO em --max-chars) -->" if truncated else " -->"), ""]
            slug = slugify(relpath)
            used_slugs[slug] = used_slugs.get(slug, 0) + 1
            if used_slugs[slug] > 1:
                slug = "{0}-{1}".format(slug, used_slugs[slug])
            body = "\n".join(header + numbered) + "\n"
            with open(os.path.join(docsdir, slug + ".md"), "w", encoding="utf-8") as fh:
                fh.write(body)
            row.update(chars=sum(len(x) for x in lines), slug=slug,
                       status="truncated" if truncated else "parsed")
            n_parsed += 1
            total_chars += row["chars"]
        except Unparseable as exc:
            row.update(status="unparseable:" + str(exc), slug="-")
            n_unparseable += 1
        except Exception as exc:  # erro inesperado tambem fica visivel no manifest
            row.update(status="unparseable:erro-" + type(exc).__name__, slug="-")
            n_unparseable += 1
        rows.append(row)

    digest = hashlib.sha256(
        "".join(r["file"] + r["status"] for r in rows).encode()).hexdigest()[:12]

    manifest = os.path.join(outdir, "manifest.toon")
    with open(manifest, "w", encoding="utf-8") as fh:
        if not rows:
            fh.write("corpus: totalDocs=0 parsed=0 unparseable=0 chars=0\n")
            fh.write("docs[0]{slug,file,type,chars,status}: (nenhum documento encontrado)\n")
        else:
            fh.write("corpus: totalDocs={0} parsed={1} unparseable={2} chars={3} raiz={4} hash={5}\n".format(
                len(rows), n_parsed, n_unparseable, total_chars, root, digest))
            fh.write("docs[{0}]{{slug,file,type,chars,status}}:\n".format(len(rows)))
            for r in rows:
                fh.write("  {0},{1},{2},{3},{4}\n".format(
                    toon_cell(r["slug"]), toon_cell(r["file"]), r["type"], r["chars"],
                    toon_cell(r["status"])))

    with open(os.path.join(outdir, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump({"raiz": root, "totalDocs": len(rows), "parsed": n_parsed,
                   "unparseable": n_unparseable, "chars": total_chars, "hash": digest,
                   "docs": rows}, fh, ensure_ascii=False, indent=1)

    if not rows:
        print("corpus: totalDocs=0 — nenhum documento encontrado em " + root)
        print("help[]:")
        print("  verifique o caminho, ou use --limite-docs 0 sem filtros")
        return 1

    print("corpus: totalDocs={0} parsed={1} unparseable={2} chars={3}".format(
        len(rows), n_parsed, n_unparseable, total_chars))
    print("saida: " + docsdir)
    print("manifest: " + manifest)
    if n_unparseable:
        print("unparseable[{0}]{{file,motivo}}:".format(n_unparseable))
        for r in rows:
            if r["status"].startswith("unparseable"):
                print("  {0},{1}".format(toon_cell(r["file"]), r["status"].split(":", 1)[1]))
    print("help[]:")
    print("  Fase 2: despache subagentes de mapeamento sobre " + docsdir)
    print("  os nao-parseaveis acima precisam de tratamento manual (transcricao/OCR)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
