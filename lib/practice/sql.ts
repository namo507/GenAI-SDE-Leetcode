/**
 * SQL drill execution and checking, shared by the browser (Pyodide's sqlite3)
 * and the CI fixture runner (CPython's sqlite3), so "correct" means the same
 * thing in both places.
 */
import type { SqlDrill } from "@/lib/content-types";

export type Cell = string | number | null;
export type SqlResult = { cols: string[]; rows: Cell[][] };

/** A Python program that runs `query` against `setup` in an in-memory SQLite database and prints JSON. */
export function sqlProgram(setup: string, query: string): string {
  return [
    "import json, sqlite3",
    'con = sqlite3.connect(":memory:")',
    `con.executescript(${JSON.stringify(setup)})`,
    `cur = con.execute(${JSON.stringify(query)})`,
    'print(json.dumps({"cols": [d[0] for d in (cur.description or [])], "rows": [list(r) for r in cur.fetchall()]}))',
  ].join("\n");
}

export const sameCell = (a: unknown, b: unknown) =>
  typeof a === "number" && typeof b === "number" ? Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b)) : a === b;

const show = (row: Cell[]) => `(${row.map((c) => (c === null ? "NULL" : typeof c === "string" ? `'${c}'` : String(c))).join(", ")})`;

export function compareSqlResult(actual: SqlResult, drill: Pick<SqlDrill, "expectedColumns" | "expectedRows" | "orderMatters">): { ok: boolean; reason: string } {
  const want = drill.expectedColumns.map((c) => c.toLowerCase());
  const got = actual.cols.map((c) => c.toLowerCase());
  if (want.join("\u0000") !== got.join("\u0000")) {
    return { ok: false, reason: `Columns should be ${drill.expectedColumns.join(", ")} in that order; your query returned ${actual.cols.join(", ") || "no columns"}.` };
  }
  if (actual.rows.length !== drill.expectedRows.length) {
    return { ok: false, reason: `Expected ${drill.expectedRows.length} rows; your query returned ${actual.rows.length}.` };
  }
  const key = (r: Cell[]) => JSON.stringify(r.map((c) => (typeof c === "number" ? Number(c.toFixed(6)) : c)));
  const a = drill.orderMatters ? actual.rows : [...actual.rows].sort((x, y) => key(x).localeCompare(key(y)));
  const e = drill.orderMatters ? drill.expectedRows : [...drill.expectedRows].sort((x, y) => key(x).localeCompare(key(y)));
  for (let i = 0; i < e.length; i++) {
    const row = a[i]!;
    const exp = e[i]!;
    if (row.length !== exp.length || !row.every((c, j) => sameCell(c, exp[j]))) {
      return {
        ok: false,
        reason: `${drill.orderMatters ? `Row ${i + 1}` : "A row"} differs: expected ${show(exp)}, got ${show(row)}.${drill.orderMatters ? " Check the ORDER BY too." : ""}`,
      };
    }
  }
  const all = e.length === 1 ? "The single row matches" : `All ${e.length} rows match`;
  return { ok: true, reason: `${all}${drill.orderMatters ? ", in order" : ""}.` };
}
