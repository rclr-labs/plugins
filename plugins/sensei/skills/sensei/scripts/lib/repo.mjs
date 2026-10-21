// Inventario do repositorio para o modo `repo`: linguagens, cobertura de camada,
// tamanho real das mudancas, candidatos a path filter e superficie sensivel.
// Tudo deterministico e sem rede. O julgamento fica em repo.md.

import fs from "node:fs";
import path from "node:path";
import { git, isTestPath, isDocPath, classifyRisk } from "./git.mjs";

const LINGUAGENS = [
  { id: "php", exts: [".php"], camada: true },
  { id: "python", exts: [".py", ".pyi"], camada: true },
  { id: "sql", exts: [".sql", ".prc"], camada: true },
  { id: "powershell", exts: [".ps1", ".psm1", ".psd1"], camada: true },
  { id: "cobol", exts: [".cbl", ".cob", ".cpy"], camada: true },
  { id: "typescript", exts: [".ts", ".tsx"], camada: false },
  { id: "javascript", exts: [".js", ".jsx", ".mjs", ".cjs"], camada: false },
  { id: "java", exts: [".java"], camada: false },
  { id: "csharp", exts: [".cs"], camada: false },
  { id: "go", exts: [".go"], camada: false },
  { id: "ruby", exts: [".rb"], camada: false },
];

// Diretorios que quase sempre devem sair do escopo do revisor.
const FILTRO = [
  { re: /(^|\/)migrations?(\/|$)/i, motivo: "migration: so risco de perda de dado, nao estilo" },
  { re: /(^|\/)vendor(\/|$)/i, motivo: "dependencia de terceiro" },
  { re: /(^|\/)node_modules(\/|$)/i, motivo: "dependencia de terceiro" },
  { re: /(^|\/)(dist|build|out|target)(\/|$)/i, motivo: "artefato de build" },
  { re: /(^|\/)__snapshots__(\/|$)/i, motivo: "snapshot de teste: diff e esperado" },
  { re: /\.(generated|g)\.[a-z]+$|_pb2\.py$|\.pb\.go$/i, motivo: "gerado por codegen" },
  { re: /(^|\/)(docs?|documentation)(\/|$)/i, motivo: "prosa: revisao e editorial, modo docs" },
  { re: /\.(lock|sum)$|(^|\/)(package-lock\.json|composer\.lock|yarn\.lock|poetry\.lock)$/i, motivo: "lockfile: ruido garantido" },
];

const SENSIVEL = [
  { re: /(^|\/)(auth|authn|authz|security|seguranca)(\/|[._-])/i, tipo: "autenticacao/autorizacao" },
  { re: /(middleware|guard|policy|policies|permission)/i, tipo: "autorizacao" },
  { re: /(payment|pagamento|billing|cobranca|invoice|fatura)/i, tipo: "financeiro" },
  { re: /(^|\/)migrations?(\/|$)/i, tipo: "schema" },
  { re: /(^|\/)(jobs?|queues?|workers?|consumers?)(\/|[._-])/i, tipo: "assincrono" },
  { re: /(^|\/)config(\/|$)|\.env/i, tipo: "configuracao" },
];

const PULAR = new Set([".git", "node_modules", "vendor", "dist", "build", "out", "target",
  ".venv", "venv", "__pycache__", ".next", "coverage", ".gradle", "bin", "obj"]);

function andar(raiz, maxFiles = 20000) {
  const out = [];
  const pilha = [raiz];
  let truncado = false;
  while (pilha.length) {
    let entradas;
    try { entradas = fs.readdirSync(pilha.pop(), { withFileTypes: true }); } catch { continue; }
    for (const e of entradas) {
      const full = path.join(e.parentPath ?? e.path ?? raiz, e.name);
      if (e.isDirectory()) {
        if (PULAR.has(e.name) || (e.name.startsWith(".") && e.name !== ".github")) continue;
        pilha.push(full);
      } else if (e.isFile()) {
        if (out.length >= maxFiles) { truncado = true; continue; }
        out.push(path.relative(raiz, full));
      }
    }
  }
  return { arquivos: out.sort(), truncado };
}

// Tamanho real das mudancas, contra o limite de 200-400 linhas do estudo Cisco.
export function tamanhoDasMudancas(repo, commits = 200) {
  const saida = git(["log", "-n", String(commits), "--no-merges", "--numstat", "--pretty=format:%H"], repo);
  if (!saida.ok) return null;
  const porCommit = [];
  let atual = null;
  for (const linha of saida.stdout.split("\n")) {
    if (/^[0-9a-f]{40}$/.test(linha.trim())) {
      if (atual !== null) porCommit.push(atual);
      atual = 0;
      continue;
    }
    const m = /^(\d+)\t(\d+)\t(.+)$/.exec(linha);
    if (m && atual !== null) {
      const arq = m[3];
      if (FILTRO.some((f) => f.re.test(arq))) continue;   // nao conta gerado/vendor
      atual += Number(m[1]) + Number(m[2]);
    }
  }
  if (atual !== null) porCommit.push(atual);
  const vivos = porCommit.filter((n) => n > 0).sort((a, b) => a - b);
  if (!vivos.length) return null;
  const q = (p) => vivos[Math.min(vivos.length - 1, Math.floor(vivos.length * p))];
  return {
    commits: vivos.length,
    mediana: q(0.5),
    p90: q(0.9),
    maior: vivos[vivos.length - 1],
    acima400: vivos.filter((n) => n > 400).length,
    acima400Pct: Math.round((vivos.filter((n) => n > 400).length / vivos.length) * 100),
    dentroDoLimite: vivos.filter((n) => n <= 200).length,
    dentroDoLimitePct: Math.round((vivos.filter((n) => n <= 200).length / vivos.length) * 100),
  };
}

