# Word of the Day Card Redesign

## Overview

Simplify the existing Word of the Day page into a minimal card showing only a word, its part of speech, and an example sentence — displayed on a rotating set of vivid cartoon-style SVG background patterns. The card is mobile-first portrait orientation.

## Background

The current WOTD page is complex (6 grid sections: video, confusables, collocations, culture, grammar, word family). The redesign strips everything except the core word and example, replacing the white card with artistic doodle backgrounds.

## Design

### Page Layout

- Single HTML page at `/word-of-the-day/`
- Only visible elements: a portrait card centered on screen with vertical centering
- **Card contents**: clickable word (links to `https://www.lijialab.com/?q=<word>`) + POS tag pill + example sentence in italics
- No top bar, no date display, no footer
- Export controls: two tiny icon-only buttons (PNG / PDF) floated in the top-right corner, semi-transparent, no text labels — functional but unobtrusive
- Loading/error states kept minimal (spinner + error message)

### Card Specs

- Portrait orientation, ~340px wide, mobile-first responsive
- Rounded corners (16px), soft shadow
- SVG data URI pattern background + gradient overlay
- Semi-transparent white content card (`backdrop-filter: blur`) for readability
- Random background rotation from 8 motifs on each page load

### Background Images (8 SVG Motifs)

All are inline SVG data URIs — zero external dependencies. Each uses a gradient base with scattered SVG elements at moderate opacity (0.15–0.3).

1. **Sunshine & Stars** — gold concentric circles (sunbursts), bright yellow stars, flowing ribbon waves. Gradient: `#fef9c3 → #fde047 → #fef9c3`
2. **Bunny & Hearts** — bunny faces (ears + round cheeks), pink hearts, purple stars. Gradient: `#f5f3ff → #ede9fe → #fce7f3`
3. **Forest Friends** — leaf clusters, tree shapes, golden pollen dots, berry circles, dashed paths. Gradient: `#ecfdf5 → #d1fae5 → #fef9c3`
4. **Ocean Wave** — bold flowing wave lines, scattered bubble circles, tiny golden stars. Gradient: `#f0f9ff → #bae6fd → #e0f2fe`
5. **Homey Cabin** — little house shapes (triangle roofs + chimneys), warm dots. Gradient: `#fefce8 → #fed7aa → #ffedd5`
6. **Heartbeat** — bright pink hearts scattered like confetti, golden sparkles. Gradient: `#fdf2f8 → #fce7f3 → #ffe4e6`
7. **Sunrise** — golden suns with cross-hair centers, blue raindrop dots, dashed horizon. Gradient: `#fef9c3 → #fde68a → #fef3c7`
8. **Stargaze** — purple shooting stars, twinkling star clusters, golden sparkles. Gradient: `#f5f3ff → #e9d5ff → #f3e8ff`

Selection: random on page load. Persisted for the session.

### Export (PNG / PDF)

- QR code + short URL footnote appears at bottom of card **only in export**
- No "Advanced English Dictionary" or other branding text
- QR code generated via existing qrcodejs library
- URL shown is `https://www.lijialab.com/?q=<word>`
- PNG: existing html2canvas approach — clone card, add `wotd-export-clone` class to show QR footer, render at 2x
- PDF: existing `window.print()` with `@media print` CSS rules to show QR footer
- Two small icon buttons in page corner trigger export

### Word as Link

- The displayed word is a clickable `<a>` tag linking to `https://www.lijialab.com/?q=<word>`
- Opens in same tab (user can right-click for new tab)
- Styled to match the regular text (no underline, same color)

### API / Data

No changes to the existing data pipeline:
- Fetch `wotd-schedule.json` from GitHub
- Call dictionary API for `basic` section data
- Extract: headword, IPA, part of speech, first sense definition (as example)
- The "example" shown is the first `sense.example` or `sense.definition`

### Files to Modify

- `clients/web/word-of-the-day/index.html` — strip to minimal card structure
- `clients/web/word-of-the-day/style.css` — rewrite for card-only layout, add 8 SVG motifs as CSS classes, add print/export styles
- `clients/web/word-of-the-day/script.js` — simplify render to word + POS + example only, word-as-link, random background, export with QR

## Out of Scope

- No changes to the main dictionary app (`/`)
- No changes to the data pipeline or API calls
- No new dependencies
- No changes to build/deploy process
