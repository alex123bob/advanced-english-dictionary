# Word of the Day Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A standalone Word of the Day page with a bento-grid learning card, export to PNG/PDF with QR code, and a GitHub Actions workflow that maintains a rolling 30-day schedule.

**Architecture:** A new `word-of-the-day/` directory under `clients/web/` holds the standalone page (HTML/CSS/JS). Export follows the same DOM-clone + canvas pattern used in `comparison-export.js`. A separate `.github/workflows/wotd-scheduler.yml` runs daily to update `data/wotd-schedule.json`. The frontend fetches the schedule from `raw.githubusercontent.com`.

**Tech Stack:** Vanilla HTML/CSS/JS, QRCode.js CDN, html2canvas CDN, GitHub Actions.

---

## File Structure

| File | Purpose |
|---|---|
| `data/wotd-schedule.json` | Rolling 30-day word schedule with status tracking |
| `.github/workflows/wotd-scheduler.yml` | Daily CI to maintain schedule |
| `clients/web/word-of-the-day/index.html` | Standalone page |
| `clients/web/word-of-the-day/style.css` | All page styles |
| `clients/web/word-of-the-day/script.js` | Fetch, render, export logic |

---

## Task 1: Create initial WOTD schedule JSON

**Files:**
- Create: `data/wotd-schedule.json`

- [ ] **Step 1: Create schedule file with initial words**

```json
[
  {
    "word": "serendipity",
    "date": "2026-07-27",
    "status": "published",
    "published_at": null,
    "difficulty": "intermediate",
    "category": "literary"
  },
  {
    "word": "ubiquitous",
    "date": "2026-07-28",
    "status": "published",
    "published_at": null,
    "difficulty": "intermediate",
    "category": "academic"
  },
  {
    "word": "ephemeral",
    "date": "2026-07-29",
    "status": "published",
    "published_at": null,
    "difficulty": "intermediate",
    "category": "literary"
  },
  {
    "word": "pipe",
    "date": "2026-07-30",
    "status": "pending",
    "difficulty": "beginner",
    "category": "everyday"
  }
]
```

- [ ] **Step 2: Verify JSON is valid**

Run: `python3 -m json.tool data/wotd-schedule.json`
Expected: exits 0, prints formatted JSON

- [ ] **Step 3: Commit**

```bash
git add data/wotd-schedule.json
git commit -m "feat: add initial WOTD schedule with 4 words"
```

---

## Task 2: Create GitHub Actions workflow for schedule maintenance

**Files:**
- Create: `.github/workflows/wotd-scheduler.yml`

- [ ] **Step 1: Create workflow file**

```yaml
name: WOTD Scheduler

on:
  schedule:
    - cron: '0 6 * * *'
  workflow_dispatch:
    inputs:
      manual_review:
        description: 'Create a PR instead of committing directly'
        type: boolean
        default: false

permissions:
  contents: write
  pull-requests: write

jobs:
  update-schedule:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Run scheduler
        id: scheduler
        run: python3 .github/workflows/wotd-scheduler.py

      - name: Check for changes
        id: diff
        run: |
          if git diff --quiet data/wotd-schedule.json; then
            echo "changed=false" >> $GITHUB_OUTPUT
          else
            echo "changed=true" >> $GITHUB_OUTPUT
          fi

      - name: Commit and push
        if: steps.diff.outputs.changed == 'true' && inputs.manual_review != true
        run: |
          git config user.name "wotd-bot"
          git config user.email "wotd-bot@users.noreply.github.com"
          git add data/wotd-schedule.json
          git commit -m "chore: update WOTD schedule [skip ci]"
          git push

      - name: Create PR for review
        if: steps.diff.outputs.changed == 'true' && inputs.manual_review == true
        uses: peter-evans/create-pull-request@v6
        with:
          title: "chore: update WOTD schedule"
          body: "Automated WOTD schedule update. Review before merging."
          branch: wotd-schedule-update
          delete-branch: true
```

- [ ] **Step 2: Create the scheduler Python script**

