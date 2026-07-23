# evaluation & learning analytics

> use this reference when the user asks for: training evaluation, ROI, impact measurement, learning analytics, kirkpatrick, xAPI, data-driven design, or post-training follow-up.

## table of contents
- [kirkpatrick four levels](#kirkpatrick-four-levels)
- [evaluation planning template](#evaluation-planning-template)
- [data collection methods](#data-collection-methods)
- [learning analytics and xAPI](#learning-analytics-and-xapi)
- [continuous improvement cycle](#continuous-improvement-cycle)

## kirkpatrick four levels

plan evaluation from the start — not after delivery.

| level | what it measures | when to collect | typical methods | cost/effort |
|---|---|---|---|---|
| **1 — reaction** | did learners find it useful and engaging? | immediately after | satisfaction survey, NPS, emoji rating | low |
| **2 — learning** | did learners acquire the knowledge/skills? | during and after | pre/post test, skills demo, quiz scores | low–medium |
| **3 — behavior** | are learners applying it on the job? | 30–90 days after | manager observation, self-report survey, performance data, mystery shopper | medium |
| **4 — results** | did it impact business outcomes? | 3–12 months after | KPIs (error rate, sales, compliance incidents, time-to-task), ROI calculation | high |

### phillips ROI (optional level 5)

ROI% = ((monetary benefits − program costs) / program costs) × 100

use only when the organization requires financial justification. requires isolating the training effect from other factors.

### planning rule

- **always plan levels 1 + 2** (minimum).
- **plan level 3** for any training linked to a business goal.
- **plan level 4** for high-investment programs or when stakeholders demand impact evidence.

## evaluation planning template

embed this in the assessment blueprint (add rows or a separate table):

| objective id | kirkpatrick level | metric | data source | collection timing | baseline | target | responsible |
|---|---|---|---|---|---|---|---|
| obj-1 | 2 | post-test score | LMS quiz | end of module | n/a | ≥80% pass | ID |
| obj-1 | 3 | error rate in task X | QA system | 60 days post | 12% | ≤5% | manager |
| program | 1 | satisfaction score | survey | end of course | n/a | ≥4.2/5 | ID |
| program | 4 | onboarding time | HR data | 6 months post | 30 days | ≤20 days | HR |

### baseline rule

for levels 3–4, always capture **baseline data before training** so you can measure change.

## data collection methods

### level 1 — reaction

- **end-of-course survey** (5–10 items): usefulness, relevance, engagement, facilitator quality, likelihood to apply.
- **in-module pulse checks**: single-question polls after each section.
- **open-ended**: "what one thing would you change?" — often more useful than likert scales.

### level 2 — learning

- **pre/post test**: same items or parallel forms. calculate gain score.
- **skills demonstration**: checklist or rubric-scored task.
- **confidence rating**: pair with knowledge test to detect over/under-confidence.
- **formative checks**: in-module quizzes (not just summative).

### level 3 — behavior

- **manager survey** (30–60 days post): "has the employee applied X? how often?"
- **self-report survey**: learner rates their own application frequency.
- **observation checklist**: structured observation by supervisor or coach.
- **system data**: if the behavior is digital (e.g., using a new tool), pull usage logs.
- **360 feedback**: peers and reports rate behavior change.

### level 4 — results

- **KPI tracking**: link training to 1–3 specific KPIs defined in the business goal.
- **control group** (when feasible): compare trained vs. untrained groups.
- **time-series**: compare metrics before, immediately after, and 3–6 months after.
- **isolate the effect**: ask managers to estimate what % of improvement is due to training (crude but practical).

## learning analytics and xAPI

### when to recommend xAPI

- the organization wants granular tracking beyond "completed / score".
- multiple learning activities (elearning, on-the-job, social, mobile) contribute to one objective.
- the organization wants adaptive or personalized learning paths.
- data-driven iteration is a priority.

### xAPI basics for instructional designers

xAPI uses **Actor – Verb – Object** statements:
- "Learner A **completed** Module 3"
- "Learner A **answered** Question 7 (incorrect, chose distractor B)"
- "Learner A **practiced** Procedure X in simulation (score: 85%)"

### what to track (design decisions)

| data point | why it matters | design implication |
|---|---|---|
| time per screen/section | identifies too-easy or too-hard content | adjust pacing or split content |
| attempts per item | reveals difficulty spikes | rewrite item or add scaffolding |
| distractor selection frequency | shows which misconceptions persist | strengthen teaching of that concept |
| drop-off points | where learners abandon | redesign that section |
| score progression | learning curve over time | validate spaced practice schedule |
| search/help usage | what learners look up | add to content or create job aid |

### SCORM vs. xAPI

| feature | SCORM | xAPI |
|---|---|---|
| tracks | completion, score, time | any learning experience |
| location | inside LMS only | anywhere (mobile, on-job, social) |
| offline | no | yes |
| data granularity | low (pass/fail/score) | high (per-interaction) |
| current status | legacy, still widespread | modern, growing adoption |

**pragmatic advice**: if the client uses SCORM and has no plans to migrate, design SCORM-compatible. mention xAPI as a future option.

## continuous improvement cycle

after collecting evaluation data, use this cycle:

1. **analyze**: what worked? what didn't? where are the gaps between target and actual performance?
2. **prioritize**: which gaps have the highest business impact?
3. **redesign**: update content, activities, or assessments to address gaps.
4. **re-measure**: track the same metrics after changes to verify improvement.

### iteration triggers

- pass rates below target → revise content or item quality.
- high satisfaction but low behavior transfer → add practice, job aids, manager involvement.
- specific distractor chosen by >40% → the misconception needs stronger teaching.
- drop-off at a specific module → redesign that module (shorter, more interactive, better hook).
