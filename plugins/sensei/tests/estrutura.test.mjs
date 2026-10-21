// Invariantes do roteador. O defeito que estes testes pegam e sempre o mesmo:
// alguem acrescenta um arquivo de modo ou de linguagem e esquece de registrar,
// e o modo fica inalcancavel sem nenhum erro aparente.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../skills/sensei");
const md = fs.readFileSync(path.join(SKILL, "SKILL.md"), "utf8");

const modosNoDisco = fs.readdirSync(SKILL)
  .filter((f) => f.endsWith(".md") && f !== "SKILL.md")
  .map((f) => f.replace(/\.md$/, ""))
  .sort();

const linguagensNoDisco = fs.readdirSync(path.join(SKILL, "review"))
  .filter((f) => f.endsWith(".md"))
  .map((f) => f.replace(/\.md$/, ""))
  .sort();

const frontmatter = md.slice(0, md.indexOf("---", 4));

test("os modos do disco sao os seis previstos", () => {
  assert.deepEqual(modosNoDisco, ["docs", "espec", "repo", "review", "sec", "sql"]);
});

test("todo modo do disco esta na tabela do roteador", () => {
  for (const m of modosNoDisco) {
    assert.ok(new RegExp("\\|\\s*`" + m + "`\\s*\\|").test(md), `modo ${m} fora da tabela do roteador`);
  }
});

test("a description cita todos os modos — sem isso o acionamento em linguagem natural nao encontra o modo", () => {
  for (const m of modosNoDisco) {
    assert.ok(frontmatter.includes("`" + m + "`"), `modo ${m} ausente da description`);
  }
});

test("a description cita todas as linguagens do review", () => {
  const nomes = { cobol: "COBOL", powershell: "PowerShell", python: "Python", sql: "SQL", php: "PHP", laravel: "Laravel" };
  for (const l of linguagensNoDisco) {
    assert.ok(frontmatter.includes(nomes[l] ?? l), `linguagem ${l} ausente da description`);
  }
});

test("toda linguagem com arquivo e alcancavel pela deteccao do roteador", () => {
  const deteccao = md.slice(md.indexOf("Detecte a linguagem"), md.indexOf("## 4. Revisar"));
  for (const l of linguagensNoDisco) {
    assert.ok(deteccao.includes("`" + l + "`"), `linguagem ${l} tem arquivo mas nao aparece na deteccao`);
  }
});

test("todo modo e linguagem tem conteudo de verdade, nao esqueleto", () => {
  for (const f of [...modosNoDisco.map((m) => `${m}.md`), ...linguagensNoDisco.map((l) => `review/${l}.md`)]) {
    const txt = fs.readFileSync(path.join(SKILL, f), "utf8");
    assert.ok(txt.length > 1200, `${f} curto demais (${txt.length} chars)`);
    // Sem a flag /i de proposito: /TODO/i casaria com a palavra portuguesa "todo",
    // que aparece em quase todo arquivo. Placeholder de verdade vem em caixa alta.
    assert.ok(!/\bTODO\b|\bTBD\b|preencher aqui/.test(txt.split("## Padrões da equipe")[0]), `${f} tem placeholder fora da secao de padroes da equipe`);
  }
});

test("os arquivos por linguagem declaram a precedencia sobre as regras gerais", () => {
  for (const l of linguagensNoDisco) {
    const txt = fs.readFileSync(path.join(SKILL, "review", `${l}.md`), "utf8");
    assert.ok(/vence/.test(txt), `review/${l}.md nao declara que vence review.md em conflito`);
  }
});

test("o roteador manda ler apenas o arquivo do modo", () => {
  assert.match(md, /Leia \*\*apenas\*\* o arquivo do modo escolhido/);
});

test("o roteador pergunta quando nao ha argumento nem contexto", () => {
  assert.match(md, /pergunte qual usar/);
  assert.match(md, /Não escolha por conta própria/);
});

test("a cascata php -> laravel esta declarada no roteador", () => {
  assert.match(md, /review\.md.*review\/php\.md.*review\/laravel\.md/);
  assert.match(md, /o mais específico vence/);
});

test("laravel declara que vence php, nao so as regras gerais", () => {
  const txt = fs.readFileSync(path.join(SKILL, "review", "laravel.md"), "utf8");
  assert.match(txt, /vence os dois/);
});

test("o modo repo exige evidencia medida em toda recomendacao", () => {
  const txt = fs.readFileSync(path.join(SKILL, "repo.md"), "utf8");
  assert.match(txt, /Toda recomendação cita um número do inventário/);
  assert.match(txt, /Dono é pessoa/);
});
