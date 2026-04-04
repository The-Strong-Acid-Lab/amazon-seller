# Image Strategy Workbench

## Goal

This project should not behave like a generic image generator. The image module exists to help an Amazon seller turn VOC evidence, listing inputs, competitor signals, and uploaded product photos into a usable `1 main + 7 secondary` image plan.

The working principle is:

1. Collect evidence
2. Plan fixed image slots
3. Generate editable concept prompts
4. Optionally generate image concepts
5. Keep selected versions for execution

The system should feel closer to a professional listing strategy console than to a one-click image toy.

## Design Principles

### 1. Prompt-first, not image-first

The user should first see:

- what this image is supposed to sell
- which buyer doubt it resolves
- which VOC evidence supports it
- what compliance constraints apply
- what prompt will be sent to the generator

Only then should the user decide whether to generate a concept.

### 2. Fixed slot system

The image workflow should always normalize to 8 slots:

1. Main Image
2. Core Value
3. Primary Lifestyle
4. Secondary Lifestyle
5. Feature Proof
6. Material Detail
7. Dimensions & Fit
8. Objection Closer

This keeps strategy stable across products and avoids random image idea generation.

### 3. Unlimited inputs, fixed outputs

Users can upload:

- unlimited target product images
- unlimited competitor images

But the system always outputs a fixed 8-slot strategy. Input images are reference material, not one-to-one slot assignments.

### 4. Generate base visuals, not final fully composed ads

The generator should primarily create the base visual layer. Text overlays, arrows, dimensions, icons, and comparison labels should later be handled in a layout step instead of being baked into the image model output.

This improves:

- compliance
- consistency
- editability
- visual quality

## Slot Definitions

### Main Image

- Job: make the product instantly recognizable and category-distinct
- Constraint: strict Amazon main-image compliance
- No text or scene elements

### Core Value

- Job: communicate the strongest value proposition quickly
- Usually the first infographic-style support image

### Primary Lifestyle

- Job: show the most commercially important real-use scene
- Must create believable user identification

### Secondary Lifestyle

- Job: extend to another user type or alternate scenario
- Must not duplicate the previous lifestyle image

### Feature Proof

- Job: explain how an important feature or mechanism works
- Should leave room for labels or callouts later

### Material Detail

- Job: visualize comfort, texture, finish, cleanability, or craftsmanship
- Often better as close-up detail or tactile interaction

### Dimensions & Fit

- Job: reduce hesitation around size, proportion, compatibility, or footprint
- Should be built for later dimension overlays

### Objection Closer

- Job: answer the final doubt that still blocks conversion
- Can be trust, stability, support, durability, or non-generic differentiation

## Prompt Structure

Each slot prompt should be long-form and structured. A single-line prompt is not enough.

The recommended visible prompt sections are:

- Purpose
- Conversion Goal
- VOC / Market Evidence
- Recommended On-Image Copy
- Visual Direction
- Product Invariants
- Compliance
- Negative Constraints
- Final Visual Prompt

The user should be able to edit the visible prompt. The system can still add hidden safety and consistency constraints before the final model call.

## Model Responsibilities

This workflow should use model specialization instead of forcing one model to do everything.

### Planning model

Use a strong reasoning model for:

- VOC synthesis
- competitor pattern reading
- slot planning
- long-form prompt construction

### Production helper model

Use a cheaper model for:

- formatting
- prompt cleanup
- JSON normalization
- copy rewrites

### Image model

Use an image generation model only after slot strategy and prompt review are complete.

Its role is to produce a concept visual, not to invent the entire commercial logic.

## Current Build Direction

The current implementation direction is:

1. migrate the UI from `Image Brief` to `8-slot strategy workbench`
2. expose editable prompts per slot
3. keep reference-image upload as evidence input
4. keep concept image generation as an optional step
5. later separate image generation from text/layout rendering

## What Comes Next

1. Persist editable slot prompts and slot planning data in the database
2. Ask the analysis model to return 8 slot briefs by default
3. Add multi-concept generation per slot
4. Add layout/render phase for text overlays and measurement graphics
5. Add competitor image analysis summaries into each slot card
