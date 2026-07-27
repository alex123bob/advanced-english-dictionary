# Word of the Day — Learning Card Design

**Date:** 2026-07-27  
**Status:** Approved

## Problem

The dictionary's main page is search-driven — you look up a word when you need it. But daily, passive exposure is one of the most effective ways for learners to build vocabulary. There is no dedicated daily learning surface that surfaces the dictionary's richest content (video examples, confusables, collocations, cultural notes, grammar patterns, word family) in a consumable, shareable format.

## Goal

A standalone Word of the Day page that:

- Surfaces the most learner-relevant information for one word per day
- Is visually clean and modern (bento grid layout, not matching existing adventure/professional modes)
- Supports export to PNG and PDF with a QR code linking to the word's dictionary page
- Uses a GitHub Actions workflow to maintain a rolling 30-day word schedule with status tracking
- Is a separate, focused page — not mixed into the existing dictionary UI

## Page Structure

### Route

- **Path:** `/word-of-the-day` (`clients/web/word-of-the-day/index.html`)
- Standalone HTML page — no header/footer from the main app
- Minimal chrome: just the card, export bar, and a subtle credit line

### Visual Style

- Clean white/off-white background (`#fafafa`)
- System font stack: `Inter, system-ui, -apple-system, sans-serif`
- Subtle neutral palette — not matching existing adventure or professional modes
- Cards have `background: #ffffff`, `border-radius: 12px`, `box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`
- Generous whitespace, muted secondary text (`#6b7280`)
- Responsive: 3-column grid on desktop → 2 on tablet → 1 on mobile

## Layout (Bento Grid)

```
┌──────────────────────────────────────────┐
│  Word of the Day — Jul 27, 2026    [PNG] [PDF]
├──────────────────────────────────────────┤
│                                          │
│        S E R E N D I P I T Y            │
│        /ˌserənˈdipəti/  ·  noun         │
│        "The art of finding something     │
│         wonderful when you weren't       │
│         looking for it."            🔊  │
│                                          │
├─────────────────────┬────────────────────┤
│  📺 In the Wild     │  ⚡ Don't Confuse  │
│  (spans 2 cols)     │                    │
├─────────────────────┴────────────────────┤
│  🤝 Collocations    │  🌍 Vibe Check     │
├─────────────────────┬────────────────────┤
│  🔬 Grammar Lab     │  🌳 Word Family    │
├─────────────────────┴────────────────────┤
│  [QR]  Advanced English Dictionary       │
└──────────────────────────────────────────┘
```

### Grid Specs

| Breakpoint | Columns | Gap | Card Padding |
|---|---|---|---|
| ≥1024px | 3 (hero: full, video: 2) | 20px | 28px |
| 640-1023px | 2 (hero: full, video: full) | 16px | 22px |
| <640px | 1 | 12px | 18px |

## Content Blocks

### Hero Block

| Element | Detail |
|---|---|
| Word | 72px, 800 weight, tracking -0.02em |
| Pronunciation | 18px, muted, with 🔊 play button |
| Part of speech | Small pill badge |
| Core definition | 20px, one-line essence of the word |
| Audio | Howler.js (same as main app) for pronunciation audio |

### 📺 In the Wild (spans 2 columns)

The most prominent block. Shows a real-world usage:

| Element | Detail |
|---|---|
| Heading | "In the Wild" |
| Content | A notable quote/sentence using the word, with source attribution |
| Visual | Optional video thumbnail or quote card |
| Purpose | Shows the word doing its job in a real context |

Data source: `video_resources` from API, or `usage_examples` with source attribution.

### ⚡ Don't Confuse

| Element | Detail |
|---|---|
| Heading | "Don't Confuse With" |
| Content | 2-3 commonly confused words, each with a one-line differentiation tip |
| Format | List with subtle dividers |
| Data source | `confusion_pairs` or `usage_notes` from API |

### 🤝 Collocations

| Element | Detail |
|---|---|
| Heading | "Natural Partners" |
| Content | 4-6 common collocations displayed as chips/pills |
| Format | Inline pill list (`<span>` chips with border) |
| Data source | `collocations` from API (or extracted from `word_family`) |

### 🌍 Vibe Check

| Element | Detail |
|---|---|
| Heading | "Vibe Check" |
| Content | 1-2 sentences on cultural context / formality |
| Indicator | Formality level: Casual / Neutral / Formal |
| Data source | `cultural_notes` + `usage_context` from API |

### 🔬 Grammar Lab

| Element | Detail |
|---|---|
| Heading | "Grammar Lab" |
| Content | Key grammar pattern + 1 common learner mistake |
| Format | Two short lines, with a "💡 Tip" callout for the mistake |
| Data source | `usage_context.grammar_notes` or extracted from `detailed_senses` |

### 🌳 Word Family

