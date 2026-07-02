# Skills / Tools to Download or Create

> Companion to [`RECOMMENDED_SKILLS_AND_WORKFLOWS.md`](RECOMMENDED_SKILLS_AND_WORKFLOWS.md).
> That file says *which "hat" to wear and which workflow to run*. **This** file says
> *what to actually install, enable, or create on disk* to make those hats real.
>
> Based on a direct inspection of the current repo (2026-07): `package.json`,
> `scripts/`, `docs/`, `project-knowledge/`, `.gitignore`, and `node_modules/`.

---

## Current setup — what already exists (grounding)

Inspected the project for any skills / agents / tools / workflow system. Findings:

| Capability | Status in repo | Evidence |
|---|---|---|
| **Claude skills folder** (project-local) | **Absent** | No `.claude/skills/` in repo. `.claude/` is git-ignored (`.gitignore` line: `# Local Claude Code agent state … .claude/`). |
| **Claude agents/subagents** (project-local) | **Absent** | No `.claude/agents/`. Only environment/global agents exist. |
| **MCP tool config** | **Absent (project)** | No `.mcp.json` / `mcp` block. Playwright MCP is available at the *session* level only, not committed. |
| **Reusable prompts / workflow templates** | **Partial (as docs)** | `project-knowledge/RECOMMENDED_SKILLS_AND_WORKFLOWS.md` holds personas + workflows A–H as prose. Not executable skills. |
| **QA scripts** | **Codemods only** | `scripts/` has 18 `.mjs` files — all *transformers* (`unify-svg-labels`, `fix-labels-global`, `compact-pass`, `fit-onboarding-diagrams`…). **None render or screenshot for QA.** |
| **Playwright / screenshot testing** | **Not installed** | No `playwright`/`puppeteer` in `node_modules` or `package.json`. Available only as session MCP. |
| **Visual regression testing** | **Absent** | No baseline images, no diff tooling, no `__screenshots__`. |
| **SVG / diagram rendering utility** | **Dependency present, no script** | `sharp` **is installed** (in `node_modules`), matching the memory note *"render scene SVGs with `sharp`"* — but there is **no wrapper script** that uses it for QA. |

**Bottom line:** the project has the *raw ingredient* (`sharp`) and *session access* (Playwright MCP, `/code-review`, `/simplify`, `/verify`), but **nothing committed** that turns them into a repeatable, project-owned QA + skills system. That is the gap this file closes.

---

## Recommended Downloads / Installations

External skills, tools, MCPs, packages, or workflows actually worth enabling. Kept deliberately minimal (per the "don't add heavy tooling" rule).

### Already available — just **enable / use**, nothing to download

| Name | What it is | Why it matters here | Action |
|---|---|---|---|
| **`/code-review`** (built-in skill) | Diff review for bugs + reuse/simplification | The Map & Diagram Kit refactor and RTL sweep need review for logical-props/token compliance | **Use as-is.** `/code-review` on any refactor branch. |
| **`/simplify`** (built-in skill) | Reuse/dedup/altitude cleanup, then applies fixes | 45 scenes hand-roll the same SVG primitives — this is the dedup lever | **Use as-is** when extracting shared diagram primitives. |
| **`/verify`** (built-in skill) | Runs the app and observes real behavior | Confirms a scene edit actually renders correctly, not just compiles | **Use as-is** before commit. |
| **`/run`** (built-in skill) | Launches this app (`npm run dev`) to view a change | Needed for every render-check step in workflows A–H | **Use as-is.** |
| **Playwright MCP** (session tool) | Real-browser navigate + `browser_take_screenshot` at any viewport | The "screenshot at 375px + 1280px" step in workflows A, C, D, H | **Enable per session.** *Assumption:* it is present in the interactive session but **not in headless/cron runs** — confirm before relying on it in automation. |

### Worth installing (small, clearly earns its place)

| Name | Type | Why for this course | Download / install? | Where |
|---|---|---|---|---|
| **`sharp` render QA wrapper** (see "QA Utilities") | Local script, uses already-installed `sharp` | Turns the memory habit ("render SVGs with `sharp`") into a committed, repeatable check | **Create locally** — `sharp` itself is already a dep; nothing new to `npm install` | `scripts/qa/render-svg.mjs` |
| **`playwright` as a devDependency** *(optional, later)* | npm package | Only if you want screenshot QA to run **outside** the Claude session (CI / a committed `npm run qa:shots`). If MCP screenshots suffice, **skip it.** | **Install only if** you need session-independent shots: `npm i -D playwright && npx playwright install chromium` | `devDependencies` + `scripts/qa/` |

> **Do not** install visual-regression frameworks (`reg-suit`, Percy, Chromatic, `jest-image-snapshot`) at this stage — see *What Not to Install*.

