# Reference images — how each lesson should look

Client/user-supplied reference screenshots for the course. **Keep these** — they are
the visual source of truth that `/reference-to-ui-exact` and the design-fidelity passes
compare the implementation against. This is not a scratch folder: throwaway QA renders
belong at the repo root (gitignored) or in `scratchpad/`, never here.

## Layout

```
design/reference/
  lesson-01/    lesson1part<N>image<M>.png   ← part N of the lesson, image M
  lesson-02/    …add as the course grows
```

One folder per lesson, named `lesson-NN`. Keep the original filenames the user sent —
`design/assumptions.md`, `docs/UI-CONSISTENCY-RECOMMENDATIONS.md` and inline code
comments cite them by bare filename, so renaming breaks those citations.

## Notes

- Some references come from unrelated apps and are cited for **visual language only**
  (layout, card art, spacing) — not palette. See `design/assumptions.md` for which,
  and for the deliberate divergences from a reference that must not be "fixed" back.
- Gaps in the numbering (e.g. no `lesson1part4image1`) are the user's own numbering,
  not missing files.