```python
#!/usr/bin/env python3
"""Maintain a rolling 30-day WOTD schedule with dedup."""

import json
import os
from datetime import datetime, timedelta, timezone

SCHEDULE_PATH = 'data/wotd-schedule.json'
MIN_PENDING = 30
WORD_POOL = [
    'serendipity', 'ubiquitous', 'ephemeral', 'pipe',
]
POOL_FILE = 'data/wotd-word-pool.json'
SKIPPED_REUSE_DAYS = 90


def load_json(path):
    with open(path) as f:
        return json.load(f)


def save_json(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')


def today_str():
    return datetime.now(timezone.utc).strftime('%Y-%m-%d')


def main():
    schedule = load_json(SCHEDULE_PATH)

    pool = load_json(POOL_FILE) if os.path.exists(POOL_FILE) else WORD_POOL

    existing_words = {e['word'].lower() for e in schedule}

    today = today_str()

    pending = [e for e in schedule if e['status'] == 'pending']

    for entry in schedule:
        if entry['status'] == 'pending' and entry['date'] <= today:
            entry['status'] = 'published'
            entry['published_at'] = datetime.now(timezone.utc).isoformat()

    pending = [e for e in schedule if e['status'] == 'pending']
    needed = MIN_PENDING - len(pending)

    if needed > 0:
        import random
        used_in_90d = {
            e['word'].lower()
            for e in schedule
            if e['status'] in ('published', 'skipped')
        }

        candidates = [w for w in pool if w.lower() not in existing_words]

        available = [w for w in candidates if w.lower() not in used_in_90d or
                     w.lower() not in {e['word'].lower() for e in schedule}]

        random.shuffle(available)

        last_date = max(
            (e['date'] for e in schedule if e.get('date')),
            default=today
        )

        for i in range(min(needed, len(available))):
            word = available[i]
            last_date = (datetime.strptime(last_date, '%Y-%m-%d') + timedelta(days=1)).strftime('%Y-%m-%d')
            schedule.append({
                'word': word,
                'date': last_date,
                'status': 'pending',
                'difficulty': None,
                'category': None
            })

    save_json(SCHEDULE_PATH, schedule)
    print(f'Schedule updated. Total entries: {len(schedule)}')


if __name__ == '__main__':
    main()
```

- [ ] **Step 3: Create word pool file**

```json
[
  "serendipity",
  "ubiquitous",
  "ephemeral",
  "pipe"
]
```

