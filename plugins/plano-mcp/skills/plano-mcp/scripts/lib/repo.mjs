// Varredura determinística do repositório: stack, superfície de API, identidade,
// testes e sinais de risco. Regex de linha, sem dependências, sem rede.
// Nunca lê valor de segredo — só o NOME da variável.

import fs from "node:fs";
import path from "node:path";

const SKIP_DIR = new Set([
  ".git", "node_modules", "dist", "build", "out", "target", "vendor",
  ".venv", "venv", "__pycache__", ".next", ".nuxt", "coverage",
  ".pytest_cache", ".mypy_cache", ".gradle", "bin", "obj", ".terraform",
]);

const CODE_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".go", ".rb",
  ".php", ".java", ".kt", ".cs", ".rs",
]);

const MAX_FILES = 4000;
const MAX_BYTES = 400_000;

export function walk(root, { maxFiles = MAX_FILES } = {}) {
  const out = [];
  const stack = [root];
  let truncated = false;
  while (stack.length) {
    let entries;
    try {
      entries = fs.readdirSync(stack.pop(), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(e.parentPath ?? e.path ?? root, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIR.has(e.name) || e.name.startsWith(".") && e.name !== ".github") continue;
        stack.push(full);
      } else if (e.isFile()) {
        if (out.length >= maxFiles) { truncated = true; continue; }
        out.push(path.relative(root, full));
      }
    }
  }
  return { files: out.sort(), truncated };
}

function readSafe(root, rel) {
  try {
    const full = path.join(root, rel);
    if (fs.statSync(full).size > MAX_BYTES) return null;
    return fs.readFileSync(full, "utf8");
  } catch {
    return null;
  }
}

const STACK_MARKERS = [
  { file: "package.json", stack: "node" },
  { file: "pyproject.toml", stack: "python" },
  { file: "requirements.txt", stack: "python" },
  { file: "go.mod", stack: "go" },
  { file: "Gemfile", stack: "ruby" },
  { file: "composer.json", stack: "php" },
  { file: "pom.xml", stack: "java" },
  { file: "build.gradle", stack: "java" },
  { file: "build.gradle.kts", stack: "java" },
  { file: "Cargo.toml", stack: "rust" },
];

const FRAMEWORKS = [
  [/"express"\s*:/, "express"], [/"fastify"\s*:/, "fastify"],
  [/"@nestjs\/core"\s*:/, "nestjs"], [/"next"\s*:/, "next"],
  [/"koa"\s*:/, "koa"], [/"hono"\s*:/, "hono"],
  [/\bdjango\b/i, "django"], [/\bflask\b/i, "flask"], [/\bfastapi\b/i, "fastapi"],
  [/\brails\b/i, "rails"], [/laravel\/framework/, "laravel"],
  [/spring-boot/, "spring-boot"],
  [/github\.com\/gin-gonic\/gin/, "gin"], [/github\.com\/labstack\/echo/, "echo"],
];

