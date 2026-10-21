import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { estimateTokens, fmtTokens, pct } from "../skills/sensei/scripts/lib/tokens.mjs";
import { buildEntry } from "../skills/sensei/scripts/lib/accounting.mjs";
import { scanAdded } from "../skills/sensei/scripts/lib/scan.mjs";
import { parseDiff } from "../skills/sensei/scripts/lib/git.mjs";

test("token estimator is sane and monotonic", () => {
  assert.ok(estimateTokens("hello world", "prose") >= 2);
  assert.ok(estimateTokens("hello world ".repeat(100), "prose") > estimateTokens("hello world", "prose"));
  assert.ok(estimateTokens("const x = 1;", "code") >= 2);
  assert.ok(estimateTokens("你好世界", "prose") >= 4);
  assert.equal(estimateTokens(""), 0);
});

test("number formatting", () => {
  assert.equal(fmtTokens(999), "999");
  assert.equal(fmtTokens(1200), "1.2k");
  assert.equal(fmtTokens(123456), "123k");
  assert.equal(pct(1, 4), 25);
});

test("diff parser extracts files, status and new line numbers", () => {
  const diff = [
    "diff --git a/src/a.ts b/src/a.ts",
    "index 111..222 100644",
    "--- a/src/a.ts",
    "+++ b/src/a.ts",
    "@@ -1,3 +1,4 @@",
    " const a = 1;",
    "+const b = 2;",
    " const c = 3;",
    "diff --git a/src/new.ts b/src/new.ts",
    "new file mode 100644",
    "--- /dev/null",
    "+++ b/src/new.ts",
    "@@ -0,0 +1,2 @@",
    "+export const x = 1;",
    "+export const y = 2;",
    "diff --git a/src/old.ts b/src/old.ts",
    "deleted file mode 100644",
    "--- a/src/old.ts",
    "+++ /dev/null",
    "@@ -1,1 +0,0 @@",
    "-old();",
  ].join("\n");
  const p = parseDiff(diff);
  assert.equal(p.files.length, 3);
  assert.equal(p.files[0].status, "M");
  assert.equal(p.files[1].status, "A");
  assert.equal(p.files[2].status, "D");
  const added = p.addedLines.map((l) => l.path + ":" + l.line);
  assert.ok(added.includes("src/a.ts:2"));
  assert.ok(added.includes("src/new.ts:1"));
  assert.ok(added.includes("src/new.ts:2"));
});

test("signal scan finds planted problems and ignores parameterized SQL", () => {
  const added = [
    { path: "src/api.ts", line: 10, text: "const rows = await db.query(\"SELECT * FROM users WHERE id = \" + id);" },
    { path: "src/api.ts", line: 11, text: "const ok = await db.query(\"SELECT * FROM users WHERE id = ?\", [id]);" },
    { path: "src/auth.ts", line: 20, text: "const decoded = jwt.decode(token);" },
    { path: "src/auth.ts", line: 21, text: "try { run(); } catch (error) {}" },
    { path: "src/config.ts", line: 3, text: "const secret = \"hardcoded-value\";" },
    { path: "migrations/001.sql", line: 1, text: "ALTER TABLE users ADD COLUMN role text NOT NULL;" },
  ];
  const hits = scanAdded(added, { max: 20 });
  const rules = hits.map((h) => h.rule);
  assert.ok(rules.includes("sql-concat"));
  assert.ok(rules.includes("jwt-decode"));
  assert.ok(rules.includes("empty-catch"));
  assert.ok(rules.includes("secret-assign"));
  assert.ok(rules.includes("sql-notnull"));
  const sqlConcatHits = hits.filter((h) => h.rule === "sql-concat");
  assert.equal(sqlConcatHits.length, 1, "parameterized SQL must not be flagged");
});

