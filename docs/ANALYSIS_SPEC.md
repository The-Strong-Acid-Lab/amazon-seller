# Analysis Output Spec

## Goal

Define what the current analysis engine must produce so the product is useful
for Amazon listing decisions.

The engine should not stop at review summarization.
It should turn review evidence plus competitor listing inputs into structured,
actionable output blocks.

## Current Analysis Stages

1. Review normalization
2. Target vs competitor segmentation
3. Listing input assembly
4. Theme extraction
5. Evidence selection
6. Positioning analysis
7. Strategy generation
8. Execution draft generation

## Normalization Rules

- trim whitespace
- preserve original title and body separately
- reject empty review rows
- treat rating as integer from 1 to 5
- keep target and competitor review sources separated
- preserve raw evidence inputs for traceability

## Evidence Inputs

The analysis engine may use:

- target reviews
- competitor reviews
- target listing inputs
  - title
  - bullets
  - description
- competitor listing inputs
  - title
  - bullets
  - description

If listing inputs are missing, the engine should fall back to review evidence
and avoid inventing listing content.

## Required Report Sections

### 1. Dataset Overview

- review count
- ASIN count
- date range
- rating distribution

### 2. Target Review Overview

- target review count
- target ASIN count
- target date range
- target rating distribution

### 3. Competitor Review Overview

- competitor review count
- competitor ASIN count
- competitor date range
- competitor rating distribution

### 4. Target Positive VOC

For each top target positive theme:

- theme label
- why buyers like it
- supporting evidence

If no target reviews exist, this section must be empty.

### 5. Target Negative VOC

For each top target negative theme:

- theme label
- why buyers complain
- supporting evidence

If no target reviews exist, this section must be empty.

### 6. Competitor Positive VOC

For each top competitor positive theme:

- theme label
- why buyers like it
- supporting evidence

### 7. Competitor Negative VOC

For each top competitor negative theme:

- theme label
- why buyers complain
- supporting evidence

### 8. Buyer Desires

Capture what buyers are trying to achieve, such as:

- comfort during long sitting
- posture flexibility
- small-space fit
- decor fit

### 9. Buyer Objections

Capture what may block conversion, such as:

- weak support
- poor durability
- not suitable for larger users
- bad value perception

### 10. Usage Scenarios

Extract repeated use cases, such as:

- office work
- gaming
- reading
- meditation
- bedroom or vanity seating

### 11. Positioning Layer

Identify:

- comparison opportunities
- comparison risks
- where competitors are already strong in their page messaging
- where the target can differentiate

### 12. VOC To Response Strategy

For each major theme, define:

- `voc_theme`
- `buyer_signal`
- `risk_or_opportunity`
- `execution_area`
- `priority`
- `why_now`
- `recommended_listing_response`
- `recommended_image_response`
- `recommended_ad_angle`
- `confidence`

### 13. Execution Tasks

Each task should include:

- `task_title`
- `priority`
- `workstream`
- `concrete_action`
- `expected_impact`
- `success_signal`

This is not a summary block.
It should read like real work to do this week.

### 14. Listing Draft

The listing draft should include:

- positioning statement
- title draft
- title rationale
- bullet drafts
- bullet rationales

The goal is to produce a first draft that is differentiated against current
competitor messaging, not final polished copy.

### 15. Image Brief

The image brief should recommend image-by-image execution, not just direction.

Each item should include:

- `slot`
- `goal`
- `message`
- `supporting_proof`
- `visual_direction`

### 16. Image Strategy

The image strategy layer can still include:

- hero image direction
- feature callout ideas
- objection-handling image ideas
- lifestyle scene ideas

### 17. Copy Strategy

The copy strategy layer can include:

- title angle options
- bullet angle options
- proof phrases

## Evidence Rules

Every insight shown in the UI must be grounded in review evidence or explicit
listing inputs.

No unsupported theme should be shown as a top recommendation.

If target reviews do not exist:

- target positive themes must be empty
- target negative themes must be empty
- target-side suggestions may still be inferred from competitor review gaps

## Minimum JSON Shape

```json
{
  "dataset_overview": {},
  "target_overview": {},
  "competitor_overview": {},
  "target_positive_themes": [],
  "target_negative_themes": [],
  "competitor_positive_themes": [],
  "competitor_negative_themes": [],
  "buyer_desires": [],
  "buyer_objections": [],
  "usage_scenarios": [],
  "comparison_opportunities": [],
  "comparison_risks": [],
  "execution_tasks": [],
  "listing_draft": {},
  "image_brief": [],
  "voc_response_matrix": [],
  "image_strategy": {},
  "copy_strategy": {}
}
```

## What To Avoid

- long unstructured summaries
- unsupported claims
- generic copy not tied to review evidence
- recommendations that require unavailable product features
- inventing target-product praise when no target reviews exist
- ignoring competitor listing inputs when they are available

## Quality Bar

The report is good enough if a seller can:

- understand the top buyer concerns quickly
- see supporting review evidence
- understand how competitors are currently positioning themselves
- turn the output into listing, image, and execution tasks
- trust that the output is grounded in real feedback