Save as `data/wotd-word-pool.json`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/wotd-scheduler.yml data/wotd-word-pool.json
git commit -m "feat: add WOTD scheduler workflow and word pool"
```

---

## Task 3: Create the standalone page HTML

**Files:**
- Create: `clients/web/word-of-the-day/index.html`

- [ ] **Step 1: Write the HTML**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Word of the Day — Advanced English Dictionary</title>
    <meta name="description" content="Daily English learning card with video examples, confusables, collocations, cultural notes, grammar tips, and word family.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
</head>
<body>

<div class="wotd-page" id="wotdPage">

    <header class="wotd-topbar">
        <span class="wotd-date" id="wotdDate"></span>
        <div class="wotd-export-bar">
            <button class="wotd-export-btn" data-format="png" id="exportPngBtn" title="Export as PNG">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.3"/><circle cx="5.5" cy="5.5" r="1" fill="currentColor"/><path d="M2 11l3.5-3.5L8 10l2-2 4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                PNG
            </button>
            <button class="wotd-export-btn" data-format="pdf" id="exportPdfBtn" title="Export as PDF">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 1h6l4 4v10H3V1z" stroke="currentColor" stroke-width="1.3"/><path d="M9 1v4h4" stroke="currentColor" stroke-width="1.3"/></svg>
                PDF
            </button>
        </div>
    </header>

    <article class="wotd-card" id="wotdCard">

        <!-- Hero -->
        <section class="wotd-hero">
            <div class="wotd-hero-top">
                <span class="wotd-pos-badge" id="posBadge"></span>
                <button class="wotd-audio-btn" id="audioBtn" title="Listen to pronunciation" aria-label="Listen to pronunciation">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M9 3L4 7H1v6h3l5 4V3z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M13 6.5a5 5 0 010 7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M15.5 4a8 8 0 010 12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                </button>
            </div>
            <h1 class="wotd-word" id="wordDisplay"></h1>
            <div class="wotd-hero-meta">
                <span class="wotd-pronunciation" id="pronunciationDisplay"></span>
                <span class="wotd-frequency" id="frequencyDisplay"></span>
            </div>
            <p class="wotd-core-sense" id="coreSenseDisplay"></p>
        </section>

        <!-- Grid -->
        <div class="wotd-grid">

            <!-- In the Wild -->
            <section class="wotd-block wotd-block-video" id="videoBlock">
                <div class="wotd-block-header">
                    <span class="wotd-block-icon">📺</span>
                    <h2 class="wotd-block-title">In the Wild</h2>
                </div>
                <div class="wotd-block-body" id="videoBody">
                    <div class="wotd-video-card" id="videoCard">
                        <div class="wotd-video-quote" id="videoQuote"></div>
                        <div class="wotd-video-source" id="videoSource"></div>
                    </div>
                </div>
            </section>

            <!-- Don't Confuse -->
            <section class="wotd-block" id="confusablesBlock">
                <div class="wotd-block-header">
                    <span class="wotd-block-icon">⚡</span>
                    <h2 class="wotd-block-title">Don't Confuse</h2>
                </div>
                <div class="wotd-block-body" id="confusablesBody"></div>
            </section>

            <!-- Collocations -->
            <section class="wotd-block" id="collocationsBlock">
                <div class="wotd-block-header">
                    <span class="wotd-block-icon">🤝</span>
                    <h2 class="wotd-block-title">Natural Partners</h2>
                </div>
                <div class="wotd-block-body wotd-chips-container" id="collocationsBody"></div>
            </section>

            <!-- Vibe Check -->
            <section class="wotd-block" id="cultureBlock">
                <div class="wotd-block-header">
                    <span class="wotd-block-icon">🌍</span>
                    <h2 class="wotd-block-title">Vibe Check</h2>
                </div>
                <div class="wotd-block-body" id="cultureBody"></div>
            </section>

            <!-- Grammar Lab -->
            <section class="wotd-block" id="grammarBlock">
                <div class="wotd-block-header">
                    <span class="wotd-block-icon">🔬</span>
                    <h2 class="wotd-block-title">Grammar Lab</h2>
                </div>
                <div class="wotd-block-body" id="grammarBody"></div>
            </section>

            <!-- Word Family -->
            <section class="wotd-block" id="familyBlock">
                <div class="wotd-block-header">
                    <span class="wotd-block-icon">🌳</span>
                    <h2 class="wotd-block-title">Word Family</h2>
                </div>
                <div class="wotd-block-body" id="familyBody"></div>
            </section>

        </div>

        <!-- QR footer — only visible in export -->
        <div class="wotd-export-footer" id="exportFooter">
            <div class="wotd-qr" id="qrContainer"></div>
            <div class="wotd-export-footer-text">
                <strong>Advanced English Dictionary</strong>
                <span id="qrUrlDisplay"></span>
            </div>
        </div>

    </article>

    <footer class="wotd-footer">
        <a href="/">Advanced English Dictionary</a>
    </footer>

</div>

<div class="wotd-error" id="errorDisplay" hidden>
    <div class="wotd-error-content">
        <span class="wotd-error-icon">📭</span>
        <h2>Word of the Day Unavailable</h2>
        <p id="errorMessage">Check back tomorrow.</p>
        <button class="wotd-retry-btn" id="retryBtn">Retry</button>
    </div>
</div>

<div class="wotd-loading" id="loadingDisplay">
    <div class="wotd-loading-spinner"></div>
    <p>Loading today's word...</p>
</div>

<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
<script src="script.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add clients/web/word-of-the-day/index.html
git commit -m "feat: add WOTD page HTML structure"
```

---

## Task 4: Create page styles

**Files:**
- Create: `clients/web/word-of-the-day/style.css`

- [ ] **Step 1: Write the CSS**

