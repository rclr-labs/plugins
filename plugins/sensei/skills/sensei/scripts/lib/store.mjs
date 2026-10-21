// Local persistence: one run directory per review, one JSONL ledger for the
// lifetime stats. Everything lives under SENSEI_HOME (~/.sensei).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function homeDir() {
  return process.env.SENSEI_HOME || path.join(os.homedir(), ".sensei");
}

export function ensureHome() {
  const home = homeDir();
  fs.mkdirSync(path.join(home, "runs"), { recursive: true });
  return home;
}

export function runsDir() {
  return path.join(ensureHome(), "runs");
}

export function runDir(id) {
  return path.join(runsDir(), id);
}

export function ledgerPath() {
  return path.join(ensureHome(), "metrics.jsonl");
}

export function newRunId() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const stamp = String(d.getUTCFullYear()) + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) +
    "-" + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds());
  const rand = Math.random().toString(36).slice(2, 6);
  return stamp + "-" + rand;
}

export function writeJson(file, data) {
  const tmp = file + ".tmp-" + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

export function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

export function listRuns() {
  let names = [];
  try { names = fs.readdirSync(runsDir(), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); }
  catch { return []; }
  const runs = [];
  for (const id of names) {
    const dir = runDir(id);
    const manifest = readJson(path.join(dir, "manifest.json"));
    if (!manifest) continue;
    let mtime = 0;
    try { mtime = fs.statSync(dir).mtimeMs; } catch { /* ignore */ }
    runs.push({ id, dir, manifest, recorded: fs.existsSync(path.join(dir, "recorded")), mtime });
  }
  runs.sort((a, b) => b.mtime - a.mtime);
  return runs;
}

export function latestRun(repo = null) {
  const runs = listRuns();
  if (repo) {
    const match = runs.find((r) => r.manifest.repo === repo);
    if (match) return match;
  }
  return runs[0] || null;
}

export function markRecorded(run) {
  try { fs.writeFileSync(path.join(run.dir, "recorded"), new Date().toISOString() + "\n"); } catch { /* ignore */ }
}

export function appendLedger(entry) {
  ensureHome();
  fs.appendFileSync(ledgerPath(), JSON.stringify(entry) + "\n");
}

export function readLedger() {
  let text = "";
  try { text = fs.readFileSync(ledgerPath(), "utf8"); } catch { return []; }
  const out = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const row = JSON.parse(t);
      if (row && row.v && typeof row.saved === "number") out.push(row);
    } catch { /* skip corrupt line */ }
  }
  return out;
}

export function pendingRuns() {
  return listRuns().filter((r) => !r.recorded);
}

export function pruneRuns(keep = 30) {
  const runs = listRuns();
  let removed = 0;
  for (const r of runs.slice(keep)) {
    if (!r.recorded && Date.now() - r.mtime < 24 * 3600 * 1000) continue;
    try { fs.rmSync(r.dir, { recursive: true, force: true }); removed++; } catch { /* ignore */ }
  }
  return removed;
}

export function loadConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(homeDir(), "config.json"), "utf8"));
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

export function repoName(repo) {
  return path.basename(repo || "") || "repo";
}

export function dateOnly(iso) {
  return String(iso || "").slice(0, 10);
}
