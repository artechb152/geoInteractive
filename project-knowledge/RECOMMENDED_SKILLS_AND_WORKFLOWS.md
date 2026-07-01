# Recommended Skills & Workflows — Military Geography Course (Geo9900)

> A practical, project-specific guide to which AI assistance, design, content, and QA
> capabilities will most improve this course — and how to use them.
>
> Based on a direct read of the actual files: `content/topic-01..12.md`,
> `docs/instructional-briefs.md`, `docs/design-system.md`, the 12 lesson component
> folders under `src/components/lessons/topic-XX/`, the shared `src/components/lesson/`
> shell, `src/lib/lessons.ts`, and the interaction placeholders.
> This report does **not** modify any code or content.

---

## What this project actually is (grounding the recommendations)

- **Stack:** Next.js + React + TypeScript + Tailwind, static-exported (`output: 'export'`) and wrapped as SCORM 1.2 for an LMS (`docs/scorm-packaging.md`). No backend.
- **Audience & language:** Hebrew, RTL, ages 18–23, mostly no prior military-geography background. Dark-first "military console" aesthetic (`docs/design-system.md`).
- **Content:** 12 topic markdown files of dense, fairly academic Hebrew prose (see `content/topic-09.md`). A 13th lesson (GIS) is planned in the briefs but has no content file yet.
- **Lesson delivery reality:** Each lesson is a hand-built sequence of "Scene" React components — `HookScene`, `OnboardingScene`, several teaching scenes, `RecapScene` — using `framer-motion` (74 files) and **hand-coded inline SVG diagrams** (58 files contain `viewBox`; 45 hand-place `textAnchor` labels). This is the visual heart of the course.
- **The big gap:** The signature *interactive simulators* promised in the briefs (`map-explorer`, `navigation-sim`, `los-simulator`, `chokepoint-map`, `sensor-fusion`, …) are still `InteractionPlaceholder` stubs (`src/components/interactive/InteractionPlaceholder.tsx`). The rich scenes teach; the "hands-on practice" layer is mostly unbuilt.

### Concrete weak spots found in the files (evidence, not assumptions)

1. **Fragile SVG diagram legibility.** Diagrams draw text at `text-[2px]`–`text-[3.5px]` inside a `100×75` viewBox (e.g. `topic-03/CombatNavScene.tsx`), then paper over collisions with a white `paintOrder`/`stroke` halo hack repeated on every label. It works, but it is per-label manual tuning with no shared primitive — high risk of overlap/illegibility when content changes. This matches your saved memory: *"illustrations must read without their labels; render scene SVGs with `sharp` to check."*
2. **Massive pattern duplication.** A/B endpoint markers, dashed "exposed" vs solid "safe" routes, `Swatch`/legend blocks, `chip` callouts, `ConclusionCard`, and "visual board" wrappers are re-implemented per lesson (45 scenes hand-roll SVG labels). No shared diagram/legend/marker component library beyond `SceneHeader`.
3. **Hebrew copy defects.** Real, shippable-bug examples: a **duplicated sentence** in `content/topic-09.md` §9.2 ("הגיאוגרפיה הימית של העולם כוללת אזורים צרים ורגישים…" appears twice in one paragraph); a **stray letter** `…ליעד המתוכנן.ד` and **missing spaces around quotes** `מנווטים"על עיוור"` in `topic-03/CombatNavScene.tsx` strings. Content is also denser/more academic than the stated 18–23 tone.
4. **RTL correctness is mostly good but not uniform.** The design system mandates logical properties (`ms-/me-/start-/end-`), and most scenes follow it — but `topic-11/DepthScene.tsx` still uses absolute `right-/left-` positioning, the exact pattern that breaks or mirrors incorrectly in RTL.
5. **No automated visual/rendered-output QA.** Diagrams and RTL layout are verified by eye. There is a `playwright` MCP available and a `sharp`-render habit in memory, but no repeatable checkpoint.

Everything below is aimed at these five realities.

---

## 1. Executive Summary

The course's quality ceiling is set by **two things: the clarity of its hand-drawn SVG diagrams/maps, and the clarity of its Hebrew instructional copy** — not by its framework or styling, which are already solid. Therefore the highest-value skills are **cartographic/diagram design paired with rendered-output visual QA**, and **Hebrew instructional copy editing paired with instructional design**. A close third is **React component refactoring** to turn the 45 duplicated diagram patterns into a small reusable "map/diagram kit," because that multiplies the impact of every future design fix.

