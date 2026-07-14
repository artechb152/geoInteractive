# Integration request — pre-existing mobile horizontal overflow in `PagedLearn.tsx`

Not something I can fix (file is on the project's read-only list), but flagging it since
I hit it during the mandatory "brief responsive pass" (step 11) after the HookScene
desktop rebuild was verified.

## What I found

At mobile widths (tested 390×844), every topic-02 scene — including `#scene-onboarding`,
which this task never touched — has real page-level horizontal overflow:
`document.documentElement.scrollWidth` (~592–595px) vs. `clientWidth` (375px). This
clips content off the right edge of the viewport (confirmed via screenshot: the "02"
numeral and headline text visibly cut off), including on scenes I have no access to and
did not modify. `HookScene.tsx`'s own `#scene-hook` section measures fully inside the
viewport (`getBoundingClientRect()` → 343px wide inside a 375px client width, no internal
overflow) — the clipping is a page-level effect from something else on the page.

## Root cause (confirmed via `getBoundingClientRect` scan of every element in `<body>`)

`src/components/lesson/PagedLearn.tsx`, function `ScenePagerMobile` (the "mobile / tablet
— lesson title + horizontal scrollable pill strip" section), this element:

```tsx
<div className="flex gap-1.5 min-w-max overflow-x-auto pb-2" role="tablist" aria-label="ניווט תתי-נושא">
  {scenes.map((s, i) => ( <button ...>{s.label}</button> ))}
</div>
```

`min-w-max` and `overflow-x-auto` are on the **same** element. `min-w-max` forces this
flex row to be at least as wide as its content's max-content size — with topic-02's 7
sub-topic pill labels (`פתיחה`, `לפני שמתחילים`, `טופוגרפיה`, `קנה מידה`, `קואורדינטות`,
`קווי גובה`, `סיכום`) that's ~560px — which overrides the element's own ability to shrink
to the viewport and scroll its overflow internally. The intended pattern (a fixed-width
outer scroll container with an unconstrained-width inner content row) needs `min-w-max`
moved to a wrapping inner element, with `overflow-x-auto` (and a real width constraint,
e.g. `w-full`) staying on the outer one:

```tsx
<div className="overflow-x-auto pb-2 w-full">
  <div className="flex gap-1.5 min-w-max" role="tablist" aria-label="ניווט תתי-נושא">
    {scenes.map((s, i) => ( <button ...>{s.label}</button> ))}
  </div>
</div>
```

## Scope note

This affects every lesson (all `PagedLearn` consumers, not just topic-02), pre-dates this
task's changes (reproduced identically on `#scene-onboarding`, untouched by me), and lives
in a file explicitly on this task's read-only list. Left unfixed in this branch on purpose
— flagging for whichever agent/orchestrator owns `PagedLearn.tsx`.
