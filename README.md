# Amazon Seller Research Console

An internal console for turning Amazon reviews, listing inputs, competitor signals, and image references into usable seller decisions.

This product is not just a copy generator. The intended workflow connects:

- review import and normalization
- VOC analysis
- target vs competitor positioning
- listing draft generation
- image strategy planning
- execution-oriented outputs

## Current Product Shape

The main modules in the app are:

- project and competitor management
- review file import into Supabase
- async VOC analysis with Trigger.dev
- listing deliverable editor with snapshots
- image strategy workbench with fixed 8 image slots

## Image Module Direction

The image module is being repositioned from a simple `Image Brief + direct generation` flow into a professional `8-slot strategy workbench`.

The target workflow is:

1. upload target and competitor reference images
2. plan fixed listing image slots
3. inspect and edit long-form concept prompts
4. optionally generate image concepts
5. keep selected versions

See the detailed design note here:

- [Image Strategy Workbench](./docs/image-strategy-workbench.md)

## Docs

- [Project Overview](./docs/ROOT_PROJECT_OVERVIEW.md)
- [Project Context](./docs/PROJECT_CONTEXT.md)
- [Review Data Context](./docs/REVIEW_DATA_CONTEXT.md)
- [V1 PRD](./docs/V1_PRD.md)
- [DB Schema](./docs/DB_SCHEMA.md)
- [Analysis Spec](./docs/ANALYSIS_SPEC.md)
- [Implementation Roadmap](./docs/IMPLEMENTATION_ROADMAP.md)

## Development

Run the app locally:

```bash
npm run dev
```

Run quality checks:

```bash
npm run lint
npm run build
```

## Stack

- Next.js App Router
- TypeScript
- Supabase
- Trigger.dev
- OpenAI API
