# Implementation Roadmap

## Goal

Move from project preparation to a usable internal V1 in the shortest sensible
sequence.

## Phase 0

Preparation and decision lock-in.

Deliverables:

- product scope
- review data strategy
- schema draft
- analysis output spec

Status:

- completed

## Phase 1

Project and review import foundation.

Deliverables:

- project creation
- upload flow for Excel and CSV
- parser for sparse Excel rows
- normalized review persistence
- import status UI

Acceptance criteria:

- upload the current meditation chair review file
- parse rows correctly
- ignore non-data sheets
- save reviews in a queryable normalized format

Status:

- completed

## Phase 1.5

Project workspace structure.

Deliverables:

- project list
- project detail workspace
- target product vs competitor product model
- delete project flow
- add competitor sources into an existing project

Acceptance criteria:

- view all projects
- open a project and append more competitor data
- delete a project and all related data safely

Status:

- completed

## Phase 2

Basic analysis engine.

Deliverables:

- dataset overview computation
- target / competitor segmentation
- target positive and negative themes
- competitor positive and negative themes
- evidence selection
- first structured comparison report JSON

Acceptance criteria:

- run analysis for one project
- render separated target and competitor themes
- attach supporting review excerpts

Status:

- completed

## Phase 3

Strategy generation layer.

Deliverables:

- buyer desire extraction
- buyer objection extraction
- comparison opportunities
- comparison risks
- VOC to response matrix
- execution task list
- listing draft
- image brief
- image strategy brief
- copy angle brief

Acceptance criteria:

- one report gives concrete next-step suggestions
- suggestions are traceable back to review evidence
- seller can see what to change this week

Status:

- completed

## Phase 4

Report UI and export.

Deliverables:

- structured report page
- competitor detail modal
- insight cards
- exportable brief

Acceptance criteria:

- seller can inspect and use the report without reading raw JSON

Status:

- in progress

## Phase 5

Seller-facing workflow polish.

Deliverables:

- stale analysis warning
- listing input workflow polish
- better competitor browsing flow
- report export and copy actions
- image strategy workspace polish
- reference-image tagging and URL import
- lightweight image-generation mode handling (`precise` vs `concept`)

Acceptance criteria:

- seller knows when re-analysis is needed
- seller can move from review evidence to action without confusion
- seller can generate image directions even when only competitor references exist
- image consistency checks appear as guidance, not as a hard block

Status:

- in progress

## Phase 6

Validation with real users.

Deliverables:

- run the product with your friend's dataset
- collect feedback on usefulness
- identify missing insight blocks
- identify bad recommendations and refine prompts or heuristics

Acceptance criteria:

- at least one seller says the output is useful enough to guide listing work

## Suggested Build Order In Code

1. database models and types
2. import parser
3. import persistence
4. project workspace
5. analysis service
6. report page
7. export

## Technical Notes

### Import Layer

- build Excel parsing around actual cell references, not raw cell order
- support multi-sheet workbooks
- allow sheet ignore rules
- store raw row JSON for debugging

### Analysis Layer

- start with a server-side pipeline
- mix deterministic preprocessing with LLM summarization
- persist analysis output as structured JSON

### UI Layer

- do not build a giant dashboard first
- make one clean report page
- prioritize evidence visibility over charts
- keep competitor details secondary to the project workspace

## Risks To Watch

- import bugs due to inconsistent seller exports
- noisy or repetitive LLM output
- strategy recommendations drifting away from evidence
- trying to support too many file formats too early
- analysis becoming too abstract and not producing usable drafts
- over-building automation before the execution brief is trusted

## Explicit Anti-Scope

Do not start with:

- auth
- billing
- team management
- scraper tooling
- ad campaign write-back
- embedding search

Related note:

- usage caps, plan limits, and credit purchases should be implemented only after auth exists
- do not tie future generation quotas to surviving `image_assets` rows because users can hard-delete generated results

## Definition Of "Ready To Build"

The project is ready to move into implementation when these are settled:

- V1 workflow
- review schema
- analysis output contract
- first dataset
- acceptance criteria for the first report

That threshold has been crossed.

## Current Suggested Next Step

The next concrete build step should be:

- report export
- user persona output
- value-layer classification
  - baseline
  - performance
  - differentiator
