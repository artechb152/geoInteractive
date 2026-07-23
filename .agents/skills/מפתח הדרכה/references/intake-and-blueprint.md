# intake & blueprint

> use this reference when the user asks for: learning objectives, course/lesson design, assessment plan, test blueprint, question-bank scope, exam structure, or validation criteria.

## table of contents
- [intake checklist](#intake-checklist)
- [writing measurable learning objectives](#writing-measurable-learning-objectives)
- [assessment blueprint template](#assessment-blueprint-template)
- [coverage rules of thumb](#coverage-rules-of-thumb)
- [difficulty, cognitive level, and scoring](#difficulty-cognitive-level-and-scoring)
- [quality guardrails](#quality-guardrails)

## intake checklist

collect (ask the user) or infer and explicitly state assumptions:

1. **business/performance goal**: what organizational outcome or on-the-job behavior should improve? (this is the action mapping starting point — if the problem is not a skill/knowledge gap, training may not be the solution.)
2. **audience**: role, prior knowledge, language level, accessibility needs.
3. **context**: academic / certification / workplace / onboarding / compliance.
4. **learning goals**: what learners must *do* on the job or in the exam.
5. **modality**: live workshop, elearning, blended, microlearning, performance support.
6. **time & scope**: total minutes, number of modules, constraints.
7. **assessment purpose**: diagnostic / formative / summative / certification.
8. **item types allowed**: mcq, select-all, short answer, scenario, practical task, two-tier.
9. **logistics**: proctored? open-book? online? device?
10. **output format**: markdown, doc structure, csv columns, lms import (gift/qti).
11. **policy constraints**: tone, inclusivity, forbidden content, branding.
12. **accessibility requirements**: organizational standards, IS 5568/WCAG level, known learner needs.
13. **evaluation expectations**: which kirkpatrick levels? baseline data available?

if the user provides only partial info, proceed with a **default**:
- audience: novice-to-intermediate
- assessment: formative + short summative quiz
- language: hebrew unless they say otherwise
- output: markdown tables
- accessibility: WCAG 2.1 AA (IS 5568 for israeli context)
- evaluation: levels 1 + 2 minimum

## action mapping check

before designing training, briefly validate:

1. **is there a performance gap?** what are people doing (or not doing) that needs to change?
2. **is it a skill/knowledge gap?** or is the root cause environment, motivation, tools, or process?
3. **if training is the answer**: what is the minimum training needed to close the gap?
4. **if training is not the answer**: recommend alternatives (job aids, process change, tool improvement, coaching) and flag this to the user.

this step prevents wasted effort on training that won't solve the real problem.

## writing measurable learning objectives

### objective format
use the format:

**"by the end, the learner can [action verb] [object] [conditions] to [standard]."**

examples:
- "identify common phishing cues in an email with 90% accuracy."
- "configure x setting following the sop without critical errors."

### do / don't
- do: observable verbs (explain, classify, troubleshoot, configure, justify)
- don't: vague verbs (understand, know, be aware)

### alignment rule
every assessment item must map to **one primary objective** (and optionally a secondary).

## assessment blueprint template

use this table to plan coverage before writing items.

| objective id | objective (measurable) | cognitive level | item type(s) | assessment modality | difficulty mix | # items | weight | time estimate | notes |
|---|---|---|---|---|---|---:|---:|---:|---|
| obj-1 | ... | remember/understand/apply/analyze/evaluate/create | mcq / scenario / performance / two-tier | online / f2f / blended | easy/med/hard | 4 | 20% | 6 min | common misconceptions |

## learning solution design

for programs that span multiple touchpoints, plan the full learning ecosystem:

| component | modality | purpose | timing | objective(s) covered |
|---|---|---|---|---|
| pre-work | microlearning (5 min) | activate prior knowledge | 1 week before | obj-1 |
| workshop | live (2 hr) | guided practice | day of | obj-1, obj-2, obj-3 |
| job aid | performance support | on-the-job reference | ongoing | obj-2 |
| elearning | self-paced (20 min) | spaced review | 1 week after | obj-1, obj-3 |
| coaching | 1-on-1 | behavior transfer | 30 days after | obj-3 |

not every program needs all components. but always consider: is a single course the right design, or does a learning cluster serve better?

## coverage rules of thumb

- **minimum items per objective**: 2 (for quick checks), 4+ (for summative reliability).
- **mix matters**: avoid all-remember items; include apply/analyze for real-world performance.
- **time**: typical mcq 45–75 seconds; scenario 2–4 minutes; performance 5–20 minutes.

## difficulty, cognitive level, and scoring

### difficulty mix (default)
- 25% easy (confidence builders)
- 50% medium (core competence)
- 25% hard (discrimination / stretch)

### scoring defaults
- mcq: 1 point; no negative marking unless requested
- select-all: either (a) all-or-nothing, or (b) partial credit with clear rule
- scenario: rubric-based (see rubrics reference)

## quality guardrails

before delivering, run a short internal review:

1. **content validity**: items reflect taught content / provided sources.
2. **construct clarity**: each item targets one skill (not two at once).
3. **cognitive level balance**: confirm the blueprint includes application/analysis/evaluation — not just recall. recall-only items are easily bypassed by AI tools and do not demonstrate real competence.
4. **fairness**: avoid culture-bound trivia; avoid stereotypes; represent diverse names and contexts.
5. **language**: plain, unambiguous, consistent terminology. in hebrew: verify consistent translation of technical terms.
6. **accessibility**: WCAG 2.1 AA compliance; alt text; keyboard access; color independence; contrast ≥ 4.5:1. see `references/accessibility-and-udl.md`.
7. **RTL/bidi**: if hebrew, verify layout mirroring, mixed-language handling, and terminology consistency. see `references/rtl-bidi-guidelines.md`.
8. **evaluation readiness**: at least levels 1–2 planned; baseline data identified for level 3+.
