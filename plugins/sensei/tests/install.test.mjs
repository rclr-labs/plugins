import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INSTALL = path.join(ROOT, "skills", "sensei", "scripts", "install.sh");
const PS1 = path.join(ROOT, "install.ps1");

function run(cmd, args, cwd, env) {
  return spawnSync(cmd, args, {
    cwd, encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: "1", ...env },
  });
}

function isLink(p) {
  try { return fs.lstatSync(p).isSymbolicLink(); } catch { return false; }
}

test("install.sh installs and uninstalls symlinks for user and project scope", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "rx-inst-"));
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "rx-proj-"));
  try {
    const env = { HOME: home };
    let r = run("bash", [INSTALL, "--scope", "user", "--bin"], project, env);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(isLink(path.join(home, ".agents/skills/sensei")));
    assert.ok(isLink(path.join(home, ".claude/skills/sensei")));
    assert.ok(isLink(path.join(home, ".local/bin/sensei")));

    r = run("bash", [INSTALL, "--scope", "user", "--bin", "--uninstall"], project, env);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(!fs.existsSync(path.join(home, ".local/bin/sensei")));
    assert.ok(!isLink(path.join(home, ".agents/skills/sensei")));

    r = run("bash", [INSTALL, "--scope", "project"], project, env);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(isLink(path.join(project, ".agents/skills/sensei")));
    assert.ok(isLink(path.join(project, ".claude/skills/sensei")));

    r = run("bash", [INSTALL, "--scope", "project", "--uninstall"], project, env);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(!isLink(path.join(project, ".agents/skills/sensei")));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test("install.sh refuses to overwrite a foreign directory without --force", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "rx-inst-"));
  try {
    const dest = path.join(home, ".agents/skills/sensei");
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, "foreign.txt"), "keep");
    const r = run("bash", [INSTALL, "--scope", "user"], home, { HOME: home });
    assert.equal(r.status, 0);
    assert.match(r.stderr, /destino existe e nao e nosso/);
    assert.ok(fs.existsSync(path.join(dest, "foreign.txt")));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("install.ps1 copies and uninstalls on PowerShell (when available)", { skip: spawnSync("pwsh", ["-NoProfile", "-Command", "exit 0"]).status !== 0 }, () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "rx-ps-"));
  try {
    const env = { HOME: home };
    let r = run("pwsh", ["-NoProfile", "-File", PS1, "-Scope", "user", "-Copy"], home, env);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(home, ".agents/skills/sensei/SKILL.md")));
    r = run("pwsh", ["-NoProfile", "-File", PS1, "-Scope", "user", "-Uninstall"], home, env);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(!fs.existsSync(path.join(home, ".agents/skills/sensei")));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});