---

## Recommended Local Skills / Agents to Create

Everything below is a **project-local Claude agent/skill** — created on disk, not downloaded. Because `.claude/` is currently git-ignored, decide first whether these should be **shared** (recommended — commit them) or kept local (leave ignored). To share, either un-ignore `.claude/agents/` and `.claude/skills/` specifically, or keep the *definitions* as prompt files under `project-knowledge/agents/` and paste them in.

**Recommended location:** `.claude/agents/<name>.md` (one Markdown file per agent, with a short system-prompt body). Each maps 1:1 to a persona in `RECOMMENDED_SKILLS_AND_WORKFLOWS.md` §6 — this file makes them installable.

For each: **Purpose · Why it matters · How to use · Example prompt.**

### 1. Hebrew Instructional Copy Editor
- **Purpose:** Tighten Hebrew to the 18–23 tone; fix typos, duplicated sentences, quote/space normalization.
- **Why:** Real shippable defects found — duplicated sentence in `content/topic-09.md` §9.2, stray `.ד` and `מנווטים"על עיוור"` spacing in `topic-03/CombatNavScene.tsx`; tone runs academic.
- **How to use:** Invoke on any `content/topic-XX.md` edit or Hebrew string change inside a scene.
- **Example prompt:** *"As Hebrew copy editor for ages 18–23: tighten the three `detail` strings in `topic-03/CombatNavScene.tsx`, fix the stray `.ד` and quote spacing, keep military terms. Return shorter Hebrew + a defect list."*
- **Location:** `.claude/agents/hebrew-copy-editor.md`

### 2. Military Geography Content Editor
- **Purpose:** Factual accuracy + domain phrasing (chokepoints, LOC/MSR/ASR, GEOINT, Mahan, ASCM, thermal crossover).
- **Why:** Facts must be right in front of a client; §9.1 (gas / "עמקי מימן") is dense and fact-sensitive.
- **How to use:** On any content/scene text containing domain terms; fact-check, don't rewrite voice.
- **Example prompt:** *"Act as a military-geography editor. Verify the Bab-el-Mandeb / Hormuz oil-percentage and Mahan claims in `content/topic-09.md`; flag anything factually shaky."*
- **Location:** `.claude/agents/military-geo-editor.md`

### 3. Instructional Designer
- **Purpose:** Map each scene to its brief objective + confront its stated misconception; assessment fit.
- **Why:** `docs/instructional-briefs.md` is a strong contract; some scenes explain rather than confront ("שלוחה vs גיא", "Cover vs Concealment").
- **How to use:** Before editing a lesson — produce an objective↔scene gap table.
- **Example prompt:** *"Compare `topic-05` scenes to its brief. Which objective/misconception is stated but never actively tested? Propose a step-reveal fix."*
- **Location:** `.claude/agents/instructional-designer.md`

### 4. Cartographic Design Reviewer
- **Purpose:** Map/diagram legibility, min label size, arrow/route semantics (solid=safe, dashed=exposed), no-mirror-in-RTL.
- **Why:** The course *is* its maps; current diagrams use `text-[2px]`–`text-[3.5px]` + stroke-halo hacks, one content change from illegibility.
- **How to use:** On any `topic-XX/*Scene.tsx` containing `viewBox`; pair with Visual QA.
- **Example prompt:** *"Review the SVG in `CombatNavScene`. List overlap risks and every label under a legible size. Propose a redesign using shared primitives, no stroke-halo hacks."*
- **Location:** `.claude/agents/cartographic-reviewer.md`

### 5. Visual QA Reviewer
- **Purpose:** Judge the **rendered** result, not the code. Overlap, clipping, mirrored diagrams.
- **Why:** Diagram/RTL bugs are invisible in JSX and obvious on screen — the single most common failure mode noted.
- **How to use:** After any scene/diagram/content edit, before commit; drive Playwright MCP + the `sharp` render script.
- **Example prompt:** *"Screenshot `/lessons/topic-03` at 375px and 1280px via Playwright. Report overlapping labels, clipped text, or mirrored diagrams as pass/fail."*
- **Location:** `.claude/agents/visual-qa-reviewer.md`

### 6. RTL QA Reviewer
- **Purpose:** Enforce logical properties (`ms-/me-/start-/end-`); no absolute `right-/left-`; no mirrored maps.
- **Why:** Mostly correct, but `topic-11/DepthScene.tsx` still uses absolute `right-/left-` — needs a sweep.
- **How to use:** As a grep-driven sweep + render check on absolute-positioned overlays.
- **Example prompt:** *"Grep all scenes for absolute `right-`/`left-` and `text-align:left/right`. For each hit, say whether it breaks RTL and give the logical-property fix."*
- **Location:** `.claude/agents/rtl-qa-reviewer.md`

