import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { parsePlan, validatePlan, issueBody, shellQuote } from "../skills/plano-mcp/scripts/lib/plan.mjs";
import { toon, kv } from "../skills/plano-mcp/scripts/lib/out.mjs";
import { scanRepo } from "../skills/plano-mcp/scripts/lib/repo.mjs";

const PLANO_OK = `# Plano MCP — X

## Issue 1 — Contrato
- **Labels:** mcp, contrato
- **Depende de:** —
- **Estimativa:** S
### Contexto
FATO (fonte: src/a.ts:1): existe camada de servico reutilizavel.
### Critério de aceite
- [ ] Contrato escrito
- [ ] Tres erros definidos
### Evidência exigida
Arquivo de contrato no repositorio.

## Issue 2 — Esqueleto
- **Labels:** mcp
- **Depende de:** 1
- **Estimativa:** M
### Contexto
Provar o canal antes de integrar com o produto.
### Critério de aceite
- [ ] Servidor sobe em stdio
### Evidência exigida
Saida do cliente MCP listando a ferramenta.
### Fora de escopo
Qualquer integracao real.
`;

test("parsePlan extrai issues, campos e secoes", () => {
  const issues = parsePlan(PLANO_OK);
  assert.equal(issues.length, 2);
  assert.equal(issues[0].n, 1);
  assert.equal(issues[0].titulo, "Contrato");
  assert.deepEqual(issues[0].labels, ["mcp", "contrato"]);
  assert.deepEqual(issues[0].depende, []);
  assert.equal(issues[0].estimativa, "S");
  assert.equal(issues[0].aceite, 2);
  assert.match(issues[0].sections.Contexto, /camada de servico/);
  assert.deepEqual(issues[1].depende, ["1"]);
  assert.equal(issues[1].sections["Fora de escopo"], "Qualquer integracao real.");
});

test("validatePlan aceita plano completo", () => {
  assert.deepEqual(validatePlan(parsePlan(PLANO_OK)), []);
});

test("validatePlan recusa plano vazio", () => {
  const p = validatePlan(parsePlan("# nada aqui\n"));
  assert.equal(p.length, 1);
  assert.match(p[0].problem, /sem nenhuma issue/);
});

test("validatePlan exige secoes obrigatorias", () => {
  const texto = `## Issue 1 — Sem evidencia
- **Labels:** mcp
- **Estimativa:** S
### Contexto
Contexto suficientemente longo para passar.
### Critério de aceite
- [ ] algo
`;
  const p = validatePlan(parsePlan(texto));
  assert.ok(p.some((x) => /Evidência exigida/.test(x.problem)), JSON.stringify(p));
});

test("validatePlan exige criterio verificavel com checkbox", () => {
  const texto = `## Issue 1 — Sem checkbox
- **Labels:** mcp
- **Estimativa:** S
### Contexto
Contexto suficientemente longo para passar.
### Critério de aceite
Deve ficar bom e funcionando direito.
### Evidência exigida
Alguma evidencia qualquer aqui.
`;
  const p = validatePlan(parsePlan(texto));
  assert.ok(p.some((x) => /sem item verificavel/.test(x.problem)));
});

test("validatePlan recusa dependencia inexistente, propria e posterior", () => {
  const base = (dep) => `## Issue 1 — Um
- **Labels:** mcp
- **Depende de:** ${dep}
- **Estimativa:** S
### Contexto
Contexto suficientemente longo para passar.
### Critério de aceite
- [ ] algo
### Evidência exigida
Alguma evidencia qualquer aqui.

## Issue 2 — Dois
- **Labels:** mcp
- **Estimativa:** S
### Contexto
Contexto suficientemente longo para passar.
### Critério de aceite
- [ ] algo
### Evidência exigida
Alguma evidencia qualquer aqui.
`;
  assert.ok(validatePlan(parsePlan(base("9"))).some((x) => /inexistente/.test(x.problem)));
  assert.ok(validatePlan(parsePlan(base("1"))).some((x) => /si mesma/.test(x.problem)));
  assert.ok(validatePlan(parsePlan(base("2"))).some((x) => /posterior/.test(x.problem)));
});

