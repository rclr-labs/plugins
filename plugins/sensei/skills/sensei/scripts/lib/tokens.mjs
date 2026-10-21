// Token estimation and compact number formatting.
// Estimator is deliberately simple and dependency-free: ~chars / ratio, calibrated
// per content kind. It is used only for accounting (baseline vs actual), never for
// billing; the stats output states the +/-10% tolerance.

const RATIOS = {
  code: 3.25,
  diff: 3.35,
  markdown: 3.8,
  prose: 4.0,
  json: 3.0,
  mixed: 3.6,
};

const CODE_EXT = new Set([
  ".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".mts", ".cts",
  ".py", ".rb", ".go", ".rs", ".java", ".kt", ".kts", ".scala",
  ".c", ".h", ".cc", ".cpp", ".hpp", ".cs", ".php", ".swift",
  ".sh", ".bash", ".zsh", ".fish", ".ps1", ".sql", ".graphql", ".gql",
  ".vue", ".svelte", ".astro", ".lua", ".ex", ".exs", ".erl", ".clj",
  ".dart", ".r", ".jl", ".tf", ".hcl", ".yaml", ".yml", ".toml",
]);

const WIDE_RE = /[\u1100-\u11FF\u2E80-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF\u{1F300}-\u{1FAFF}]/gu;

export function kindFor(path = "") {
  const p = String(path).toLowerCase();
  if (p.endsWith(".diff") || p.endsWith(".patch")) return "diff";
  if (p.endsWith(".md") || p.endsWith(".mdx") || p.endsWith(".txt")) return "markdown";
  if (p.endsWith(".json") || p.endsWith(".jsonc") || p.endsWith(".jsonl")) return "json";
  const dot = p.lastIndexOf(".");
  if (dot >= 0 && CODE_EXT.has(p.slice(dot))) return "code";
  return "prose";
}

export function estimateTokens(text, kind = "mixed") {
  if (text === null || text === undefined) return 0;
  const s = String(text);
  if (s.length === 0) return 0;
  const wide = (s.match(WIDE_RE) || []).length;
  const ratio = RATIOS[kind] || RATIOS.mixed;
  return Math.max(1, wide + Math.ceil((s.length - wide) / ratio));
}

export function estimateFileTokens(text, path) {
  return estimateTokens(text, kindFor(path));
}

export function fmtTokens(n) {
  const v = Number(n) || 0;
  const sign = v < 0 ? "-" : "";
  const a = Math.abs(v);
  if (a < 1000) return sign + String(Math.round(a));
  if (a < 10_000) return sign + (a / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  if (a < 1_000_000) return sign + Math.round(a / 1000) + "k";
  return sign + (a / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
}

export function fmtSigned(n) {
  const v = Math.round(Number(n) || 0);
  return (v > 0 ? "+" : v < 0 ? "-" : "") + fmtTokens(Math.abs(v));
}

export function pct(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

export function fmtPct(p) {
  const v = Math.round((Number(p) || 0) * 10) / 10;
  return String(v).replace(/\.0$/, "") + "%";
}

export const TOKEN_RATIOS = RATIOS;
