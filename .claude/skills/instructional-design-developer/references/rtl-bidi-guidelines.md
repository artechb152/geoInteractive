# RTL & bidirectional content guidelines

> use this reference when designing training materials in hebrew or other RTL languages, or when content mixes hebrew and english (extremely common in israeli training contexts).

## table of contents
- [layout mirroring](#layout-mirroring)
- [typography](#typography)
- [bidirectional content](#bidirectional-content)
- [charts, diagrams, and timelines](#charts-diagrams-and-timelines)
- [forms and interactions](#forms-and-interactions)
- [storyboard and elearning notes](#storyboard-and-elearning-notes)
- [terminology consistency](#terminology-consistency)

## layout mirroring

when designing for hebrew (RTL), **mirror the entire layout**, not just text direction.

| element | LTR default | RTL mirrored |
|---|---|---|
| text alignment | left | right |
| navigation flow | left → right | right → left |
| sidebar | left side | right side |
| progress bar | fills left → right | fills right → left |
| back button | ← left | → right |
| checkmarks/bullets | left of text | right of text |
| icons with direction (arrows, play) | point right | point left |

**exception**: icons without directional meaning (search, settings, clock) do not flip.

**css tip**: use logical properties (`margin-inline-start` / `padding-inline-end`) instead of `margin-left` / `padding-right` so layouts adapt automatically.

## typography

- **font selection**: choose fonts with full hebrew character support. test bold, italic, and bold-italic — some fonts distort hebrew characters in these weights.
- **line height**: hebrew characters have different vertical metrics than latin. increase line-height slightly (1.6–1.8) to prevent clipping.
- **font size**: hebrew characters are visually denser than latin at the same point size. consider 1–2px larger for body text, or test readability.
- **mixed scripts**: when hebrew and english appear together, ensure consistent baseline alignment.
- **nikud (vowel marks)**: if using nikud (ניקוד), verify rendering at all sizes — small text may make nikud illegible.

## bidirectional content

hebrew training materials almost always contain english elements: technical terms, brand names, code, URLs, email addresses.

### rules for mixed content

| element | direction | example |
|---|---|---|
| hebrew text | RTL | הלומד יבצע את המשימה |
| english terms inline | LTR island within RTL | הלומד ישתמש ב-**Action Mapping** |
| numbers | LTR | סעיף 3.2.1 |
| email addresses | LTR | שלח ל-user@example.com |
| URLs | LTR | https://example.com |
| code snippets | LTR | `git commit -m "message"` |
| acronyms | LTR | תקן WCAG 2.1 AA |
| phone numbers | LTR | 03-1234567 |

### common pitfalls

1. **punctuation displacement**: periods, commas, and parentheses can jump to the wrong side in mixed content. always preview rendered output.
2. **reversed lists**: numbered/bulleted lists should increment top-to-bottom (same in both directions), but alignment flips.
3. **copy-paste corruption**: when learners copy mixed bidi text, the result may reorder. test copy-paste from your materials.
4. **LMS rendering**: some LMS platforms handle bidi poorly. test in the target LMS before deployment.

## charts, diagrams, and timelines

| visual type | should it mirror? | notes |
|---|---|---|
| timeline | **yes** — flows right to left | earlier events on the right, later on the left |
| flowcharts | **yes** — start from right | process flows right → left |
| bar charts | **usually no** | axes stay standard (x left-to-right) unless convention differs |
| pie charts | **no** | no directional element |
| tables | **yes** — first column on right | header row stays on top; first data column shifts to right |
| screenshots of software | **depends** | if the software is LTR (e.g., English UI), show it as-is with hebrew annotations |

**rule of thumb**: mirror elements that represent sequence or flow. do not mirror elements where the spatial convention is universal (mathematical axes).

## forms and interactions

| element | RTL behavior |
|---|---|
| text input fields | right-aligned cursor; text flows RTL |
| number input | left-aligned (numbers are LTR) |
| email / URL input | left-aligned (content is LTR) |
| dropdown menus | open and align to the right |
| sliders | reversed direction (high value on left) — or keep universal direction and label clearly |
| drag-and-drop | source area on right, target on left (for sequential activities) |
| radio/checkbox labels | label to the right of the control → label to the left (control on right side) |

## storyboard and elearning notes

when writing storyboards for hebrew elearning:

1. **screen layout column**: specify RTL layout explicitly. note which elements flip and which don't.
2. **narration column**: write hebrew narration with embedded english terms marked (e.g., bold or `code` formatting).
3. **on-screen text**: keep short — hebrew text is ~20% longer than english for the same content.
4. **navigation**: "next" button on the left (opposite of LTR convention); "previous" on the right.
5. **accessibility**: screen readers for hebrew (JAWS/NVDA) read RTL correctly only if the HTML `dir="rtl"` attribute is set properly.
6. **images with text**: never embed hebrew text in images — use overlay text so it can be localized and read by screen readers.

## hebrew assessment-specific gotchas

these patterns surfaced over four audit cycles on a 321-question hebrew course. see `source-anchored-content.md` for the rule-based content patterns; the items here are hebrew-specific.

### multi-valid spellings — acknowledge in explanation

the academy of the hebrew language and major style guides explicitly accept *both* forms for several common words: ייצוא / יצוא; אומנם / אמנם; מגיפה / מגפה; בליבו / לבו (literary register); ויו"ד / ו"ו for some forms. when your assessment marks one as "correct", the explanation must say so:

> "הצורה X תקינה גם בעברית הכללית; הבחירה ב-Y היא תקן האחדה של [הסטייל-גייד] ולא כלל לשוני מוחלט."

without this nuance, learners who follow the source's permissive framing get punished.

### plural-address discipline (gender inclusivity)

modern hebrew educational materials address learners in **plural** ("לחצו", "כתבו", "תקנו", "סמנו") rather than masculine-singular ("לחץ", "כתוב"). plural is the standard inclusive form — it addresses זכר ונקבה equally without requiring a gender-selection setting.

apply throughout: prompts, instructions, button labels, feedback messages, lesson body imperatives. **exception**: quoted source content stays verbatim — don't pluralize a sentence quoted from a source.

if your validation engine tolerates either form via `acceptedAnswers[]`, that's an alternative — but plural-by-default is simpler and removes a class of inclusivity bugs.

### gender agreement in distractor labels

distractor labels often contain noun phrases ("האמל"ח", "הוועדה", "הפצמ"ר") that take gender agreement. mismatched agreement in a question that itself teaches agreement is the cardinal sin (the chapter's own example violates the chapter's rule). spot-check distractor wording for:
- adjective agreement with its noun ("אמל"ח רב" not "אמל"ח רבה")
- verb-subject agreement ("הוועדה החליטה" not "הוועדה החליט")
- definite article concordance in apposition

### lesson body prose drafted faster than exercises

across four audits, gender-agreement slips cluster in lesson body files (`.tsx` / `.md`) more than in exercise files. lesson bodies are typically drafted in long-form prose mode where authors think about content rather than each phrase's agreement. exercise items are short, atomic, and reviewed multiple times.

discipline: include lesson body prose in the wording audit. don't assume "it's just intro text — the rules are in the bank."

### niqqud-aware validators

if your validation engine strips niqqud (`normalizeHebrew` style normalization), questions whose pedagogy depends on niqqud presence/absence are silently broken — any answer with the same letters passes. examples: "add partial niqqud helper" questions, "distinguish הַעֲרָכוֹת from הָעֲרָכוֹת" questions.

mitigations:
- restructure as multiple-choice (the validator compares option *values*, not strings)
- use word-reorder rewrites instead of niqqud-only rewrites in ambiguity-style questions
- add `acceptedAnswers[]` support to the validator (engine change) and list both niqqud-bearing and stripped forms

### english calques to avoid in hebrew explanations

four audits caught these anglicisms repeatedly. flag during wording audit:

| calque | natural hebrew |
|---|---|
| "(vocative)" embedded in hebrew prompts | use "פנייה" alone |
| "בלולאה" (out of the loop) | "לא נחשפו לפרשייה" / "לא היו מעורבים" |
| "בעיני המקור" (in the source's eyes) | "על-פי המקור" / "לפי המקור" |
| "סטילסטית" | "סגנונית" or "סטיליסטית" |
| "סיגנל" | "סימן" |
| english soldier / force glosses for חייל / חיל | use hebrew glosses |

## terminology consistency

hebrew training materials often struggle with inconsistent translation of technical terms.

### best practices

- **create a glossary** at the start of each project: hebrew term ↔ english original ↔ definition.
- **pick one translation and stick with it** throughout all materials. do not alternate between translations.
- **for untranslatable terms**: use the english term in hebrew text with parenthetical explanation on first use. example: "שיטת Action Mapping (מיפוי פעולה)".
- **common convention**: many israeli organizations prefer english technical terms with hebrew grammar. example: "לעשות דיפלוי" instead of "לפרוס". follow the organization's convention.
- **abbreviations**: on first use, write the full form in both languages. example: "UDL (עיצוב אוניברסלי ללמידה — Universal Design for Learning)".