### 7. Interaction Designer
- **Purpose:** Purposeful motion (sequence attention, not decorate); spec the future simulators' feedback loops.
- **Why:** `framer-motion` is everywhere; the promised simulators (`navigation-sim`, `map-explorer`…) are still `InteractionPlaceholder` stubs.
- **How to use:** Design interaction + scoring/feedback *before* code; respect `prefers-reduced-motion`.
- **Example prompt:** *"Design interaction + feedback for `navigation-sim` (back-azimuth resection) per the brief: inputs, scoring, error explanation. Motion that guides attention."*
- **Location:** `.claude/agents/interaction-designer.md`

### 8. Frontend Implementation Reviewer
- **Purpose:** React/TS quality, token compliance, reuse — the "does the code hold up" hat.
- **Why:** The Map & Diagram Kit refactor needs review for logical-props, token usage, duplicated SVG.
- **How to use:** Wrap `/code-review`; focus on RTL + tokens + dedup.
- **Example prompt:** *"Run a code review on my diagram-kit refactor. Focus on RTL logical-props, token usage, and duplicated SVG that should be shared."*
- **Location:** `.claude/agents/frontend-reviewer.md`

### 9. Client Delivery QA Reviewer
- **Purpose:** Final go/no-go before showing the client — build + typos + facts + RTL + legibility + a11y.
- **Why:** One typo or mirror bug undoes all the polish; static export → LMS/SCORM is the delivery target.
- **How to use:** Run workflow H end-to-end; produce a signed checklist or blocker list.
- **Example prompt:** *"Delivery-QA `topic-09`: `npm run build` passes, no typos, facts checked, no RTL mirroring, diagrams legible on mobile. Give me a checklist verdict."*
- **Location:** `.claude/agents/delivery-qa-reviewer.md`

> **Optional 10th — Accessibility/Readability QA** (Priority Low–Medium): alt-text/aria on diagrams, keyboard reachability, AAA contrast. Can be folded into the Delivery QA agent initially; split out only if a11y becomes its own workstream. `.claude/agents/a11y-qa-reviewer.md`.

---

## Recommended QA Utilities

Concrete, low-footprint scripts/checks. Put executables under **`scripts/qa/`** (new folder; keeps QA separate from the existing codemod scripts) and wire `npm` aliases.

### 1. SVG → PNG render check (uses already-installed `sharp`)
- **Purpose:** Render a scene's SVG to PNG so you can confirm it **reads without its labels** (the saved memory rule) and that labels aren't overlapping/sub-legible.
- **Why:** `sharp` is installed but unused for QA; this is the cheapest, highest-value checkpoint.
- **Create:** `scripts/qa/render-svg.mjs` — take an SVG string/file, `sharp(buf).png().resize({width})` to `qa-output/`, at 375px and 1280px-equivalent widths.
- **Command:** `node scripts/qa/render-svg.mjs src/components/lessons/topic-03/CombatNavScene.tsx` → writes `qa-output/topic-03@375.png` + `@1280.png`.
- **Status:** **Create locally.** No new install.

### 2. Playwright page screenshots (mobile + desktop)
- **Purpose:** Screenshot a live `/lessons/topic-XX` page at 375px and 1280px for overlap/clipping/mirroring checks.
- **How (default, no install):** Use the **Playwright MCP** in-session — `browser_resize` → `browser_navigate` → `browser_take_screenshot`. Have the **Visual QA Reviewer** agent drive it.
- **How (optional, committed):** If you need it outside a Claude session, add `playwright` devDep and `scripts/qa/shots.mjs` + `"qa:shots": "node scripts/qa/shots.mjs"`.
- **Command (MCP path):** *"Resize to 375×812, navigate to `http://localhost:3000/lessons/topic-03`, screenshot; repeat at 1280×800."*
- **Status:** **Use MCP as-is** first; install Playwright only if session-independence is required.

