// Git plumbing: resolve a review target, parse a unified diff, and gather the
// cheap metadata the review bundle needs. No third-party dependencies.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const MAX_BUFFER = 96 * 1024 * 1024;
const SOURCE_EXT = new Set([
  ".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".mts", ".cts",
  ".py", ".rb", ".go", ".rs", ".java", ".kt", ".kts", ".scala",
  ".c", ".h", ".cc", ".cpp", ".hpp", ".cs", ".php", ".swift",
  ".sh", ".bash", ".zsh", ".ps1", ".sql", ".graphql", ".gql",
  ".vue", ".svelte", ".astro", ".lua", ".ex", ".exs", ".dart",
]);

const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

export function git(args, cwd, opts = {}) {
  const res = spawnSync(
    "git",
    ["-c", "core.quotePath=false", "-c", "color.ui=false", ...args],
    {
      cwd,
      encoding: "utf8",
      maxBuffer: opts.maxBuffer || MAX_BUFFER,
      timeout: opts.timeout || 20000,
      env: {
        ...process.env,
        GIT_PAGER: "cat",
        GIT_EXTERNAL_DIFF: "",
        GIT_TERMINAL_PROMPT: "0",
      },
    },
  );
  return {
    ok: res.status === 0,
    status: res.status,
    stdout: res.stdout || "",
    stderr: res.stderr || "",
  };
}

export function findRepoRoot(cwd) {
  const r = git(["rev-parse", "--show-toplevel"], cwd);
  if (!r.ok) return null;
  return r.stdout.trim() || null;
}

export function headRef(repo) {
  const r = git(["rev-parse", "--short", "HEAD"], repo);
  return r.ok ? r.stdout.trim() : "(sem HEAD)";
}

export function defaultBaseRef(repo) {
  const sym = git(["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"], repo);
  if (sym.ok && sym.stdout.trim()) {
    return sym.stdout.trim().replace(/^refs\/remotes\//, "");
  }
  for (const cand of ["origin/main", "origin/master", "main", "master", "trunk", "develop"]) {
    if (git(["rev-parse", "--verify", "--quiet", cand], repo).ok) return cand;
  }
  return null;
}

export function mergeBase(repo, ref) {
  const r = git(["merge-base", "HEAD", ref], repo);
  if (r.ok && r.stdout.trim()) return r.stdout.trim();
  const s = git(["rev-parse", "--verify", ref], repo);
  return s.ok ? s.stdout.trim() : EMPTY_TREE;
}

// Collect the raw diff for a target. Returns { diffText, base, head, mode, pr }.
export function getDiff(repo, opts = {}) {
  const mode = opts.mode || "branch";
  let base = null;
  let head = "WORKTREE";
  let diffText = "";
  let pr = opts.pr || null;

  if (opts.diffFile) {
    diffText = fs.readFileSync(path.resolve(opts.diffFile), "utf8");
    base = opts.base || "(diff externo)";
    head = "(diff externo)";
    return { diffText, base, head, mode: "file", pr: null };
  }

  if (mode === "pr") {
    const gh = spawnSync("gh", ["pr", "diff", String(pr), "--patch"], {
      cwd: repo, encoding: "utf8", maxBuffer: MAX_BUFFER, timeout: 30000,
    });
    if (gh.status !== 0) {
      throw new Error("gh pr diff falhou: " + ((gh.stderr || "").trim().split("\n")[0] || "gh nao autenticado?"));
    }
    diffText = gh.stdout || "";
    const meta = spawnSync("gh", ["pr", "view", String(pr), "--json", "baseRefName,headRefName,title"], {
      cwd: repo, encoding: "utf8", maxBuffer: 4 * 1024 * 1024, timeout: 20000,
    });
    let info = null;
    try { info = JSON.parse(meta.stdout || "{}"); } catch { info = null; }
    base = info && info.baseRefName ? "origin/" + info.baseRefName : "(PR base)";
    head = info && info.headRefName ? info.headRefName : "(PR head)";
    return { diffText, base, head, mode: "pr", pr, prTitle: info && info.title ? info.title : null };
  }

  if (mode === "range") {
    if (!opts.range) throw new Error("--range exige A..B");
    base = opts.range.split("..")[0] || "(inicio)";
    head = opts.range.split("..")[1] || "HEAD";
    const r = git(["diff", "--no-color", "--no-ext-diff", opts.range], repo);
    if (!r.ok) throw new Error("git diff " + opts.range + ": " + firstLine(r.stderr));
    diffText = r.stdout;
    return { diffText, base, head, mode: "range", pr: null };
  }

  if (mode === "staged") {
    base = "HEAD";
    head = "INDEX";
    const r = git(["diff", "--cached", "--no-color", "--no-ext-diff"], repo);
    if (!r.ok) throw new Error("git diff --cached: " + firstLine(r.stderr));
    diffText = r.stdout;
    return { diffText, base, head, mode, pr: null };
  }

  if (mode === "working") {
    base = "HEAD";
    head = "WORKTREE";
    const r = git(["diff", "HEAD", "--no-color", "--no-ext-diff"], repo);
    if (!r.ok) throw new Error("git diff HEAD: " + firstLine(r.stderr));
    diffText = r.stdout;
    diffText += untrackedDiff(repo);
    return { diffText, base, head, mode, pr: null };
  }

  // branch: committed on the branch + staged + unstaged, against merge-base.
  const ref = opts.base || defaultBaseRef(repo);
  base = ref ? mergeBase(repo, ref) : EMPTY_TREE;
  const r = git(["diff", base, "--no-color", "--no-ext-diff"], repo);
  if (!r.ok) throw new Error("git diff " + base + ": " + firstLine(r.stderr));
  diffText = r.stdout;
  diffText += untrackedDiff(repo);
  return { diffText, base, baseRef: ref || "(arvore vazia)", head, mode: "branch", pr: null };
}

function untrackedDiff(repo) {
  const r = git(["ls-files", "--others", "--exclude-standard"], repo);
  if (!r.ok) return "";
  const files = r.stdout.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 20);
  let out = "";
  for (const rel of files) {
    const abs = path.join(repo, rel);
    try {
      const st = fs.statSync(abs);
      if (!st.isFile() || st.size > 1024 * 1024) continue;
      const buf = fs.readFileSync(abs);
      if (buf.includes(0)) continue;
      const d = spawnSync("git", ["diff", "--no-index", "--no-color", "--", "/dev/null", rel], {
        cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024, timeout: 10000,
      });
      if (d.stdout) out += d.stdout;
    } catch { /* ignore unreadable untracked file */ }
  }
  return out;
}

