#!/usr/bin/env node
// plano-mcp CLI (mcpx): scan -> prontidão -> contrato -> issues.
// Um processo, zero dependências, nenhuma chamada de rede. Desenhado para uso
// por agente: saída compacta, estado vazio explícito, exit 0/1/2, sem prompt.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { scanRepo } from "./lib/repo.mjs";
import { parsePlan, validatePlan, issueBody, shellQuote } from "./lib/plan.mjs";
import { toon, kv, help, fail } from "./lib/out.mjs";

const VERSION = "0.1.0";
const SELF = fileURLToPath(import.meta.url);

const BOOL = new Set(["help", "json", "gh", "version", "full"]);
const VALUE = new Set(["root", "plan", "out", "max-files", "repo", "label"]);

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { out._.push(a); continue; }
    const eq = a.indexOf("=");
    if (eq > 0) { out[a.slice(2, eq)] = a.slice(eq + 1); continue; }
    const key = a.slice(2);
    if (BOOL.has(key)) { out[key] = true; continue; }
    if (VALUE.has(key)) {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) throw fail(2, `--${key} exige um valor`);
      out[key] = v; i++; continue;
    }
    throw fail(2, `flag desconhecida: --${key}`, ["mcpx --help"]);
  }
  return out;
}

const USAGE = `plano-mcp ${VERSION} — avalia um repositório e planeja a implementação de um servidor MCP.

  mcpx scan [--root .] [--json]        inventário do repo: superfície, identidade, testes, riscos
  mcpx issues --plan <arquivo.md>      valida o plano e gera os comandos de criação das issues
                [--gh] [--out <dir>] [--repo owner/name] [--json]
  mcpx doctor                          ambiente e caminhos

Executável: ${SELF}`;

// ---------------------------------------------------------------- scan

function cmdScan(args) {
  const root = path.resolve(args.root || ".");
  if (!fs.existsSync(root)) throw fail(1, `diretório inexistente: ${root}`);
  const maxFiles = args["max-files"] ? Number(args["max-files"]) : undefined;
  const r = scanRepo(root, { maxFiles });

  if (args.json) return JSON.stringify(r, null, 2);

  const out = [];
  out.push(kv([
    ["repo", path.basename(root)],
    ["stack", r.stacks],
    ["framework", r.frameworks],
    ["arquivos", `${r.files} (${r.codeFiles} de código)`],
    ["teste", r.testCommand || "nao detectado"],
    ["mcp_ja_presente", r.mcp],
  ]));
  if (r.truncated) out.push("aviso: varredura truncada no limite de arquivos — use --max-files para ampliar");
  out.push("");

  const surface = args.full ? r.surface : r.surface.slice(0, 12);
  out.push(toon("superficie", surface, ["file", "routes", "verbs", "paginated"]));
  if (!args.full && r.surface.length > surface.length) {
    out.push(`  (${r.surface.length - surface.length} arquivos a mais — use --full)`);
  }
  out.push(`agregado: ${r.totalRoutes} rotas em ${r.surface.length} arquivos; ${r.paginatedFiles} com sinal de paginação`);
  out.push("");

  out.push(toon("identidade", r.auth, ["kind", "count", "where"]));
  out.push("");
  out.push(toon("camada_servico", r.serviceDirs.map((d) => ({ dir: d })), ["dir"]));
  out.push("");
  out.push(toon("risco", dedupeRisks(r.risks), ["kind", "count", "where"]));
  out.push("");
  out.push(kv([
    ["segredos_declarados", r.secretNames.length ? `${r.secretNames.length} nomes (valores nao lidos)` : "nenhum .env encontrado"],
    ["docs_de_contexto", r.agentDocs],
  ]));

  const hints = [];
  if (!r.surface.length) {
    hints.push("nenhuma rota HTTP detectada: confirme se existe API antes de planejar — tela e login nao provam API");
  }
  if (!r.auth.length) {
    hints.push("nenhum sinal de identidade: BLOQUEIO de prontidao — a ferramenta MCP precisa agir como o usuario autenticado");
  }
  if (!r.serviceDirs.length) {
    hints.push("nenhuma camada de servico isolada: o adaptador MCP pode nao ter o que reutilizar");
  }
  if (!r.testCommand) hints.push("comando de teste nao detectado: a evidencia de aceite vai depender de verificacao manual");
  hints.push("proximo: leia references/rubrica-prontidao.md e pontue os 6 eixos com estes sinais");
  hints.push(`depois: mcpx issues --plan <plano.md> --repo <owner/name> --gh`);

  return out.join("\n") + help(hints);
}

