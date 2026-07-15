# OnboardingScene comparison notes

Reference: `design-references/topic-03/scene-onboarding.png`
Current: `screenshots/onboarding-current.png` (1536, full page)

## Round 1
- Built local `topic-03/SceneHeader.tsx` — eyebrow "לפני שמתחילים" now renders (muted tone), matching mockup; shared `@/components/lesson/SceneHeader` untouched.
- Built local `NavExampleCard.tsx` (bordered, icon top-start-corner, subtitle, orange rule, body) replacing shared `IntelCard`'s borderless "editorial" pattern for this scene only.
- Built local `ReadyBand.tsx` (tinted `bg-accent` band + circular shield-check badge at the start/right) replacing shared `ReadyCallout`'s plain white card for this scene only.
- Added small diamond ornaments to `SoftDivider` either side of the section label, matching the mockup's divider glyph.
- Delta found: `ReadyBand`'s shield icon lacked the checkmark the mockup shows inside it → overlaid a small `check` icon centered on the `shield` icon.
- 4-step accordion, `MissionStage` map (hill/palm landmarks, A/B markers, phase overlays), and historical-card grid order were already close matches and needed no structural change — grid auto-flow already places `HISTORICAL[0]` (סוד המדבר) at the visual top-right per RTL, matching the mockup's own top-right card; content order is unchanged (locked data).

## Verified
- All 4 step captions/insights, all 4 historical example headline/place/lesson strings, and the `ReadyBand` closing paragraph are byte-identical to the original code — only wrapper/markup changed.
- Accordion `handleStepClick` toggle logic, `phase` state driving `MissionStage`, and `expandedStep` are untouched.
- No horizontal overflow at 1536 width.