function firstLine(s) {
  return (s || "").trim().split("\n")[0] || "erro desconhecido";
}

function unquote(s) {
  let v = String(s || "").trim();
  if (v.startsWith("\"") && v.endsWith("\"")) {
    try { return JSON.parse(v); } catch { return v.slice(1, -1); }
  }
  return v;
}

function stripPrefix(s) {
  let v = unquote(s);
  if (v.startsWith("a/") || v.startsWith("b/")) v = v.slice(2);
  return v;
}

const HUNK_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

// Parse a unified diff into files, hunks and added lines (with new line numbers).
export function parseDiff(text) {
  const lines = String(text || "").split("\n");
  const files = [];
  const addedLines = [];
  let cur = null;
  let inHunk = false;
  let newLine = 0;
  let oldLine = 0;

  const close = () => {
    if (!cur) return;
    cur.path = cur.newPath || cur.oldPath || "";
    if (!cur.status) cur.status = "M";
    if (cur.oldPath === "/dev/null") cur.oldPath = null;
    if (cur.newPath === "/dev/null") cur.newPath = null;
    if (cur.oldPath && cur.newPath && cur.oldPath !== cur.newPath && cur.status === "M") {
      cur.status = "R";
    }
    if (cur.path) files.push(cur);
    cur = null;
    inHunk = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (ln.startsWith("diff --git ")) {
      close();
      cur = {
        lines: [ln], oldPath: null, newPath: null, status: null,
        binary: false, added: 0, deleted: 0, hunks: [],
      };
      inHunk = false;
      continue;
    }
    if (!cur) continue;
    cur.lines.push(ln);

    if (ln.startsWith("new file mode")) { cur.status = "A"; inHunk = false; continue; }
    if (ln.startsWith("deleted file mode")) { cur.status = "D"; inHunk = false; continue; }
    if (ln.startsWith("rename from ")) { cur.oldPath = unquote(ln.slice(12)); if (cur.status === null) cur.status = "R"; inHunk = false; continue; }
    if (ln.startsWith("rename to ")) { cur.newPath = unquote(ln.slice(10)); if (cur.status === null) cur.status = "R"; inHunk = false; continue; }
    if (ln.startsWith("--- ")) { const p = stripPrefix(ln.slice(4)); if (p !== "/dev/null") cur.oldPath = p; inHunk = false; continue; }
    if (ln.startsWith("+++ ")) { const p = stripPrefix(ln.slice(4)); if (p !== "/dev/null") cur.newPath = p; inHunk = false; continue; }
    if (ln.startsWith("Binary files ")) { cur.binary = true; inHunk = false; continue; }

    const hm = HUNK_RE.exec(ln);
    if (hm) {
      oldLine = Number(hm[1]);
      newLine = Number(hm[3]);
      inHunk = true;
      cur.hunks.push({ header: ln, lines: [ln], newStart: newLine, oldStart: oldLine });
      continue;
    }

    if (!inHunk) continue;

    const h = cur.hunks[cur.hunks.length - 1];
    if (h) h.lines.push(ln);

    if (ln.startsWith("+")) {
      cur.added++;
      addedLines.push({ path: cur.newPath || cur.oldPath || "", line: newLine, text: ln.slice(1) });
      newLine++;
    } else if (ln.startsWith("-")) {
      cur.deleted++;
      oldLine++;
    } else if (ln.startsWith(" ")) {
      newLine++;
      oldLine++;
    } else if (ln.startsWith("\\")) {
      // "\ No newline at end of file"
    } else {
      inHunk = false;
    }
  }
  close();
  return { files, addedLines };
}

