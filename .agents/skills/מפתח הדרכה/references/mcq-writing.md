# mcq writing

> use this reference when the user asks for multiple-choice questions, distractors, answer keys, rationales, feedback, or question-bank quality improvements.

## table of contents
- [default output schema](#default-output-schema)
- [cognitive level guidance](#cognitive-level-guidance)
- [stem rules](#stem-rules)
- [option rules](#option-rules)
- [distractor design](#distractor-design)
- [two-tier items](#two-tier-items)
- [common flaws to avoid](#common-flaws-to-avoid)
- [ai-era considerations](#ai-era-considerations)
- [review checklist](#review-checklist)

## default output schema

when generating a bank, use a table like this unless the user asks otherwise:

| id | objective | cognitive level | difficulty | stem | a | b | c | d | correct | rationale (1–2 lines) | feedback if wrong (1 line) | misconception targeted | tags |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

## cognitive level guidance

research shows >90% of MCQ items are written at recall level. actively push toward higher-order thinking.

### bloom's taxonomy targets for MCQ

| cognitive level | suitable for MCQ? | stem pattern | example |
|---|---|---|---|
| **remember** | yes, but limit to ≤25% of bank | "what is...?" / "which term...?" | "what is the default port for HTTPS?" |
| **understand** | yes | "which example best illustrates...?" / "explain why..." | "which scenario best illustrates a phishing attempt?" |
| **apply** | yes — prioritize | "given this situation, what should you...?" | "a user reports X. what is your first step?" |
| **analyze** | yes — prioritize | "what is the most likely cause...?" / "which factor..." | "given these logs, what is the most likely cause of the error?" |
| **evaluate** | yes, with scenario | "which approach is most appropriate...?" | "the team proposes A and B. which better addresses the constraint?" |
| **create** | rarely suitable for MCQ | use performance tasks instead | → redirect to rubrics-and-performance.md |

**rule**: aim for ≥50% of items at apply/analyze/evaluate level. use scenarios to elevate cognitive demand.

## stem rules

1. **one problem per item**: one clear decision.
2. **include the context** needed to answer, but no extra story.
3. **avoid negatives** ("which is not...") unless unavoidable; if used, bold the negative word.
4. **keep reading load low**: short sentences; define jargon.
5. **no trick wording**: assess competence, not puzzle-solving.

## option rules

1. **one best answer**: clearly best, not "two are kind of right".
2. **parallel structure**: similar grammar/length across options.
3. **plausible distractors**: each wrong option should be a believable choice for a learner with a typical misconception.
4. **avoid clues**: avoid the longest option always being correct; avoid absolute words (always/never) unless true.
5. **avoid "all of the above" / "none of the above"** unless explicitly requested.

## distractor design

generate distractors by mapping to these sources:

1. **near miss**: almost correct but misses a key condition.
2. **common misconception**: what novices often believe.
3. **wrong procedure**: a typical step-order error.
4. **overgeneralization**: applying a rule too broadly.

for each item, explicitly write (internally or in a column) which misconception each distractor targets.

## two-tier items

two-tier MCQs test both the answer and the reasoning — harder to guess, more diagnostic.

### format

**tier 1** (content): standard MCQ stem + options.
**tier 2** (reasoning): "what is the reason for your answer?" with 3–4 reasoning options.

### output schema

| id | objective | tier 1 stem | t1-a | t1-b | t1-c | t1-d | t1 correct | tier 2 stem | t2-a | t2-b | t2-c | t2 correct | rationale |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

### scoring options

- **strict**: both tiers correct = 1 point; otherwise 0.
- **partial**: tier 1 correct = 0.5; both correct = 1.
- **diagnostic only**: no score; use to identify misconceptions (tier 1 right + tier 2 wrong = surface knowledge without understanding).

### when to use

- when you suspect learners memorize answers without understanding why.
- for formative assessment where diagnosis matters more than scoring.
- for higher-stakes assessments where guessing must be reduced.

## ai-era considerations

in an era where learners can easily use AI tools to answer recall questions:

1. **reduce pure recall items**: "what is the definition of X?" is trivially answered by AI. instead: "given situation Y, how does concept X apply?"
2. **use scenario-based stems**: ground items in specific, context-rich situations that require judgment, not just information retrieval.
3. **assess process, not just answer**: two-tier items, rationale requirements, and "explain your reasoning" components resist AI shortcuts.
4. **design for open-book/open-AI contexts**: assume the learner has access to information. test whether they can *use* information, not whether they *have* it.
5. **combine with performance assessment**: pair MCQ banks with practical tasks that require demonstration. see `references/rubrics-and-performance.md`.

**note**: this does not mean MCQs are obsolete. well-written, scenario-based MCQs at the apply/analyze level remain valid and efficient — they just need to test thinking, not memory.

## common flaws to avoid

- **window dressing**: irrelevant background details.
- **double-barreled stems**: "and" / "both" testing two things.
- **unintended difficulty**: complex language instead of complex thinking.
- **test-wiseness cues**: repeating key words from the stem only in the correct option.
- **opinion items**: if multiple answers could be justified, use a rubric/scenario format instead.

## review checklist

for each item, confirm:

- [ ] mapped to exactly one primary objective
- [ ] cognitive level is appropriate (≥50% of bank at apply/analyze/evaluate)
- [ ] correct option is unambiguously best
- [ ] distractors are plausible and distinct
- [ ] no extra clues (length, grammar, absolutes)
- [ ] language is clear, inclusive, and level-appropriate
- [ ] feedback/rationale explains *why*, not just the letter
- [ ] item resists simple AI lookup (scenario-based, requires judgment)
- [ ] accessible: no image-only stems without alt text; no color-only cues
