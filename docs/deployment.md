# Deployment and maintenance

TechPrep OS is a static Next.js application. Python and R execute in browser workers. Learner progress stays in the visitor's browser; there is no application database or server-side code runner.

The private Sites deployment is [TechPrep OS](https://techprep-os-namo.namit507.chatgpt.site). Its identity and output directory are tracked in `.openai/hosting.json`. Preserve that identity when updating this site.

## Develop and verify

```sh
nvm use
npm ci
npm run dev
```

Before publishing, run:

```sh
npm run check
npm run build
npm run e2e
npm run e2e:runtime
npm run fixtures
npm run fixtures:webr
npm run export
```

`npm run fixtures` requires Python 3.10+ with numpy and pandas, and R with testthat. Set `PYTHON_BIN` and `RSCRIPT_BIN` to select those interpreters. Use `R_LIBS_USER` for an R library outside the system installation. CI installs these dependencies explicitly. The runtime browser tests need access to the Pyodide and webR CDNs.

`npm run export` creates `out/`, including every lesson, roadmap day, search index, browser worker and client asset. The build tools use `.next/` while compiling and write the export to `out/`. Stop production preview servers before exporting, and rebuild normally before using `npm start` again. Build artifacts, test outputs, local runtime libraries and credentials are ignored by Git.

Static exports use Next.js's supported Webpack build path through `scripts/build-next.mjs`. The normal build uses the default Turbopack path. This avoids the observed stale relative-CSS resolution warnings when switching normal/export modes. Semantic token styles load explicitly in the root layout and declare their CSS layer order.

To verify the exact exported files, set `STATIC_E2E=1 PORT=3102` when running Playwright. The dependency-free local QA server serves `out/` with clean HTML routes and asset content types. CI verifies the static studio and real Python/R runtime smoke tests after exporting. It is a preview server, not an application backend or the production host.

## Publish with Sites

1. Read `.openai/hosting.json` and use the existing `project_id`.
2. Obtain a source write credential for that project through Sites. Credentials belong only in session memory and the source helper's hidden stdin.
3. Use the Sites source helper to open the current checkout. Keep the returned opening result.
4. Complete verification, commit the source and push it to GitHub. Synchronize the same source with the Sites source helper and package the unchanged `out/` artifact.
5. Pass the helper's exact commit SHA and archive to the private save-and-deploy operation. Preserve the current audience. Poll a nonterminal deployment until it succeeds or fails.

GitHub and Sites have separate Git destinations. A GitHub push alone does not update the hosted site. Publish the same verified source to Sites after merging changes. A saved version and deployment response record which source commit is live.

## Maintain the curriculum

The authoring contracts are `lib/curriculum.ts` and `docs/curriculum.schema.json`. Source briefs are archived in `docs/briefs/`. Topic changes must preserve 16 chronological weeks, seven days each, valid prerequisites, equivalent deterministic Python/R fixtures, narrated flows and analogy limits. Link version-sensitive statements to current primary documentation.

`RUNTIME_E2E=all npm run e2e` runs every paired lesson and practice reference solution in the browser runtimes. This is broader than the representative runtime smoke suite and takes longer because it downloads runtimes for each browser context.

## Operational limits

- New runtime sessions require an internet connection for CDN downloads. Reading an already open lesson does not require code execution, but the app does not provide a complete offline cache.
- Progress is local to one browser and origin. Use Settings export/import to move it between devices or deployments.
- A passing self-assessment or learning indicator is not a prediction of interview or hiring outcomes.
- PyTorch examples are labelled read-only. The paired browser programs demonstrate the mathematics without pretending to run PyTorch.