test("validatePlan recusa titulo com placeholder", () => {
  const texto = PLANO_OK.replace("Issue 1 — Contrato", "Issue 1 — TODO definir");
  assert.ok(validatePlan(parsePlan(texto)).some((x) => /placeholder/.test(x.problem)));
});

test("issueBody preserva secoes extra e adiciona rodape de meta", () => {
  const [, dois] = parsePlan(PLANO_OK);
  const body = issueBody(dois);
  assert.match(body, /## Contexto/);
  assert.match(body, /## Critério de aceite/);
  assert.match(body, /## Evidência exigida/);
  assert.match(body, /## Fora de escopo/);
  assert.match(body, /Estimativa: M/);
  assert.match(body, /Depende de: 1/);
});

test("shellQuote escapa aspas simples", () => {
  assert.equal(shellQuote("o'brien"), "'o'\\''brien'");
});

test("toon usa estado vazio explicito e nunca quebra a tabela", () => {
  assert.equal(toon("x", [], ["a"]), "x[0]: nenhum");
  const out = toon("x", [{ a: "um,dois", b: true, c: null }], ["a", "b", "c"]);
  assert.equal(out, "x[1]{a,b,c}:\n  um;dois,sim,-");
  assert.equal(toon("y", [{ a: "l1\nl2" }], ["a"]).split("\n").length, 2);
});

test("kv omite valor vazio e junta lista", () => {
  assert.equal(kv([["a", 1], ["b", ""], ["c", ["x", "y"]], ["d", []]]), "a: 1  c: x|y  d: -");
});

test("scanRepo detecta stack, rota, identidade, servico e teste", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mcpx-scan-"));
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
    dependencies: { express: "^4" }, scripts: { test: "vitest run" },
  }));
  fs.mkdirSync(path.join(dir, "src/routes"), { recursive: true });
  fs.mkdirSync(path.join(dir, "src/services"), { recursive: true });
  fs.writeFileSync(path.join(dir, "src/routes/tickets.ts"),
    "router.get('/tickets', auth, (req, res) => {\n  const u = req.user;\n  const limit = 20;\n});\n");
  fs.writeFileSync(path.join(dir, "src/services/tickets.ts"),
    "export function list(accountId) { return db.find({ account_id: accountId }); }\n");
  fs.writeFileSync(path.join(dir, ".env.example"), "DATABASE_URL=\nAPI_TOKEN=\n");

  const r = scanRepo(dir);
  assert.deepEqual(r.stacks, ["node"]);
  assert.deepEqual(r.frameworks, ["express"]);
  assert.equal(r.testCommand, "npm run test");
  assert.equal(r.surface.length, 1);
  assert.equal(r.surface[0].verbs, "GET");
  assert.ok(r.surface[0].paginated);
  assert.ok(r.auth.some((a) => a.kind === "usuario-na-request"));
  assert.ok(r.serviceDirs.some((d) => d.endsWith("services")));
  assert.deepEqual(r.secretNames, ["API_TOKEN", "DATABASE_URL"]);
  assert.deepEqual(r.mcp, []);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("scanRepo le apenas o NOME do segredo, nunca o valor", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mcpx-secret-"));
  fs.writeFileSync(path.join(dir, ".env"), "API_TOKEN=sk-valor-secreto-123\n");
  const r = scanRepo(dir);
  assert.deepEqual(r.secretNames, ["API_TOKEN"]);
  assert.equal(JSON.stringify(r).includes("sk-valor-secreto-123"), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("scanRepo ignora node_modules e nao explode em repo vazio", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mcpx-empty-"));
  fs.mkdirSync(path.join(dir, "node_modules/pkg"), { recursive: true });
  fs.writeFileSync(path.join(dir, "node_modules/pkg/index.js"), "app.get('/x', h);\n");
  const r = scanRepo(dir);
  assert.equal(r.files, 0);
  assert.equal(r.surface.length, 0);
  assert.equal(r.testCommand, null);
  fs.rmSync(dir, { recursive: true, force: true });
});
