# Amazon Seller Research Workspace

## Product Thesis

This product should not be positioned as a generic AI writing tool.

The stronger positioning is:

An evidence-first workspace for Amazon sellers that turns:

- review exports
- competitor listings
- target product context

into:

- VOC insight
- positioning decisions
- execution tasks
- listing draft
- image brief

The goal is not to automate everything.
The goal is to help a seller make better conversion decisions faster.

## What The Original AI Flow Really Implies

The original PPT-style AI flow is directionally right, but it is easy to
misread it as:

`reviews -> model -> generated listing`

That is too shallow.

What it is actually implying is:

`evidence -> structured VOC -> positioning -> content execution`

In practice that means:

1. collect competitor reviews
2. collect competitor listing inputs
3. collect target product context
4. extract buyer voice
5. identify gaps and risks
6. convert those findings into image and copy actions

So the product is not a chatbot.
It is a decision workspace for Amazon PDP optimization.

## Product Model

### One Project = One Target-Product Decision

A project is not a review file.

A project represents:

- one target product
- zero or more competitor products
- all review and listing evidence attached to those products
- one evolving set of recommendations for how the target should position itself

### Product Roles

Inside a project there are two roles:

- `target`
- `competitor`

The target is the product you are trying to improve or launch.

Competitors are reference products whose:

- reviews
- listing content
- positioning

help shape the target strategy.

## Core Product Logic

The product should always answer four layers of questions.

### 1. Evidence Layer

What inputs do we have?

- review exports
- target listing inputs
- competitor listing inputs
- optional notes and context

### 2. Insight Layer

What are buyers actually saying?

- target positive and negative themes
- competitor positive and negative themes
- buyer desires
- buyer objections
- usage scenarios
- comparison opportunities
- comparison risks

### 3. Strategy Layer

What should the target do with those insights?

- VOC to response matrix
- positioning logic
- prioritization of actions

### 4. Execution Layer

What can the seller actually use this week?

- execution task list
- listing draft
- image brief
- copy strategy

This is the right product shape.
It is much stronger than stopping at “theme clustering” or “AI listing generator”.

## Current Implemented State

The product has already moved beyond the original rough framework.

### Implemented

- project list
- create project
- append competitor review sources inside an existing project
- Excel / CSV review import
- target vs competitor project structure
- competitor list with modal detail view
- manual target and competitor listing input
- project delete flow
- project-level stale analysis warning
- LLM analysis for:
  - target vs competitor VOC
  - comparison opportunities and risks
  - execution tasks
  - listing draft
  - image brief
- image strategy workspace with fixed 8-slot planning
- reference image upload plus image URL import
- target vs competitor reference-image separation
- automatic reference-image classification and main-image pinning
- image generation runs with versioned outputs
- precise mode vs concept mode generation behavior

### Important Current Behavior

- the system uses competitor listing inputs if they are provided
- missing listing fields do not block the workflow
- if target reviews do not exist, target-only praise / complaint sections are kept empty
- adding new reviews or changing listing inputs should trigger re-analysis
- image generation now has two lightweight modes:
  - `precise`: at least one usable target reference image exists
  - `concept`: no target image exists, but competitor references exist
- deleting a generated image currently hard-deletes the storage object and the `image_assets` row
- image consistency review is advisory, not a hard failure gate
- generation quota / credits are intentionally deferred until auth and plan work land together

## Why Reviews Alone Are Not Enough

Reviews tell you:

- what buyers want
- what buyers dislike
- what worries them

But reviews do not tell you enough about:

- what competitors are already saying on-page
- what messaging space is crowded
- what claims are underexplained

That is why competitor listing inputs matter.

The useful comparison is:

`buyer voice` vs `current competitor messaging`

That is how the product finds:

- baseline expectations
- missed objections
- open positioning gaps
- overused claims

## Why This Product Should Stay Evidence-First

Amazon sellers do not fully trust black-box AI output.

They trust:

- evidence
- traceability
- clear reasoning
- suggestions they can edit

So the product should behave like:

- research assistant
- positioning assistant
- execution assistant

Not like:

- all-knowing autopilot
- one-click listing generator

## What Matters Most In V1

### Highest Value Inputs

- review exports
- competitor title
- competitor bullets
- target title
- target bullets

### Medium Value Inputs

- product URL
- product notes
- description fields

### Lower Priority For Now

- scraping
- image-generation billing / quota enforcement
- campaign automation
- billing
- auth

## What The Product Should Ultimately Help A Seller Do

The real seller questions are:

- Why are competitors converting?
- What are buyers repeatedly praising?
- What objections must the page answer?
- Which angle should the target claim?
- What should we change first in title, bullets, and images?

If the product cannot help answer those, then extra AI features do not matter.

## Design Principle For Future Decisions

When choosing what to build next, prefer the thing that most directly improves:

- seller clarity
- seller trust
- seller execution speed

and deprioritize things that only improve:

- novelty
- AI spectacle
- automation for its own sake

## Recommended Next Additions

The next logical modules are:

1. user persona output
2. value-layer classification
   - baseline
   - performance
   - differentiator
3. export / shareable report
4. A+ or enhanced content brief

These are more valuable than jumping straight into image generation.

## Short Product Definition

The cleanest one-line definition at this stage is:

An Amazon seller research workspace that turns reviews and competitor listings
into positioning, listing, and image decisions.
