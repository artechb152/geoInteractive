# accessibility & universal design for learning

> use this reference when the user asks for: accessible training, inclusive design, UDL, WCAG compliance, screen reader support, or when designing for diverse learner populations.

## table of contents
- [universal design for learning (UDL)](#universal-design-for-learning-udl)
- [WCAG and digital accessibility](#wcag-and-digital-accessibility)
- [israeli accessibility law (IS 5568)](#israeli-accessibility-law-is-5568)
- [accessibility checklist for training materials](#accessibility-checklist-for-training-materials)
- [accessible assessment design](#accessible-assessment-design)

## universal design for learning (UDL)

UDL is a proactive framework: design for diverse learners from the start, not as an afterthought.

### three principles

| principle | goal | examples in training |
|---|---|---|
| **multiple means of representation** | present information in various formats | text + audio + visual; captions on video; glossary for jargon; diagrams with alt text |
| **multiple means of engagement** | offer different ways to motivate | choice of topics; collaborative + solo options; real-world relevance; self-pacing; gamified and non-gamified tracks |
| **multiple means of action & expression** | varied ways to demonstrate knowledge | written response, oral presentation, portfolio, demonstration, drag-and-drop, video submission |

### applying UDL to deliverables

- **learning objectives**: ensure the verb allows multiple demonstration paths (e.g., "explain" can be oral or written).
- **assessment blueprint**: for each objective, plan at least two modalities when feasible.
- **elearning storyboard**: for each screen, check: can a learner who cannot see/hear/use a mouse still access the content?
- **question banks**: provide text alternatives for image-based items; avoid items that depend solely on color or spatial arrangement.
- **activities**: offer at least one alternative interaction pattern (e.g., drag-and-drop + dropdown menu equivalent).

## WCAG and digital accessibility

WCAG (Web Content Accessibility Guidelines) is the global standard. current target: **WCAG 2.1 Level AA**.

### POUR principles

| principle | what it means | training examples |
|---|---|---|
| **perceivable** | users can perceive all content | alt text on images; captions on video; sufficient color contrast (4.5:1 for text) |
| **operable** | all functions work via keyboard and assistive tech | tab navigation; no time-limited interactions without override; no flashing content |
| **understandable** | content and navigation are clear | plain language; consistent layout; error messages explain what to fix |
| **robust** | works across devices and assistive technologies | semantic HTML; ARIA labels; tested with screen readers |

### key requirements for elearning

1. **text alternatives**: every non-decorative image needs alt text; complex images need long descriptions.
2. **captions and transcripts**: all audio/video must have synchronized captions and a transcript option.
3. **keyboard access**: every interaction (buttons, drag-and-drop, menus) must be operable via keyboard alone.
4. **color independence**: never use color as the only way to convey information (e.g., "red = wrong" must also have text/icon).
5. **contrast**: text contrast ratio ≥ 4.5:1 (normal text), ≥ 3:1 (large text / UI components).
6. **readable text**: minimum 16px body text; resizable to 200% without loss of content.
7. **time limits**: if timed, provide option to extend or disable time limits.
8. **focus indicators**: visible focus ring on all interactive elements.

## israeli accessibility law (IS 5568)

**applies to**: all businesses and organizations serving the public in israel.

| requirement | detail |
|---|---|
| standard | IS 5568, based on WCAG 2.0 Level AA |
| scope | websites, web applications, digital learning platforms, mobile apps |
| enforcement | statutory damages up to **50,000 ₪** without requiring proof of harm |
| who must comply | medium/large organizations (from inception); small businesses (since october 2020) |

### implications for instructional designers in israel

- all elearning modules, online assessments, and digital handouts must comply.
- screen reader testing in hebrew (JAWS/NVDA) is essential — do not assume compliance.
- PDF documents must be tagged for accessibility.
- forms and quizzes must have proper labels and error messaging.
- if producing SCORM/xAPI packages for an LMS, the LMS itself must also be accessible.

## accessibility checklist for training materials

use this checklist before delivering any digital training artifact:

### content
- [ ] alt text on all meaningful images; decorative images marked as decorative
- [ ] captions on all video; transcripts available
- [ ] color is not the sole carrier of information
- [ ] text contrast ≥ 4.5:1; large text ≥ 3:1
- [ ] plain language; jargon defined; acronyms expanded on first use
- [ ] reading order is logical (test by tabbing through)

### interaction
- [ ] all interactions operable via keyboard
- [ ] focus indicators visible on all interactive elements
- [ ] drag-and-drop has a keyboard alternative (e.g., dropdown, arrow keys)
- [ ] time limits can be extended or disabled
- [ ] no content flashes more than 3 times per second

### assessment
- [ ] question stems do not depend on images without alt text
- [ ] feedback is provided in text (not only color or sound)
- [ ] accommodations are documented (extended time, alternative formats)
- [ ] instructions are clear without relying on spatial cues ("click the box on the left")

### documents and exports
- [ ] PDF is tagged (headings, lists, tables have structure)
- [ ] Word/Google Docs use heading styles (not just bold text)
- [ ] tables have header rows marked
- [ ] slide decks have slide titles and alt text

## accessible assessment design

### accommodations to plan for

| accommodation | when to offer | how to implement |
|---|---|---|
| extended time | learning disabilities, ESL learners | 1.5x–2x default time; configurable in LMS |
| screen reader compatible | visual impairments | semantic markup; alt text; avoid image-only items |
| large print / zoom | low vision | responsive design; minimum 16px; zoomable to 200% |
| alternative input | motor disabilities | keyboard-only access; voice input compatible |
| simplified language | cognitive disabilities, ESL | plain language version; glossary; shorter sentences |
| audio description | visual impairments | narrated version of visual-only content |

### inclusive item writing

- avoid culture-specific references that disadvantage certain groups.
- avoid idioms or metaphors that do not translate well across languages.
- test items with diverse reviewers when possible.
- when using scenarios, represent diverse names, roles, and contexts.