```css
:root {
    --bg: #fafafa;
    --card-bg: #ffffff;
    --ink: #111827;
    --muted: #6b7280;
    --subtle: #e5e7eb;
    --accent: #2563eb;
    --radius: 12px;
    --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    --font: 'Inter', system-ui, -apple-system, sans-serif;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html { font-size: 16px; }

body {
    font-family: var(--font);
    background: var(--bg);
    color: var(--ink);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
}

.wotd-page {
    max-width: 920px;
    margin: 0 auto;
    padding: 24px 20px 48px;
}

/* Top bar */
.wotd-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
}

.wotd-date {
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.wotd-export-bar {
    display: flex;
    gap: 8px;
}

.wotd-export-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border: 1px solid var(--subtle);
    border-radius: 8px;
    background: var(--card-bg);
    color: var(--muted);
    font-family: var(--font);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
}

.wotd-export-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
}

.wotd-export-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

/* Card */
.wotd-card {
    background: var(--card-bg);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    overflow: hidden;
}

/* Hero */
.wotd-hero {
    padding: 40px 40px 32px;
    border-bottom: 1px solid #f3f4f6;
}

.wotd-hero-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}

.wotd-pos-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 6px;
    background: #eff6ff;
    color: var(--accent);
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.wotd-audio-btn {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border: 1px solid var(--subtle);
    border-radius: 50%;
    background: none;
    color: var(--muted);
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
}

.wotd-audio-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
}

.wotd-audio-btn.playing {
    border-color: var(--accent);
    color: var(--accent);
    background: #eff6ff;
}

.wotd-word {
    font-size: clamp(48px, 8vw, 72px);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    margin-bottom: 8px;
}

.wotd-hero-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
}

.wotd-pronunciation {
    font-size: 16px;
    color: var(--muted);
}

.wotd-frequency {
    font-size: 12px;
    color: var(--muted);
    padding: 2px 8px;
    border-radius: 4px;
    background: #f3f4f6;
}

.wotd-core-sense {
    font-size: 18px;
    color: var(--muted);
    line-height: 1.6;
    max-width: 680px;
}

/* Grid */
.wotd-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
}

@media (max-width: 640px) {
    .wotd-grid {
        grid-template-columns: 1fr;
    }
}

.wotd-block-video {
    grid-column: 1 / -1;
}

@media (max-width: 640px) {
    .wotd-block-video {
        grid-column: 1;
    }
}

.wotd-block {
    padding: 28px 40px;
    border-bottom: 1px solid #f3f4f6;
}

.wotd-block:nth-child(odd) {
    border-right: 1px solid #f3f4f6;
}

@media (max-width: 640px) {
    .wotd-block {
        padding: 24px 20px;
    }
    .wotd-block:nth-child(odd) {
        border-right: none;
    }
}

.wotd-block-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
}

.wotd-block-icon {
    font-size: 18px;
    line-height: 1;
}

.wotd-block-title {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
}

.wotd-block-body {
    font-size: 15px;
    line-height: 1.6;
    color: var(--ink);
}

/* Video block */
.wotd-video-card {
    background: #f9fafb;
    border-radius: 8px;
    padding: 20px;
}

.wotd-video-quote {
    font-style: italic;
    font-size: 16px;
    line-height: 1.7;
    color: var(--ink);
    margin-bottom: 8px;
}

.wotd-video-quote::before {
    content: '\201C';
}

.wotd-video-quote::after {
    content: '\201D';
}

.wotd-video-source {
    font-size: 13px;
    color: var(--muted);
    font-weight: 500;
}

/* Confusables */
.wotd-confusable-item {
    padding: 10px 0;
}

.wotd-confusable-item + .wotd-confusable-item {
    border-top: 1px solid #f3f4f6;
}

.wotd-confusable-word {
    font-weight: 700;
    font-size: 15px;
    color: #dc2626;
    margin-bottom: 2px;
}

.wotd-confusable-tip {
    font-size: 14px;
    color: var(--muted);
}

/* Collocation chips */
.wotd-chips-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.wotd-chip {
    display: inline-block;
    padding: 6px 14px;
    border: 1px solid var(--subtle);
    border-radius: 20px;
    font-size: 14px;
    font-weight: 500;
    color: var(--ink);
    background: #f9fafb;
}

/* Culture block */
.wotd-culture-note {
    font-size: 15px;
    line-height: 1.7;
    margin-bottom: 10px;
}

.wotd-formality-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.wotd-formality-badge.casual { background: #fef3c7; color: #92400e; }
.wotd-formality-badge.neutral { background: #eff6ff; color: #1e40af; }
.wotd-formality-badge.formal { background: #f3f4f6; color: #374151; }

/* Grammar */
.wotd-grammar-pattern {
    font-size: 15px;
    margin-bottom: 8px;
}

.wotd-grammar-pattern code {
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: var(--font);
    font-size: 14px;
}

.wotd-grammar-tip {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding: 12px;
    border-radius: 8px;
    background: #fefce8;
    font-size: 14px;
    color: #92400e;
}

.wotd-grammar-tip-icon {
    flex-shrink: 0;
}

/* Word family */
.wotd-family-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}

.wotd-family-item {
    padding: 10px 12px;
    border: 1px solid var(--subtle);
    border-radius: 8px;
}

.wotd-family-pos {
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 2px;
}

.wotd-family-word {
    font-weight: 600;
    font-size: 15px;
}

/* Export footer (hidden on screen, visible in export) */
.wotd-export-footer {
    display: none;
    padding: 24px 40px;
    border-top: 1px solid #f3f4f6;
    align-items: center;
    gap: 16px;
}

.wotd-export-footer-text {
    font-size: 13px;
    color: var(--muted);
}

.wotd-export-footer-text strong {
    display: block;
    color: var(--ink);
    margin-bottom: 2px;
}

.wotd-qr {
    flex-shrink: 0;
}

.wotd-qr canvas,
.wotd-qr img {
    display: block;
    width: 72px;
    height: 72px;
}

/* Footer */
.wotd-footer {
    text-align: center;
    margin-top: 24px;
}

.wotd-footer a {
    font-size: 13px;
    color: var(--muted);
    text-decoration: none;
}

.wotd-footer a:hover {
    color: var(--accent);
}

/* Error & loading states */
.wotd-error,
.wotd-loading {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    background: var(--bg);
    z-index: 10;
}

.wotd-error[hidden],
.wotd-loading[hidden] {
    display: none;
}

.wotd-error-content {
    text-align: center;
    max-width: 400px;
}

.wotd-error-icon {
    font-size: 48px;
    display: block;
    margin-bottom: 16px;
}

.wotd-error-content h2 {
    font-size: 20px;
    margin-bottom: 8px;
}

.wotd-error-content p {
    color: var(--muted);
    margin-bottom: 20px;
}

.wotd-retry-btn {
    padding: 10px 24px;
    border: none;
    border-radius: 8px;
    background: var(--accent);
    color: #fff;
    font-family: var(--font);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
}

.wotd-retry-btn:hover {
    opacity: 0.9;
}

.wotd-loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--subtle);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    margin: 0 auto 16px;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* Print / export styles */
@media print {
    body { background: #fff; }
    .wotd-topbar { display: none; }
    .wotd-page { padding: 0; max-width: 100%; }
    .wotd-card { box-shadow: none; border: 1px solid #e5e7eb; }
    .wotd-export-footer { display: flex; }
    .wotd-footer { display: none; }
    .wotd-loading, .wotd-error { display: none !important; }
    .wotd-audio-btn { display: none; }
}

.wotd-export-clone .wotd-export-footer {
    display: flex;
}
```