### 3. RTL / overlap static checks (grep-level, zero deps)
- **Purpose:** Fast pre-render smell test.
- **Create:** `scripts/qa/rtl-audit.mjs` — flag absolute `right-`/`left-`, `text-left/right`, and `text-[Npx]` where N < a min (e.g. 4) inside `topic-XX/*.tsx`.
- **Command:** `node scripts/qa/rtl-audit.mjs` → prints file:line offenders.
- **Overlap detection:** true geometric overlap detection is hard for hand-placed SVG; **rely on the render check (#1/#2) for overlap** and use this script only to catch sub-legible font sizes. *(Assumption: full automated overlap detection is not worth building now.)*
- **Status:** **Create locally.** No new install.

### 4. Build verification before client delivery
- **Purpose:** Confirm the static export actually builds before a client review.
- **How:** Already available — `npm run build` (Next `output: 'export'`) then spot-check `out/`. Optionally `npm run scorm:package` for the LMS bundle.
- **Command:** `npm run build && ls out` (blocker if it fails).
- **Status:** **Use existing scripts.** Fold into the Delivery QA agent's checklist (workflow H).

> Add to `.gitignore`: `qa-output/` (rendered PNGs are throwaway artifacts).

---

## Priority Order

**Set up first (immediate, low risk, unblocks the daily workflows):**
1. **Create the 3 QA-heavy agents** — Hebrew Copy Editor, Cartographic Reviewer, Visual QA Reviewer. These cover the two quality ceilings (diagrams + Hebrew copy).
2. **Create `scripts/qa/render-svg.mjs`** (sharp) — the render-with-labels-hidden checkpoint.
3. **Confirm Playwright MCP is available** in your session and wire the Visual QA agent to use it.
4. **Decide the `.claude/` sharing question** (commit agents vs keep local) so the team can reuse them.

**Set up second (consistency & maintainability):**
5. **Create Instructional Designer + Frontend Reviewer + RTL QA agents.**
6. **Create `scripts/qa/rtl-audit.mjs`** and add `npm run qa:rtl`.
7. Use `/simplify` + `/code-review` while extracting the **Map & Diagram Kit** (`src/components/diagram/`).

**Later (growth):**
8. **Interaction Designer + Client Delivery QA agents**, once the existing scenes are clean and you start on the real simulators.
9. **Military Geography Content Editor** as an on-demand fact-check hat (create anytime; heaviest use during content passes).
10. **Optional:** committed Playwright `qa:shots` + accessibility agent — only if CI/session-independent QA or a dedicated a11y pass becomes necessary.

---

## What Not to Install

- **Visual-regression frameworks** (Percy, Chromatic, `reg-suit`, `jest-image-snapshot`, Storybook VRT). Overkill for a 12-lesson static course with hand-tuned diagrams — baseline churn would be constant. The `sharp` render + MCP screenshots give you the coverage without the maintenance tax.
- **A second headless-browser stack** (Puppeteer) when Playwright MCP already exists. Don't run two.
- **AI raster/image-generation for maps** (Higgsfield/Canva/Figma image gen for diagrams). Clashes with the crisp SVG/console style and can't stay factually precise or theme-tokened. Maps stay SVG. *(Reserve image-gen, if ever, for non-diagram hero atmosphere only.)*
- **Generic UI-redesign skills** (`ui-ux-pro-max`, `banner-design`, full `design` system generation) applied to the *lessons*. The design system in `docs/design-system.md` is coherent — the job is **enforcement, not replacement**. Using these to restyle would fragment the 12 lessons.
- **Figma / Canva / Google-Drive MCPs** as required tooling. They're available but there's no design-handoff or asset-sync need here; enabling them as project dependencies adds auth surface for no gain. Leave off unless a specific handoff appears.
- **Heavy linters/formatters beyond what exists.** `next lint` is already wired; adding Prettier/ESLint plugin sprawl mid-project risks noisy diffs across 74 scene files.
- **Unverified/hallucinated skills.** *Assumption flag:* I did **not** find a canonical downloadable "Hebrew copy editor" or "cartographic reviewer" skill in a registry — treat these as **local agents to create**, not downloads. If you believe an external one exists, confirm it manually before installing.

---

## Summary

**Download / install:**
- Effectively **nothing new to download.** `sharp` is already installed; `/code-review`, `/simplify`, `/verify`, `/run`, and the Playwright MCP are already available at session level — **enable and use them.**
- **Only optional install:** `playwright` as a devDependency, *and only if* you need screenshot QA to run outside a Claude session (CI / committed `qa:shots`). Otherwise skip it.

**Create locally:**
- **9 project agents** under `.claude/agents/` (one per persona: Hebrew Copy, Military-Geo, Instructional Designer, Cartographic, Visual QA, RTL QA, Interaction, Frontend Reviewer, Client-Delivery QA) — plus an optional a11y agent.
- **QA scripts** under a new `scripts/qa/`: `render-svg.mjs` (sharp render check) and `rtl-audit.mjs` (static RTL/label-size sweep), with `npm run qa:*` aliases. Add `qa-output/` to `.gitignore`.
- Decide whether to **commit `.claude/`** (currently git-ignored) so agents are shared.

**Keep as documentation only:**
- `RECOMMENDED_SKILLS_AND_WORKFLOWS.md` (personas §6 + workflows A–H) — the operating manual the agents implement.
- Build/delivery verification stays a documented checklist (workflow H) using existing `npm run build` / `scorm:package`; no new tool.
- Full automated visual-regression and geometric overlap detection — documented as *intentionally not built*; the render + screenshot checks cover it.

No course content or lesson code was modified by this task.