export function statusOf(f) {
  return f.status || "M";
}

export function readAt(repo, rel, rev) {
  const safeRel = String(rel || "").replace(/^\/+/, "");
  if (!safeRel) return null;
  if (!rev || rev === "WORKTREE" || rev === "INDEX") {
    const abs = path.join(repo, safeRel);
    try {
      const st = fs.statSync(abs);
      if (st.isFile()) return fs.readFileSync(abs, "utf8");
    } catch { /* fall through to git */ }
  }
  if (rev && rev !== "WORKTREE" && rev !== "INDEX" && rev !== "(diff externo)") {
    const r = git(["show", rev + ":" + safeRel], repo);
    if (r.ok) return r.stdout;
  }
  const h = git(["show", "HEAD:" + safeRel], repo);
  return h.ok ? h.stdout : null;
}

export function isBinaryText(text) {
  if (!text) return false;
  const sample = text.slice(0, 8000);
  return sample.includes("\u0000");
}

export function isSourcePath(p) {
  const dot = p.lastIndexOf(".");
  return dot >= 0 && SOURCE_EXT.has(p.slice(dot).toLowerCase());
}

export function isTestPath(p) {
  const low = p.toLowerCase();
  return /(^|\/)(tests?|__tests__|specs?)\//.test(low) ||
    /\.(test|spec)\.[a-z0-9]+$/.test(low) ||
    /(^|\/)test_[^/]+\.py$/.test(low) ||
    /_test\.(go|py|rb)$/.test(low) ||
    /(^|\/)conftest\.py$/.test(low);
}

export function isDocPath(p) {
  const low = p.toLowerCase();
  return /\.(md|mdx|rst|txt|adoc)$/.test(low) || /(^|\/)docs?\//.test(low);
}

export function isConfigPath(p) {
  const low = p.toLowerCase();
  const base = low.split("/").pop();
  return [
    "package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb",
    "pyproject.toml", "requirements.txt", "poetry.lock", "go.mod", "go.sum",
    "cargo.toml", "cargo.lock", "composer.json", "composer.lock", "gemfile", "gemfile.lock",
    ".env", ".env.example", "dockerfile", "docker-compose.yml", "makefile",
  ].includes(base) || /\.(ya?ml|toml|ini|cfg|conf)$/.test(low) ||
    low.includes(".github/workflows/") || low.startsWith("terraform/");
}

export function classifyRisk(p) {
  const low = p.toLowerCase();
  if (isTestPath(low)) return "low";
  if (isDocPath(low)) return "low";
  if (/(auth|login|session|oauth|jwt|permission|acl|rbac|security|crypto|tls|cert)/.test(low)) return "high";
  if (/(migration|schema|database|db\/|models\/|\.sql$)/.test(low)) return "high";
  if (/(route|controller|handler|api\/|endpoint|graphql|openapi|swagger)/.test(low)) return "high";
  if (isConfigPath(low)) return "medium";
  if (/(infra|terraform|k8s|helm|deploy)/.test(low)) return "medium";
  return "normal";
}