- [ ] **Step 2: Commit**

```bash
git add clients/web/word-of-the-day/style.css
git commit -m "feat: add WOTD page styles with bento grid layout"
```

---

## Task 5: Create the page script with fetch, render, audio, export, and QR

**Files:**
- Create: `clients/web/word-of-the-day/script.js`

- [ ] **Step 1: Write the script**

```js
(function () {
    'use strict';

    const SCHEDULE_URL = 'https://raw.githubusercontent.com/alex123bob/advanced-english-dictionary/main/data/wotd-schedule.json';
    const API_URL = window.location.hostname === 'localhost'
        ? 'http://localhost:8000/api/dictionary'
        : '/api/dictionary';

    let currentWord = '';
    let currentData = null;

    const $ = id => document.getElementById(id);
    const el = {
        loading: $('loadingDisplay'),
        error: $('errorDisplay'),
        errorMsg: $('errorMessage'),
        retryBtn: $('retryBtn'),
        date: $('wotdDate'),
        word: $('wordDisplay'),
        pronunciation: $('pronunciationDisplay'),
        posBadge: $('posBadge'),
        frequency: $('frequencyDisplay'),
        coreSense: $('coreSenseDisplay'),
        audioBtn: $('audioBtn'),
        videoQuote: $('videoQuote'),
        videoSource: $('videoSource'),
        confusablesBody: $('confusablesBody'),
        collocationsBody: $('collocationsBody'),
        cultureBody: $('cultureBody'),
        grammarBody: $('grammarBody'),
        familyBody: $('familyBody'),
        exportPngBtn: $('exportPngBtn'),
        exportPdfBtn: $('exportPdfBtn'),
        card: $('wotdCard'),
        qrContainer: $('qrContainer'),
        qrUrl: $('qrUrlDisplay'),
        page: $('wotdPage'),
    };

    // ---- Audio ----
    let currentSound = null;

    function playAudio(url) {
        if (!url) return;

        if (currentSound) {
            currentSound.pause();
            currentSound = null;
            el.audioBtn.classList.remove('playing');
            return;
        }

        const audio = new Audio(url);
        audio.volume = 0.8;
        audio.addEventListener('play', () => el.audioBtn.classList.add('playing'));
        audio.addEventListener('ended', () => {
            el.audioBtn.classList.remove('playing');
            currentSound = null;
        });
        audio.addEventListener('error', () => {
            el.audioBtn.classList.remove('playing');
            currentSound = null;
        });
        currentSound = audio;
        audio.play().catch(() => {
            el.audioBtn.classList.remove('playing');
            currentSound = null;
        });
    }

    el.audioBtn.addEventListener('click', () => {
        if (currentData && currentData.pronunciation_audio) {
            playAudio(currentData.pronunciation_audio);
        }
    });

    // ---- Data fetching ----
    async function fetchSchedule() {
        const res = await fetch(SCHEDULE_URL);
        if (!res.ok) throw new Error('Failed to fetch schedule');
        return res.json();
    }

    async function fetchWordData(word) {
        const url = `${API_URL}?q=${encodeURIComponent(word)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        return res.json();
    }

    // ---- Render ----
    function getTodayWord() {
        const today = new Date().toISOString().slice(0, 10);
        return today;
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function getCoreSense(data) {
        if (data.detailed_senses && data.detailed_senses.length > 0) {
            const sense = data.detailed_senses[0];
            return sense.short_definition || sense.definition || '';
        }
        return '';
    }

    function getVideoData(data) {
        if (data.video_resources && data.video_resources.length > 0) {
            const v = data.video_resources[0];
            return { quote: v.context || v.example || '', source: v.title || v.source || '' };
        }
        if (data.detailed_senses && data.detailed_senses.length > 0) {
            const examples = data.detailed_senses[0].examples || [];
            if (examples.length > 0) {
                return { quote: examples[0], source: 'Example usage' };
            }
        }
        return null;
    }

    function getConfusables(data) {
        if (data.confusion_pairs && data.confusion_pairs.length > 0) {
            return data.confusion_pairs.slice(0, 3).map(p => ({
                word: p.word || p.confused_word || '',
                tip: p.tip || p.differentiation || ''
            }));
        }
        if (data.common_misused_words) {
            return data.common_misused_words.slice(0, 3).map(w => ({
                word: typeof w === 'string' ? w : w.word || '',
                tip: w.tip || w.note || ''
            }));
        }
        return null;
    }

    function getCollocations(data) {
        if (data.collocations && data.collocations.length > 0) {
            return data.collocations;
        }
        if (data.word_family && data.word_family.collocations) {
            return data.word_family.collocations;
        }
        return null;
    }

    function getCultureData(data) {
        const note = data.cultural_notes_info || data.cultural_notes || null;
        const usage = data.usage_context_info || data.usage_context || null;
        return {
            note: note ? (note.notes || note.note || '') : '',
            formality: usage ? (usage.formality || usage.formality_level || '') : ''
        };
    }

    function getGrammarData(data) {
        if (data.usage_context_info && data.usage_context_info.grammar_notes) {
            return {
                pattern: data.usage_context_info.grammar_notes.pattern || '',
                tip: data.usage_context_info.grammar_notes.common_mistake || data.usage_context_info.grammar_notes.tip || ''
            };
        }
        if (data.detailed_senses && data.detailed_senses.length > 0) {
            for (const sense of data.detailed_senses) {
                if (sense.grammar_note || sense.usage_note) {
                    return {
                        pattern: sense.grammar_note || '',
                        tip: sense.usage_note || ''
                    };
                }
            }
        }
        return null;
    }

    function getFamilyData(data) {
        const wf = data.word_family_info || data.word_family || null;
        if (!wf) return null;
        const forms = [];
        if (wf.noun) forms.push({ pos: 'noun', word: wf.noun });
        if (wf.verb) forms.push({ pos: 'verb', word: wf.verb });
        if (wf.adjective) forms.push({ pos: 'adjective', word: wf.adjective });
        if (wf.adverb) forms.push({ pos: 'adverb', word: wf.adverb });
        return forms.length > 0 ? forms : null;
    }

    function renderWord(data) {
        currentData = data;
        el.loading.hidden = true;
        el.error.hidden = true;
        el.page.hidden = false;

        // Hero
        el.word.textContent = data.headword || currentWord;
        el.pronunciation.textContent = data.pronunciation || '';
        el.posBadge.textContent = data.part_of_speech || data.pos || '';
        el.posBadge.style.display = data.part_of_speech || data.pos ? '' : 'none';

        if (data.frequency) {
            el.frequency.textContent = data.frequency;
            el.frequency.style.display = '';
        } else {
            el.frequency.style.display = 'none';
        }

        el.coreSense.textContent = getCoreSense(data);
        el.audioBtn.style.display = data.pronunciation_audio ? '' : 'none';

        // Video
        const video = getVideoData(data);
        if (video) {
            el.videoQuote.textContent = video.quote;
            el.videoSource.textContent = video.source;
            el.videoBlock.hidden = false;
        } else {
            el.videoBlock.hidden = true;
        }

        // Confusables
        const confusables = getConfusables(data);
        if (confusables) {
            el.confusablesBody.innerHTML = confusables.map(c => `
                <div class="wotd-confusable-item">
                    <div class="wotd-confusable-word">${escapeHtml(c.word)}</div>
                    <div class="wotd-confusable-tip">${escapeHtml(c.tip)}</div>
                </div>
            `).join('');
            el.confusablesBlock.hidden = false;
        } else {
            el.confusablesBlock.hidden = true;
        }

        // Collocations
        const collocations = getCollocations(data);
        if (collocations) {
            el.collocationsBody.innerHTML = collocations.map(c => `
                <span class="wotd-chip">${escapeHtml(typeof c === 'string' ? c : c.word || c)}</span>
            `).join('');
            el.collocationsBlock.hidden = false;
        } else {
            el.collocationsBlock.hidden = true;
        }

        // Culture
        const culture = getCultureData(data);
        if (culture && (culture.note || culture.formality)) {
            let html = '';
            if (culture.note) {
                html += `<p class="wotd-culture-note">${escapeHtml(culture.note)}</p>`;
            }
            if (culture.formality) {
                const cls = culture.formality.toLowerCase().includes('casual') ? 'casual'
                    : culture.formality.toLowerCase().includes('formal') ? 'formal'
                    : 'neutral';
                html += `<span class="wotd-formality-badge ${cls}">${escapeHtml(culture.formality)}</span>`;
            }
            el.cultureBody.innerHTML = html;
            el.cultureBlock.hidden = false;
        } else {
            el.cultureBlock.hidden = true;
        }

        // Grammar
        const grammar = getGrammarData(data);
        if (grammar && (grammar.pattern || grammar.tip)) {
            let html = '';
            if (grammar.pattern) {
                html += `<p class="wotd-grammar-pattern">${escapeHtml(grammar.pattern)}</p>`;
            }
            if (grammar.tip) {
                html += `<div class="wotd-grammar-tip">
                    <span class="wotd-grammar-tip-icon">💡</span>
                    <span>${escapeHtml(grammar.tip)}</span>
                </div>`;
            }
            el.grammarBody.innerHTML = html;
            el.grammarBlock.hidden = false;
        } else {
            el.grammarBlock.hidden = true;
        }

        // Word family
        const family = getFamilyData(data);
        if (family) {
            el.familyBody.innerHTML = family.map(f => `
                <div class="wotd-family-item">
                    <div class="wotd-family-pos">${escapeHtml(f.pos)}</div>
                    <div class="wotd-family-word">${escapeHtml(f.word)}</div>
                </div>
            `).join('');
            el.familyBlock.hidden = false;
        } else {
            el.familyBlock.hidden = true;
        }

        // Enable export
        el.exportPngBtn.disabled = false;
        el.exportPdfBtn.disabled = false;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    // ---- Main ----
    async function loadWordOfTheDay() {
        el.loading.hidden = false;
        el.error.hidden = true;
        el.page.hidden = true;

        try {
            const today = getTodayWord();
            el.date.textContent = formatDate(today);

            const schedule = await fetchSchedule();
            const entry = schedule.find(e => e.date === today);

            const word = entry ? entry.word : 'serendipity';
            currentWord = word;

            const data = await fetchWordData(word);
            renderWord(data);

            // Generate QR
            const qrUrl = `https://www.lijialab.com/?q=${encodeURIComponent(word)}`;
            el.qrUrl.textContent = qrUrl;
            new QRCode(el.qrContainer, {
                text: qrUrl,
                width: 72,
                height: 72,
                colorDark: '#111827',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
        } catch (err) {
            console.error('WOTD error:', err);
            el.loading.hidden = true;
            el.error.hidden = false;
            el.errorMsg.textContent = err.message || 'Check back tomorrow.';
        }
    }

    el.retryBtn.addEventListener('click', loadWordOfTheDay);

    // ---- Export ----
    async function exportPng() {
        try {
            el.exportPngBtn.disabled = true;
            el.exportPngBtn.textContent = 'Rendering...';

            const clone = el.card.cloneNode(true);
            clone.classList.add('wotd-export-clone');
            clone.style.position = 'absolute';
            clone.style.left = '-9999px';
            clone.style.top = '0';
            clone.style.width = '800px';
            clone.style.background = '#ffffff';

            document.body.appendChild(clone);

            const canvas = await html2canvas(clone, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: true,
            });

            document.body.removeChild(clone);

            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `wotd-${currentWord}.png`;
                a.click();
                URL.revokeObjectURL(url);
                el.exportPngBtn.disabled = false;
                el.exportPngBtn.textContent = 'PNG';
            }, 'image/png');
        } catch (err) {
            console.error('PNG export failed:', err);
            el.exportPngBtn.disabled = false;
            el.exportPngBtn.textContent = 'PNG';
        }
    }

    function exportPdf() {
        window.print();
    }

    el.exportPngBtn.addEventListener('click', exportPng);
    el.exportPdfBtn.addEventListener('click', exportPdf);

    // ---- Init ----
    loadWordOfTheDay();

})();
```

- [ ] **Step 2: Commit**

```bash
git add clients/web/word-of-the-day/script.js
git commit -m "feat: add WOTD page logic with fetch, render, export, and QR"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - Bento grid layout ✓ (Task 3 HTML + Task 4 CSS — 3-col grid, hero, 6 blocks)
   - Hero with word, pronunciation, POS, core sense ✓ (Task 5 renderWord)
   - "In the Wild" video/examples block ✓ (Task 5 getVideoData)
   - "Don't Confuse" confusables ✓ (Task 5 getConfusables)
   - Collocations chips ✓ (Task 5 getCollocations)
   - "Vibe Check" cultural notes ✓ (Task 5 getCultureData)
   - "Grammar Lab" grammar patterns ✓ (Task 5 getGrammarData)
   - Word family grid ✓ (Task 5 getFamilyData)
   - PNG export via html2canvas ✓ (Task 5 exportPng)
   - PDF export via window.print() ✓ (Task 5 exportPdf)
   - QR code in export footer ✓ (Task 3 HTML footer + Task 5 QRCode.js init)
   - QR links to `https://www.lijialab.com/?q=<word>` ✓ (Task 5)
   - GitHub Actions workflow ✓ (Task 2)
   - WOTD schedule JSON ✓ (Task 1)
   - Dedup in scheduler script ✓ (Task 2 — tracks existing + 90-day reused words)
   - Schedule fetched from raw.githubusercontent.com ✓ (Task 5 SCHEDULE_URL)
   - Error and loading states ✓ (Task 3 error/loading elements, Task 5 error handling)
   - Standalone page at `clients/web/word-of-the-day/` ✓

2. **Placeholder scan:** No TBDs, TODOs, or incomplete sections found.

3. **Type consistency:** All function names, variable names, data property accesses, and CSS class names are consistent across tasks.

4. **Scope check:** Focused on one standalone page + one CI workflow. No subsystem decomposition needed.
