# My RPG Source Analytics & Owner Dashboard Setup

**GA4 Measurement ID:** `G-N3252YKGQX`  
**Search Console property:** `myrpgsource.com`

This file documents the owner-facing analytics setup. It contains configuration notes only; it does not expose visitor analytics data.

## 1. What is installed on the site

The Google tag is installed once in the `<head>` of every public HTML page.

`js/analytics.js` adds privacy-conscious product events without intentionally sending:

- Character names
- Character notes or backstories
- Ability scores
- Imported or exported JSON content
- Email addresses
- Text typed into the Codex search box

The Codex search event records only the query length plus active non-text filters.

## 2. Custom event dictionary

| Event | Meaning | Useful parameters |
| --- | --- | --- |
| `builder_open` | A character builder loaded | `game_system`, `edition` |
| `edition_select` | A visitor chose a builder edition link | `game_system`, `edition`, `source_page` |
| `character_export` | JSON export control used | `game_system`, `edition`, `export_type` |
| `character_import` | JSON import flow opened | `game_system`, `edition` |
| `sheet_print` | Blank print or PDF control used | `game_system`, `edition`, `output_type` |
| `level_up_open` | Level Up flow opened | `game_system`, `edition` |
| `level_up_complete` | A level advancement was committed | `edition`, `character_level`, `class_level`, `hp_method` |
| `codex_entry_open` | A Codex entry or related entry was opened | `entry_id`, `navigation_type` |
| `codex_filter_change` | A non-text Codex filter changed | `filter_name`, `filter_value` |
| `codex_search` | A Codex search occurred | `query_length`, `edition`, `entry_type` |
| `knowledge_card_open` | A builder Knowledge Card was encountered | `edition`, `topic_id` |
| `knowledge_card_codex_click` | A Knowledge Card's Codex button was used | `edition`, `entry_id` |
| `featured_card_codex_click` | Homepage Featured Knowledge Card link used | `entry_id` |
| `homepage_get_started` | Homepage portal CTA used | `source_page` |
| `news_index_open` | News & Guides index loaded | `source_page` |
| `news_card_open` | A news story card was selected | `item_id` |
| `news_article_open` | A news article loaded | `article_id` |
| `guide_open` | An evergreen guide loaded | `guide_id` |
| `guide_card_open` | A guide card was selected | `item_id` |
| `guide_builder_click` | A guide sent a reader to a builder | `edition`, `item_id` |
| `guide_video_start` | Reserved for future companion videos | `video_id` |

## 3. Verify data collection after deployment

1. Open Google Analytics.
2. Go to **Reports → Realtime**.
3. Open `https://www.myrpgsource.com/` in another tab.
4. Visit the Codex and one builder.
5. Use a test interaction such as the homepage Get Started portal or opening a Codex entry.
6. Allow several minutes for Realtime to populate.

Google notes that initial Analytics data can take time to appear. Realtime is the quickest first verification.

## 4. Link Search Console to GA4

After the Google tag is detected:

1. In GA4, open **Admin**.
2. Under **Product links**, open **Search Console links**.
3. Create a link.
4. Select the verified `myrpgsource.com` Search Console property.
5. Select the My RPG Source web stream.
6. Review and submit.

This allows Search Console query and organic landing-page information to be analyzed alongside Analytics reporting.

## 5. Recommended GA4 custom dimensions

After events have begun arriving, create event-scoped custom dimensions for the parameters that will be useful in owner reports:

- `game_system`
- `edition`
- `source_page`
- `entry_id`
- `entry_type`
- `guide_id`
- `article_id`
- `output_type`
- `filter_name`
- `filter_value`
- `hp_method`

Do not create a dimension for Codex search text because the site does not send that text.

## 6. Private Looker Studio dashboard foundation

The dashboard itself should live in Looker Studio, not on the public GitHub Pages site.

Recommended data sources:

1. Google Analytics 4
2. Google Search Console
3. AdSense, once the account/site is approved and reporting is available

Recommended first dashboard sections:

### Audience pulse

- Active users today
- Users in the last 7 and 30 days
- New versus returning users
- Device category
- Country

### Acquisition

- Top traffic sources
- Organic search users
- Top Search Console queries
- Search impressions and clicks
- Top landing pages

### Product use

- 2014 versus 2024 builder opens
- JSON exports
- Print/PDF actions
- Level Up opens and completions
- Knowledge Card interactions
- Most-opened Codex entries

### Content

- News and guide page views
- Guide-to-builder clicks
- Future video starts
- Returning readers

### Monetization

Add after AdSense reporting is available:

- Estimated revenue
- Page RPM
- Ad impressions
- Revenue by landing page or content section where supported

## 7. Sharing and privacy

Keep the Looker Studio report restricted to the owner's Google account unless there is a deliberate reason to share it. Do not publish the dashboard URL as a site navigation item and do not embed private analytics data into a public GitHub Pages file.
