# source-anchored content — fidelity, distractors, audit

> use this reference when the training content must trace back to an authoritative source (spelling rules, punctuation, grammar, policies, regulations, SOP, legal text). these patterns were surfaced over four audit cycles on a 321-question hebrew course; they generalize to any rule-based curriculum.

## table of contents
- [when to use this reference](#when-to-use-this-reference)
- [source fidelity discipline](#source-fidelity-discipline)
- [the four audit cycles](#the-four-audit-cycles)
- [distractor anti-patterns specific to rule-based content](#distractor-anti-patterns-specific-to-rule-based-content)
- [the multi-fixable token pattern (digital interactive)](#the-multi-fixable-token-pattern-digital-interactive)
- [pre-publication checklist](#pre-publication-checklist)
- [automated content validation](#automated-content-validation)

## when to use this reference

your content is "source-anchored" if either:
1. you are teaching from a specific authoritative source (a textbook, a style guide, a regulation, a policy document, an SOP), and learners will be tested on what *that source* says — not what is generally true.
2. the rules being taught are **closed** (the source enumerates a finite list) rather than **open** (the source gives a pattern that can be extended).

if your content is general best-practice / opinion-shaped, the standard `mcq-writing.md` patterns are sufficient. this reference adds the discipline you need when "the source said so" matters.

## source fidelity discipline

### every example traces back

- every example sentence/word/phrase used in a question must trace **verbatim** to a specific source line. cite it: `[Source A:73]` or `[חוברת עמק:80]`. if the example has been composed (paraphrased or invented), tag the citation `[עיבוד]` (Hebrew) / `[adapted]` (English).
- composed examples are acceptable when the source provides only a rule with no example sentence. they are **not** acceptable when the source provides an example you ignored.

### "frame around verbatim word" tolerance

- many questions embed a verbatim source word/phrase inside an authored carrier sentence. example: source has the word "תקווה"; question reads `"בכותרת 'הקצין הציג ___' איזו צורה נכונה?"`.
- this is fine **as long as**:
  - the target word/phrase is verbatim
  - the carrier sentence does not introduce a different rule that the chapter teaches differently
  - the carrier reads as authentic register, not caricature (see "audience-sample drift" below)

### never invent the rule itself

- it is fine to compose an example sentence around the rule.
- it is **never** fine to invent terminology the source does not use, or test mechanics the source does not endorse, or rules the source does not state. invented rules teach learners wrong knowledge.

## the four audit cycles

a single quality pass misses different things. on rule-based content, run four distinct passes — each catches a different failure mode:

### pass 1 — pedagogical-bug audit
for each question independently: does the question test what its prompt claims it tests? are the distractors plausible? does the explanation match the answer? this is the standard QA pass most projects run.
typical findings: ambiguous prompts, multiple-correct traps, explanations that contradict the answer key, click-to-fix giveaways (one fixable token), find-errors with mismatched count.

### pass 2 — source-fidelity audit
for each example (sentence, word, phrase) used in any question: does it trace verbatim to a source line? are the distractors based on real misconceptions documented in the source? is the rule formulation in the explanation aligned with how the source states the rule?
typical findings: invented examples passed off as source-attested, distractors that misrepresent the source, truncated source sentences (loses context), rules stated more absolutely than the source allows.

### pass 3 — wording-quality audit
for each user-facing string: does it read as well-formed natural language in the target register? gender agreement, subject-verb agreement, calques from foreign languages, run-on sentences, broken phrases.
typical findings: gender-agreement slips (cluster in lesson bodies more than exercise items — bodies are drafted faster), english calques in non-english explanations, recurring broken phrases that look copy-pasted from a corrupted draft.

### pass 4 — deep per-question audit
for each question, slowly: rule under test, source basis (with line cite), correct answer per source, each distractor, the explanation. this catches the things faster passes skim past.
typical findings: invented grammatical categories, invented test mechanics, multi-valid forms taught as binary, subjective calls forced into a single-correct format, frame-vs-answer contamination, surface-token equivalence violations in ambiguity questions.

a minimum-viable QA program runs passes 1, 2, and 4. pass 3 is essential when the content is in a language where readers will notice agreement slips — typically hebrew, arabic, romance languages, slavic languages.

## distractor anti-patterns specific to rule-based content

### 1. closed lists vs open patterns
if the source enumerates specific cases ("the only verbs that...", "the closed list of fillers..."), do **not** extend the list. inventing a fourth member of a three-member list — even if it follows the same pattern — teaches learners a rule that doesn't exist as written.
fix: before adding a new example, verify whether the source enumerates or patterns. if enumerates, stick to the source's list.

### 2. multi-valid forms taught as binary
some rules have multiple acceptable answers per the source itself ("either X or Y is valid", "both spellings are acceptable", "audience-dependent"). marking one as "correct" and the other as "wrong" without nuance penalizes learners for following the source's permissive framing.
fix: in the explanation, acknowledge the alternative explicitly. if your bank's "correct" answer is a *standardization* preference (e.g., a style guide picks one of two valid forms), say so: "the alternative is also valid in general; this question tests the [standard] preference."

### 3. frame contamination
when a question's prompt embeds a blank inside a carrier sentence, prefixes (articles, prepositions, particles) before the blank can trigger a *different* rule than the answer alone tests. example from a hebrew orthography bank: prompt `"ב___ פריז"` with answer "ועידת" — the answer alone is correct, but combined with the ב prefix it produces "בועידת" which violates a separate doubling rule the chapter also teaches.
fix: read the FULL rendered string aloud and verify each rule the chapter teaches as you go. if a prefix triggers a separate rule, either drop the prefix from the frame or rewrite the question to test the prefix-rule explicitly.

### 4. surface-token equivalence (ambiguity-style questions)
"the same sentence has two readings" questions require the two readings to share **the same surface tokens**. if your "rewrite for reading B" has to change a verb form, word order, or vocabulary, you have two different sentences — not one ambiguous one.
fix: pick a sentence whose ambiguity is genuinely resolved by punctuation/spelling/spacing alone. if you can't find one, switch the exercise type to multiple-choice.

### 5. don't invent grammatical categories
if the source calls something a "noun phrase", don't promote it to "subject phrase" in your distractor labels. invented categories sound authoritative but mislead learners about how the source organizes the field.
fix: use the source's vocabulary exactly. if you need a category the source doesn't have, either accept that the source doesn't make that distinction (and reframe), or cite an external authority and acknowledge the deviation.

### 6. don't invent test mechanics
"drop test", "swap test", "audibility test" — these heuristic mechanics often emerge as authoring shortcuts. if the source doesn't describe a test by that name, your invented test may give wrong predictions in edge cases. example: a "drop the letter and listen for sound change" test gave wrong answers on hebrew words where dropping the letter doesn't change pronunciation but the letter is still consonantal.
fix: use the source's framing for how to identify rule applications. if the source says "any letter that is audible", call it the audibility test, not the drop test.

### 7. subjective calls shouldn't be forced binary
if the source admits "this is audience-dependent" or "depends on context", forcing learners to pick exactly one correct answer punishes them for the source's own honesty.
fix: add a third option ("depends on audience" / "either is acceptable"). when the question is genuinely binary, the third option will be the wrong distractor; when the source admits ambiguity, the third option is the legitimate answer.

### 8. self-contradicting model answers across rules
multi-rule content frequently has model answers that fix rule A while violating rule B (e.g., a model rewrite that fixes a sinkhole verb but introduces a filler word the chapter elsewhere flags). model answers must respect *every* rule the chapter teaches, not only the one currently under test.
fix: cross-rule check every model answer. write a checklist of all chapter rules and validate each model answer against the full list.

### 9. audience-sample drift to caricature
when authoring sample paragraphs that demonstrate teaching points, stuffing 3+ teaching items into one composed sentence produces frankenstein text no real writer in the target domain would produce.
fix: limit to 1–2 teaching items per composed sentence; or split across multiple sentences. if your audience-sample reads as parody, your learners will notice.

### 10. lesson body vs exercise file drift
gender agreement, broken phrases, and english calques cluster in lesson body prose more than in exercise question banks — bodies are drafted faster and reviewed less. spot-check lesson bodies separately, with the same rigor as the question banks.
fix: include lesson `.tsx` / `.md` files in the wording audit (pass 3 above). don't assume "the lesson body is just intro text."

## the multi-fixable token pattern (digital interactive)

for click-to-fix, find-errors, and similar interactive formats:

- **rule:** when the prompt asks "find the X" / "click on the wrong Y", the question should have **at least 2 candidate clickable elements**. one clickable element = no diagnostic work, just click the only thing you can.
- **but**: only ONE candidate is the correct answer. the others must be either (a) already-correct (no-op alternatives in their option list) or (b) plausibly-wrong distractors that the validator will mark as incorrect.
- **never**: have two candidates with valid different fixes. the engine accepts only one — students who pick the other valid fix are punished for being right.
- **explicit click convention** in the prompt when the click-target is non-obvious (e.g., "click on the word AFTER which a comma is missing" — without saying so, learners click the word BEFORE).

## pre-publication checklist

- [ ] every example traces to a source line (or is tagged `[עיבוד]` / `[adapted]`)
- [ ] no invented terminology — every category and rule name appears verbatim in the source
- [ ] no invented test mechanics — heuristic identification methods are framed in the source's vocabulary
- [ ] multi-valid forms acknowledged in explanation
- [ ] every question's answer key was cross-checked against the actual source line
- [ ] every model answer was checked against ALL chapter rules (not only the rule under test)
- [ ] interactive questions: ≥2 candidate clickable elements; only one is correct; click conventions stated
- [ ] frame contamination: any prefix in question stems was checked against rules the chapter teaches
- [ ] subjective calls: third option ("depends on context") added where source admits ambiguity
- [ ] lesson body prose was wording-audited with the same rigor as exercise items
- [ ] ambiguity questions resolve by the rule under test ALONE — same surface tokens, different readings

## automated content validation

once the content is structured (typed, schema-validated, in code or a database), invest in an automated validator that runs at author-time and in CI. typical checks:

- structural: required fields, schema parse, valid id convention, references resolve
- per-type: click-to-fix replacement is in options, find-errors index is in range, multiple-choice answer is in options, ambiguity-riddle rewrites differ from ambiguous form, category-sort id/label shape, drag-drop slot indices in range
- pattern: forbidden invented terms (your "פסוקית ניגוד" list — whatever the canonical anti-patterns are in your domain), forbidden invented test mechanics
- frame contamination: prompts whose blank is preceded by a particle that triggers a separate rule the chapter teaches
- glossary references: every term-link in lessons resolves to a glossary entry

a project-specific validator with ~30 rules will catch ~half of what manual audit cycles catch — and it catches them at write-time, not three audit cycles later. write the validator in the same language as your content (so authors can run it locally), wire it into CI as a separate step before tests, and document its rules in your authoring guide so authors understand the constraints up front.
