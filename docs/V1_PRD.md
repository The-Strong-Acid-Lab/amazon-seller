# V1 PRD

## Product

Amazon Seller VOC Optimization Copilot

## Objective

Build a focused product that helps Amazon sellers turn third-party review data
and competitor listing data into conversion strategy and first-draft execution
assets.

V1 is not a generic AI writing tool.
V1 is not an ad automation platform.
V1 is not a scraping product.

V1 should help a seller answer:

- What are buyers praising?
- What are buyers complaining about?
- Which concerns are blocking conversion?
- What are competitors already saying well in their listing?
- Which positioning gaps are still open?
- What angles should the listing and images respond to?
- What copy directions should be tested next?
- What should we actually change this week?

## Primary User

Small to mid-sized Amazon seller or operator who:

- already has access to exported review data
- understands listing and advertising basics
- needs faster insight extraction and content decisions
- wants evidence-backed recommendations, not vague AI output

## Core User Journey

1. Create a project for one target-product decision.
2. Define the target product:
   launched or pre-launch.
3. Add competitor / reference products.
4. Upload review export files against the correct product source.
5. Paste or edit target / competitor listing inputs.
6. Run analysis across target and competitor evidence.
7. Review VOC findings, evidence, and positioning gaps.
8. Review execution outputs for the target product.
9. Export a brief and use it to update listing assets.

## V1 Inputs

### Required

- review export file: Excel or CSV
- review title
- review body
- star rating
- product source assignment
  - target product or competitor product

### Strongly Recommended

- ASIN
- product URL
- model / variant
- review date
- country

### Optional

- target product listing draft
- seller product title
- seller product bullets
- seller product description
- seller product features
- seller product images
- competitor titles
- competitor bullets
- competitor descriptions

## V1 Outputs

### Review Insight Layer

- review volume summary
- rating distribution
- target positive theme summary
- target negative theme summary
- competitor positive theme summary
- competitor negative theme summary
- evidence-backed quotes

### Strategy Layer

- top buyer desires
- top buyer objections
- top usage scenarios
- positioning opportunities
- positioning risks
- VOC to response strategy table
- prioritized execution task list

### Execution Layer

- listing draft
  - positioning statement
  - title draft
  - bullet drafts
- image brief
  - hero image purpose
  - image-by-image brief for supporting slots
- image strategy recommendations
- copy angle recommendations

### Export Layer

- structured report view
- exportable text brief

## V1 Screens

1. Project list
2. New project / upload flow
3. Project workspace
4. Competitor detail modal
5. Analysis report
6. Export page

## Jobs To Be Done

### Functional

- import and normalize review data
- attach each review source to the correct product
- support target product and competitor product roles
- support manual competitor listing input
- summarize buyer voice fast
- highlight real conversion blockers
- generate actionable content strategy for the target product
- generate first-draft listing and image outputs

### Emotional

- reduce analysis overwhelm
- make sellers feel their decisions are grounded
- reduce guesswork before making listing changes

## Product Principles

- Evidence first
- Explainable outputs
- Narrow scope
- Actionable over impressive
- Human review is required
- One workspace should support one target plus multiple competitors

## Success Criteria

V1 is successful if a seller can upload one dataset and get a report that is:

- understandable in under 10 minutes
- concrete enough to guide image and copy changes
- grounded in real review evidence
- differentiated enough to avoid copying the competitor's current listing
- worth using again for another ASIN

## Non-Goals

- automatic Amazon scraping
- ad bid automation
- campaign publishing
- autonomous decision-making
- broad marketplace support beyond the initial workflow

## Main Risks

- AI output sounds smart but lacks actionability
- weak evidence grounding reduces trust
- review imports vary too much across file formats
- seller inputs are incomplete or inconsistent

## Product Decisions Locked For V1

- Imported review files are the main review source
- Excel and CSV import are first-class features
- One project represents one target-product decision task
- Review files are evidence sources, not the project itself
- A project should support one target product plus multiple competitors
- LLM extraction plus fixed taxonomy beats unsupervised clustering for V1
- Outputs must be traceable to source reviews
- Competitor listing input is manual before any scraping is considered
- Listing draft and image brief are now part of the core V1 output
- The product is a decision workspace, not a black-box autopilot
- Image generation is a workspace tool, not a billing-aware entitlement system yet
- Reference images may come from local upload or direct image URL import
- Image generation may run in `precise` mode or `concept` mode depending on whether target product images exist
- Image consistency review should guide human judgment, not cancel a paid generation result

## Explicit Deferrals

- login / auth and plan-aware image quotas should be designed together
- credit purchase logic should not be bolted onto raw image deletion behavior
- generated-image usage limits should later be counted from runs or a dedicated usage ledger, not remaining image rows
