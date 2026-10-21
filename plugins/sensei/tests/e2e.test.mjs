import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RX = path.join(ROOT, "skills", "sensei", "scripts", "sensei.mjs");

function sh(cmd, args, cwd, env = {}) {
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", ...env },
    maxBuffer: 32 * 1024 * 1024,
  });
  return r;
}

function git(cwd, args) {
  const r = sh("git", ["-c", "core.quotePath=false", ...args], cwd);
  if (r.status !== 0) throw new Error("git " + args.join(" ") + ": " + r.stderr);
  return r.stdout;
}

function write(cwd, rel, text) {
  const abs = path.join(cwd, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text);
}

function runRx(args, cwd, home) {
  return sh(process.execPath, [RX, ...args], cwd, {
    SENSEI_HOME: home,
    SENSEI_LANG: "en",
  });
}

function makeFixture() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "rx-e2e-repo-"));
  git(repo, ["init", "-q"]);
  git(repo, ["config", "user.email", "sensei@example.com"]);
  git(repo, ["config", "user.name", "RX"]);
  write(repo, "package.json", JSON.stringify({ name: "fixture", version: "1.0.0", scripts: { test: "node --test" } }, null, 2));
  write(repo, "src/db.ts", "export const db = {\n  query(sql: string, params?: unknown[]) {\n    return Promise.resolve({ sql, params });\n  },\n};\n");
  write(repo, "src/auth.ts", "import jwt from \"jsonwebtoken\";\n\nexport function verifyToken(token: string) {\n  return jwt.verify(token, process.env.JWT_SECRET as string);\n}\n");
  write(repo, "src/api.ts", "import { db } from \"./db\";\nimport { verifyToken } from \"./auth\";\n\nexport async function getUser(id: string) {\n  return db.query(\"SELECT * FROM users WHERE id = ?\", [id]);\n}\n");
  write(repo, "src/util.ts", "export function last<T>(items: T[]): T | undefined {\n  return items[items.length - 1];\n}\n");
  write(repo, "src/legacy.ts", "export function legacy() { return 1; }\n");
  write(repo, "tests/auth.test.ts", "import { test } from \"node:test\";\ntest(\"ok\", () => {});\n");
  write(repo, "README.md", "# fixture\n");
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-qm", "base"]);
  git(repo, ["checkout", "-qb", "feature/endpoints"]);

  write(repo, "src/api.ts", [
    "import { db } from \"./db\";",
    "import { verifyToken } from \"./auth\";",
    "",
    "export async function getUser(id: string) {",
    "  return db.query(\"SELECT * FROM users WHERE id = ?\", [id]);",
    "}",
    "",
    "export async function searchUsers(req: any, res: any) {",
    "  const term = String(req.query.q || \"\");",
    "  const rows = await db.query(\"SELECT * FROM users WHERE name LIKE '%\" + term + \"%'\");",
    "  console.log(\"search\", process.env.DATABASE_URL, term);",
    "  return res.json(rows);",
    "}",
    "",
    "export async function deleteUser(req: any, res: any) {",
    "  await db.query(\"DELETE FROM users WHERE id = \" + req.params.id);",
    "  return res.send(\"ok\");",
    "}",
    "",
  ].join("\n"));
  write(repo, "src/auth.ts", [
    "import jwt from \"jsonwebtoken\";",
    "",
    "export function verifyToken(token: string) {",
    "  try {",
    "    const decoded = jwt.decode(token);",
    "    return decoded;",
    "  } catch (error) {}",
    "  return null;",
    "}",
    "",
    "export function makeToken(userId: string) {",
    "  const nonce = Math.random().toString(36).slice(2);",
    "  return userId + \":\" + nonce;",
    "}",
    "",
  ].join("\n"));
  write(repo, "src/util.ts", [
    "export function last<T>(items: T[]): T | undefined {",
    "  return items[items.length - 1];",
    "}",
    "",
    "export function chunk<T>(items: T[], size: number): T[][] {",
    "  const out: T[][] = [];",
    "  for (let i = 0; i <= items.length; i += size) {",
    "    out.push(items.slice(i, i + size));",
    "  }",
    "  return out;",
    "}",
    "",
  ].join("\n"));
  // Os segredos do fixture sao MONTADOS em tempo de execucao, de proposito: escritos
  // como literal eles disparam a protecao de push do GitHub e o repo publico recusa o
  // commit. O arquivo gerado e identico, entao as regras secret-* continuam sendo
  // exercitadas. Nao "simplifique" de volta para literal.
  const falsoStripe = ["sk", "live", "1234567890abcdefghijklmnop"].join("_");
  const falsaUrlDeBanco = "postgres://" + "admin" + ":" + "hunter2" + "@localhost/app";
  write(repo, "src/config.ts", [
    "export const config = {",
    "  databaseUrl: \"" + falsaUrlDeBanco + "\",",
    "  stripeKey: \"" + falsoStripe + "\",",
    "  http: { rejectUnauthorized: false },",
    "};",
    "",
  ].join("\n"));
  write(repo, "migrations/001_add_role.sql", "ALTER TABLE users ADD COLUMN role text NOT NULL;\n");
  fs.rmSync(path.join(repo, "src/legacy.ts"));
  write(repo, "README.md", "# fixture\n\nsearch users\n");
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-qm", "feature"]);
  return repo;
}

