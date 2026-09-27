# Lessons 2 & 6 — UI-language cleanup spec (binding for this pass)

Scope: every active learn-mode screen of `/lessons/topic-02` and `/lessons/topic-06` — cards, typography, icons and interface decoration. The quality of MVP illustrations/maps is a **separate task**: do not redraw maps, SVG content, 3D, canvas or image assets.

Built on `design/docs/topic-01-design-language-brief.md` (tiers, surfaces, button/option states). Where the two differ, **this file wins for lessons 2 & 6** — it applies the user's 21-pattern brief (appendix A), which explicitly removes several things the topic-01 brief had added (accent bars under titles, tracked micro-labels, orange heading highlights).

Outcome per screen: **one visual focus**, an immediate difference between **information / action / result**, and **few decorations, each with a reason**.

---

## 0. Iron rules

1. **Wording is frozen.** No Hebrew/English string is reworded, added, re-punctuated or moved into another sentence — including aria-labels, sr-only text, alt text, button labels, hints, captions. The ONLY permitted text removals are the three the brief names:
   - **Eyebrow / kicker labels** above a heading (pattern 4) that repeat the heading or don't help orientation — delete. If one genuinely orients the learner, keep it as plain text (§3 T5).
   - **English sub-lines** under a Hebrew title (pattern 3) — delete, **unless** the English term is itself a professional term the lesson relies on (test: the same English term also appears in the lesson's body copy or recap, e.g. `GPS-Denied`, `Dead Reckoning`, `Pacing`, `Azimuth`). Then keep it **inline on the same line** as the Hebrew term: `<span className="font-medium text-fg-muted">(Term)</span>`, same size as or one step below the title, never below 14px, never a second line.
   - **Colour-highlight spans in headings** (pattern 10) — unwrap the span, keep the words byte-identical (see §6 for which two stay).
   Every removal is listed in the agent's report.
2. **Interactions are frozen.** Same state, handlers, click/drag/keyboard flows, aria roles/attributes, element types (a `<button>` stays a `<button>`), quiz logic and scoring, same DOM order of controls. Styling = class/markup changes only. Removing a *decorative* motion (§5) is allowed; motion that shows a state change stays.
3. **Map/data colour coding is frozen.** Any colour that encodes meaning in a map, diagram, exercise or feedback (legend swatches, route colours, north-line colours, correct/wrong) stays — including where a UI element repeats that colour as a legend key.
4. **Images frozen.** `IsometricAsset` props, `<img src>`, video, canvas players untouched. Only the frame *around* an image may change.
5. **No new colour tokens / no raw hex in classNames.** Use existing classes (`tailwind.config.ts`, `globals.css`).
6. **RTL logical properties only** (`ms-/me-/ps-/pe-/start-/end-/text-start`). Never mirror maps/diagrams.
7. **Shared components in `src/components/lesson/` are not edited** in this pass. For `ReadyCallout` / `IntelCard` pass `signature={false}` (drops their accent stroke). Any other shared component may be replaced *at the call site* with local markup that follows this spec.
8. **Global CSS classes are not edited** (`.section-eyebrow`, `.gradient-text`, `.surface*`, `.chip` are used by other lessons). Stop *using* them in lessons 2 & 6 where this spec says so.

---

## 1. Surfaces — four roles, applied consistently (patterns 8, 13, 19)

| Role | What it is | Classes |
|---|---|---|
| **Workspace** | The ONE main board of a block: the interactive instrument / main illustration panel. The screen's visual focus. | `.surface-elevated` (= `rounded-2xl border border-border/60 bg-bg-elevated shadow-elevated`) + `p-5 sm:p-6` or `p-6 lg:p-8` |
| **Info card** | Static explanation on the page background (outside a workspace) | `.surface` (= `rounded-2xl border border-border/60 bg-bg-card`, **no shadow**) + `p-5 sm:p-6`. No icon tile, no eyebrow, no side stripe. |
| **Inset** | Secondary content *inside* a workspace or card (readout, "when to use", example, key fact) | `rounded-xl bg-bg-accent/60 p-4` — **no border, no shadow**. Or no box at all: plain text separated by spacing. **Never** a bordered/shadowed card inside another card. |
| **Option** (clickable) | Tabs, selectable cards, accordion headers, choice buttons | idle `rounded-xl border border-border bg-bg-elevated transition-colors duration-200 ease-snap hover:border-brand/30 hover:bg-brand/[0.03] cursor-pointer` |

- Nesting depth: page → workspace/info card → inset. Nothing deeper. If an illustration already sits in a workspace, drop extra frames around it (inner border+bg+shadow) unless the frame is the map's own neat-line.
- Radius set: `rounded-2xl` (workspace, info card), `rounded-xl` (inset, option, image frame, inner button), `rounded-lg` (thumbnail), `rounded-full` (real chips, round badges, pill buttons). Replace `rounded-md`, `rounded-sm`, `rounded-[3px]/[4px]`, `rounded-3xl` on content surfaces.
- Shadow: only the workspace (and existing `.btn-primary`). Info cards, insets, options: flat.
- Result/feedback (what changed after an action): appears next to the control that caused it; tinted by the feedback/data colour (`bg-status-ok/10`, the map colour at `/10`…) as an inset, **no side stripe**; one status glyph (`check`/`x`) allowed because it *is* feedback.

## 2. Selected / active state (pattern 12)

One cue family per control group, max two signals on the chosen item:

| State | Classes |
|---|---|
| Selected choice / active tab / active option card | `border-accent bg-accent/10` (text stays `text-fg`) — optionally its number badge fills (`bg-accent text-white`); nothing else |
| Open accordion item | `border-brand/45` (+ chevron `text-brand-dark`); body inside is plain text (no inner card) |
| Dark band active | `border-ember bg-ember/20` |

Remove on the selected item: extra shadow, ring, side bar / `layoutId` sliding bar, scale, coloured title, coloured icon swap, background gradient. Exception: when the selection colour *is* the data colour of that item in the map (e.g. a north type whose line is red on the dial), keep that colour as the single cue (`border-[that] bg-[that]/10` or a legend swatch) — never both a swatch and a bar and a ring.

Unselected options must remain fully legible (`text-fg`, not faded below `text-fg-muted`).

## 3. Typography tiers (patterns 14, 15)

| Tier | Element | Classes |
|---|---|---|
| T0 | Scene title | `<SceneHeader title intro>` — never hand-rolled; no `underline` prop |
| T1 | Section title (h3 inside a scene) | `font-display text-2xl font-bold leading-tight text-fg sm:text-3xl` — **no accent bar, no eyebrow above** |
| T1-intro | one-line explainer under T1 | `mt-2 text-base leading-relaxed text-fg-muted` |
| T2 | Card / panel heading (h4) | `font-display text-lg font-bold leading-snug text-fg md:text-xl` |
| T3 | Sub-heading inside a card body | `text-base font-display font-bold text-fg` (no tracking) |
| T4 | Body | `text-base leading-relaxed text-fg` or `text-fg-muted` for secondary paragraphs |
| T5 | Meta / orienting label (only if it survives rule 0.1) | `text-sm font-display font-semibold text-fg-muted` — **no `tracking-*`, no `uppercase`, no dot, no colour** |
| T6 | Caption / legend / helper | `text-sm text-fg-muted leading-snug` (legend rows inside a dense instrument may use `text-[13px]`) |

- **Floor:** no HTML text below 13px; readable help text ≥ 14px (`text-sm`). Replace `text-[10px]`, `text-[11px]`, `text-xs` for text a learner needs. Text inside SVG maps is out of scope.
- Contrast: needed text uses `text-fg` / `text-fg-muted`. `text-fg-dim` only for genuinely tertiary meta (disabled, closed chevrons).
- No `tracking-wide|wider|widest|[0.x em]` and no `uppercase` on Hebrew labels. (`tracking-tight` on headings is fine.) Stop using `.section-eyebrow` in these lessons.
- Numerals: keep each block's existing numeral font (`font-mono` / `tabular-nums`) — don't churn.

## 4. Decoration policy (patterns 1, 2, 5, 6, 7, 16, 17, 18)

**Remove:**
- Vertical side stripes on cards (`border-s-4`, `border-e-2` accents, absolute `inset-y-0 w-1` bars, `layoutId` active bars) — unless they encode a state/category the learner must identify *and* are the only cue for it.
- Short accent bars/strokes (`h-[3px] w-7`, `h-1 w-10`, `h-0.5 w-8`, lines above titles, under tabs, beside labels).
- Dots before labels (`size-1.5 rounded-full bg-accent` spans, `.section-eyebrow::before`). Keep dots that encode progress, selection, or a legend colour.
- Icon-in-rounded-square decorations on info/concept/conclusion cards (`spark`, mountain, wave, flag, check, compass, satellite… in a `size-8/9/10/11 rounded-lg/xl bg-… border…` tile).
- Chip/pill styling for static info (examples, keywords, tags, legend items) → plain text, `·`-separated inline list, or a simple list. Keep chips only for real selection/filter/status.
- Gradient backgrounds, blur blobs, glows, halos (`bg-gradient-*`, `blur-*` decorative layers, `shadow-glow*`, radial washes, `bg-topo-fade`).
- Decorative topo/grid textures used as panel backgrounds (`.topo-bg`, `bg-grid-pattern`, contour SVG textures, `FrameCorners`, `.oct`, `.outline-numeral`, `.dotted-leader`). Keep a grid only where it is map information (e.g. a coordinate grid the learner reads).
- Frequent separators: `border-t`/`border-b`/`<hr>`/labelled dividers between small sub-parts — use spacing (`mt-4/6`) first. At most one divider per workspace between genuinely different regions.

**Keep (with a reason):** icons inside buttons (action); icons that act as a legend or quick identifier the map also uses; feedback glyphs (correct/wrong); chevrons; drag handles; the SceneHeader. A kept icon is rendered **bare** (no tile), 18–20px, `text-fg-muted` unless it carries a legend colour.

## 5. Motion (pattern 20)

Remove: hover lift/scale (`hover:-translate-y-*`, `hover:scale-*`, `whileHover`), `whileTap` scale on simple buttons, staggered per-card entrances (`whileInView` / `initial` with `delay: i * …` on every card), infinite pulses/loops that decorate.
Keep: transitions that explain a state change or cause→effect (AnimatePresence content swap, needle/spring, layer fades, accordion open/close, progress fill, feedback reveal). Keep `useReducedMotion` handling intact. When removing a `motion.div` wrapper that only animated entrance, replacing it with a plain `div` is fine (keep its className).

## 6. Colour roles (patterns 10, 11)

| Role | Colour |
|---|---|
| Text | `text-fg` / `text-fg-muted` |
| Selection / active / action | accent (orange) — selected option, active tab, primary buttons, progress. Not on static titles, labels or icons. |
| Open / neutral structure | brand (sage) — open accordion border, chevrons |
| Data, map, feedback | `accent-cool`, `accent-hot`, `terrain-*`, `status-*` — **only** where they mean something in the map/exercise/feedback (then keep them exactly) |

- Card titles are `text-fg`, never orange/green/blue. Labels are `text-fg-muted`. Icons are `text-fg-muted` unless legend-coloured.
- **Heading highlights (pattern 10).** Keep exactly two, one per lesson, where the highlight *is* the scene's central concept:
  - topic-02 `ReliefCoverIntroScene` — `תבליט ותכסית`
  - topic-06 `PlanningScene` — `סיפור דרך`

  Unwrap every other `gradient-text` / `text-accent` / gradient span in a heading of lessons 2 & 6 (SceneHeader titles, h3, h4, recap banners).

## 7. Screen composition (patterns 9, 19, 21)

- **Opening (9):** if a screen opens with a big title, centred intro, then two equal explanation cards before the interaction, decide per screen what must precede the action. Default move: demote the pre-interaction cards to lightweight **info** (plain text in two columns or a single `.surface` with no icon/eyebrow) so the interaction is the first strong surface; or place an explanation beside the interaction if it is read *while* acting. Keep all text; don't change interaction order/behaviour.
- **Info vs action vs result (19):** options look clickable (border + hover + cursor) and nothing static shares that look; static cards never get hover states; results appear adjacent to the control, tinted by meaning.
- **Recap (21):** no big check circle, halo, pulse, gradient wash or celebratory colouring. The closing sentence becomes a plain, confident heading block (T1/T2, `text-fg`) — wording unchanged. Term cards: flat `.surface`, numbers `text-fg-muted` (not orange). Don't use the shared `RecapBanner` celebratory treatment in these two lessons.

## 8. Ownership & process (for parallel agents)

- Each agent edits only the files it owns. Other sessions may edit the same repo concurrently: re-read a file right before each edit, use small exact `Edit` replacements, never revert changes you didn't make, never run formatters or state-changing git.
- Keep every intermediate edit compilable — one route bundles all lessons, so a syntax error blocks everyone's screenshots.
- Verify at 1440px with `scripts/qa/shot-ui-cleanup.mjs` against the isolated dev server, compare with the baseline, and diff the scene's `innerText` dump (`.txt`) before/after: the only removed lines may be rule-0.1 removals.
- Document real uncertainty in the report (the controller appends to `design/docs/assumptions.md`).

---

## Appendix A — the user's brief (verbatim)

# ניקוי שפת הממשק בשיעורים 2 ו־6

סקור את כל המסכים הפעילים בשיעורים 2 ו־6. התמקד בכרטיסים, בטיפוגרפיה, באייקונים ובקישוטי הממשק. איכות ההמחשות והמפות של ה־MVP היא משימה נפרדת; שמור על התוכן, על התנהגות האינטראקציות ועל קידוד צבע שיש לו משמעות במפה או בתרגיל.

1. **פס צבע אנכי בצד ימין של כרטיס:** הפס מופיע בכרטיסי הסבר, בכרטיס פעיל ובכרטיסי מסקנה גם כשאין לו משמעות עקבית. הסר פסי צד דקורטיביים; השאר אותם רק אם הם מקודדים מצב או קטגוריה שהלומד צריך לזהות.
2. **פסי אקסנט קטנים בכל מקום:** קו קצר מעל כותרת, מתחת ללשונית, לצד תווית ובתוך כרטיס. ריבוי ה״חתימות״ האלה הופך אותן לקישוט אוטומטי. בחר טיפול אחד ברור לכל סוג רכיב.
3. **כותרת עברית עם שורת אנגלית זעירה מתחתיה:** למשל שמות סלעים, צורות נוף, סוגי צפון וטכניקות ניווט. הצג אנגלית רק כשהמונח המקצועי עצמו חשוב ללמידה; במקרה כזה שלב אותו ליד המונח העברי בגודל קריא, בלי ליצור שכבת כותרת נוספת.
4. **תוויות זעירות מעל כותרות:** "הכלי המנחה", "למה מראש", "דוגמה", "מקרא" וכדומה מוצגות לעיתים כטקסט קטן, מרווח וצבעוני. מחק תווית שחוזרת על הכותרת או שאינה עוזרת להתמצא. שמור על היררכיה של כותרת, כותרת משנה וגוף.
5. **נקודה כתומה לפני כל תווית:** נקודה זהה חוזרת בכרטיסי הסבר ובתגיות בלי לציין מצב. השתמש בנקודה רק כשיש לה משמעות מוגדרת, כגון התקדמות או בחירה.
6. **אייקון בתוך ריבוע מעוגל כמעט בכל כרטיס:** אייקוני spark, הר, גל, דגל וסימון וי חוזרים גם כשהטקסט מובן בלעדיהם. השאר אייקונים שמשרתים פעולה, זיהוי מהיר או מקרא; הסר אייקונים שממלאים מקום.
7. **תגיות וצ׳יפים למידע סטטי:** דוגמאות ומילות מפתח מוצגות כגלולות שנראות לחיצות. הצג מידע סטטי כטקסט או כרשימה; שמור מראה של צ׳יפ לבחירה, סינון או סטטוס אמיתי.
8. **יותר מדי כרטיסים בתוך כרטיסים:** מסגרת סביב ההמחשה, מסגרת סביב ההסבר, מסגרת סביב המסקנה ועוד מסגרת סביב פרט בתוכה. צמצם שכבות של רקע, גבול וצל כך שיהיה ברור מהו משטח העבודה הראשי.
9. **פתיחה שחוזרת באותה נוסחה:** כותרת ענקית, מבוא ממורכז, שני כרטיסי הסבר שווים ורק אחריהם האינטראקציה. בדוק בכל מסך אילו הסברים חייבים להופיע לפני הפעולה ואילו יכולים להופיע לצדה או בעקבותיה.
10. **הדגשה כתומה או גרדיאנטית בכל כותרת ראשית:** כשהמחווה חוזרת כמעט בכל חלק, הכותרות מרגישות מיוצרות מתבנית. השתמש בהדגשת צבע רק כשהיא מכוונת למושג המרכזי, ובחן כותרות נקיות במסכים אחרים.
11. **צבע כאמצעי "להחיות" כרטיסי טקסט:** כותרת כתומה, תווית ירוקה, אייקון כחול ופס צד בצבע נוסף על אותו מסך יוצרים תחרות. הגבל צבעי ממשק לתפקידים קבועים; שמור צבעים נוספים לנתונים, למפה ולמשוב.
12. **מצב נבחר שמודגש בכמה דרכים יחד:** רקע צבעוני, גבול מודגש, צל, טבעת, פס אקסנט ואייקון צבוע על אותה אפשרות. בחר אות בחירה מרכזי אחד או שניים, והשאר את האפשרויות האחרות קריאות.
13. **רדיוס, גבול וצל שאינם עקביים:** כרטיסים מרובעים כמעט לגמרי מופיעים ליד כרטיסים מעוגלים מאוד; חלקם שטוחים וחלקם מוגבהים. הגדר מעט סוגי משטחים לפי תפקיד והחל אותם בעקביות.
14. **טקסט של 10–11 פיקסלים בניגודיות חלשה:** תוויות, הסברי משנה ומקראים נראים כמו פרטי ממשק טכניים. הגדל טקסט שנחוץ להבנה, ומחק טקסט שאינו נחוץ במקום להקטין אותו.
15. **ריווח אותיות רחב ו־uppercase לכותרות קטנות:** השילוב נותן תחושה של תבנית דשבורד, וב־RTL הוא לא תמיד מתאים לעברית. השתמש בטיפוגרפיה רגילה וקריאה לתוויות עבריות.
16. **רקעי גרדיאנט, כתמי blur והילות בכרטיסים:** במיוחד בכרטיסי סיום והדגשה, האפקטים מוסיפים חגיגיות כללית בלי להסביר דבר. העדף משטח נקי; שמור אפקט רק כשיש לו תפקיד ברור במיקוד או במשוב.
17. **גריד טופוגרפי ושכבות דקורטיביות סביב כל המחשה:** מוטיב המפה מועיל כשהוא חלק מהמידע הגיאוגרפי. כשהוא מופיע גם כטקסטורת רקע כללית בתוך לוחות, הוא מוסיף רעש חזותי.
18. **קווי הפרדה וכותרות מקטע תכופים:** כל חלוקה קטנה מקבלת פס, כותרת או מסגרת משלה. השתמש ברווח וביישור כדי לחלק מידע לפני הוספת קו נוסף.
19. **אותו משקל חזותי להסבר ולפעולה:** כרטיס מידע, לשונית לבחירה וכרטיס תוצאה נראים לפעמים קרובים מדי זה לזה. ודא שאפשר לזהות מיד מה לחיץ, מה רק מסביר ומה השתנה בעקבות הפעולה.
20. **תנועה וקישוטים סביב פעולה פשוטה:** הגדלה בלחיצה, הזזה בריחוף או כניסה מדורגת של כל כרטיס מוסיפות תחושת "רכיב מוכן". השאר תנועה שמבהירה מעבר מצב או קשר של סיבה ותוצאה.
21. **כרטיסי סיכום וחיזוק בנוסחה קבועה:** וי גדול, הילה, גרדיאנט ומשפט חגיגי חוזרים גם כשמספיק סיכום ישיר של מה שנלמד. תן לסיום להדגיש את היכולת שרכש הלומד, בלי שכבת חגיגיות כללית.

User constraint (same message): **do not change any wording at all (except the heading cases named in the patterns) and do not change the interactions.**
