TechPrep OS is a 16-week study dashboard for software engineer, data scientist, data analyst, ML engineer, data engineer and GenAI engineer interviews. The interface is minimal and professional: neutral zinc surfaces, hairline borders and one indigo accent, so the lesson, the code and the diagram carry the page. Every surface works in Light and Dark, by keyboard alone, with a screen reader, and with reduced motion.

## Voice and content

- Write to the learner as "you"; the product never says "we". Sentence case everywhere, including buttons and headings.
- Be specific and plain: "Run three sliding-window problems in Python and R" beats "Level up your skills". No hype words, no exclamation marks, no emoji, no em dashes.
- **ELI5 mode** uses a physical analogy, short sentences and everyday words, then always ends with a "Where the analogy breaks" callout (`Callout --limit`). Simple, never false. The same voice runs the code walkthrough ("Explain like I'm 5") and the ELI5 note under every coding problem.
- **Senior mode** states assumptions and invariants first, then mechanism, complexity, trade-offs against named alternatives, failure modes, and a two-to-four sentence interview answer (`Callout --note`).
- Numbers are labelled with what they measure and how. Completion, mastery, confidence and retention are never merged into one score. A readiness value is always called a "learning indicator", links to its formula, and is never phrased as a chance of being hired.
- Prices in lessons (cloud instances, model APIs) are labelled hypothetical, and anything that changes with versions or vendors says to check current documentation.
- Empty states say what to do next in one sentence with one button: "No reviews due. Start today's plan."
- Dates are ISO (`2026-10-07`) in data views and "Wed 7 Oct" in plans. Durations are minutes ("45 min").

## Color

- Page ground is `bg` (near-white zinc in Light, near-black in Dark); cards, the sidebar, popovers and the command palette sit on `surface` with a `border` hairline; wells inside a card (code, console, table headers, meter tracks, the ModeToggle trough, the selected palette row) use `surface-sunken`.
- Body text is `ink`. Secondary text is `ink-muted`, never for anything the learner must act on.
- `brand` (indigo, `#4f46e5` Light, `#818cf8` Dark) is the one accent: the primary button, links, the icon of the current nav item, active flow nodes, edges and travelling pulses, the walkthrough's highlighted line edge, and the Mastery meter. Labels on it use `on-brand`. Selected and highlighted regions use `brand-soft` with `brand-ink` text.
- `accent` (amber) is used sparingly: ELI5 mode, confidence, streaks and review-due counts, with `accent-soft` and `accent-ink` for tinted grounds.
- Status: `positive` (green, always with a check icon or the word) for done, mastered, passing tests and matching output; `caution` for due soon and downloading; `critical` for errors, stderr, failing tests and failure modes. Every status also carries an icon and a word, so color is never the only signal.
- Tracks: `track-core` (weeks 1 to 4), `track-data` (5 to 8), `track-ai` (9, 13 to 15), `track-platform` (10 to 12), `track-capstone` (16). A track color appears only as a small swatch beside the track name.
- Charts use `chart-1` (indigo) and `chart-2` (orange), validated together for lightness, chroma and color-vision-deficiency separation, plus `chart-reference` for plan lines and the calibration diagonal and `chart-grid` for recessive rules. Series colors are never used for text.
- Code uses `syntax-keyword`, `syntax-string`, `syntax-number`, `syntax-comment` and `syntax-function` on `surface-sunken`; comments still clear 4.5:1.
- Text pairs meet 4.5:1 in both themes; control edges (`border-strong`) and the `focus` ring meet 3:1 or better. Check new pairings in both themes before shipping.
- No gradients, no glows, no colored side borders on cards. The only colored edge in the product is the 3px `brand` line on the code walkthrough's highlighted lines.

## Typography

- Inter (`--font-sans`) for the interface; JetBrains Mono (`--font-mono`) for code, console output, keyboard hints and the wordmark's "T". Both are served by Google Fonts. Code turns ligatures off so `!=` and `->` read literally.
- Page titles use `t-title` (26px); section headings `t-heading` (18px); card titles `t-subheading` (15px). `t-display` (36px) appears at most once per page.
- Lesson prose uses `t-body` at 16px with lines under `prose-max` (72ch). Dense tables and side panels use `t-body-sm` (14px). Control labels and table headers use `t-label`; metadata uses `t-caption` in `ink-muted`. Nothing is set below 13px except the 11.5px uppercase section labels in the sidebar and command palette.
- Stat numbers use `t-numeral` (sans, 28px) with tabular figures; code uses `t-code` (13.5px mono).
- Headings are semibold to bold and sentence case. Never all caps, except those small section labels.

