# GOATIA V37 · Native English URLs stay English + USA SEO audit

## What was fixed

The V36 package had the correct native English pages under `/en/...`, but the global language script still read older browser values such as:

- `goatify_lang_manual_v33`
- `goatify_lang_manual_v9`
- `goatify_lang_v7`
- the old `googtrans` cookie

That meant a browser that had previously selected ES could still force native English pages to display in Spanish. V37 fixes that.

## V37 language behavior

- `/en/...` pages load in English by default.
- Old V33/V9/V7 language memories are ignored and cleared on native English pages.
- Old `googtrans` cookies are cleared on native English pages unless the user makes a fresh V37 manual selection.
- The manual ES/EN selector still works.
- Spanish source pages can still use IP-based EN fallback for non-Spanish countries.

## USA SEO expansion confirmed

- Sitemap URLs: 89
- Existing sitemap files: 89/89
- Canonical: 89/89
- Robots index/follow: 89/89
- JSON-LD valid: 89/89
- Hreflang present: 89/89
- Open Graph: 89/89
- Twitter Card: 89/89
- AI summary/services signals: 89/89
- Lead form: 89/89
- Scheduler: 89/89
- Language selector: 89/89

## English pages confirmed

- English sitemap URLs: 44
- Native `/en/...` pages have `lang="en"`.
- English pages use the V37 language script.
- English pages keep English as the default state.
- English mega menu text corrected from "90 indexable pages" to "89 indexable pages".