Skills that make this course *feel* more professional to a client are the ones that improve **signal per pixel**: fewer words on screen, bigger and never-overlapping labels, consistent legends, correct RTL, and diagrams that read at a glance. Generic UI restyling and decorative animation will *not* move the needle and risk breaking a coherent, already-good design system.

**One-line verdict:** invest in *diagram clarity + Hebrew copy + a reusable map kit*, validate everything by *rendering the actual output*, and treat the unbuilt interactive simulators as the main growth project once the existing scenes are clean.

---

## 2. Highest-Value Skills to Use (ranked)

### 1. Cartographic / Diagram Design Clarity — **Priority: High**
- **Why it matters:** The course *is* its maps, routes, arrows and terrain diagrams. Every scene lives or dies on whether a 19-year-old grasps the picture in 3 seconds. Current diagrams use 2px text and halo hacks — one content change from illegibility.
- **Where:** Every `topic-XX/*Scene.tsx` that contains an SVG (`CombatNavScene`, `topic-02/ContoursScene`, `topic-09` chokepoint visuals, `topic-05` mobility, `topic-06` LOS).
- **Example tasks:** Redesign the handrail/dead-reckoning/pace diagrams so labels never collide without needing stroke halos; standardize arrowheads and route styling (solid=safe, dashed=exposed) across all lessons; set a minimum on-screen label size.
- **Impact:** Largest single lever on perceived professionalism and comprehension.

### 2. Rendered-Output Visual QA — **Priority: High**
- **Why it matters:** Diagram and RTL bugs are invisible in source and obvious on screen. You already know this (memory: render SVGs with `sharp`). The `playwright` MCP can screenshot real pages.
- **Where:** After any scene/diagram/content edit, before commit.
- **Example tasks:** Screenshot each scene at mobile + desktop widths; verify no label overlap; verify maps are **not** mirrored in RTL; diff before/after.
- **Impact:** Prevents "looked fine in code, broken in the LMS" regressions. Cheap, repeatable.

### 3. Hebrew Instructional Copy Editing — **Priority: High**
- **Why it matters:** Content is academic and occasionally defective (duplicated sentence in `topic-09`, stray `.ד`, missing quote spacing in `topic-03`). Tone is above the 18–23 target.
- **Where:** `content/topic-XX.md` and hard-coded Hebrew strings inside scene components.
- **Example tasks:** Tighten §9.1 natural-gas / "עמקי מימן" wording; fix duplicated chokepoint sentence; normalize quotes/spacing; shorten `detail` blocks in `CombatNavScene`.
- **Impact:** Immediate credibility; fewer embarrassing typos in front of a client.

### 4. Instructional Design (scene → learning) — **Priority: High**
- **Why it matters:** `docs/instructional-briefs.md` is a strong contract (measurable objectives, common misconceptions). The scenes should map 1:1 to those objectives and misconceptions; some lean explanatory rather than get-it-wrong-then-learn.
- **Where:** Scene ordering and the (still-placeholder) practice layer.
- **Example tasks:** Ensure each lesson's misconception ("שלוחה vs גיא", "Cover vs Concealment") is *actively confronted*, not just stated; convert static explanation scenes into step-reveal.
- **Impact:** Turns pretty pages into measurable learning (Kirkpatrick L2).

### 5. React / Component Refactoring (a "Map & Diagram Kit") — **Priority: High**
- **Why it matters:** 45 scenes re-implement A/B markers, routes, legends, `Swatch`, callouts. A shared kit makes every future clarity fix apply everywhere at once.
- **Where:** New `src/components/diagram/` (e.g. `<MapFrame>`, `<Route>`, `<Marker>`, `<Legend>`, `<Arrow>`, `<Label>` with auto-halo + min-size).
- **Example tasks:** Extract the `CombatNavScene` legend/`Swatch`/board wrapper into shared primitives; migrate two scenes as proof.
- **Impact:** Force-multiplier; lowers cost of skills #1–#2 permanently. Use `/simplify` and `/code-review` here.

### 6. RTL Layout QA — **Priority: Medium**
- **Why:** Mostly correct, but `topic-11/DepthScene.tsx` uses absolute `right-/left-`. Needs a sweep, not a rebuild.
- **Where:** Any absolute-positioned overlay, any SVG that must not mirror.
- **Impact:** Prevents subtle mirroring bugs that look unprofessional in Hebrew.