// Rotas: o que sugere endpoint HTTP numa linha.
const ROUTE_RE = [
  /\b(?:router|app|server|api)\.(get|post|put|patch|delete)\s*\(/i,
  /@(?:app|router|blueprint|bp)\.(?:route|get|post|put|patch|delete)\s*\(/i,
  /@(?:Get|Post|Put|Patch|Delete)Mapping\b/,
  /@(?:Get|Post|Put|Patch|Delete)\s*\(/,
  /\bRoute::(get|post|put|patch|delete)\b/,
  /\b(?:get|post|put|patch|delete)\s+['"]\//,
  /\bpath\s*\(\s*['"]/,
];

// Identidade: o que sugere autenticação/autorização já existente.
const AUTH_RE = [
  [/\bjwt\b|jsonwebtoken|verify_jwt|decode_token/i, "jwt"],
  [/\bpassport\b|next-auth|authlib|devise|omniauth/i, "lib-auth"],
  [/@login_required|@requires_auth|\bauthenticate\b|\bauthorize\b|ensureAuth/i, "middleware"],
  [/\bAuthorization\b\s*[:\]]|bearer\s+token/i, "header"],
  [/\boauth2?\b|openid/i, "oauth"],
  [/req\.user\b|request\.user\b|current_user\b|currentUser\b|ctx\.user\b/, "usuario-na-request"],
  [/\brole\b\s*[=:]|\bpermission\b|\bscope\b\s*[=:]|can\?|ability/i, "autorizacao"],
  [/tenant_id|account_id|organization_id|workspace_id/i, "isolamento-multi-conta"],
];

// Camada de serviço: diretórios que indicam regra de negócio reutilizável.
const SERVICE_DIR_RE = /(^|\/)(services?|usecases?|use_cases|domain|application|repositories|repository|interactors)(\/|$)/i;

// Paginação: sinal de que a listagem já tem contrato de página.
const PAGE_RE = /\b(limit|offset|per_page|page_size|cursor|pageSize)\b/;

// Risco: o que o plano precisa olhar antes de expor nada.
const RISK_RE = [
  [/\b(?:execute|query|raw)\s*\(\s*[`"'][^`"']*\$\{|\bf"[^"]*SELECT|%\s*\(.*\)\s*s.*SELECT/i, "sql-dinamico"],
  [/\.(?:raw|exec)\s*\(/, "query-raw"],
  [/verify\s*=\s*False|rejectUnauthorized\s*:\s*false|InsecureSkipVerify\s*:\s*true/i, "tls-desligado"],
  [/jwt\.decode\s*\([^)]*verify\s*[:=]\s*(?:False|false)/i, "jwt-sem-verify"],
  [/cors\s*\(\s*\{?[^)]*origin\s*:\s*['"]\*|Access-Control-Allow-Origin['"]?\s*[:,]\s*['"]\*/i, "cors-wildcard"],
  [/\b(?:SELECT|UPDATE|DELETE)\b[^;]{0,120}\bFROM\b[^;]{0,60}(?:users?|accounts?|tenants?)\b/i, "acesso-direto-dado-sensivel"],
];

// Segredo: detectamos o NOME da chave, nunca o valor.
const SECRET_NAME_RE = /^([A-Z][A-Z0-9_]{2,})\s*=/m;

const MCP_RE = [
  [/@modelcontextprotocol\/sdk/, "sdk-typescript"],
  [/^\s*mcp\b|\bmcp\[cli\]|modelcontextprotocol/im, "sdk-python"],
  [/github\.com\/modelcontextprotocol\/go-sdk/, "sdk-go"],
];

function testCommand(root, files) {
  const pkg = readSafe(root, "package.json");
  if (pkg) {
    try {
      const scripts = JSON.parse(pkg).scripts || {};
      for (const k of ["test", "test:unit", "jest", "vitest"]) {
        if (scripts[k]) return `npm run ${k}`;
      }
    } catch { /* package.json inválido não é erro do scan */ }
  }
  if (files.some((f) => /^pytest\.ini$|^tox\.ini$|^conftest\.py$/.test(f))) return "pytest";
  if (readSafe(root, "pyproject.toml")?.includes("[tool.pytest")) return "pytest";
  if (files.includes("go.mod")) return "go test ./...";
  if (files.includes("Gemfile") && files.some((f) => f.startsWith("spec/"))) return "bundle exec rspec";
  if (readSafe(root, "Makefile")?.match(/^test\s*:/m)) return "make test";
  return null;
}

export function scanRepo(root, { maxFiles } = {}) {
  const { files, truncated } = walk(root, { maxFiles });
  const manifests = files.filter((f) => STACK_MARKERS.some((m) => f === m.file));
  const stacks = new Set();
  let frameworks = new Set();
  const mcp = new Set();

  for (const m of STACK_MARKERS) {
    if (files.includes(m.file)) stacks.add(m.stack);
  }
  for (const f of manifests) {
    const txt = readSafe(root, f) || "";
    for (const [re, name] of FRAMEWORKS) if (re.test(txt)) frameworks.add(name);
    for (const [re, name] of MCP_RE) if (re.test(txt)) mcp.add(name);
  }
  if (files.some((f) => f === ".mcp.json" || f === "mcp.json")) mcp.add("config-cliente");

  const code = files.filter((f) => CODE_EXT.has(path.extname(f)));
  const surface = [];
  const auth = new Map();
  const risks = [];
  const paginated = new Set();
  let scanned = 0;

  for (const rel of code) {
    const txt = readSafe(root, rel);
    if (txt === null) continue;
    scanned++;
    const lines = txt.split("\n");
    const verbs = new Set();
    let routeHits = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length > 500) continue;
      for (const re of ROUTE_RE) {
        const m = re.exec(line);
        if (m) {
          routeHits++;
          if (m[1]) verbs.add(m[1].toUpperCase());
          break;
        }
      }
      for (const [re, kind] of AUTH_RE) {
        if (re.test(line)) {
          if (!auth.has(kind)) auth.set(kind, { kind, count: 0, where: `${rel}:${i + 1}` });
          auth.get(kind).count++;
        }
      }
      for (const [re, kind] of RISK_RE) {
        if (re.test(line)) risks.push({ kind, where: `${rel}:${i + 1}` });
      }
      if (PAGE_RE.test(line)) paginated.add(rel);
    }
    if (routeHits > 0) {
      surface.push({ file: rel, routes: routeHits, verbs: [...verbs].sort().join("|") || "?", paginated: paginated.has(rel) });
    }
  }

  const serviceDirs = [...new Set(
    code.filter((f) => SERVICE_DIR_RE.test(path.dirname(f)))
      .map((f) => path.dirname(f)),
  )].sort();

  const secretNames = [];
  for (const f of files.filter((f) => /(^|\/)\.env(\.|$)|(^|\/)\.env\.example$/.test(f))) {
    const txt = readSafe(root, f) || "";
    for (const line of txt.split("\n")) {
      const m = SECRET_NAME_RE.exec(line + "\n");
      if (m) secretNames.push(m[1]);
    }
  }

  const agentDocs = files.filter((f) => /^(CLAUDE|AGENTS|CONTRIBUTING|README)\.md$|^\.cursorrules$|^docs\/adr\//i.test(f));

  return {
    root,
    stacks: [...stacks].sort(),
    frameworks: [...frameworks].sort(),
    mcp: [...mcp].sort(),
    files: files.length,
    codeFiles: code.length,
    scanned,
    truncated,
    surface: surface.sort((a, b) => b.routes - a.routes),
    serviceDirs,
    auth: [...auth.values()].sort((a, b) => b.count - a.count),
    risks,
    secretNames: [...new Set(secretNames)].sort(),
    testCommand: testCommand(root, files),
    agentDocs,
    totalRoutes: surface.reduce((n, s) => n + s.routes, 0),
    paginatedFiles: [...paginated].filter((f) => surface.some((s) => s.file === f)).length,
  };
}
