/* Dedicated Pyodide module worker. Learner code never runs on the main thread or the server.
 * Current Pyodide releases reject classic workers, so this file is loaded with { type: "module" }.
 * Protocol (postMessage):
 *   in:  { type: "init" } | { type: "run", id, code, allowlist: { importName: packageName } }
 *   out: { type: "status", state, detail } | { type: "stdout" | "stderr", id, text } | { type: "done", id, ok, error? }
 */
const PYODIDE_VERSION = "314.0.7";
const INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let ready = null;
let stdlib = null;
let readyDetail = "Python ready";

function post(msg) {
  self.postMessage(msg);
}

function boot() {
  if (!ready) {
    ready = (async () => {
      post({ type: "status", state: "loading", detail: "Downloading the Python runtime (Pyodide)" });
      const { loadPyodide } = await import(`${INDEX_URL}pyodide.mjs`);
      const pyodide = await loadPyodide({ indexURL: INDEX_URL });
      const version = pyodide.runPython("import sys; sys.version.split()[0]");
      readyDetail = `Python ${version} (Pyodide ${PYODIDE_VERSION})`;
      post({ type: "status", state: "ready", detail: readyDetail });
      return pyodide;
    })();
    ready.catch((err) => {
      ready = null;
      post({ type: "status", state: "error", detail: `Could not load the Python runtime: ${err && err.message ? err.message : err}` });
    });
  }
  return ready;
}

self.onmessage = async (event) => {
  const msg = event.data || {};
  if (msg.type === "init") {
    try {
      await boot();
    } catch {
      /* reported by boot() */
    }
    return;
  }
  if (msg.type !== "run") return;

  const { id, code, allowlist } = msg;
  let pyodide;
  try {
    pyodide = await boot();
  } catch {
    post({ type: "done", id, ok: false, error: "The Python runtime is not available. Check your connection and try again." });
    return;
  }

  // Refuse imports outside the standard library and the allowlist before running anything (fail closed).
  try {
    if (!stdlib) stdlib = new Set(pyodide.runPython("import sys; sorted(sys.stdlib_module_names)").toJs());
    const found = pyodide.pyimport("pyodide.code").find_imports(code);
    const imports = found.toJs();
    found.destroy();
    const blocked = imports.filter((m) => !stdlib.has(m) && !(m in allowlist));
    if (blocked.length) {
      post({
        type: "done",
        id,
        ok: false,
        error: `Import not allowed here: ${blocked.join(", ")}. Allowed packages: ${Object.values(allowlist).join(", ")} and the standard library.`,
      });
      return;
    }
    // Standard-library modules (sqlite3 included in this Pyodide release) are bundled; only third-party packages are loaded.
    const needed = [...new Set(imports.filter((m) => m in allowlist && !stdlib.has(m)).map((m) => allowlist[m]))];
    if (needed.length) {
      post({ type: "status", state: "loading", detail: `Loading ${needed.join(", ")}` });
      await pyodide.loadPackage(needed);
    }
  } catch (err) {
    const text = String(err && err.message ? err.message : err);
    // A SyntaxError surfaces here first; report it like any other error in learner code.
    const lines = text.split("\n").filter(Boolean);
    post({ type: "done", id, ok: false, error: lines.slice(-4).join("\n") || "Could not check the imports in this code." });
    if (pyodide) post({ type: "status", state: "ready", detail: readyDetail });
    return;
  }

  post({ type: "status", state: "running", detail: "Running" });
  pyodide.setStdout({ batched: (text) => post({ type: "stdout", id, text: text + "\n" }) });
  pyodide.setStderr({ batched: (text) => post({ type: "stderr", id, text: text + "\n" }) });
  const globals = pyodide.toPy({ __name__: "__main__" });
  try {
    await pyodide.runPythonAsync(code, { globals });
    post({ type: "done", id, ok: true });
  } catch (err) {
    const text = String(err && err.message ? err.message : err);
    // Keep the traceback from the first frame in learner code; drop Pyodide's internal frames.
    const lines = text.split("\n");
    const first = lines.findIndex((l) => l.includes('File "<exec>"'));
    const clean = first > 0 ? ["Traceback (most recent call last):", ...lines.slice(first)] : lines;
    post({ type: "done", id, ok: false, error: clean.join("\n").trim() });
  } finally {
    globals.destroy();
  }
};