### 7. Interaction & Animation Design (purposeful) — **Priority: Medium**
- **Why:** `framer-motion` is everywhere; animation should *guide attention* (reveal a route step-by-step), not decorate. Also the gateway skill for building the real simulators.
- **Where:** Scene transitions; future `navigation-sim`/`map-explorer`.
- **Impact:** Medium now, High once simulators are built.

### 8. UI Polish / Design-System Consistency — **Priority: Medium**
- **Why:** The system (`docs/design-system.md`, tokens, `surface`/`chip`/`btn`) is good. Job is *enforcement*, not redesign — catch off-token colors and inconsistent spacing.
- **Impact:** Keeps 12 lessons feeling like one product.

### 9. Military-Geography Content Accuracy — **Priority: Medium**
- **Why:** Facts (chokepoint oil %, Mahan doctrine, ASCM, thermal crossover) must be right for a client. Use for fact-checking, not rewriting voice.
- **Impact:** Protects credibility on the domain that is the whole point of the course.

### 10. Accessibility / Readability QA — **Priority: Low–Medium**
- **Why:** Briefs promise AAA contrast, alt-text per map, keyboard support. Verify diagrams have text alternatives and interactive elements are reachable.
- **Impact:** Required for a professional LMS deliverable; low effort per scene.

---

## 3. Recommended Skill Combinations

Use these **together**; separately they miss each other's failure modes.

| Combination | When to use | Why the pair matters | Mistakes it prevents | Expected result |
|---|---|---|---|---|
| **Diagram Design + Rendered-Output Visual QA** | Any map/route/arrow work | Design proposes; only rendering proves labels don't collide and maps aren't mirrored | Shipping 2px overlapping labels that "looked fine in JSX" | A screenshot-verified, legible diagram at mobile+desktop |
| **Hebrew Copy Editing + Instructional Design** | Rewriting any scene text | Clear Hebrew that still hits the objective and confronts the misconception | Prose that reads nicely but teaches nothing measurable | Shorter copy tied to a stated objective |
| **Component Refactoring + Interaction Design** | Building the real simulators | State/logic and motion designed together avoid rework | A `navigation-sim` that animates but has no scoring/feedback loop | A reusable, testable interactive component |
| **Hebrew Copy Editing + RTL QA** | Editing strings inside components | Text changes can re-break RTL flow and label widths | Fixed typo that now overflows an SVG label box | Correct wording *and* correct layout |
| **Military-Geography Expertise + Scenario Design** | Practice/quiz authoring | Realistic, correct scenarios beat trivia | Plausible-sounding but factually wrong scenarios | Domain-true decision exercises |
| **Animation Design + Learner-Attention Guidance** | Multi-part diagrams | Motion should sequence understanding, not decorate | Everything animating at once, splitting attention | Step-reveal that walks the eye A→threat→detour→B |
| **Design-System Enforcement + UI Polish** | Cross-lesson consistency pass | Tokens + trained eye catch drift a linter can't | One lesson using off-palette reds/spacing | 12 lessons that feel like one product |

---

## 4. Workflow Recommendations

> **Inspect-first files for almost every task:** the target `content/topic-XX.md`, the matching `src/components/lessons/topic-XX/*Scene.tsx`, the lesson's row in `src/lib/lessons.ts` (objectives), and the lesson's section in `docs/instructional-briefs.md` (objective + common misconceptions). Then `docs/design-system.md` for tokens/RTL rules.

### A. Improve an existing lesson
1. Read the brief's **objective + misconceptions** for that lesson; list what each scene is supposed to achieve.
2. Read the scenes; flag any scene that explains without confronting the misconception.
3. Copy-edit Hebrew for tone/length; fix defects.
4. Tighten diagrams (see workflow C).
5. **Render** the page (playwright screenshot / `npm run dev`) at 375px and 1280px.
- **Skills:** Instructional Design + Hebrew Copy + Diagram Design + Visual QA.
- **Done when:** every objective has a scene, no label overlaps, copy is shorter than before, no typos.

