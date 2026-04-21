# Amazon Seller Project Context

This is a Next.js 16 Amazon seller image strategy app. Read this file before editing code, then inspect the files closest to the requested workflow.

## Core Stack

- Next.js App Router
- Supabase Postgres, Storage, Auth, and Realtime
- Trigger.dev v4 workers for long-running LLM and image tasks
- OpenAI and Gemini providers, with user-provided API keys where available
- shadcn/radix UI components

## Main Product Flow

1. User creates or imports a project.
2. User uploads target product images and optional competitor images.
3. System analyzes reviews/listing data and produces VOC strategy.
4. System maps image work into 8 fixed strategy slots.
5. User edits or rebuilds the prompt for a specific slot.
6. Prompt rebuild runs in a Trigger worker and writes progress/result to `prompt_rebuild_runs`.
7. Image generation runs in a Trigger worker and writes progress/result to `image_generation_runs` and `image_assets`.
8. Generated image history is visible per slot, but historical generated images are not source truth unless explicitly selected in future work.

## Important Files

- `src/components/image-brief-workbench.tsx`: main image strategy orchestration UI, realtime subscriptions, slot state, prompt rebuild and image generation actions.
- `src/components/image-strategy-workbench/reference-image-section.tsx`: target/competitor image upload and reference image management.
- `src/components/image-strategy-workbench/strategy-slot-card.tsx`: per-slot prompt editor, reference image, generated image, history UI, progress bars.
- `src/components/image-strategy-workbench/types.ts`: shared UI data types for assets, runs, references, slots.
- `src/lib/image-strategy.ts`: fixed 8-slot strategy blueprint and editable prompt construction.
- `src/lib/image-generation.ts`: image generation pipeline, reference selection, identity review, storage insert.
- `src/lib/image-prompt-rebuild.ts`: prompt rebuild logic and structured prompt enforcement.
- `src/trigger/generate-image-slot-task.ts`: image generation Trigger worker.
- `src/trigger/rebuild-image-slot-prompt-task.ts`: prompt rebuild Trigger worker.
- `src/lib/projects.ts`: server-side project page data loader.
- `src/app/api/projects/[projectId]/image-assets/generate/route.ts`: enqueue image generation runs.
- `src/app/api/projects/[projectId]/image-strategy-slots/rebuild-prompt/route.ts`: enqueue prompt rebuild runs.
- `supabase/migrations`: source of truth for DB schema changes.

## Current Product Decisions

- There are always 8 fixed image strategy slots.
- Slot prompts should stay structured: `Purpose`, `Conversion Goal`, `VOC / Market Evidence`, `Recommended On-Image Copy`, `Visual Direction`, `Product Invariants`, `Compliance`, `Negative Constraints`, and `Final Visual Prompt`.
- The editable final generation prompt should be stable English for image model consistency. UI labels and operational messages can be Chinese.
- Prompt rebuild and image generation must run in Trigger workers, not as slow synchronous API work.
- Image generation should anchor to the slot's `reference_image_id` when available, then fall back carefully.
- User-uploaded target images are source truth. Historical generated images should not override target reference images by default.
- Product identity must be preserved: category, silhouette, materials, hardware layout, footrests/armrests/wheels, and other visible core structure.
- Base images should not render text, letters, logos, watermarks, or overlay copy. Text overlays are handled later outside image generation.
- Do not force white background unless the user explicitly asks for it.

## Local Commands

- `npm run dev`
- `npm run trigger:dev`
- `npm run lint`
- `npx tsc --noEmit`
- `supabase db push`

## Common Pitfalls

- Do not make OpenAI/Gemini calls that can be slow directly from UI-facing API routes. Create a run row and enqueue a Trigger task.
- Do not mix Chinese correction prose into the final image-generation prompt.
- Do not rely only on image order for slot matching; use `reference_image_id` where available.
- Do not use generated history as the primary visual reference when the slot has a target reference image.
- Do not change unrelated UI layout or copy while fixing worker/API behavior.
- Do not add schema-dependent behavior without a Supabase migration.
- Realtime client callbacks may need explicit `{ new: unknown }` typing under the current TypeScript config.

## Verification

For code changes, run:

```bash
npm run lint
npx tsc --noEmit
```

For DB-backed changes, also add/check migrations and remind the user to run:

```bash
supabase db push
```