function dedupeRisks(risks) {
  const by = new Map();
  for (const r of risks) {
    if (!by.has(r.kind)) by.set(r.kind, { kind: r.kind, count: 0, where: r.where });
    by.get(r.kind).count++;
  }
  return [...by.values()].sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------- issues

function cmdIssues(args) {
  if (!args.plan) throw fail(2, "issues exige --plan <arquivo.md>", ["mcpx issues --plan plano-mcp.md"]);
  const planPath = path.resolve(args.plan);
  if (!fs.existsSync(planPath)) throw fail(1, `plano inexistente: ${planPath}`);

  const issues = parsePlan(fs.readFileSync(planPath, "utf8"));
  const problems = validatePlan(issues);

  if (args.json) {
    return JSON.stringify({ count: issues.length, problems, issues }, null, 2);
  }

  if (problems.length) {
    const out = [
      toon("problemas", problems, ["issue", "problem"]),
      "",
      `agregado: ${problems.length} problema(s) em ${issues.length} issue(s) — nada foi gerado`,
    ];
    const e = fail(1, out.join("\n"), [
      "cada issue precisa de: campos Labels e Estimativa; secoes Contexto, Critério de aceite, Evidência exigida",
      "o criterio de aceite precisa de ao menos um item '- [ ] ...' verificavel",
      "formato completo em references/templates-issues.md",
    ]);
    throw e;
  }

  const outDir = path.resolve(args.out || ".plano-mcp/issues");
  fs.mkdirSync(outDir, { recursive: true });
  const written = [];
  for (const i of issues) {
    const file = path.join(outDir, `issue-${String(i.n).padStart(2, "0")}.md`);
    fs.writeFileSync(file, issueBody(i));
    written.push({ n: i.n, titulo: i.titulo, labels: i.labels.join("|") || "-", depende: i.depende.join("|") || "-", estimativa: i.estimativa, aceite: i.aceite });
  }

  const out = [];
  out.push(toon("issues", written, ["n", "titulo", "labels", "depende", "estimativa", "aceite"]));
  const roots = issues.filter((i) => !i.depende.length).map((i) => i.n);
  out.push("");
  out.push(`agregado: ${issues.length} issues validas, ${issues.reduce((n, i) => n + i.aceite, 0)} critérios de aceite; podem comecar em paralelo: ${roots.join(",") || "-"}`);
  out.push(`corpos gravados em: ${shortPath(outDir)}`);

  if (args.gh) {
    const repoFlag = args.repo ? ` --repo ${shellQuote(args.repo)}` : "";
    const extra = args.label ? ` --label ${shellQuote(args.label)}` : "";
    out.push("");
    out.push("# revise antes de rodar; cada comando e idempotente apenas em relacao ao arquivo de corpo");
    for (const i of issues) {
      const labels = i.labels.map((l) => ` --label ${shellQuote(l)}`).join("");
      const body = path.join(outDir, `issue-${String(i.n).padStart(2, "0")}.md`);
      out.push(`gh issue create${repoFlag} --title ${shellQuote(i.titulo)}${labels}${extra} --body-file ${shellQuote(body)}`);
    }
  }

  const hints = [];
  if (!args.gh) hints.push("adicione --gh para emitir os comandos gh issue create");
  if (args.gh && !args.repo) hints.push("sem --repo, o gh usa o repositorio do diretorio atual");
  hints.push("nenhuma issue foi criada por este comando: os comandos acima sao para voce revisar e rodar");
  return out.join("\n") + help(hints);
}

function shortPath(p) {
  const rel = path.relative(process.cwd(), p);
  return !rel || rel.startsWith("..") ? p : rel;
}

// ---------------------------------------------------------------- doctor

function cmdDoctor() {
  const skill = path.resolve(path.dirname(SELF), "..", "SKILL.md");
  const refs = path.resolve(path.dirname(SELF), "..", "references");
  const rows = [
    { item: "node", valor: process.version, ok: Number(process.versions.node.split(".")[0]) >= 18 },
    { item: "executavel", valor: SELF, ok: fs.existsSync(SELF) },
    { item: "SKILL.md", valor: skill, ok: fs.existsSync(skill) },
    { item: "references", valor: refs, ok: fs.existsSync(refs) },
    { item: "cwd_e_git", valor: fs.existsSync(path.join(process.cwd(), ".git")) ? "sim" : "nao", ok: true },
    { item: "gh", valor: "verifique com: gh auth status", ok: true },
  ];
  const bad = rows.filter((r) => !r.ok);
  const out = [toon("ambiente", rows, ["item", "valor", "ok"]), "", `agregado: ${rows.length - bad.length}/${rows.length} ok`];
  if (bad.length) {
    out.push("");
    throw fail(1, out.join("\n"), ["node 18+ e obrigatorio", "reinstale a skill se SKILL.md ou references faltarem"]);
  }
  return out.join("\n");
}

// ---------------------------------------------------------------- main

function main(argv) {
  const args = parseArgs(argv);
  if (args.version) return VERSION;
  const cmd = args._[0];
  if (args.help && !cmd) return USAGE;

  // Conteúdo primeiro: sem argumento, mostra dado vivo, não a tela de ajuda.
  if (!cmd) {
    return [
      `plano-mcp ${VERSION} — avalia um repositório e planeja a implementação de um servidor MCP.`,
      "",
      cmdScan({ root: "." }),
    ].join("\n");
  }

  switch (cmd) {
    case "scan": return args.help ? USAGE : cmdScan(args);
    case "issues": return args.help ? USAGE : cmdIssues(args);
    case "doctor": return args.help ? USAGE : cmdDoctor(args);
    case "help": return USAGE;
    default: throw fail(2, `comando desconhecido: ${cmd}`, ["mcpx help"]);
  }
}

try {
  const out = main(process.argv.slice(2));
  if (out) process.stdout.write(out + "\n");
  process.exit(0);
} catch (e) {
  // Erro estruturado no stdout: o agente lê a saída, não o canal.
  process.stdout.write(`erro: ${e.message}\n`);
  if (e.hints?.length) process.stdout.write(help(e.hints).replace(/^\n/, "") + "\n");
  process.exit(e.code === 2 ? 2 : 1);
}