| Element | Detail |
|---|---|
| Heading | "Word Family" |
| Content | Related forms in a 2x2 mini-grid: noun, verb, adjective, adverb |
| Each entry | Form label + the word form + short example |
| Data source | `word_family` from API |

## Export

### Formats

| Format | Method | Implementation |
|---|---|---|
| PNG | Canvas rendering | Clone card DOM → render with canvas → `canvas.toBlob()` → download. Reuses pattern from `comparison-export.js`. |
| PDF | Print-to-PDF | `window.print()` with `@media print` CSS. Hides controls, adds page margins, renders QR code in print-only footer. |

### Export Output

- Full card content is rendered in export (all blocks visible)
- Export-specific CSS strips animations, shadows, hover states
- White background, crisp text, proper color handling
- QR code is injected at the bottom of the exported document (not visible on screen)
- QR code links to `https://www.lijialab.com/?q=<word>`

### QR Code

- Library: QRCode.js (or qrsvg.js for lightweight SVG generation)
- Position: Bottom-right of exported image/PDF
- Size: ~80x80px in export output
- Data URL: `https://www.lijialab.com/?q={word}`

## Data Source & WOTD Schedule

### JSON Schedule File

Stored at `data/wotd-schedule.json` in the repo:

```json
[
  {
    "word": "serendipity",
    "date": "2026-07-27",
    "status": "published",
    "published_at": "2026-07-27T00:00:00Z",
    "difficulty": "intermediate",
    "category": "literary",
    "notes": ""
  },
  {
    "word": "ubiquitous",
    "date": "2026-07-28",
    "status": "pending"
  }
]
```

### Status Values

| Status | Meaning |
|---|---|
| `draft` | Proposed but not yet assigned a date |
| `pending` | Scheduled on a specific date, not yet delivered |
| `published` | Has been served on its scheduled date |
| `skipped` | Manually bypassed (e.g., too similar to recent word, controversial) |

### Entry Properties

| Property | Type | Required | Description |
|---|---|---|---|
| `word` | string | yes | The headword |
| `date` | string (ISO date) | at `pending`+ | Scheduled date YYYY-MM-DD |
| `status` | enum | yes | See status table |
| `published_at` | string (ISO datetime) | no | When it was first served |
| `difficulty` | string | no | beginner / intermediate / advanced |
| `category` | string | no | everyday / academic / literary / technical |
| `scheduled_by` | string | no | GitHub username who triggered scheduling |
| `notes` | string | no | Editorial notes |

### GitHub Actions Workflow

**Trigger:** Daily cron (`0 6 * * *`) + manual workflow_dispatch

**Logic:**

1. Read `data/wotd-schedule.json`
2. Count entries with `status: "pending"` in future dates
3. If count < 30, compute how many new words to add (target: 30 pending)
4. Fetch list of available words from the API or a static word pool
5. Filter out words already present in the schedule (any status) — **dedup check**
6. For each new word:
   - Assign the next available future date (skipping weekends? — configurable)
   - Set `status: "pending"`
   - Infer `difficulty` and `category` if API provides it, else null
7. Mark today's word as `"published"` if its date has passed and status is `"pending"`
8. Commit updated `data/wotd-schedule.json` back to the repo
9. (Optional) Create a PR for manual review if `manual_review` input is set

**Dedup rules:**
- Exact word match against all entries in the schedule (any status, past or future)
- Case-insensitive comparison
- If a word exists but was `skipped`, it can be re-added after 90 days

### Frontend Consumption

- The page fetches `data/wotd-schedule.json` at build time (or on load)
- Finds the entry matching today's date
- Fetches word data from `/api/dictionary?q={word}`
- Populates the card from the API response
- Falls back to a random word if today's entry is missing

## File Layout

```
clients/web/word-of-the-day/
├── index.html            # Standalone page
├── style.css             # All styles for the page
├── script.js             # Logic: fetch, render, export, QR
└── export.js             # Export helpers (PNG, PDF)

data/
└── wotd-schedule.json    # Schedule generated by CI

.github/workflows/
└── wotd-scheduler.yml    # Daily workflow to maintain schedule
```

## Technical Dependencies

- **QRCode.js** (or `qrsvg.js`) — lightweight QR generation, loaded from CDN
- **html2canvas** (or custom canvas renderer following `comparison-export.js` pattern) — for PNG export
- No other external dependencies — pure HTML/CSS/JS like the rest of the project

## Edge Cases

| Case | Behavior |
|---|---|
| API unavailable | Show "Word of the Day unavailable — check back tomorrow" with a retry button |
| No schedule entry for today | Fall back to a random word from the pool, don't show export |
| Word not found in API | Show error state, log to console, don't break the page |
| Export of long content | Canvas auto-sizes height to fit content; print CSS handles page breaks |
| Mobile export | Same logic — buttons work on touch, print dialog works on mobile browsers |
| Schedule file missing on first run | Workflow creates it from scratch with 30 entries |