test("accounting attribution sums exactly to saved", () => {
  const manifest = {
    id: "t1", repo: "/tmp/x", repoName: "x", mode: "branch", base: "main",
    stats: { files: 2, sourceFiles: 2, testFiles: 0, additions: 30, deletions: 2, hunks: 2 },
    files: [{ path: "a.ts" }, { path: "b.ts" }],
    sections: { diff: { tokens: 1000 }, signals: { tokens: 200 }, orient: { tokens: 40 }, total: { tokens: 1240 } },
    baseline: {
      fullFilesTokens: 8000, importsTokens: 500,
      callersBaselineTokens: 600, patternBaselineTokens: 900,
      imports: [], callers: [], symbols: [],
    },
    skillTokens: 850,
  };
  const entry = buildEntry(manifest, { findings: 3, severity: { S0: 1, S1: 2, S2: 0 }, reportTokens: 156 });
  const sum = entry.mechanisms.reduce((a, m) => a + m.tokens, 0);
  assert.equal(sum, entry.saved);
  assert.equal(entry.saved, entry.baseline.total - entry.actual.total);
  assert.ok(entry.saved > 0);
});

test("scan cobre os padroes de PHP e Laravel — o stack do cliente", () => {
  const added = [
    { path: "app/Http/Controllers/ChamadoController.php", line: 46, text: '        $sql = "SELECT email FROM clientes WHERE id = " . $chamado->cliente_id;' },
    { path: "app/Http/Controllers/ChamadoController.php", line: 25, text: "        $chamado = Chamado::create($request->all());" },
    { path: "app/Http/Controllers/ChamadoController.php", line: 32, text: "        if (env('NOTIFICAR_CLIENTE') == true) {" },
    { path: "app/Models/Chamado.php", line: 9, text: "    protected $guarded = [];" },
    { path: "app/Repositories/Rel.php", line: 12, text: '        return DB::table("x")->whereRaw("total > $limite")->get();' },
  ];
  const rules = scanAdded(added, { max: 20 }).map((h) => h.rule);
  assert.ok(rules.includes("sql-concat-php"), "SQL concatenado com . em PHP");
  assert.ok(rules.includes("laravel-mass-assign"), "create($request->all())");
  assert.ok(rules.includes("laravel-env-fora-config"), "env() fora de config/");
  assert.ok(rules.includes("laravel-guarded-open"), "$guarded = []");
  assert.ok(rules.includes("laravel-raw"), "whereRaw com interpolacao");
});

test("scan nao acusa env() dentro de config/, onde ele e o uso correto", () => {
  const dentro = scanAdded([{ path: "config/services.php", line: 4, text: "    'token' => env('SERVICO_TOKEN')," }], { max: 20 });
  assert.equal(dentro.filter((h) => h.rule === "laravel-env-fora-config").length, 0);
  const fora = scanAdded([{ path: "app/Jobs/Envia.php", line: 4, text: "        $t = env('SERVICO_TOKEN');" }], { max: 20 });
  assert.equal(fora.filter((h) => h.rule === "laravel-env-fora-config").length, 1);
});

test("as regras de PHP nao disparam em outras linguagens", () => {
  const js = scanAdded([{ path: "src/a.js", line: 1, text: 'const s = "SELECT x FROM y WHERE id = " . id;' }], { max: 20 });
  assert.equal(js.filter((h) => h.rule === "sql-concat-php").length, 0);
});

test("inventario do repo mede o tamanho das mudancas contra o limite de 200-400", async () => {
  const { inventario } = await import("../skills/sensei/scripts/lib/repo.mjs");
  const inv = inventario(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.."));
  assert.ok(inv.arquivos > 0);
  assert.ok(Array.isArray(inv.linguagens));
  if (inv.mudancas) {
    assert.ok(inv.mudancas.mediana >= 0);
    assert.ok(inv.mudancas.acima400Pct >= 0 && inv.mudancas.acima400Pct <= 100);
    assert.ok(inv.mudancas.dentroDoLimitePct >= 0 && inv.mudancas.dentroDoLimitePct <= 100);
  }
  // o inventario nao pode contar arquivo gerado/vendor como linguagem do time
  assert.equal(inv.linguagens.some((l) => l.id === "javascript" && l.arquivos > 1000), false);
});
