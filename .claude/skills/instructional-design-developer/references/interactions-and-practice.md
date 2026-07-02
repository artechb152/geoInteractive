# interactions & special practice

> use this reference when the user asks for: interactive elearning, activities, drills, simulations, practice sets, spaced repetition plans, microlearning, gamification, or creative exercises beyond classic quiz questions.

## table of contents
- [activity selection rule](#activity-selection-rule)
- [cognitive load management](#cognitive-load-management)
- [interaction patterns for elearning](#interaction-patterns-for-elearning)
- [special practice formats](#special-practice-formats)
- [microlearning design](#microlearning-design)
- [evidence-based gamification](#evidence-based-gamification)
- [feedback and debrief templates](#feedback-and-debrief-templates)
- [spaced practice schedule](#spaced-practice-schedule)

## activity selection rule

pick activity types based on the *skill*:

- **recognition** (spot / identify) → mcq, matching, sorting, hotspots
- **application** (choose next step) → scenarios, decision trees, worked examples
- **procedure** (do steps) → checklists, sims, guided practice with fading support
- **judgment** (prioritize / evaluate) → sjt, ranking, compare cases
- **fluency** (speed + accuracy) → timed drills, flashcards, spaced retrieval

## cognitive load management

apply cognitive load theory to every activity design:

### three types of load

| type | description | designer's job |
|---|---|---|
| **intrinsic** | complexity inherent in the content | manage through sequencing, chunking, and prerequisite checks |
| **extraneous** | load caused by poor design | eliminate: remove irrelevant details, simplify navigation, avoid split attention |
| **germane** | load from building mental models | maximize: use worked examples, analogies, retrieval practice |

### design techniques

1. **scaffolding + fading**: provide full support initially (worked example), then gradually remove support (completion task → independent task).
2. **chunking**: break complex content into 3–5 information units per segment.
3. **split attention prevention**: integrate related text and visuals (label on the diagram, not in a separate paragraph).
4. **redundancy avoidance**: don't present the same information in text AND narration simultaneously (unless for accessibility).
5. **segmenting**: let learners control pacing — "next" rather than auto-advance.
6. **pre-training**: teach key concepts/vocabulary before the main task.

## interaction patterns for elearning

for each interaction, specify:
1) learner action, 2) correct rule, 3) feedback, 4) common errors.

patterns:

1. **sorting / categorization**
   - prompt: "drag each example to the correct category"
   - feedback: per item + summary rule

2. **matching**
   - terms ↔ definitions / symptoms ↔ causes

3. **hotspot / click-to-identify**
   - "click the risky area" (include alt text guidance)

4. **error spotting**
   - show a flawed email/report/procedure; learner marks errors; then reveal model answer

5. **worked example + completion**
   - show full solution; then partial solution with blanks; then independent item

6. **branching dialogue**
   - learner chooses a reply; system shows consequence; allow recovery path

7. **micro-simulation**
   - sandbox with constraints; scoring rules + debrief questions

## special practice formats

use these when the user asks for "special" or "creative" drills:

1. **two cases, one rule**: present two similar cases; learner explains why one passes and one fails.
2. **minimal pair**: two answer choices differ by one detail; learner must notice the detail.
3. **confidence check**: learner answers + rates confidence; feedback targets over/under-confidence.
4. **teach-back**: learner writes a 3-sentence explanation for a peer; provide model answer.
5. **misconception challenge**: present a common wrong belief; learner refutes it using evidence.
6. **decision journal**: learner records choice + cue + rule; later review patterns.

## microlearning design

use when the user asks for short, focused learning modules or just-in-time training.

### design rules

| rule | guideline |
|---|---|
| **duration** | 5–15 minutes per module. under 5 min lacks depth; over 15 min approaches overload. |
| **scope** | one learning objective per module. one complete conceptual unit. |
| **structure** | hook (30 sec) → content (3–8 min) → practice (2–5 min) → summary (30 sec) |
| **retrieval** | end every module with 3–5 retrieval practice items (not passive review) |
| **application** | include a "try this now" prompt — connect to the learner's actual work context |
| **standalone** | each module should make sense independently, even if part of a series |

### microlearning formats

1. **video micro-lesson**: 3–5 min video + 3 quiz items + 1 reflection prompt
2. **interactive card deck**: 8–12 swipeable cards with embedded interactions
3. **scenario snippet**: one short scenario + decision point + feedback
4. **job aid + check**: reference card + 3 application questions
5. **spaced retrieval set**: 5–10 retrieval items from previous modules (interleaved)

### just-in-time delivery

design microlearning to be accessible *at the moment of need*:
- searchable by topic/keyword
- mobile-friendly
- no login wall if possible
- tagged by task/role for filtering

## evidence-based gamification

use when the user asks for game elements, engagement, points, badges, leaderboards, or motivation design.

### design principles (grounded in self-determination theory)

| SDT need | game element | example | caution |
|---|---|---|---|
| **autonomy** | choice, branching paths, optional challenges | learner chooses which scenario to tackle first | don't force participation in competitive elements |
| **competence** | progressive difficulty, mastery indicators, skill trees | unlock harder scenarios after demonstrating basics | avoid making early levels too easy (boredom) or too hard (frustration) |
| **relatedness** | team challenges, peer comparison (opt-in), shared goals | team solves a case study together; shared leaderboard | over-competition causes stress — offer collaborative alternatives |

### gamification elements and when to use them

| element | effective for | ineffective for | notes |
|---|---|---|---|
| **points** | tracking progress, effort recognition | deep learning, complex skills | use as feedback, not as the goal |
| **badges** | milestone recognition, skill certification | motivation if overused | tie to meaningful achievements, not trivial actions |
| **leaderboards** | competitive learners, sales teams | anxious learners, mandatory compliance | always make opt-in; show top N, not full ranking |
| **narrative/story** | engagement, context-setting | pure procedural training | wrap scenarios in a story arc |
| **levels/progression** | structured learning paths, onboarding | one-off workshops | align levels to actual competency milestones |
| **time pressure** | fluency drills, emergency procedures | complex reasoning, accessibility needs | always offer untimed alternative |

### anti-patterns to avoid

- **chocolate-covered broccoli**: slapping points on boring content doesn't make it engaging. fix the content first.
- **extrinsic crowding out intrinsic**: if learners only engage for points, remove points and check if the activity has inherent value.
- **forced competition**: some learners disengage when ranked. always offer a non-competitive path.
- **reward inflation**: too many badges/points devalue them. keep rewards scarce and meaningful.

## feedback and debrief templates

### immediate feedback (micro)
- "correct because __. cue: __. rule: __."
- "not quite: you focused on __, but the key cue is __. next time: __."

### debrief questions (macro)
- "what cue did you use?"
- "what alternative cue could mislead you?"
- "what would you do differently if __ changed?"

## spaced practice schedule

default schedule for a new module:

- day 0: learn + 5–10 retrieval items
- day 1–2: short review (5 items) — first spacing interval
- day 7: mixed review (8–12 items) — interleave with previous topics
- day 21: cumulative review (10–15 items) — all topics mixed
- day 60+ (optional): maintenance review (5–8 items) for critical/safety content

### retrieval practice principles

1. **active recall over passive review**: "answer this question" is far more effective than "re-read this slide." always use retrieval, not recognition.
2. **desirable difficulty**: items should require effort. too-easy retrieval provides little benefit.
3. **interleaving**: mix topics within review sessions. interleaved practice outperforms blocked practice for long-term retention.
4. **near-transfer variants**: never repeat the identical item. create variants that test the same concept in a different context.
5. **feedback after retrieval**: always provide feedback after the learner attempts retrieval — delayed feedback (after attempt) is more effective than immediate hints.

### evidence

- learners receiving spaced retrieval show ~150% better retention vs. massed practice.
- the combination of spacing + retrieval + interleaving is the strongest evidence-based learning strategy available.
