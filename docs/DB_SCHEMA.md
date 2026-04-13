# Database Schema

## Goal

Define the minimum data model needed to support:

- project creation
- target product definition
- competitor product definition
- review import
- normalized review storage
- analysis generation
- strategy report display

## Design Principles

- Keep the schema narrow for V1
- Preserve raw imported data
- Keep generated artifacts versionable
- Make all insights traceable back to reviews

## Tables

### projects

Purpose:
One decision workspace for one target-product optimization task.

Fields:

- `id`
- `name`
- `status`
- `created_at`
- `updated_at`

Notes:

- `projects` should represent the business task, not just a file import.
- One project can contain one target product plus multiple competitor products.

### project_products

Purpose:
Represent all product entities inside one project, including the target product
and competitor products.

Fields:

- `id`
- `project_id`
- `role` (`target` or `competitor`)
- `name`
- `asin`
- `product_url`
- `market`
- `is_launched`
- `current_title`
- `current_bullets`
- `current_description`
- `notes`
- `created_at`
- `updated_at`

Notes:

- The target product may be pre-launch and therefore have no ASIN or URL yet.
- Competitor products should usually have ASIN and URL when available.
- Review files should attach to a specific `project_product`, not just to the
  project as a whole.

### import_files

Purpose:
Track uploaded source files and parsing status.

Fields:

- `id`
- `project_id`
- `project_product_id`
- `file_name`
- `file_type`
- `source_kind`
- `sheet_name`
- `storage_path`
- `import_status`
- `row_count`
- `error_message`
- `created_at`

### reviews

Purpose:
Normalized review rows used by analysis.

Fields:

- `id`
- `project_id`
- `project_product_id`
- `import_file_id`
- `asin`
- `model`
- `review_title`
- `review_body`
- `rating`
- `review_date`
- `country`
- `is_verified_purchase`
- `is_vine`
- `helpful_count`
- `image_count`
- `has_video`
- `review_url`
- `reviewer_name`
- `reviewer_profile_url`
- `influencer_program_url`
- `raw_row_json`
- `created_at`

### review_media

Purpose:
Store image and video URLs in normalized form.

Fields:

- `id`
- `review_id`
- `media_type`
- `url`
- `position`

### analysis_runs

Purpose:
Track each analysis job and its status.

Fields:

- `id`
- `project_id`
- `run_type`
- `status`
- `model_name`
- `started_at`
- `completed_at`
- `error_message`

### analysis_reports

Purpose:
Store the final structured report for one run.

Fields:

- `id`
- `project_id`
- `analysis_run_id`
- `report_version`
- `summary_json`
- `strategy_json`
- `export_text`
- `created_at`

### insight_items

Purpose:
Store normalized insight cards for UI and sorting.

Fields:

- `id`
- `project_id`
- `analysis_run_id`
- `category`
- `label`
- `description`
- `sentiment`
- `priority_score`
- `evidence_count`
- `created_at`

### insight_evidence

Purpose:
Link insights back to individual reviews.

Fields:

- `id`
- `insight_item_id`
- `review_id`
- `evidence_type`
- `excerpt`
- `created_at`

## V1 Status Values

### projects.status

- `draft`
- `ready`
- `analyzing`
- `completed`
- `failed`

### import_files.import_status

- `uploaded`
- `parsed`
- `normalized`
- `failed`

### analysis_runs.status

- `queued`
- `running`
- `completed`
- `failed`

## Practical Notes

- `raw_row_json` is mandatory in V1 for traceability and debugging
- `project_products` is the key schema upgrade that aligns the data model with
  the real business logic: one project, one target product, many competitors
- `summary_json` and `strategy_json` should remain flexible while output format evolves
- `insight_items` makes it easier to build UI without re-parsing large report blobs
- `review_media` should be separate to avoid URL arrays inside the reviews table

## Deferred For Later

- user accounts and teams
- billing
- seller assets
- listing version history
- embedding tables
- cross-project benchmarking
- prompt/version audit tables

## Current Image-Generation Notes

- `image_assets` is currently a results table, not a billing ledger
- deleting a generated image currently removes both the storage object and the `image_assets` row
- `image_generation_runs` is the better near-term source for counting historical generations because image rows can be deleted later
- if plan limits or credit purchases are introduced, add a dedicated usage / ledger table instead of deriving quota state from remaining generated-image rows
