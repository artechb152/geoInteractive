# storyboards & training materials

> use this reference when the user asks for: lesson plans, facilitator guides, learner handouts, elearning storyboards, scripts, microcopy, or rewriting content into training-ready form.

## table of contents
- [lesson plan template](#lesson-plan-template)
- [facilitator guide template](#facilitator-guide-template)
- [elearning storyboard template](#elearning-storyboard-template)
- [writing style rules](#writing-style-rules)

## lesson plan template

| time | segment | objective | method | activity | materials | success check |
|---:|---|---|---|---|---|---|
| 0–5 | opener | obj-1 | discussion | prompt: __ | slides | learners can __ |

## facilitator guide template

for each segment include:

- **say/do**: what the facilitator says and does
- **ask**: key questions
- **watch for**: misconceptions and pitfalls
- **adapt**: what to do if learners struggle

## elearning storyboard template

| screen | title | on-screen text | narration | interaction | correct response rule | feedback | accessibility notes | assets |
|---:|---|---|---|---|---|---|---|---|
| 1 | ... | ... | ... | click to reveal | n/a | n/a | alt text... | img-1 |

## writing style rules

- use short sentences; one idea per line for on-screen text.
- prefer active voice and concrete verbs.
- explain acronyms on first use.
- in hebrew: keep terminology consistent (same translation each time). create a glossary at project start. see `references/rtl-bidi-guidelines.md`.
- avoid shame language in feedback; focus on behavior and impact.

## RTL and hebrew storyboard notes

when writing storyboards for hebrew elearning:

- **layout**: specify RTL layout explicitly in the storyboard. navigation "next" button goes on the left; "previous" on the right.
- **narration**: write hebrew narration with embedded english terms marked (bold or code formatting).
- **text length**: hebrew text is ~20% longer than english for the same content — account for this in screen layout.
- **images**: never embed hebrew text in images — use overlay text for localization and screen reader compatibility.
- **bidi content**: when screens contain mixed hebrew/english (technical terms, code, URLs), note the expected rendering behavior.
- for full RTL guidelines, see `references/rtl-bidi-guidelines.md`.

## accessibility checklist for materials

before delivering any training material, verify:

### elearning storyboard
- [ ] alt text specified for every meaningful image/graphic
- [ ] narration transcript available (not just audio)
- [ ] interactions have keyboard alternatives
- [ ] color is not the sole information carrier
- [ ] text contrast ≥ 4.5:1 specified in design notes
- [ ] reading order specified for screen readers
- [ ] time-limited interactions include extension option

### facilitator guide
- [ ] materials list includes accessible alternatives (e.g., large print handouts)
- [ ] activities have adaptations for diverse learners (UDL)
- [ ] visual aids described in facilitator notes (for facilitators with visual impairments or remote participants)

### learner handouts
- [ ] uses heading styles (not just bold) for document structure
- [ ] tables have header rows
- [ ] images have alt text
- [ ] PDF is tagged for accessibility

for full accessibility and UDL guidance, see `references/accessibility-and-udl.md`.
