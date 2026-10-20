import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(HERE, "../skills/plano-mcp/scripts/mcpx.mjs");
const EXEMPLO = path.resolve(HERE, "../skills/plano-mcp/examples/caso-exemplo-001/plano-mcp.md");

function run(args, cwd = HERE) {
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });
    return { code: 0, stdout };
  } catch (e) {
    return { code: e.status, stdout: String(e.stdout || "") + String(e.stderr || "") };
  }
}

function fixtureRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mcpx-e2e-"));
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
    dependencies: { express: "^4" }, scripts: { test: "jest" },
  }));
  fs.mkdirSync(path.join(dir, "src/routes"), { recursive: true });
  fs.writeFileSync(path.join(dir, "src/routes/api.ts"),
    "router.get('/items', authenticate, (req,res)=>{ const u=req.user; const limit=10; });\n" +
    "router.post('/items', authenticate, h);\n");
  return dir;
}

test("scan: saida compacta, agregado e linhas de help", () => {
  const dir = fixtureRepo();
  const r = run(["scan", "--root", dir]);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /stack: node/);
  assert.match(r.stdout, /framework: express/);
  assert.match(r.stdout, /superficie\[1\]\{file,routes,verbs,paginated\}:/);
  assert.match(r.stdout, /agregado: 2 rotas em 1 arquivos/);
  assert.match(r.stdout, /help\[\d+\]:/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("scan --json devolve JSON parseavel", () => {
  const dir = fixtureRepo();
  const r = run(["scan", "--root", dir, "--json"]);
  assert.equal(r.code, 0);
  const data = JSON.parse(r.stdout);
  assert.equal(data.totalRoutes, 2);
  assert.equal(data.testCommand, "npm run test");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("scan de repo sem rota avisa que tela e login nao provam API", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mcpx-norota-"));
  const r = run(["scan", "--root", dir]);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /superficie\[0\]: nenhum/);
  assert.match(r.stdout, /tela e login nao provam API/);
  assert.match(r.stdout, /BLOQUEIO de prontidao/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("scan de diretorio inexistente falha com exit 1", () => {
  const r = run(["scan", "--root", "/caminho/que/nao/existe/xyz"]);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /erro: diretório inexistente/);
});

test("issues: o plano de exemplo da skill passa na validacao", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "mcpx-issues-"));
  const r = run(["issues", "--plan", EXEMPLO, "--out", out]);
  assert.equal(r.code, 0, r.stdout);
  assert.match(r.stdout, /issues\[7\]/);
  assert.match(r.stdout, /7 issues validas/);
  assert.match(r.stdout, /podem comecar em paralelo: 1/);
  assert.equal(fs.readdirSync(out).length, 7);
  assert.match(fs.readFileSync(path.join(out, "issue-01.md"), "utf8"), /## Critério de aceite/);
  fs.rmSync(out, { recursive: true, force: true });
});

test("issues --gh emite um comando por issue e nao cria nada", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "mcpx-gh-"));
  const r = run(["issues", "--plan", EXEMPLO, "--out", out, "--gh", "--repo", "cliente-exemplo/acme"]);
  assert.equal(r.code, 0);
  const cmds = r.stdout.split("\n").filter((l) => l.startsWith("gh issue create"));
  assert.equal(cmds.length, 7);
  assert.ok(cmds.every((c) => c.includes("--repo 'cliente-exemplo/acme'") && c.includes("--body-file")));
  assert.match(r.stdout, /nenhuma issue foi criada por este comando/);
  fs.rmSync(out, { recursive: true, force: true });
});

test("issues: plano invalido falha com exit 1 e NAO grava corpo nenhum", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mcpx-bad-"));
  const plan = path.join(dir, "ruim.md");
  const out = path.join(dir, "issues");
  fs.writeFileSync(plan, `## Issue 1 — Sem nada
- **Labels:** mcp
### Contexto
curto
`);
  const r = run(["issues", "--plan", plan, "--out", out]);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /problemas\[\d+\]\{issue,problem\}:/);
  assert.match(r.stdout, /nada foi gerado/);
  assert.equal(fs.existsSync(out), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("issues sem --plan falha com exit 2 (uso incorreto)", () => {
  const r = run(["issues"]);
  assert.equal(r.code, 2);
  assert.match(r.stdout, /exige --plan/);
});

test("flag e comando desconhecidos falham com exit 2", () => {
  assert.equal(run(["--naoexiste"]).code, 2);
  assert.equal(run(["naoexiste"]).code, 2);
});

test("sem argumento mostra dado vivo, nao tela de ajuda", () => {
  const dir = fixtureRepo();
  const r = run([], dir);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /^plano-mcp \d+\.\d+\.\d+ — avalia um repositório/);
  assert.match(r.stdout, /superficie\[1\]/);
  assert.doesNotMatch(r.stdout, /mcpx scan \[--root/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("doctor confirma a instalacao da skill", () => {
  const r = run(["doctor"]);
  assert.equal(r.code, 0, r.stdout);
  assert.match(r.stdout, /SKILL\.md/);
  assert.match(r.stdout, /agregado: 6\/6 ok/);
});

test("help e --version respondem", () => {
  assert.match(run(["help"]).stdout, /mcpx scan/);
  assert.match(run(["--version"]).stdout, /^\d+\.\d+\.\d+/);
});
