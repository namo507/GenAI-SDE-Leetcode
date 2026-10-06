import { describe, expect, it } from "vitest";
import { normalizeOutput, outputsMatch, pythonTestProgram, rTestProgram } from "@/lib/runtime/harness";
import { referencedRPackages } from "@/lib/runtime/r";
import { compareSqlResult, sqlProgram } from "@/lib/practice/sql";
import { tokenize } from "@/components/ui/CodeBlock";

describe("output comparison", () => {
  it("ignores line endings, trailing spaces and outer blank lines only", () => {
    expect(normalizeOutput("\r\na: 1  \r\nb: 2\n\n")).toBe("a: 1\nb: 2");
    expect(outputsMatch("x\n", "x")).toBe(true);
    expect(outputsMatch("x y", "x  y")).toBe(false);
    expect(outputsMatch("1.0", "1")).toBe(false);
  });

  it("builds test programs that run the sample before the tests", () => {
    expect(pythonTestProgram("x = 1", "def test_x():\n    assert x == 1")).toMatch(/x = 1[\s\S]*def test_x[\s\S]*_techprep_run_tests\(\)/);
    expect(rTestProgram("x <- 1", "test_that('x', expect_equal(x, 1))")).toMatch(/test_that <- function[\s\S]*x <- 1[\s\S]*tests passed/);
    expect(rTestProgram("x <- 1", "t", false)).toMatch(/^library\(testthat\)/);
  });
});

describe("R package detection", () => {
  it("finds library, require and namespace calls", () => {
    expect(referencedRPackages("library(MASS)\nrequire('survival')\nx <- jsonlite::toJSON(1)").sort()).toEqual(["MASS", "jsonlite", "survival"]);
    expect(referencedRPackages("x <- c(1, 2)")).toEqual([]);
  });
});

describe("SQL drill checking", () => {
  const drill = { expectedColumns: ["name", "revenue"], expectedRows: [["Ada", 100], ["Grace", 198]], orderMatters: false };

  it("accepts any row order when order does not matter, and float noise", () => {
    expect(compareSqlResult({ cols: ["NAME", "revenue"], rows: [["Grace", 198.0000000001], ["Ada", 100]] }, drill).ok).toBe(true);
  });

  it("explains column, row-count and value mismatches", () => {
    expect(compareSqlResult({ cols: ["name"], rows: [] }, drill).reason).toMatch(/Columns should be name, revenue/);
    expect(compareSqlResult({ cols: ["name", "revenue"], rows: [["Ada", 100]] }, drill).reason).toMatch(/Expected 2 rows/);
    expect(compareSqlResult({ cols: ["name", "revenue"], rows: [["Ada", 100], ["Grace", 99]] }, drill).ok).toBe(false);
    expect(compareSqlResult({ cols: ["name", "revenue"], rows: [["Grace", 198], ["Ada", 100]] }, { ...drill, orderMatters: true }).reason).toMatch(/ORDER BY/);
  });

  it("embeds setup and query as escaped Python string literals", () => {
    const program = sqlProgram("CREATE TABLE t (x TEXT);", "SELECT 'a\"b' AS x");
    expect(program).toContain('con.executescript("CREATE TABLE t (x TEXT);")');
    expect(program).toContain(String.raw`cur = con.execute("SELECT 'a\"b' AS x")`);
  });
});

describe("code highlighting", () => {
  it("keeps the source text intact and classifies tokens per language", () => {
    const src = "def f(x):  # note\n    return 'a' + 2";
    const tokens = tokenize(src, "python");
    expect(tokens.map((t) => t.text).join("")).toBe(src);
    expect(tokens.find((t) => t.text === "def")?.type).toBe("keyword");
    expect(tokens.find((t) => t.text === "# note")?.type).toBe("comment");
    expect(tokenize("SELECT a -- c", "sql").find((t) => t.text === "-- c")?.type).toBe("comment");
    expect(tokenize("x <- y - -1", "r").map((t) => t.text).join("")).toBe("x <- y - -1");
  });
});
