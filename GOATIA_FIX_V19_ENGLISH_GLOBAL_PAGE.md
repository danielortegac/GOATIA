# GOATIA V19 — English global page rebuilt

## Why `/en/` exists
The `/en/` URL is a dedicated English landing page intended for English-speaking users and search engines. It is not a second CRM page. The previous V17 implementation was too short and reused CRM-heavy copy, so it looked like a CRM clone. V19 replaces it completely.

## Changes made to `/en/index.html`
- Rebuilt from scratch as a complete English overview of the Goatify ecosystem.
- Added the main Goatify video as the hero background: `../Main final.Mp4`.
- Added a fallback hero image for browsers that block video autoplay.
- Added seven existing Goatify visual assets throughout the page.
- Added sections for:
  - CRM and customer management
  - AI agents and automated responses
  - WhatsApp automation
  - AI voice calls and audio workflows
  - sales pipelines and follow-up
  - websites, e-commerce and PWAs
  - custom apps and internal portals
  - free Portal Goatify and productivity
  - social media, ads and marketing
  - email marketing, SEO and consulting
  - POS and business operations
  - APIs, webhooks and integrations
  - Goatify product family: Portal, QLASE, goatiFIT, Flow, Meet, Mailing, Social Media and Partners
  - industry solutions
  - coverage across the United States, Latin America and Spain
  - portfolio, FAQ and global calls to action
- Added links to all major public Goatify pages.
- Added a responsive desktop/mobile navigation and visual animations with reduced-motion support.

## SEO / GEO / AI discovery changes
- Expanded title and description beyond CRM.
- Added comprehensive English keywords and AI summary metadata.
- Added canonical and bidirectional hreflang references.
- Added Open Graph and Twitter sharing metadata.
- Added structured data for Organization, WebPage, Service, SoftwareApplication, ItemList, BreadcrumbList and FAQPage.
- Kept `Goatify` as the primary brand and `Goatify IA` / `Goatify AI` as alternate names.
- Added explicit international service coverage for the United States, Latin America and Spain.
- Updated `llms.txt`, `llms-full.txt` and the sitemap entry.

## Files changed
- `en/index.html`
- `sitemap.xml`
- `llms.txt`
- `llms-full.txt`

## Files not changed
No Spanish page layout or content was modified in V19. The V18 pricing contrast fix remains intact.