### B. Add a new lesson (e.g. the missing Lesson 13 — GIS)
1. Author `content/topic-13.md` from the brief; register it in `src/lib/lessons.ts` and `quizzes.ts`.
2. Scaffold scene folder by **copying an existing lesson's structure** (Hook→Onboarding→teaching→Recap), not from scratch.
3. Reuse the diagram kit (once it exists) rather than new bespoke SVG.
4. Visual + RTL QA pass.
- **Skills:** Instructional Design + Content + Refactoring + Visual QA.
- **Done when:** parity with sibling lessons in structure, tokens, and RTL.

### C. Redesign a weak diagram
1. State the **one idea** the diagram must convey in a sentence.
2. Sketch label placement first; guarantee a **minimum on-screen label size** (avoid `text-[2px]`).
3. Rebuild with shared primitives (`<Marker>`, `<Route>`, `<Legend>`).
4. Render to PNG (`sharp`) and check it reads **with labels hidden** (your memory rule).
- **Skills:** Diagram/Cartographic Design + Visual QA.
- **Done when:** legible on mobile, no halo hacks needed, reads without labels.

### D. Rework a map
1. Confirm the map must **not** mirror in RTL (`design-system.md` §"מפות").
2. Reduce to the fewest features that serve the lesson; label only what's referenced in copy.
3. Consistent arrow/route semantics across the course.
4. Render at two widths; verify orientation and legend.
- **Skills:** Cartographic Design + RTL QA + Visual QA.

### E. Fix overlapping text / labels
1. Reproduce by screenshot (not by reading JSX).
2. Prefer *fewer/larger* labels or a legend over shrinking font.
3. Adopt a shared `<Label>` with built-in halo + min size instead of per-label stroke props.
4. Re-render to confirm.
- **Skills:** Diagram Design + Visual QA + Refactoring.

### F. Improve an interaction / animation
1. Ask: does this motion **teach** (sequence attention) or just decorate? Cut decoration.
2. Respect `prefers-reduced-motion` (design-system rule).
3. For real simulators, design state + feedback first, animation second.
- **Skills:** Interaction Design + Frontend + Instructional Design.

### G. Review Hebrew wording
1. Read aloud for the 18–23 tone; cut academic phrasing.
2. Grep for defects: duplicated sentences, stray characters, `"`-without-space.
3. Keep military terms accurate (fact-check with domain skill).
4. Re-render scenes where text lives inside SVG (width changes matter).
- **Skills:** Hebrew Copy + Military-Geography Accuracy + RTL QA.

### H. Prepare a lesson for client delivery
1. Full visual QA at mobile+desktop, every scene.
2. RTL sweep (no absolute `right-/left-`).
3. Copy proofread; facts checked.
4. `npm run build` (static export) succeeds; spot-check `out/`.
5. Accessibility: alt-text/aria on diagrams, keyboard reachability.
- **Skills:** Client-Delivery QA + Visual QA + Accessibility QA.
- **Done when:** you'd screen-share it live without flinching.

---

## 5. Skill-to-Task Matrix

| Task type | Primary skill | Supporting skills | Why it matters | Priority |
|---|---|---|---|---|
| Rewrite unclear opening (Hook) text | Hebrew Copy Editing | Instructional Design | The hook decides whether they keep reading | High |
| Improve map readability | Cartographic Design | Visual QA, RTL QA | Maps are the course's core value | High |
| Fix arrows / movement direction | Diagram Design | Visual QA, Interaction Design | Wrong-reading arrows teach the wrong thing | High |
| Create a stronger route/story illustration | Diagram Design | Instructional Design, Animation | Story-route (A→threat→detour→B) drives comprehension | High |
| Redesign a logistics diagram (`topic-08`) | Diagram Design | Military-Geo Accuracy | MSR/ASR/graph clarity is easy to get muddled | High |
| Improve natural-gas / strategic-value wording (`topic-09`) | Hebrew Copy Editing | Military-Geo Accuracy | Dense §9.1 + duplicated sentence in §9.2 | High |
| Fix Hebrew RTL layout issues | RTL QA | Visual QA, Refactoring | `topic-11/DepthScene` absolute positioning | Medium |
| Make a lesson feel more interactive | Interaction Design | Frontend, Instructional Design | Simulators are still placeholders | High |
| Convert static explanation → step-by-step | Instructional Design | Animation, Frontend | Reveal-on-step beats a wall of text | Medium |
| De-duplicate repeated SVG/legend code | React Refactoring | Diagram Design | 45 scenes hand-roll the same primitives | Medium |
| Final QA before client review | Client-Delivery QA | Visual, RTL, Accessibility, Copy | One typo/mirror bug undoes the polish | High |

