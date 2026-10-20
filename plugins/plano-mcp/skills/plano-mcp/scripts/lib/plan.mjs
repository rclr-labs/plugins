// Parser e validador do plano de issues. O formato é markdown porque o plano é
// lido por humano; a validação é determinística porque o agente não deve
// "achar" que o plano está completo.

const ISSUE_RE = /^##\s+Issue\s+(\d+)\s+—\s+(.+?)\s*$/;
const FIELD_RE = /^-\s+\*\*(.+?):\*\*\s*(.*)$/;
const SECTION_RE = /^###\s+(.+?)\s*$/;

const REQUIRED_SECTIONS = ["Contexto", "Critério de aceite", "Evidência exigida"];
const REQUIRED_FIELDS = ["Labels", "Estimativa"];

export function parsePlan(text) {
  const lines = text.split("\n");
  const issues = [];
  let cur = null;
  let section = null;

  const pushSection = () => { section = null; };

  for (const line of lines) {
    const mi = ISSUE_RE.exec(line);
    if (mi) {
      pushSection();
      cur = {
        n: Number(mi[1]),
        titulo: mi[2],
        fields: {},
        sections: {},
        order: issues.length,
      };
      issues.push(cur);
      continue;
    }
    if (!cur) continue;

    const ms = SECTION_RE.exec(line);
    if (ms) { section = ms[1]; cur.sections[section] = cur.sections[section] || []; continue; }

    const mf = FIELD_RE.exec(line);
    if (mf && !section) { cur.fields[mf[1]] = mf[2].trim(); continue; }

    if (section) cur.sections[section].push(line);
  }

  for (const i of issues) {
    for (const k of Object.keys(i.sections)) {
      i.sections[k] = i.sections[k].join("\n").trim();
    }
    i.labels = splitList(i.fields.Labels);
    i.depende = splitList(i.fields["Depende de"]).filter((d) => d !== "-" && d !== "—");
    i.estimativa = i.fields.Estimativa || "";
    i.aceite = countChecks(i.sections["Critério de aceite"]);
  }
  return issues;
}

function splitList(v) {
  if (!v) return [];
  return v.split(/[,|]/).map((s) => s.trim()).filter(Boolean);
}

function countChecks(body) {
  if (!body) return 0;
  return (body.match(/^\s*-\s+\[\s?\]/gm) || []).length;
}

export function validatePlan(issues) {
  const problems = [];
  if (!issues.length) {
    problems.push({ issue: "-", problem: "plano sem nenhuma issue (esperado '## Issue N — titulo')" });
    return problems;
  }
  const numbers = new Set(issues.map((i) => i.n));
  for (const i of issues) {
    for (const f of REQUIRED_FIELDS) {
      if (!i.fields[f]) problems.push({ issue: i.n, problem: `campo obrigatorio ausente: ${f}` });
    }
    for (const s of REQUIRED_SECTIONS) {
      if (!i.sections[s]) problems.push({ issue: i.n, problem: `secao obrigatoria ausente: ${s}` });
      else if (i.sections[s].length < 10) problems.push({ issue: i.n, problem: `secao vazia ou curta demais: ${s}` });
    }
    if (i.aceite === 0) problems.push({ issue: i.n, problem: "criterio de aceite sem item verificavel ('- [ ] ...')" });
    for (const d of i.depende) {
      const dn = Number(d.replace(/[^0-9]/g, ""));
      if (!dn || !numbers.has(dn)) problems.push({ issue: i.n, problem: `depende de issue inexistente: ${d}` });
      if (dn === i.n) problems.push({ issue: i.n, problem: "depende de si mesma" });
      if (dn > i.n) problems.push({ issue: i.n, problem: `depende de issue posterior (${d}): a ordem nao fecha` });
    }
    if (/TODO|TBD|\.\.\.$/.test(i.titulo)) problems.push({ issue: i.n, problem: "titulo com placeholder" });
  }
  return problems;
}

export function issueBody(i) {
  const parts = [];
  if (i.sections.Contexto) parts.push("## Contexto\n\n" + i.sections.Contexto);
  if (i.sections["Critério de aceite"]) parts.push("## Critério de aceite\n\n" + i.sections["Critério de aceite"]);
  if (i.sections["Evidência exigida"]) parts.push("## Evidência exigida\n\n" + i.sections["Evidência exigida"]);
  for (const [k, v] of Object.entries(i.sections)) {
    if (REQUIRED_SECTIONS.includes(k)) continue;
    parts.push(`## ${k}\n\n${v}`);
  }
  const meta = [];
  if (i.estimativa) meta.push(`Estimativa: ${i.estimativa}`);
  if (i.depende.length) meta.push(`Depende de: ${i.depende.join(", ")}`);
  if (meta.length) parts.push("---\n\n" + meta.join(" · "));
  return parts.join("\n\n") + "\n";
}

export function shellQuote(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}
