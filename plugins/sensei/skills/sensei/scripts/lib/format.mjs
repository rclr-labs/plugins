// Output helpers: language, colors, compact numbers and sparklines.
// Kept tiny so the CLI itself stays token-cheap.

import { fmtTokens, fmtPct } from "./tokens.mjs";

const ESC = "\u001b[";
const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR && process.env.TERM !== "dumb";

function c(code, text) {
  if (!useColor) return String(text);
  return ESC + code + "m" + text + ESC + "0m";
}

export const color = {
  bold: (t) => c("1", t),
  dim: (t) => c("2", t),
  green: (t) => c("32", t),
  yellow: (t) => c("33", t),
  red: (t) => c("31", t),
  cyan: (t) => c("36", t),
};

export function detectLang(explicit) {
  if (explicit === "pt" || explicit === "en") return explicit;
  if (process.env.SENSEI_LANG === "pt" || process.env.SENSEI_LANG === "en") return process.env.SENSEI_LANG;
  if (process.env.SENSEI_LANG === "pt" || process.env.SENSEI_LANG === "en") return process.env.SENSEI_LANG;
  const loc = String(process.env.LC_ALL || process.env.LANG || "").toLowerCase();
  return loc.startsWith("pt") ? "pt" : "en";
}

export function L(lang) {
  const pt = lang === "pt";
  return {
    lang,
    reviews: pt ? "revisões" : "reviews",
    findings: pt ? "achados" : "findings",
    since: pt ? "desde" : "since",
    tokens: pt ? "tokens" : "tokens",
    baseline: pt ? "baseline" : "baseline",
    actual: pt ? "real" : "actual",
    saved: pt ? "economia" : "saved",
    savedPct: pt ? "economizado" : "saved",
    perReview: pt ? "por revisão" : "per review",
    perFinding: pt ? "por achado" : "per finding",
    why: pt ? "Por que economizou" : "Why it saved",
    trend: pt ? "Últimos 6 meses" : "Last 6 months",
    topRepos: pt ? "Principais repos" : "Top repos",
    pending: pt ? "revisões sem registro" : "unrecorded reviews",
    avg: pt ? "média" : "avg",
    total: pt ? "total" : "total",
    range: pt ? "intervalo" : "range",
    method: pt
      ? "estimativa ±10%; baseline é um protocolo declarado, real é medido (bundle + SKILL.md + leituras)"
      : "estimate ±10%; baseline is a declared protocol, actual is measured (bundle + SKILL.md + reads)",
    noData: pt
      ? "0 revisões registradas. Rode /revisar em um repositório git para começar."
      : "0 reviews recorded. Run /revisar in a git repository to start.",
    noWindow: pt ? "0 revisões no intervalo." : "0 reviews in range.",
    receipt: pt ? "registrado" : "recorded",
    diff: pt ? "diff" : "diff",
    bundle: pt ? "bundle" : "bundle",
    profile: pt ? "perfil" : "profile",
    lifetime: pt ? "acumulado" : "lifetime",
    files: pt ? "arquivos" : "files",
    lines: pt ? "linhas" : "lines",
    next: pt ? "próximo" : "next",
    bundleHint: pt
      ? "leia o bundle e revise; depois registre com record"
      : "read the bundle and review; then record",
    empty: pt ? "sem mudanças para revisar" : "no changes to review",
    pendingHint: pt
      ? "rode record --run <id> para contabilizar"
      : "run record --run <id> to account for it",
    days: pt ? "dias" : "days",
    pages: pt ? "páginas" : "pages",
    savedLabel: pt ? "economia" : "saved",
    mechanisms: {
      diff_slicing: pt ? "só os hunks, não os arquivos inteiros" : "hunks only, not whole files",
      signal_prefilter: pt ? "varredura determinística no script" : "deterministic script scan",
      caller_index: pt ? "índice de call sites em vez de lê-los" : "call-site index instead of reading them",
      dependency_pruning: pt ? "imports de 1º grau não lidos" : "1-hop imports not read",
      report_compression: pt ? "relatório compacto (1–2 linhas/achado)" : "compact report (1–2 lines/finding)",
      extra_reads: pt ? "leituras extras durante a revisão" : "extra reads during review",
      protocol_overhead: pt ? "protocolo (SKILL.md + chamadas)" : "protocol (SKILL.md + calls)",
      fanout_especialistas: pt ? "fan-out do modo fundo (releitura por especialista)" : "deep-mode fan-out (bundle re-read per specialist)",
    },
  };
}

export function sparkline(values) {
  const chars = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
  const max = Math.max(1, ...values);
  return values.map((v) => chars[Math.max(0, Math.min(chars.length - 1, Math.round((v / max) * (chars.length - 1))))]).join("");
}

export function splitPct(saved, baseline) {
  if (!baseline) return "0%";
  return fmtPct((saved / baseline) * 100);
}

export function pad(s, n) {
  const str = String(s);
  return str.length >= n ? str : str + " ".repeat(n - str.length);
}

export { fmtTokens, fmtPct };
