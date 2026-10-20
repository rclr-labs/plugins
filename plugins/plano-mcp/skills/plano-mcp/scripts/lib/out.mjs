// Saída compacta no estilo TOON: sem chaves, sem aspas, sem vírgula decorativa.
// Linhas de cabeçalho dizem a forma; o agente lê a tabela sem parser.

export function toon(name, rows, cols) {
  if (!rows.length) return `${name}[0]: nenhum`;
  const head = `${name}[${rows.length}]{${cols.join(",")}}:`;
  const body = rows.map((r) => "  " + cols.map((c) => cell(r[c])).join(","));
  return [head, ...body].join("\n");
}

function cell(v) {
  if (v === undefined || v === null || v === "") return "-";
  if (v === true) return "sim";
  if (v === false) return "nao";
  return String(v).replace(/[\r\n]+/g, " ").replace(/,/g, ";");
}

export function kv(pairs) {
  return pairs
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? (v.length ? v.join("|") : "-") : v}`)
    .join("  ");
}

export function help(lines) {
  if (!lines.length) return "";
  return ["", `help[${lines.length}]:`, ...lines.map((l) => "  " + l)].join("\n");
}

export function fail(code, message, hints = []) {
  const e = new Error(message);
  e.code = code;
  e.hints = hints;
  return e;
}