---

## 6. Recommended AI Roles / Personas

Give the assistant one hat at a time — mixed hats produce mushy output.

### Military-Geography Content Editor
- **Owns:** factual accuracy + domain phrasing (chokepoints, LOC, GEOINT sensors, Mahan doctrine).
- **Use when:** editing `content/*.md` or scene text with domain terms.
- **Example prompt:** *"Act as a military-geography editor. In `content/topic-09.md`, verify the Bab-el-Mandeb / Hormuz claims and tighten §9.1 on gas & 'hydrogen valleys' without dumbing down the domain. Flag anything factually shaky."*
- **Expect:** corrected facts + a short list of claims to double-check.

### Hebrew Professional Copy Editor
- **Owns:** tone (18–23), concision, typos, quote/space normalization.
- **Use when:** any Hebrew text change.
- **Prompt:** *"As a Hebrew copy editor for ages 18–23, tighten the three `detail` strings in `topic-03/CombatNavScene.tsx`, fix the stray `.ד` and quote spacing, keep military terms."*
- **Expect:** shorter Hebrew + a defect list.

### Instructional Designer
- **Owns:** objective↔scene mapping, misconception confrontation, assessment fit.
- **Prompt:** *"Compare `topic-05` scenes to its brief. Which objective/misconception (Cover vs Concealment) is stated but never actively tested? Propose a step-reveal fix."*
- **Expect:** a gap table + concrete scene change.

### Cartographic Design Reviewer
- **Owns:** map/diagram legibility, label sizing, arrow/route semantics, no-mirror-in-RTL.
- **Prompt:** *"Review the SVG in `CombatNavScene`. Identify overlap risks and every label under a legible size. Propose a redesign using shared primitives, no stroke-halo hacks."*
- **Expect:** annotated issues + redesign plan.

### Visual QA Reviewer
- **Owns:** the rendered result, not the code.
- **Prompt:** *"Screenshot `/lessons/topic-03` at 375px and 1280px via playwright. Report any overlapping labels, clipped text, or mirrored diagrams."*
- **Expect:** screenshots + a pass/fail list.

### Interaction Designer
- **Owns:** purposeful motion + the future simulators' feel and feedback loops.
- **Prompt:** *"Design the interaction + feedback for `navigation-sim` (back-azimuth resection) per the brief: inputs, scoring, error explanation. Motion that guides attention."*
- **Expect:** interaction spec before code.

### Frontend Implementation Reviewer
- **Owns:** React/TS quality, token compliance, reuse.
- **Prompt:** *"Run `/code-review` on my diagram-kit refactor. Focus on RTL logical-props, token usage, and duplicated SVG that should be shared."*
- **Expect:** ranked findings.

### Client-Delivery QA Reviewer
- **Owns:** the final go/no-go before showing the client.
- **Prompt:** *"Delivery-QA `topic-09`: build passes, no typos, facts checked, no RTL mirroring, diagrams legible on mobile. Give me a checklist verdict."*
- **Expect:** a signed-off checklist or a blocker list.

---

## 7. What Not to Use / What to Avoid

- **Generic UI redesigns.** The design system (`docs/design-system.md`, tokens, `surface`/`chip`) is coherent and good. Restyling risks fragmenting 12 lessons. *Enforce* it; don't replace it.
- **Decorative animation.** `framer-motion` is already heavy. Motion that doesn't sequence attention just splits it (and must respect `prefers-reduced-motion`).
- **Generic geography explainers.** This is *military* geography for a specific audience; boilerplate Wikipedia-style prose dilutes it.
- **Overly academic Hebrew.** The current tendency (see `topic-09`) is the main copy risk for an 18–23 audience.
- **Too much on screen.** Prefer fewer words and fewer labels. Legends beat cramming.
- **Over-complicated maps.** Every extra feature/label not referenced in the copy is noise. The chokepoint and mobility maps especially should stay minimal.
- **Inconsistent visual styles between lessons.** Bespoke per-lesson SVG idioms are already causing drift; converge on shared primitives.
- **Ignoring RTL.** Never introduce absolute `right-/left-`; use `ms-/me-/start-/end-`. Never let a map mirror.
- **Fixing code without checking the render.** The single most common failure mode here — 2px labels look fine in JSX and unreadable on screen. Always render.
- **Making diagrams prettier but less clear.** Halo hacks and gradients that reduce comprehension are a net loss. Legibility > decoration.
- **Raster/AI-generated imagery for maps.** Tempting via image-gen tools, but it clashes with the crisp vector/console style and can't stay factually precise or theme-tokened. *Assumption:* keep maps as SVG; reserve AI image gen (if any) for non-diagram hero atmosphere only.

