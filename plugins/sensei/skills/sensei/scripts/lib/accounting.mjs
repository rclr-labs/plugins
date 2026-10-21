// Token accounting: the declared baseline, the measured actual, and the
// per-mechanism attribution that explains the saving. Every number in the stats
// report comes from this file, so the formulas are kept in one place.

import fs from "node:fs";
import path from "node:path";
import { estimateFileTokens, pct } from "./tokens.mjs";

// All constants are part of the published methodology (references/contabilidade.md).
export const M = {
  version: 2,
  promptTokens: 80,            // user ask, paid by both baseline and actual
  toolTokens: 140,             // collect summary + record receipt (actual only)
  verboseSummary: 300,         // conventional review: summary + next steps
  verbosePerFinding: 100,      // conventional review: per-finding prose
  compactReportBase: 30,       // our report shell ("3 achados", header)
  compactPerFinding: 42,       // our report: 1-2 lines per finding
  callSiteReadTokens: 120,     // baseline: read one caller with context
  callSiteReadsPerSymbol: 5,   // baseline: up to 5 call sites per symbol
  patternSweepTokens: 450,     // baseline: grep+read risk patterns per file
  patternSweepFilesMax: 20,
  fullFileCapTokens: 40_000,   // per changed file
  fullFilesTotalCapTokens: 400_000,
  pageTokens: 500,
  methods: "v1",
};

export function reportTokensFor(findings, measured = null) {
  if (measured && measured > 0) return measured;
  return M.compactReportBase + M.compactPerFinding * Math.max(0, findings);
}

export function verboseReportTokensFor(findings) {
  return M.verboseSummary + M.verbosePerFinding * Math.max(0, findings);
}

export function baselineFromManifest(manifest, findings) {
  const b = manifest.baseline || {};
  const fullFiles = clamp(b.fullFilesTokens || 0, 0, M.fullFilesTotalCapTokens);
  const imports = b.importsTokens || 0;
  const callers = b.callersBaselineTokens || 0;
  const patterns = b.patternBaselineTokens || 0;
  const report = verboseReportTokensFor(findings);
  const prompt = M.promptTokens;
  return {
    fullFiles,
    imports,
    callers,
    patterns,
    report,
    prompt,
    total: fullFiles + imports + callers + patterns + report + prompt,
  };
}

export function actualFromArgs(args) {
  const s = args.sections || {};
  const diff = s.diff || 0;
  const signals = s.signals || 0;
  const orient = s.orient || 0;
  const report = args.reportTokens || 0;
  const skill = args.skillTokens || 0;
  const reads = args.readsTokens || 0;
  const slices = args.sliceTokens || 0;
  const tool = M.toolTokens;
  const prompt = M.promptTokens;
  // Modo espec: cada especialista e o verificador releem o bundle. O custo extra
  // sao as passadas ALEM da primeira, que ja esta contada em diff+signals+orient.
  const passes = Math.max(1, Number(args.agents) || 1);
  const fanout = (passes - 1) * (diff + signals + orient);
  return {
    diff, signals, orient, report, skill, reads, slices, tool, prompt, fanout, passes,
    total: diff + signals + orient + report + skill + reads + slices + tool + prompt + fanout,
  };
}

export function mechanismsFor(baseline, actual) {
  const rows = [
    { id: "diff_slicing", tokens: baseline.fullFiles - actual.diff },
    { id: "signal_prefilter", tokens: baseline.patterns - actual.signals },
    { id: "caller_index", tokens: baseline.callers - actual.orient },
    { id: "dependency_pruning", tokens: baseline.imports },
    { id: "report_compression", tokens: baseline.report - actual.report },
    { id: "extra_reads", tokens: -(actual.reads + actual.slices) },
    { id: "protocol_overhead", tokens: -(actual.skill + actual.tool) },
    { id: "fanout_especialistas", tokens: -(actual.fanout || 0) },
  ];
  const gross = rows.filter((r) => r.tokens > 0).reduce((a, r) => a + r.tokens, 0);
  return rows.map((r) => ({
    ...r,
    share: gross > 0 ? pct(Math.max(0, r.tokens), gross) : 0,
  }));
}

export function buildEntry(manifest, opts) {
  const findings = Math.max(0, Number(opts.findings) || 0);
  const severity = opts.severity || {};
  const sections = manifest.sections || {};
  const baseline = baselineFromManifest(manifest, findings);
  const actual = actualFromArgs({
    sections: {
      diff: sections.diff ? sections.diff.tokens : 0,
      signals: sections.signals ? sections.signals.tokens : 0,
      orient: sections.orient ? sections.orient.tokens : 0,
    },
    reportTokens: opts.reportTokens,
    skillTokens: manifest.skillTokens || 0,
    readsTokens: opts.readsTokens || 0,
    sliceTokens: opts.sliceTokens || 0,
    agents: opts.agents || 1,
  });
  const mechanics = mechanismsFor(baseline, actual);
  const saved = baseline.total - actual.total;
  const savedPct = baseline.total > 0 ? pct(saved, baseline.total) : 0;
  const sum = mechanics.reduce((a, r) => a + r.tokens, 0);
  if (sum !== saved) {
    throw new Error("atribuicao inconsistente: mecanismos=" + sum + " economia=" + saved);
  }
  return {
    v: M.version,
    id: manifest.id,
    ts: new Date().toISOString(),
    host: opts.host || "cli",
    repo: manifest.repo,
    repoName: manifest.repoName,
    branch: manifest.branch || null,
    base: manifest.base || null,
    mode: manifest.mode || "branch",
    pr: manifest.pr || null,
    diff: {
      files: manifest.files ? manifest.files.length : 0,
      sourceFiles: manifest.stats ? manifest.stats.sourceFiles : 0,
      testFiles: manifest.stats ? manifest.stats.testFiles : 0,
      additions: manifest.stats ? manifest.stats.additions : 0,
      deletions: manifest.stats ? manifest.stats.deletions : 0,
      hunks: manifest.stats ? manifest.stats.hunks : 0,
    },
    findings: {
      total: findings,
      s0: severity.S0 || 0,
      s1: severity.S1 || 0,
      s2: severity.S2 || 0,
      s3: severity.S3 || 0,
    },
    baseline,
    actual,
    saved,
    savedPct,
    mechanisms: mechanics,
    tokensPerFinding: findings > 0 ? Math.round(actual.total / findings) : actual.total,
    estimator: "chars/ratio " + M.methods,
    profile: "standard",
    bundleTokens: sections.total ? sections.total.tokens : 0,
  };
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

export function estimateReads(repo, reads) {
  let total = 0;
  const files = [];
  for (const rel of reads) {
    try {
      const text = fs.readFileSync(path.join(repo, rel), "utf8");
      const t = Math.min(M.fullFileCapTokens, estimateFileTokens(text, rel));
      total += t;
      files.push({ path: rel, tokens: t });
    } catch { /* ignore unreadable */ }
  }
  return { total, files };
}