function latestRunDir(home) {
  const runs = path.join(home, "runs");
  const dirs = fs.readdirSync(runs).map((d) => path.join(runs, d));
  dirs.sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);
  return dirs[dirs.length - 1];
}

function ledger(home) {
  const file = path.join(home, "metrics.jsonl");
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

test("end-to-end: collect, slice, record, stats, truncation and empty state", () => {
  const repo = makeFixture();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "rx-e2e-home-"));
  try {
    const c1 = runRx(["collect"], repo, home);
    assert.equal(c1.status, 0, c1.stderr);
    assert.match(c1.stdout, /run=/);
    const bundlePath = /bundle=(\S+)/.exec(c1.stdout)[1];
    assert.ok(fs.existsSync(bundlePath));
    const manifest = JSON.parse(fs.readFileSync(path.join(latestRunDir(home), "manifest.json"), "utf8"));
    assert.ok(manifest.files.length >= 6);
    assert.ok(manifest.baseline.fullFilesTokens > 0);
    assert.ok(manifest.baseline.patternBaselineTokens > 0);
    assert.ok(manifest.skillTokens > 300);
    const rules = manifest.signals.map((s) => s.rule);
    for (const expected of ["sql-concat", "jwt-decode", "empty-catch", "verify-false", "secret-db-url", "sql-notnull"]) {
      assert.ok(rules.includes(expected), "missing signal " + expected);
    }

    const sqli = manifest.signals.find((s) => s.rule === "sql-concat");
    const slice = runRx(["slice", "--file", sqli.file, "--line", String(sqli.line), "--context", "2"], repo, home);
    assert.equal(slice.status, 0, slice.stderr);
    assert.match(slice.stdout, new RegExp(sqli.file + ":" + sqli.line));

    const reportPath = path.join(home, "report.md");
    fs.writeFileSync(reportPath, [
      "1. [S0] src/api.ts:10 - SQL injection. Gatilho: quote. Correcao: bind.",
      "2. [S0] src/config.ts:2 - live key. Correcao: rotate.",
      "3. [S1] src/auth.ts:5 - jwt.decode. Correcao: verify.",
      "4. [S1] migrations/001_add_role.sql:1 - not null. Correcao: default.",
      "5. [S2] src/util.ts:6 - off by one. Correcao: <.",
    ].join("\n"));
    const rec = runRx(["record", "--findings", "5", "--severity", "S0:2,S1:2,S2:1", "--report", reportPath], repo, home);
    assert.equal(rec.status, 0, rec.stderr);
    assert.match(rec.stdout, /recorded/);
    const rows = ledger(home);
    assert.equal(rows.length, 1);
    const entry = rows[0];
    assert.equal(entry.findings.total, 5);
    assert.ok(entry.saved > 0, "expected positive savings on this diff");
    assert.equal(entry.mechanisms.reduce((a, m) => a + m.tokens, 0), entry.saved);

    const stats = runRx(["stats", "--json"], repo, home);
    assert.equal(stats.status, 0, stats.stderr);
    const sj = JSON.parse(stats.stdout);
    assert.equal(sj.totals.reviews, 1);
    assert.ok(sj.mechanisms.length > 0);

    const dup = runRx(["record", "--findings", "0"], repo, home);
    assert.equal(dup.status, 1, "recording twice must fail");

    const c2 = runRx(["collect"], repo, home);
    assert.equal(c2.status, 0, c2.stderr);
    const rec2 = runRx(["record", "--findings", "0", "--severity", "S0:0,S1:0,S2:0"], repo, home);
    assert.equal(rec2.status, 0, rec2.stderr);
    assert.equal(ledger(home).length, 2);

    write(repo, "src/huge.ts", Array.from({ length: 500 }, (_, i) =>
      "export function huge" + i + "(v: string): string { return v.trim() + " + i + "; }").join("\n"));
    const c3 = runRx(["collect", "--max-tokens", "300"], repo, home);
    assert.equal(c3.status, 0, c3.stderr);
    const m3 = JSON.parse(fs.readFileSync(path.join(latestRunDir(home), "manifest.json"), "utf8"));
    assert.ok(m3.truncated || m3.omitted.length > 0, "huge diff with tiny --max-tokens should truncate");
    fs.rmSync(path.join(repo, "src/huge.ts"));

    git(repo, ["checkout", "-q", "main"]);
    const empty = runRx(["collect"], repo, home);
    assert.equal(empty.status, 0, empty.stderr);
    assert.match(empty.stdout, /^empty:/);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("collect fails clearly outside a git repository", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rx-nogit-"));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "rx-nogit-home-"));
  try {
    const r = runRx(["collect"], dir, home);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /nao e um repositorio git/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
});