## Spacing and layout

- 4px base: `space-1` 4 through `space-8` 64. Card padding `space-5` (`space-4` under 768px); grid gaps `space-4` to `space-5`; between sections `space-6`.
- The sidebar is `sidebar` (240px) wide at 1024px and up, with navigation grouped into Plan, Learn, Practice and Insights; below that it becomes a drawer. A sticky top bar holds search (the command palette), the theme switch and, on phones, the menu button. The content column is at most `content-max` (1120px) and centres on very wide screens (2560px).
- Lesson pages add a table of contents rail at 1280px and up.
- Breakpoints tested: 375px (16px gutters, single column, no horizontal page scroll), 768px, 1280px and 2560px.
- Controls are `control` (36px) tall; toolbar controls `control-sm` (30px); nothing clickable is under `target-min` (24px).

## Shape and elevation

- `radius-sm` (6px) for flow nodes, meter bars and roadmap day tiles; `radius-md` (8px) for buttons, inputs, toggles and palette rows; `radius-lg` (12px) for cards, the CodeRunner, the code walkthrough, the FlowPlayer and the command palette; `radius-pill` for chips only.
- Separate things with `border` hairlines first. `elevation-1` lifts the active ModeToggle segment and flow nodes; `elevation-2` is only for things that float (drawer, command palette, dialogs).

## Motion

- Motion explains a change of state; it never decorates. UI transitions use Motion for React.
- Control feedback takes `duration-fast` (150ms). Panel swaps and client-side page changes take `duration-panel` (220ms): opacity plus a short rise (`shift-panel`, 10px; 8px between pages), with `ease-standard` in and `ease-exit` out. The first page load does not animate.
- The ModeToggle, Run and Explain toggle, and Tabs indicators move with a shared layout animation. Meters fill from zero when they enter. The code walkthrough's highlight band glides between lines on a spring, which is the one place springs are used.
- A FlowPlayer step lasts `duration-step` (1600ms at 1x). Active edges carry a small `brand` pulse that travels from source to target, and a 2px progress bar shows how far through the steps you are. Playback pauses when the tab is hidden.
- Under `prefers-reduced-motion`, or when the learner turns on "Reduce motion" in Settings, all movement stops: panels swap instantly, indicators jump, pulses disappear and active edges stay solid.

## Focus and accessibility

- Every interactive element shows a solid 2px `focus` outline 2px outside its edge on `:focus-visible`.
- Every page starts with a "Skip to content" link, has one `h1`, and uses landmarks (`nav`, `main`, `header`).
- Toggles use `aria-pressed`, tabs use the WAI-ARIA tabs pattern, the command palette uses the combobox and listbox pattern with `aria-activedescendant`, meters use `role="meter"`, and live results (runtime status, test verdicts, flow narration, walkthrough captions, filter counts) use polite live regions.
- Never use color as the only signal: status chips, verdicts, day status and track markers all carry an icon or a word.
- Automated checks run axe for WCAG 2.2 AA on every main route in both themes.

## Iconography

- Icons are Lucide (ISC license), outline style, 2px stroke, `currentColor`, at 16px in controls and chips, 17px in the sidebar and 20px in callouts.
- An icon sits beside a word. Icon-only buttons carry an `aria-label` that names the action, and decorative icons are `aria-hidden`.
- The set in use lives in the Icons group, including `library` for Topics, `baby` for "Explain like I'm 5", `flask-conical` for Run tests and `eye` for Show solution. Add new icons from Lucide only.
- No emoji, no illustrations, no mascots. The wordmark is plain type: a 24px `ink` square holding a mono "T", then "TechPrep" and a small mono "OS" in `ink-muted`. There is no other logo mark.

## Data and charts

- Charts sit in a Card with a `t-subheading` title that states the takeaway and a `t-caption` line that says how the data was computed.
- Two-series charts use `chart-1` and `chart-2` with a legend; a single series needs no legend. Reference lines use `chart-reference`, gridlines `chart-grid`.
- Every chart has a text alternative: a visible summary sentence plus a data table behind a "Show data table" disclosure.

## Practice surfaces

- Coding problems are cards: difficulty and pattern chips, examples in mono on `surface-sunken`, then a "Solve it in Python or R" disclosure that opens a CodeRunner-style workspace with Run tests (primary), Reset, Stop and Show solution. The solution reveals the reference code, an ELI5 note (`Callout --note`) and the complexity.
- Confidence is rated before checking an answer, with five levels from "Guessing" to "Certain"; it feeds calibration in Analytics.
