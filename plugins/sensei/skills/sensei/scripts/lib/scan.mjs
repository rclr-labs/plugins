// Deterministic, high-precision signal scan over added lines only.
// The scan is cheap (no model tokens) and replaces the usual "grep around the
// repo looking for trouble" step. False positives are acceptable at this layer
// because the reviewer verifies every signal against the hunk before reporting.

import path from "node:path";

const SEV_ORDER = { S0: 0, S1: 1, S2: 2 };

const RULES = [
  // --- secrets -------------------------------------------------------------
  { id: "secret-aws", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/, sev: "S0", why: "access key AWS", fix: "remover a chave e rotacionar" },
  { id: "secret-key", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/, sev: "S0", why: "chave privada no diff", fix: "remover do repo e rotacionar" },
  { id: "secret-openai", re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b/, sev: "S0", why: "chave de API exposta", fix: "remover e rotacionar" },
  { id: "secret-github", re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/, sev: "S0", why: "token GitHub exposto", fix: "remover e revogar" },
  { id: "secret-live-key", re: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}/, sev: "S0", why: "chave de pagamento no codigo", fix: "remover e rotacionar" },
  { id: "secret-db-url", re: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s"'@]+:[^\s"'@]+@/i, sev: "S0", why: "credencial de banco na URL", fix: "usar secret/env" },
  { id: "secret-const", re: /\b(?:JWT_SECRET|API_KEY|ACCESS_TOKEN|PRIVATE_KEY|CLIENT_SECRET)\s*[:=]\s*["'][^"']{6,}["']/i, sev: "S1", why: "segredo literal no codigo", fix: "mover para env/secret store" },
  { id: "secret-assign", re: /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*["'][^"']{6,}["']/i, sev: "S1", why: "segredo literal no codigo", fix: "mover para env/secret store" },
  { id: "secret-log", re: /console\.(?:log|debug|info)\([^)]*(?:process\.env|secret|password|apiKey|accessToken)/i, sev: "S1", why: "segredo pode vazar no log", fix: "nao logar o valor" },

  // --- injection / execution ----------------------------------------------
  { id: "eval", re: /\beval\s*\(/, sev: "S1", why: "execucao de codigo dinamico", fix: "eliminar eval ou validar entrada", skipComment: true },
  { id: "new-function", re: /\bnew\s+Function\s*\(/, sev: "S1", why: "execucao de codigo dinamico", fix: "eliminar Function", skipComment: true },
  { id: "shell-true", re: /\bshell\s*=\s*True\b/, sev: "S1", why: "shell com interpolacao", fix: "usar lista de args, shell=False", skipComment: true },
  { id: "os-system", re: /\bos\.system\s*\(|\bsubprocess\.(?:call|run|Popen)\([^)]*shell\s*=\s*True/, sev: "S1", why: "execucao de comando", fix: "validar/evitar shell", skipComment: true },
  { id: "sql-concat", re: /\b(?:query|execute|raw|exec)\s*\([^;]{0,300}(?:SELECT|INSERT|UPDATE|DELETE)[^;]{0,300}\+\s*[A-Za-z_$]/i, sev: "S0", why: "SQL montado por concatenacao", fix: "usar parametros/bind", skipComment: true },
  { id: "sql-template", re: /\b(?:query|execute|raw)\s*\(\s*["'\x60][^"'\x60]*(?:SELECT|INSERT|UPDATE|DELETE)[^"'\x60]*\$\{/i, sev: "S0", why: "SQL interpolado em template string", fix: "usar parametros/bind", skipComment: true },
  { id: "sql-fstring", re: /\b(?:execute|query)\s*\(\s*f["'][^"']*(?:SELECT|INSERT|UPDATE|DELETE)/i, sev: "S0", why: "SQL interpolado em f-string", fix: "usar parametros/bind", skipComment: true },
  { id: "sql-percent", re: /\b(?:execute|query)\s*\(\s*["'][^"']*(?:SELECT|INSERT|UPDATE|DELETE)[^"']*["']\s*%\s*/i, sev: "S1", why: "SQL formatado com %", fix: "usar parametros/bind", skipComment: true, exts: [".py"] },
  { id: "sql-concat-php", re: /["'][^"']*(?:SELECT|INSERT|UPDATE|DELETE)[^"']*["']\s*\.\s*\$/i, sev: "S0", why: "SQL concatenado com variavel (PHP)", fix: "usar bind: DB::select($sql, [$id])", skipComment: true, exts: [".php"] },
  { id: "laravel-raw", re: /\b(?:DB::raw|whereRaw|selectRaw|orderByRaw|havingRaw|groupByRaw)\s*\(\s*["'][^"']*(?:\$|\{)/i, sev: "S0", why: "SQL cru com interpolacao", fix: "passar bindings como 2o argumento", skipComment: true, exts: [".php"] },
  { id: "laravel-mass-assign", re: /(?:::create|->(?:fill|update|forceFill))\s*\(\s*\$request->(?:all|input)\s*\(/i, sev: "S1", why: "atribuicao em massa com a entrada inteira", fix: "usar validated() ou only([...])", skipComment: true, exts: [".php"] },
  { id: "laravel-guarded-open", re: /\$guarded\s*=\s*\[\s*\]\s*;/, sev: "S1", why: "$guarded vazio abre todos os campos a atribuicao em massa", fix: "declarar $fillable explicito", skipComment: true, exts: [".php"] },
  { id: "laravel-env-fora-config", re: /(?<![\w$>])env\s*\(\s*["']/, sev: "S1", why: "env() fora de config/: devolve null com config:cache", fix: "ler via config() e declarar em config/", skipComment: true, exts: [".php"], notPathRe: /(^|\/)config\// },

  // --- deserialization / XSS ----------------------------------------------
  { id: "pickle", re: /\bpickle\.loads?\s*\(/, sev: "S1", why: "desserializacao insegura", fix: "nao desserializar dados nao confiaveis", skipComment: true },
  { id: "yaml-load", re: /\byaml\.(?:load|unsafe_load)\s*\(/, sev: "S1", why: "YAML sem Loader seguro", fix: "usar safe_load", skipComment: true },
  { id: "unserialize", re: /\bunserialize\s*\(/, sev: "S1", why: "desserializacao insegura", fix: "usar formato seguro", skipComment: true },
  { id: "xss-html", re: /dangerouslySetInnerHTML|\.innerHTML\s*=|document\.write\s*\(|v-html\s*=/, sev: "S1", why: "HTML nao sanitizado", fix: "sanitizar/serializar como texto", skipComment: true },
  { id: "xss-bypass", re: /bypassSecurityTrust(?:Html|Script|Url)/, sev: "S1", why: "bypass de sanitizacao", fix: "evitar bypass ou sanitizar antes", skipComment: true },

  // --- auth / TLS / crypto -------------------------------------------------
  { id: "jwt-decode", re: /\bjwt\.decode\s*\(/, sev: "S1", why: "JWT decodificado sem verificar assinatura", fix: "usar verify com algoritmo/segredo", skipComment: true },
  { id: "verify-false", re: /verify\s*[:=]\s*(?:false|False)\b|rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0/, sev: "S0", why: "verificacao TLS desligada", fix: "manter verificacao ligada", skipComment: true },
  { id: "jwt-none", re: /algorithms?\s*:\s*\[?\s*["']none["']/i, sev: "S0", why: "algoritmo JWT none aceito", fix: "fixar algoritmo seguro", skipComment: true },
  { id: "weak-hash", re: /\b(?:createHash\s*\(\s*["'](?:md5|sha1)["']|hashlib\.(?:md5|sha1)\s*\(|md5\s*\()/i, sev: "S1", why: "hash fraco para seguranca", fix: "usar sha256+/argon2/bcrypt", skipComment: true },
  { id: "math-random", re: /Math\.random\s*\(/, sev: "S2", why: "random nao criptografico (confirmar uso)", fix: "usar crypto.randomUUID/randomBytes", skipComment: true },
  { id: "cors-wildcard", re: /origin\s*:\s*["']\*["']|Access-Control-Allow-Origin["']?\s*[,:]\s*["']\*/i, sev: "S1", why: "CORS liberado para qualquer origem", fix: "restringir origens", skipComment: true },
  { id: "cookie-flags", re: /httpOnly\s*:\s*false|secure\s*:\s*false/i, sev: "S1", why: "cookie sem httpOnly/secure", fix: "ligar httpOnly e secure", skipComment: true },

  // --- reliability / data --------------------------------------------------
  { id: "empty-catch", re: /catch\s*\([^)]*\)\s*\{\s*\}/, sev: "S1", why: "erro engolido", fix: "tratar/logar/repropagar", skipComment: true },
  { id: "bare-except", re: /^\s*except\s*:\s*$|^\s*except\s+Exception\s*:\s*pass\s*$/, sev: "S1", why: "excecao engolida", fix: "capturar erro especifico", skipComment: true },
  { id: "debugger", re: /^\s*debugger\s*;?\s*$/, sev: "S2", why: "breakpoint esquecido", fix: "remover", skipComment: true },
  { id: "suppression", re: /@ts-ignore|@ts-nocheck|eslint-disable|type:\s*ignore|#\s*noqa/, sev: "S2", why: "supressao de checagem", fix: "corrigir ou justificar com escopo", skipComment: true },
  { id: "unsafe-rust", re: /\bunsafe\s*\{/, sev: "S2", why: "bloco unsafe", fix: "justificar invariantes", skipComment: true },

  // --- database / migrations ----------------------------------------------
  { id: "sql-notnull", re: /\bADD\s+COLUMN\b[^;]*\bNOT\s+NULL\b/i, sev: "S1", why: "coluna NOT NULL sem default pode quebrar", fix: "default + backfill ou passo separado", skipComment: true },
  { id: "sql-drop", re: /\b(?:DROP\s+TABLE|TRUNCATE\s+TABLE)\b/i, sev: "S1", why: "operacao destrutiva", fix: "confirmar migracao/rollback", skipComment: true },
  { id: "sql-delete-all", re: /\bDELETE\s+FROM\s+[\w."]+\s*(?:;|$)/i, sev: "S1", why: "DELETE sem WHERE", fix: "adicionar WHERE ou confirmar intencao", skipComment: true },
  { id: "sql-update-all", re: /\bUPDATE\s+[\w."]+\s+SET\b[^;]*?(?:;|$)/i, sev: "S2", why: "UPDATE sem WHERE explicito (confirmar)", fix: "adicionar WHERE", skipComment: true },

  // --- request handling ----------------------------------------------------
  { id: "ssrf-fetch", re: /\b(?:fetch|axios\.(?:get|post|put|delete)|requests\.(?:get|post))\s*\(\s*req\.(?:query|body|params)/, sev: "S1", why: "URL controlada pelo cliente (SSRF)", fix: "validar allowlist de hosts", skipComment: true },
  { id: "open-redirect", re: /\bredirect\s*\(\s*req\.(?:query|body|params)/, sev: "S1", why: "redirect aberto", fix: "validar destino", skipComment: true },
  { id: "path-traversal", re: /\b(?:readFile|readFileSync|createReadStream|sendFile)\s*\([^)]*req\./, sev: "S1", why: "caminho controlado pelo cliente", fix: "normalizar e limitar ao diretorio", skipComment: true },
  { id: "mass-assign", re: /\bObject\.assign\s*\([^,]+,\s*req\.body|\.\.\.req\.body/, sev: "S1", why: "mass assignment", fix: "selecionar campos permitidos", skipComment: true },
  { id: "csrf-disabled", re: /csrf\s*:\s*false|@csrf_exempt|csrf_exempt\s*\(/, sev: "S1", why: "protecao CSRF desligada", fix: "manter CSRF ou justificar", skipComment: true },
];

function isComment(text) {
  const t = text.trim();
  return t.startsWith("//") || t.startsWith("#") || t.startsWith("/*") ||
    t.startsWith("*") || t.startsWith("--") || t.startsWith("<!--");
}

export function scanAdded(addedLines, opts = {}) {
  const max = opts.max || 40;
  const hits = [];
  const seen = new Set();
  for (const rec of addedLines) {
    const text = rec.text || "";
    if (!text.trim()) continue;
    const ext = path.extname(rec.path || "").toLowerCase();
    for (const rule of RULES) {
      if (rule.skipComment && isComment(text)) continue;
      if (rule.exts && !rule.exts.includes(ext)) continue;
      if (rule.notPathRe && rule.notPathRe.test(rec.path || "")) continue;
      if (!rule.re.test(text)) continue;
      const key = rec.path + ":" + rec.line + ":" + rule.id;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({
        rule: rule.id,
        file: rec.path,
        line: rec.line,
        sev: rule.sev,
        why: rule.why,
        fix: rule.fix,
        text: text.trim().slice(0, 110),
      });
      if (hits.length >= max * 2) break;
    }
    if (hits.length >= max * 2) break;
  }
  hits.sort((a, b) => (SEV_ORDER[a.sev] - SEV_ORDER[b.sev]) || a.file.localeCompare(b.file) || (a.line - b.line));
  return hits.slice(0, max);
}

export function groupSignals(signals) {
  const byRule = new Map();
  for (const s of signals) {
    const cur = byRule.get(s.rule) || { rule: s.rule, sev: s.sev, why: s.why, fix: s.fix, count: 0, files: new Set() };
    cur.count++;
    cur.files.add(s.file);
    byRule.set(s.rule, cur);
  }
  return [...byRule.values()].sort((a, b) => (SEV_ORDER[a.sev] - SEV_ORDER[b.sev]) || b.count - a.count);
}