const JS_IMPORT_RE = /(?:from\s*|require\s*\(\s*|import\s*\(\s*)["']([^"']+)["']/g;
const JS_SIDE_RE = /(?:^|\n)\s*import\s+["']([^"']+)["']/g;
const PY_FROM_RE = /^\s*from\s+([.\w]+)\s+import\b/gm;
const PY_IMPORT_RE = /^\s*import\s+([\w.]+)/gm;

export function importSpecs(text, file) {
  const out = [];
  const ext = path.extname(file).toLowerCase();
  let m;
  if ([".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".mts", ".cts", ".vue", ".svelte", ".astro"].includes(ext)) {
    JS_IMPORT_RE.lastIndex = 0;
    while ((m = JS_IMPORT_RE.exec(text))) out.push(m[1]);
    JS_SIDE_RE.lastIndex = 0;
    while ((m = JS_SIDE_RE.exec(text))) out.push(m[1]);
  } else if (ext === ".py") {
    PY_FROM_RE.lastIndex = 0;
    while ((m = PY_FROM_RE.exec(text))) out.push(m[1]);
    PY_IMPORT_RE.lastIndex = 0;
    while ((m = PY_IMPORT_RE.exec(text))) out.push(m[1]);
  }
  return out;
}

const EXTS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".json", ".vue", ".svelte", ".py", ".rb", ".go", ".rs", ".java", ".kt", ".php", ".swift"];

export function resolveImport(repo, fromFile, spec) {
  const clean = String(spec || "").split("?")[0];
  if (!clean) return null;

  if (clean.startsWith(".")) {
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), clean));
    const candidates = [base];
    for (const e of EXTS) candidates.push(base + e);
    for (const e of EXTS) candidates.push(path.posix.join(base, "index" + e));
    for (const c of candidates) {
      const abs = path.join(repo, c);
      try { if (fs.statSync(abs).isFile()) return c.replace(/^\.\//, ""); } catch { /* next */ }
    }
    return null;
  }

  if (fromFile.endsWith(".py")) {
    const dots = (clean.match(/^\.+/) || [""])[0].length;
    if (dots > 0) {
      const rest = clean.slice(dots).replace(/\./g, "/");
      let base = path.posix.dirname(fromFile);
      for (let i = 1; i < dots; i++) base = path.posix.dirname(base);
      const p = path.posix.join(base, rest);
      for (const c of [p + ".py", path.posix.join(p, "__init__.py")]) {
        try { if (fs.statSync(path.join(repo, c)).isFile()) return c; } catch { /* next */ }
      }
    }
    return null;
  }
  return null;
}

export function collectImports(repo, files, changedSet, cap = 30) {
  const out = [];
  const seen = new Set();
  for (const f of files) {
    if (!isSourcePath(f.path)) continue;
    const text = readAt(repo, f.path, f.status === "D" ? "HEAD" : "WORKTREE");
    if (!text || isBinaryText(text)) continue;
    for (const spec of importSpecs(text, f.path)) {
      const resolved = resolveImport(repo, f.path, spec);
      if (!resolved || changedSet.has(resolved) || seen.has(resolved)) continue;
      seen.add(resolved);
      out.push(resolved);
      if (out.length >= cap) return out;
    }
  }
  return out;
}

const SYMBOL_PATTERNS = [
  /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/,
  /(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\(|function)/,
  /(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/,
  /(?:async\s+)?def\s+([A-Za-z_]\w*)/,
  /func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)/,
  /interface\s+([A-Za-z_$][\w$]*)/,
  /type\s+([A-Za-z_$][\w$]*)\s*=/,
];

const SYMBOL_NOISE = new Set([
  "if", "for", "while", "switch", "catch", "return", "constructor", "main",
  "init", "render", "handler", "get", "set", "run", "create", "update", "delete",
  "process", "handle", "apply", "start", "stop", "load", "save", "new", "test",
  "describe", "it", "expect", "mock", "default", "index", "value", "data",
  "offset", "page", "size", "limit", "rows", "row", "total", "term", "claims",
  "config", "result", "response", "request", "error", "item", "count", "length",
  "user", "users", "payload", "params", "options", "context",
]);

export function changedSymbols(addedLines, cap = 12) {
  const out = [];
  const seen = new Set();
  for (const rec of addedLines) {
    const raw = rec.text || "";
    const text = raw.trim();
    if (!text || text.startsWith("//") || text.startsWith("#")) continue;
    for (const re of SYMBOL_PATTERNS) {
      const m = re.exec(text);
      if (!m) continue;
      const name = m[1];
      if (!name || name.length < 4 || SYMBOL_NOISE.has(name.toLowerCase()) || seen.has(name)) continue;
      const localConst = re === SYMBOL_PATTERNS[1] && raw !== text && !/^export\b/.test(text);
      if (localConst) continue;
      seen.add(name);
      out.push(name);
      break;
    }
    if (out.length >= cap) break;
  }
  return out;
}

export function callSiteCounts(repo, symbols) {
  const counts = new Map();
  for (const s of symbols) counts.set(s, { count: 0, files: new Set() });
  if (!symbols.length) return counts;
  const args = ["grep", "-n", "-w", "-F", "--no-color", "--max-count", "200"];
  for (const s of symbols) args.push("-e", s);
  const r = git(args, repo, { timeout: 6000 });
  if (!r.ok) return counts;
  const rows = r.stdout.split("\n").slice(0, 400);
  for (const row of rows) {
    if (!row) continue;
    const first = row.indexOf(":");
    const second = row.indexOf(":", first + 1);
    if (first < 0 || second < 0) continue;
    const file = row.slice(0, first);
    const text = row.slice(second + 1);
    for (const s of symbols) {
      if (new RegExp("(^|[^A-Za-z0-9_$])" + escapeRe(s) + "([^A-Za-z0-9_$]|$)").test(text)) {
        const rec = counts.get(s);
        rec.count++;
        rec.files.add(file);
      }
    }
  }
  return counts;
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
}

export function detectTestCommand(repo) {
  const pkgPath = path.join(repo, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const test = pkg && pkg.scripts && pkg.scripts.test;
      if (test && !/no test specified/i.test(test)) {
        let pm = "npm";
        if (fs.existsSync(path.join(repo, "pnpm-lock.yaml"))) pm = "pnpm";
        else if (fs.existsSync(path.join(repo, "yarn.lock"))) pm = "yarn";
        else if (fs.existsSync(path.join(repo, "bun.lockb"))) pm = "bun";
        return pm === "npm" ? "npm test" : pm + " test";
      }
    } catch { /* ignore invalid package.json */ }
  }
  if (fs.existsSync(path.join(repo, "pyproject.toml")) || fs.existsSync(path.join(repo, "pytest.ini"))) return "pytest -q";
  if (fs.existsSync(path.join(repo, "go.mod"))) return "go test ./...";
  if (fs.existsSync(path.join(repo, "Cargo.toml"))) return "cargo test";
  if (fs.existsSync(path.join(repo, "composer.json"))) return "composer test";
  const mk = path.join(repo, "Makefile");
  if (fs.existsSync(mk)) {
    try { if (/^test:/m.test(fs.readFileSync(mk, "utf8"))) return "make test"; } catch { /* ignore */ }
  }
  return null;
}

export function relatedTests(repo, files, cap = 8) {
  const out = [];
  const seen = new Set();
  for (const f of files) {
    if (!isSourcePath(f.path)) continue;
    const dir = path.posix.dirname(f.path);
    const base = path.posix.basename(f.path);
    const ext = path.posix.extname(base);
    const stem = base.slice(0, base.length - ext.length);
    const candidates = [];
    if (isTestPath(f.path)) candidates.push(f.path);
    for (const e of [ext, ".ts", ".tsx", ".js", ".jsx"]) {
      candidates.push(path.posix.join(dir, stem + ".test" + e));
      candidates.push(path.posix.join(dir, stem + ".spec" + e));
      candidates.push(path.posix.join(dir, "__tests__", stem + ".test" + e));
    }
    candidates.push(path.posix.join("tests", stem + ".test" + ext));
    candidates.push(path.posix.join("test", stem + ".test" + ext));
    candidates.push(path.posix.join("tests", "test_" + stem + ".py"));
    candidates.push(path.posix.join("test", "test_" + stem + ".py"));
    candidates.push(path.posix.join(dir, stem + "_test.go"));
    candidates.push(path.posix.join(dir, stem + "_test.py"));
    for (const c of candidates) {
      if (seen.has(c)) continue;
      try {
        if (fs.statSync(path.join(repo, c)).isFile()) {
          seen.add(c);
          out.push(c);
          if (out.length >= cap) return out;
          break;
        }
      } catch { /* next */ }
    }
  }
  return out;
}
