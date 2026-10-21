/**
 * Shared between the browser runners and the CI fixture runner so that
 * "matches expected" means exactly the same thing in both places.
 */

/** Normalizes program output for comparison: unify newlines, trim line ends and outer blank lines. */
export function normalizeOutput(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "");
}

export function outputsMatch(actual: string, expected: string): boolean {
  return normalizeOutput(actual) === normalizeOutput(expected);
}

/** Appended after a Python sample plus its test functions. Runs every test_* function. */
export const PYTHON_TEST_RUNNER = `
def _techprep_run_tests():
    import traceback
    names = [n for n, f in list(globals().items()) if n.startswith("test_") and callable(f)]
    failed = 0
    for name in names:
        try:
            globals()[name]()
            print(f"PASS {name}")
        except Exception:
            failed += 1
            print(f"FAIL {name}")
            traceback.print_exc()
    print(f"{len(names) - failed} of {len(names)} tests passed")
    if failed:
        raise AssertionError(f"{failed} test(s) failed")

_techprep_run_tests()
`;

/** The testthat expectations R tests may use; the browser shim implements exactly these. */
export const SUPPORTED_R_EXPECTATIONS = [
  "expect_equal",
  "expect_identical",
  "expect_true",
  "expect_false",
  "expect_error",
  "expect_length",
  "expect_null",
  "expect_gt",
  "expect_lt",
  "expect_gte",
  "expect_lte",
  "expect_setequal",
  "expect_match",
] as const;

/**
 * A small testthat-compatible shim (edition 2 semantics: expect_equal uses
 * all.equal with tolerance). The browser uses it so tests run without
 * downloading testthat and its dependencies; CI runs the same tests with the
 * real testthat package.
 */
export const R_TESTTHAT_SHIM = `
.techprep_results <- logical()
.techprep_fail <- function(msg) stop(msg, call. = FALSE)
test_that <- function(desc, code) {
  expr <- substitute(code)
  env <- new.env(parent = parent.frame())
  ok <- tryCatch({ eval(expr, env); TRUE }, error = function(e) {
    cat(sprintf("FAIL %s: %s\\n", desc, conditionMessage(e)))
    FALSE
  })
  if (ok) cat(sprintf("PASS %s\\n", desc))
  .techprep_results <<- c(.techprep_results, ok)
  invisible(ok)
}
expect_equal <- function(object, expected, tolerance = sqrt(.Machine$double.eps), ...) {
  res <- all.equal(expected, object, tolerance = tolerance, ...)
  if (!isTRUE(res)) .techprep_fail(sprintf("%s not equal to %s: %s", deparse(substitute(object)), deparse(substitute(expected)), paste(res, collapse = "; ")))
  invisible(object)
}
expect_identical <- function(object, expected) {
  if (!identical(object, expected)) .techprep_fail(sprintf("%s not identical to %s", deparse(substitute(object)), deparse(substitute(expected))))
  invisible(object)
}
expect_true <- function(object) if (!isTRUE(object)) .techprep_fail(sprintf("%s is not TRUE", deparse(substitute(object)))) else invisible(object)
expect_false <- function(object) if (!isFALSE(object)) .techprep_fail(sprintf("%s is not FALSE", deparse(substitute(object)))) else invisible(object)
expect_null <- function(object) if (!is.null(object)) .techprep_fail(sprintf("%s is not NULL", deparse(substitute(object)))) else invisible(object)
expect_length <- function(object, n) if (length(object) != n) .techprep_fail(sprintf("%s has length %d, not %d", deparse(substitute(object)), length(object), n)) else invisible(object)
expect_gt <- function(object, expected) if (!isTRUE(all(object > expected))) .techprep_fail(sprintf("%s is not > %s", deparse(substitute(object)), format(expected))) else invisible(object)
expect_lt <- function(object, expected) if (!isTRUE(all(object < expected))) .techprep_fail(sprintf("%s is not < %s", deparse(substitute(object)), format(expected))) else invisible(object)
expect_gte <- function(object, expected) if (!isTRUE(all(object >= expected))) .techprep_fail(sprintf("%s is not >= %s", deparse(substitute(object)), format(expected))) else invisible(object)
expect_lte <- function(object, expected) if (!isTRUE(all(object <= expected))) .techprep_fail(sprintf("%s is not <= %s", deparse(substitute(object)), format(expected))) else invisible(object)
expect_setequal <- function(object, expected) if (!setequal(object, expected)) .techprep_fail(sprintf("%s does not have the same elements as %s", deparse(substitute(object)), deparse(substitute(expected)))) else invisible(object)
expect_match <- function(object, regexp) if (!all(grepl(regexp, object))) .techprep_fail(sprintf("%s does not match %s", deparse(substitute(object)), regexp)) else invisible(object)
expect_error <- function(object, regexp = NULL) {
  err <- tryCatch({ object; NULL }, error = function(e) e)
  if (is.null(err)) .techprep_fail("expected an error but none was raised")
  if (!is.null(regexp) && !grepl(regexp, conditionMessage(err))) .techprep_fail(sprintf("error '%s' does not match %s", conditionMessage(err), regexp))
  invisible(err)
}
`;

export const R_TEST_SUMMARY = `
cat(sprintf("%d of %d tests passed\\n", sum(.techprep_results), length(.techprep_results)))
if (!all(.techprep_results)) stop("Some tests failed", call. = FALSE)
`;

/** Program the browser runs for "Run tests". */
export function pythonTestProgram(sample: string, tests: string): string {
  return `${sample}\n\n${tests}\n\n${PYTHON_TEST_RUNNER}`;
}

export function rTestProgram(sample: string, tests: string, useShim = true): string {
  return useShim ? `${R_TESTTHAT_SHIM}\n${sample}\n\n${tests}\n${R_TEST_SUMMARY}` : `library(testthat)\n${sample}\n\n${tests}\n`;
}