export function arquivosMaisTocados(repo, commits = 200, limite = 8) {
  const saida = git(["log", "-n", String(commits), "--no-merges", "--name-only", "--pretty=format:"], repo);
  if (!saida.ok) return [];
  const conta = new Map();
  for (const linha of saida.stdout.split("\n")) {
    const arq = linha.trim();
    if (!arq || FILTRO.some((f) => f.re.test(arq)) || isTestPath(arq) || isDocPath(arq)) continue;
    conta.set(arq, (conta.get(arq) || 0) + 1);
  }
  return [...conta.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite)
    .map(([arquivo, toques]) => ({ arquivo, toques, risco: classifyRisk(arquivo) }));
}

function comandoDeTeste(raiz, arquivos) {
  const ler = (f) => { try { return fs.readFileSync(path.join(raiz, f), "utf8"); } catch { return null; } };
  const pkg = ler("package.json");
  if (pkg) {
    try {
      const sc = JSON.parse(pkg).scripts || {};
      for (const k of ["test", "test:unit"]) if (sc[k]) return `npm run ${k}`;
    } catch { /* manifesto invalido nao e erro do inventario */ }
  }
  const composer = ler("composer.json");
  if (composer) {
    try {
      const sc = JSON.parse(composer).scripts || {};
      if (sc.test) return "composer test";
    } catch { /* idem */ }
    if (arquivos.some((f) => /^(phpunit\.xml|phpunit\.xml\.dist)$/.test(f))) return "vendor/bin/phpunit";
    if (arquivos.some((f) => /^(pest\.php|tests\/Pest\.php)$/.test(f))) return "vendor/bin/pest";
  }
  if (arquivos.some((f) => /^(pytest\.ini|tox\.ini|conftest\.py)$/.test(f))) return "pytest";
  if (arquivos.includes("go.mod")) return "go test ./...";
  if (ler("Makefile")?.match(/^test\s*:/m)) return "make test";
  return null;
}

export function inventario(raiz, { commits = 200 } = {}) {
  const { arquivos, truncado } = andar(raiz);

  const linguagens = [];
  for (const l of LINGUAGENS) {
    const n = arquivos.filter((f) => l.exts.includes(path.extname(f).toLowerCase())
      && !FILTRO.some((x) => x.re.test(f))).length;
    if (n > 0) linguagens.push({ id: l.id, arquivos: n, camada: l.camada });
  }
  linguagens.sort((a, b) => b.arquivos - a.arquivos);

  // Laravel e framework, nao linguagem: detecta por marcador de projeto.
  const laravel = arquivos.includes("artisan")
    || arquivos.some((f) => /^app\/(Http|Models|Providers)\//.test(f));
  if (laravel && linguagens.some((l) => l.id === "php")) {
    linguagens.push({ id: "laravel", arquivos: arquivos.filter((f) => /^app\//.test(f)).length, camada: true });
  }

  const filtros = FILTRO
    .map((f) => ({ motivo: f.motivo, exemplos: arquivos.filter((a) => f.re.test(a)).slice(0, 2), total: arquivos.filter((a) => f.re.test(a)).length }))
    .filter((f) => f.total > 0);

  const sensivel = SENSIVEL
    .map((s) => ({ tipo: s.tipo, total: arquivos.filter((a) => s.re.test(a) && !FILTRO.some((x) => x.re.test(a))).length }))
    .filter((s) => s.total > 0);

  const ci = [
    arquivos.some((f) => f.startsWith(".github/workflows/")) && "github-actions",
    arquivos.includes(".gitlab-ci.yml") && "gitlab-ci",
    arquivos.includes("azure-pipelines.yml") && "azure-devops",
    arquivos.includes("Jenkinsfile") && "jenkins",
  ].filter(Boolean);

  return {
    raiz,
    arquivos: arquivos.length,
    truncado,
    linguagens,
    filtros,
    sensivel,
    ci,
    teste: comandoDeTeste(raiz, arquivos),
    templatePR: arquivos.some((f) => /pull_request_template\.md$/i.test(f)),
    docsDeContexto: arquivos.filter((f) => /^(CLAUDE|AGENTS|CONTRIBUTING)\.md$|^\.cursorrules$|^docs\/adr\//i.test(f)).slice(0, 6),
    linter: arquivos.filter((f) => /^(\.eslintrc|eslint\.config|\.php-cs-fixer|pint\.json|ruff\.toml|\.flake8|\.rubocop\.yml|cspell\.json)/i.test(f)).slice(0, 6),
    mudancas: tamanhoDasMudancas(raiz, commits),
    hotspots: arquivosMaisTocados(raiz, commits),
  };
}
