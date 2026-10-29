import { code, defineTopic, edge, node, step } from "../helpers";

/** A runnable graph model accompanies real Git commands; it does not emulate Git. */
export const gitCollaboration = defineTopic({
  id: "w01-d03-git-collaboration",
  slug: "git-collaboration",
  title: "Git: snapshots, branches and safe collaboration",
  domain: "foundations",
  roles: ["sde", "data-scientist", "data-analyst", "ml-engineer", "data-engineer", "genai-engineer"],
  difficulty: "beginner",
  minutes: 45,
  prerequisites: ["w01-d01-python-r-idioms"],
  objectives: [
    "Explain the working tree, staging area, commit, branch, HEAD and remote as different things",
    "Choose a fast-forward, merge or rebase from a commit graph, and resolve conflicts deliberately",
    "Describe a reviewed, tested collaboration workflow and undo a shared mistake safely",
  ],
  summary: "Git stores a history of snapshots. A branch is a movable name for a commit, not a separate folder. Learn to inspect changes, stage a small unit, commit it, fetch remote history, integrate deliberately, run tests and submit a pull request. The runnable exercise studies commit ancestry; the command reference is for a real terminal.",
  eli5: {
    analogy: "You and a friend build a toy castle. A photo records each finished step. A sticky note called a branch points to the latest photo of your version. You can try a new roof while your friend builds a door, then compare both sets of photos before combining the work.",
    steps: [
      "The working tree is the castle you are changing now. Staging chooses which changes go in the next photo.",
      "A commit saves the chosen snapshot with a message and links to earlier commits.",
      "A branch name points to a commit. HEAD says which branch, or which exact commit, you have checked out.",
      "Fetch brings in your friend's latest history. It does not change your castle by itself.",
      "When both people change the same part, read what each intended, combine carefully and test the result.",
    ],
    analogyLimit: "Git stores files, content hashes and parent links, not actual photographs. It can combine many text changes automatically, but a conflict-free combination can still be wrong. A remote is another repository, not a guaranteed backup of uncommitted work.",
  },
  senior: {
    definition: "Git is a distributed version-control system whose commits reference immutable trees and zero or more parents. Branches are mutable references; HEAD usually names the checked-out branch and can instead refer directly to a commit (detached HEAD). The index records the proposed next snapshot separately from the working tree.",
    invariants: [
      "Commit ancestry is a directed acyclic graph. An existing commit does not change when a branch name moves.",
      "A fast-forward is possible only when the current branch tip is an ancestor of the target tip.",
      "Fetch updates remote-tracking references; it does not itself merge them into the checked-out branch.",
      "Secrets must not enter commits. Ignoring a previously tracked file does not remove it from history.",
    ],
    mechanism: [
      "Inspect git status and git diff, stage intentional paths or hunks, inspect git diff --cached and create a focused commit. A local commit is not uploaded until pushed.",
      "Create a short-lived branch, fetch the remote, and compare the branch histories. Fast-forward when only the target advanced; otherwise merge to preserve both histories or rebase private commits onto the updated base.",
      "A merge commit has two or more parents. Rebase copies commits onto a new base, producing new identities; do not rewrite a shared branch without coordination.",
      "Resolve conflicts by understanding both intents, removing conflict markers, staging the resolved files and continuing the operation. Run tests even when Git reports no conflict; use merge --abort or rebase --abort if you need to return to the previous state.",
      "Use revert to add a compensating commit for a mistake already shared. Reset moves a reference and can also change the index or working tree depending on the mode; inspect the mode and save local work before using it. Reflog may help recover recent reference moves but is not a backup policy.",
      "For reproducible analysis, commit code, dependency lockfiles, data version identifiers and small fixtures. Keep credentials and sensitive or large raw datasets outside Git, under appropriate storage controls.",
    ],
    complexity: "The ancestry model below visits V reachable commits and E parent links in O(V + E) time and O(V) space. Real Git operations also depend on object packing, repository size, file content and transport; this model is not a benchmark of Git.",
    tradeoffs: [
      { option: "Merge", choose: "A shared history where preserving branch topology matters.", cost: "Extra merge commits and a less linear history." },
      { option: "Rebase private commits", choose: "A clean local sequence before review.", cost: "Changes commit identities and can repeat conflict resolution; rewriting shared history disrupts collaborators." },
      { option: "Revert", choose: "Undoing a change that other people may already have fetched.", cost: "Adds another commit and may require resolving conflicts with later work." },
    ],
    failureModes: [
      "Treating fetch as if it had integrated changes, or assuming pull uses the same strategy on every machine.",
      "Staging all files without checking for credentials, generated files or unrelated changes.",
      "Accepting one side of a conflict mechanically and losing the other person's requirement.",
      "Force-pushing rewritten shared commits without coordination or checking the remote state.",
    ],
    production: "A pull request connects a small change to its reason, tests and review. Protected branches and CI support that workflow. A passing build is evidence about those checks, not proof that business behavior, migration safety or data privacy is correct.",
    interviewAnswer: "I keep the working tree, index and commit history separate: the index defines the next snapshot, a branch points to a commit, and HEAD identifies my checkout. I fetch before integrating, then choose a fast-forward, merge or private rebase based on ancestry and team policy. I inspect conflicts by intent and run tests afterwards. For a shared mistake I normally revert, preserving a history collaborators can follow.",
  },
  implementation: {
    problem: "Walk a small commit graph and determine whether two branch tips are up to date, fast-forwardable or divergent. This is an ancestry model, not execution of Git commands.",
    input: "A root A, main commits B and C, and a feature commit D whose parent is B; compare main B to C, main C to D, and C to B.",
    python: { code: code`
      PARENTS: dict[str, list[str]] = {"A": [], "B": ["A"], "C": ["B"], "D": ["B"]}

      def ancestors(tip: str) -> set[str]:
          seen: set[str] = set()
          pending = [tip]
          while pending:
              commit = pending.pop()
              if commit not in PARENTS:
                  raise ValueError("unknown commit")
              if commit not in seen:
                  seen.add(commit)
                  pending.extend(PARENTS[commit])
          return seen

      def integration(current: str, target: str) -> str:
          current_history = ancestors(current)
          target_history = ancestors(target)
          if target in current_history:
              return "already contains target"
          if current in target_history:
              return "fast-forward possible"
          return "diverged: choose merge or private rebase"

      for current, target in [("B", "C"), ("C", "D"), ("C", "B")]:
          print(f"{current} -> {target}: {integration(current, target)}")
      print("shared ancestors: " + ",".join(sorted(ancestors("C") & ancestors("D"))))
    ` },
    r: { code: code`
      parents <- list(A = character(), B = "A", C = "B", D = "B")

      ancestors <- function(tip) {
        seen <- character()
        pending <- tip
        while (length(pending)) {
          commit <- pending[[length(pending)]]
          pending <- head(pending, -1)
          if (!commit %in% names(parents)) stop("unknown commit")
          if (!commit %in% seen) {
            seen <- c(seen, commit)
            pending <- c(pending, parents[[commit]])
          }
        }
        seen
      }

      integration <- function(current, target) {
        current_history <- ancestors(current)
        target_history <- ancestors(target)
        if (target %in% current_history) return("already contains target")
        if (current %in% target_history) return("fast-forward possible")
        "diverged: choose merge or private rebase"
      }

      for (pair in list(c("B", "C"), c("C", "D"), c("C", "B"))) {
        cat(sprintf("%s -> %s: %s\n", pair[1], pair[2], integration(pair[1], pair[2])))
      }
      cat(sprintf("shared ancestors: %s\n", paste(sort(intersect(ancestors("C"), ancestors("D"))), collapse = ",")))
    ` },
    expectedOutput: "B -> C: fast-forward possible\nC -> D: diverged: choose merge or private rebase\nC -> B: already contains target\nshared ancestors: A,B",
    tests: {
      python: code`
        def test_ancestry_and_self():
            assert ancestors("C") == {"A", "B", "C"}
            assert integration("C", "C") == "already contains target"

        def test_divergence_is_not_fast_forward():
            assert integration("C", "D").startswith("diverged")
            assert integration("A", "D") == "fast-forward possible"

        def test_unknown_commit_is_rejected():
            try:
                ancestors("missing")
            except ValueError:
                return
            raise AssertionError("unknown commit accepted")
      `,
      r: code`
        test_that("ancestry includes the tip and its parents", {
          expect_setequal(ancestors("C"), c("A", "B", "C"))
          expect_equal(integration("C", "C"), "already contains target")
        })
        test_that("divergence is different from a fast-forward", {
          expect_match(integration("C", "D"), "^diverged")
          expect_equal(integration("A", "D"), "fast-forward possible")
          expect_error(ancestors("missing"), "unknown commit")
        })
      `,
    },
    eli5Trace: ["Start at C and follow its parent B, then A. Keep each photo only once.", "B is already in C's history, so the branch at B can move directly to C.", "C and D share A and B, but neither contains the other. Combining them needs a decision, not just moving a sticky note."],
    complexity: { time: "O(V + E) with hash-based membership; the R character-vector model uses linear membership and can take O(V² + E)", space: "O(V + E) in the pending worklist, O(V) for visited commits", note: "V and E are reachable commits and parent links. This tiny base-R teaching model favors readable code; a hash-based visited set restores linear graph traversal." },
    edgeCases: ["A tip is an ancestor of itself; comparing it to itself requires no integration.", "A merge commit can have multiple parents; visit all of them.", "An unknown commit is rejected. Real shallow clones may need more history before an ancestry decision is possible."],
    incorrect: { language: "python", code: "if PARENTS[target] == [current]:\n    print('fast-forward possible')", whyWrong: "Checking only one immediate parent misses longer ancestor chains and merge commits with multiple parents.", fix: "Check whether the current tip appears anywhere in the target tip's reachable ancestry." },
    walkthrough: [
      { python: "PARENTS:", r: "parents <-", eli5: "Each photo names the earlier photos it came from." },
      { python: "def ancestors(", pythonLines: 11, r: "ancestors <-", rLines: 14, eli5: "Follow earlier photos, remembering what you have seen." },
      { python: "def integration(", pythonLines: 8, r: "integration <-", rLines: 7, eli5: "First check whether the target is already included, then whether the branch can move forward; otherwise the histories split." },
      { python: "for current, target", pythonLines: 3, r: "for (pair", rLines: 4, eli5: "Try three branch comparisons and print their shared history." },
    ],
  },
  referenceSnippet: { language: "shell", label: "Run these in a real terminal inside your repository; the browser exercise above models ancestry only.", code: code`
    git status
    git switch -c feature/small-change
    git diff
    git add path/to/changed-file
    git diff --cached
    git commit -m "Explain the change"
    git fetch origin
    git log --oneline --graph --all
    git merge origin/main
    # Resolve any conflicts, stage resolved paths, then run project tests.
    git push -u origin feature/small-change
    # Open a pull request with context and validation.
  ` },
  flow: {
    title: "A reviewed change from edit to integration",
    nodes: [node("edit", "Working tree", 0, 100), node("stage", "Staged snapshot", 220, 100), node("commit", "Local commit", 440, 100), node("review", "Push and review", 660, 100), node("merge", "Test and integrate", 880, 100)],
    edges: [edge("edit", "stage"), edge("stage", "commit"), edge("commit", "review"), edge("review", "merge")],
    steps: [step("edit", "", "Inspect your edits and keep the change focused."), step("edit stage", "edit-stage", "Choose what belongs in the next snapshot and inspect the staged diff."), step("stage commit", "stage-commit", "Record the snapshot locally with a clear message."), step("commit review", "commit-review", "Push the branch and review its behavior and test results."), step("review merge", "review-merge", "Fetch current history, resolve any integration issues, test the result and merge according to team policy.")],
  },
  practice: [
    { id: "w01-git-recall-1", type: "recall", prompt: "How do fetch, merge and rebase differ?", answer: "Fetch downloads remote objects and updates remote-tracking references. Merge integrates histories, possibly with a new multi-parent commit. Rebase replays commits onto a different base and produces new commit identities.", rubric: ["Fetch does not merge", "Merge preserves ancestry", "Rebase rewrites identities"] },
    { id: "w01-git-case-1", type: "case", prompt: "You discover a defect in a commit already used by teammates. How do you undo it?", answer: "Identify the commit and impact, create a revert on a branch, resolve conflicts with newer changes, test the intended behavior and review the compensating commit. Do not silently rewrite the shared branch; if a secret leaked, rotate it and follow the repository's history-remediation process too.", rubric: ["Revert shared history", "Tests and review", "Secret rotation if relevant"] },
    { id: "w01-git-code-1", type: "code", prompt: "Add merge commit M with parents C and D to the graph. Which commits are its ancestors?", answer: "M, C, D, B and A. The visited set avoids processing the shared B and A twice.", rubric: ["Both parents visited", "Includes tip", "Deduplicates shared ancestry"] },
  ],
  references: [
    { title: "Pro Git: Basic Branching and Merging", url: "https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging", versionSensitive: false },
    { title: "Git reference: git-revert", url: "https://git-scm.com/docs/git-revert", versionSensitive: true },
  ],
  lastReviewed: "2026-10-28",
});