---

## 8. Suggested Priority Roadmap

### Immediate (biggest quality gain, low risk)
1. **Copy-edit pass over all 12 content files + scene strings** — fix the `topic-09` duplicated sentence, the `topic-03` stray `.ד`/quote spacing, and trim academic tone. (Hebrew Copy + Domain Accuracy)
2. **Diagram legibility sweep** — eliminate sub-legible label sizes and overlap on the most-viewed scenes; render-verify each. (Diagram Design + Visual QA)
3. **RTL sweep** — fix `topic-11/DepthScene` absolute positioning; grep for others. (RTL QA)
4. **Stand up a repeatable Visual-QA checkpoint** (playwright screenshots at 375/1280 + `sharp` SVG render) so 1–3 stay fixed. (Visual QA)

### Medium-Term (consistency & maintainability)
5. **Build the Map & Diagram Kit** (`src/components/diagram/`): `<MapFrame> <Route> <Marker> <Arrow> <Legend> <Label>` with built-in RTL-safety, min label size, auto-halo. Migrate 2–3 scenes as proof. (Refactoring + Diagram Design; validate with `/simplify`, `/code-review`)
6. **Instructional alignment pass** — ensure every brief objective/misconception is actively confronted by a scene. (Instructional Design)
7. **Design-system enforcement pass** — catch off-token colors/spacing across lessons. (UI Polish)

### Later (growth, after core is stable)
8. **Build the real interactive simulators**, starting with `map-explorer` (Lesson 02) as the briefs recommend, then `navigation-sim`, `chokepoint-map`, `sensor-fusion`. Replace `InteractionPlaceholder`. (Interaction Design + Frontend + Instructional Design)
9. **Author the missing Lesson 13 (GIS)** content + scenes to match the briefs. (Content + Instructional Design)
10. **Accessibility hardening** — alt-text/aria for every diagram, keyboard paths for interactions. (Accessibility QA)

---

## 9. Final Practical Recommendation

**The 3–5 skills to use most often**
1. Hebrew Instructional Copy Editing
2. Cartographic / Diagram Design Clarity
3. Rendered-Output Visual QA (playwright + `sharp`)
4. Instructional Design (objective ↔ scene)
5. React Component Refactoring (the Map & Diagram Kit)

**The 2–3 workflows to repeat for every lesson**
- **Improve-an-existing-lesson (A)** — brief → copy → diagrams → render-check.
- **Redesign-a-weak-diagram (C)** — one-idea → label-first → shared primitives → render-with-labels-hidden.
- **Prepare-for-client-delivery (H)** — visual + RTL + copy + build + a11y checklist.

**Biggest risks if you keep changing the course without these skills**
- Diagrams drift into unreadable 2px-label territory and each is fixed by hand forever (no kit).
- Hebrew typos/duplications and over-academic tone quietly accumulate in front of a client.
- RTL/mirroring bugs slip in because changes are judged in code, not on screen.
- The interactive promise in the briefs never ships, leaving the course "nice slides" instead of "hands-on."

**Best way to use the project-knowledge files with these skills**
- Treat `docs/instructional-briefs.md` as the **source of truth for what each lesson must achieve** — every content/diagram edit should trace back to an objective or a listed misconception.
- Treat `docs/design-system.md` as the **non-negotiable style + RTL contract** — tokens, logical properties, no mirrored maps, reduced-motion.
- Keep this file as the **operating manual**: pick the persona (§6), run the matching workflow (§4), and never close a task without the render-check (§2). Feed all three docs to the assistant at the start of a task so its "hat" is grounded in your actual objectives and system.

---

### File created

`project-knowledge/RECOMMENDED_SKILLS_AND_WORKFLOWS.md` — a project-specific playbook mapping your real weak spots (SVG diagram legibility, Hebrew copy, RTL, pattern duplication, unbuilt simulators) to the skills, skill-combinations, workflows, task matrix, AI personas, anti-patterns, and a phased roadmap. Use it to decide *which "hat" to put on and which workflow to run* before each editing session, and to keep every change validated against the briefs, the design system, and the rendered result.
