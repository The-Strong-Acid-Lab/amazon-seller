# Review Data Context

## Current Working Dataset

Source file:

`/Users/osir/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/sry334217233_ee13/msg/file/2025-11/冥想椅评论合集US-Reviews-20251102.xlsx`

This dataset is good enough for V1 product design and early feature
development. We do not need to build review collection first.

## What The File Contains

### Workbook Structure

- Sheet 1: `B0F4RGNNK7-Reviews(101)`
- Sheet 2: `Note`

The `Note` sheet is tool/vendor metadata and should be ignored by the product.

### Main Columns

- `ASIN`
- `标题`
- `内容`
- `VP评论`
- `Vine Voice评论`
- `型号`
- `星级`
- `赞同数`
- `图片数量`
- `图片地址`
- `是否有视频`
- `视频地址`
- `评论链接`
- `评论人`
- `头像地址`
- `所属国家`
- `评论人主页`
- `红人计划链接`
- `评论时间`

## Dataset Snapshot

Based on the current file:

- total reviews: 342
- total columns: 19
- unique ASINs: 8
- main country: US
- date range: 2025-05-02 to 2025-10-30
- image-attached reviews: 16
- video-attached reviews: 2

### Largest ASIN Buckets

- `B0DFXSCYFR`: 148 reviews
- `B0F4RGNNK7`: 61 reviews
- `B0F4QBDQMP`: 26 reviews
- `B0F6T5WDRQ`: 15 reviews

### Rating Distribution

- 1 star: 21
- 2 star: 23
- 3 star: 31
- 4 star: 41
- 5 star: 226

This is enough to support:

- positive theme extraction
- negative pain point extraction
- variant-level review comparison
- ASIN-level competitor comparison

## What This Means For The Product

For V1, review import should work like this:

1. User uploads Excel or CSV.
2. System maps source columns to internal review fields.
3. System validates row quality.
4. System creates a project-level review dataset.
5. VOC analysis runs on normalized rows.

This means the product does not need Amazon scraping in order to be useful.

## Recommended Internal Review Schema

- `project_id`
- `source_file_name`
- `source_sheet_name`
- `asin`
- `review_title`
- `review_body`
- `rating`
- `review_date`
- `country`
- `model`
- `is_verified_purchase`
- `is_vine`
- `helpful_count`
- `image_count`
- `image_urls`
- `has_video`
- `video_urls`
- `review_url`
- `reviewer_name`
- `reviewer_profile_url`
- `influencer_program_url`
- `raw_row_json`

## Import Rules

- Ignore the `Note` sheet.
- Trim whitespace from text fields.
- Keep line breaks in review body.
- Store image and video URLs as arrays after splitting on line breaks.
- Convert `星级` to integer.
- Convert `赞同数` to integer.
- Convert `评论时间` to date.
- Convert `VP评论 == Y` to boolean.
- Convert `Vine Voice评论 == Y` to boolean.
- Preserve original raw row for traceability.

## Important Parsing Note

Do not parse Excel rows by positional cell order alone.

This file contains sparse cells, so empty cells can cause field shifts if the
importer only reads the values in sequence. The importer must map cells by
their actual Excel column reference.

Without that rule, fields such as `ASIN`, `星级`, `型号`, and `所属国家` can be
misread.

## Product Opportunity From This Dataset

Because the file includes:

- ASIN
- variant / model
- star rating
- title and full review text
- media presence
- review date

we can already build a useful first workflow:

- compare positive vs negative VOC by ASIN
- compare variants by complaint patterns
- identify recurring objections
- identify image-worthy proof points
- generate copy and image strategy from grounded evidence

## Current Recommendation

Treat uploaded third-party review exports as the primary review source for V1.

That is not a shortcut. It is the fastest path to a product that can actually
help your friend make better Amazon listing and image decisions.
