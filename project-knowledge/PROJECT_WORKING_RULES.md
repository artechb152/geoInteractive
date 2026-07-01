# Project Working Rules — Military Geography Course (Geo9900)

> The default operating rules for any AI assistant or Claude Code session working on this course.
> Short and operational. The full reasoning behind these rules lives in
> [`RECOMMENDED_SKILLS_AND_WORKFLOWS.md`](RECOMMENDED_SKILLS_AND_WORKFLOWS.md).

---

## Default Working Rules

- Always preserve the course identity: **Hebrew, RTL, military geography, operational, visual, serious, clear.**
- Do not treat this as a generic geography course.
- Prefer **operational meaning** over abstract academic explanation.
- Prefer **concise Hebrew** over dense academic prose.
- Prefer **clear diagrams** over decorative visuals.
- Every map, diagram, arrow, route, and label must be checked in the **rendered result**, not only in code.
- Text must never overlap other text.
- Labels must never hide important visual information.
- Maps must not mirror in RTL.
- Arrows and routes must have clear direction and purpose.
- Interactions must support learning, not decoration.
- Before changing a lesson, inspect:
  - the lesson content file (`content/topic-XX.md`)
  - the lesson React scene components (`src/components/lessons/topic-XX/*Scene.tsx`)
  - the relevant instructional brief (`docs/instructional-briefs.md`)
  - the design system (`docs/design-system.md`)
  - existing patterns in nearby lessons
- Use the existing design system unless explicitly asked to redesign.
- Prefer improving and reusing existing components over inventing new visual styles.
- For visual changes, always recommend or perform screenshot-based QA.
- For Hebrew text changes, check tone, clarity, punctuation, spacing, and RTL behavior.
- For diagrams, prioritize readability on **mobile and desktop**.
- For client delivery, check visual QA, RTL, copy, facts, and build stability.

---

## Default Skill Selection

| When the task is about... | Use these roles together |
|---|---|
| **Wording** | Hebrew Instructional Copy Editor + Instructional Designer |
| **Maps, routes, arrows, labels, diagrams** | Cartographic / Diagram Design Reviewer + Rendered Visual QA |
| **Interactivity or animation** | Interaction Designer + Instructional Designer + Frontend Reviewer |
| **Code structure** | React Component Refactoring Reviewer + Design-System Enforcement |
| **Before client delivery** | Client Delivery QA Reviewer |

---

## Non-Negotiables

- No generic UI redesigns.
- No decorative-only animation.
- No tiny unreadable SVG text.
- No overlapping labels.
- No academic walls of text.
- No ignoring RTL.
- No map mirroring.
- No code-only approval for visual work.
- No making diagrams prettier if they become less understandable.

---

## Final Rule

For every change, ask:

> **Does this make the military-geography concept clearer, more operational, more readable, and more professional?**
> If not, do not make the change.
