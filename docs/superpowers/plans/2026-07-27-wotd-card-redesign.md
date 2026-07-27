# WOTD Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) for syntax tracking.

**Goal:** Strip the Word of the Day page to a minimal card (word + POS + example) with 8 rotating cartoon SVG background motifs.

**Architecture:** Single-page vanilla JS app using existing data pipeline. Three files to modify: HTML (structure), CSS (card + 8 SVG motifs + export), JS (render + export). No new dependencies.

**Tech Stack:** Vanilla HTML/CSS/JS, SVG data URIs, html2canvas (existing), qrcodejs (existing).

---

### Task 1: Simplify HTML to Minimal Card

**Files:**
- Modify: `clients/web/word-of-the-day/index.html`

- [ ] **Step 1: Rewrite index.html with minimal card structure**

Replace the entire file content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Word of the Day — Advanced English Dictionary</title>
    <meta name="description" content="Daily English word card.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
</head>
<body>

<div class="wotd-page" id="wotdPage">
    <div class="wotd-export-actions" id="exportActions">
        <button class="wotd-export-btn" data-format="png" id="exportPngBtn" title="Save as PNG">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.3"/><circle cx="5.5" cy="5.5" r="1" fill="currentColor"/><path d="M2 11l3.5-3.5L8 10l2-2 4 4" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
        </button>
        <button class="wotd-export-btn" data-format="pdf" id="exportPdfBtn" title="Save as PDF">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 1h6l4 4v10H3V1z" stroke="currentColor" stroke-width="1.3"/><path d="M9 1v4h4" stroke="currentColor" stroke-width="1.3"/></svg>
        </button>
    </div>

    <article class="wotd-card" id="wotdCard">
        <div class="wotd-card-inner" id="wotdCardInner">
            <a class="wotd-word" id="wordDisplay" target="_blank" rel="noopener"></a>
            <span class="wotd-pos" id="posDisplay"></span>
            <p class="wotd-example" id="exampleDisplay"></p>

            <div class="wotd-export-footer" id="exportFooter">
                <div class="wotd-qr" id="qrContainer"></div>
                <span class="wotd-qr-url" id="qrUrlDisplay"></span>
            </div>
        </div>
    </article>
</div>

<div class="wotd-error" id="errorDisplay" hidden>
    <div class="wotd-error-content">
        <h2>Word of the Day Unavailable</h2>
        <p id="errorMessage">Check back tomorrow.</p>
        <button class="wotd-retry-btn" id="retryBtn">Retry</button>
    </div>
</div>

<div class="wotd-loading" id="loadingDisplay">
    <div class="wotd-loading-spinner"></div>
    <p>Loading today's word...</p>
</div>

<script src="../config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
<script src="script.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add clients/web/word-of-the-day/index.html
git commit -m "refactor: simplify WOTD HTML to minimal card structure"
```

---

### Task 2: Rewrite CSS — Card Layout + 8 SVG Motifs + Export

**Files:**
- Modify: `clients/web/word-of-the-day/style.css`

- [ ] **Step 1: Replace style.css entirely**

Write the complete new CSS file (see content below). Key sections:
1. Base/reset — full page centering, font
2. Card layout — portrait card, rounded, shadow, backdrop blur for inner content
3. 8 background motif classes (`.bg-1` through `.bg-8`) — each with SVG data URI + gradient
4. Typography — word (large bold), POS pill, example italics
5. Export buttons — tiny top-right floating icons
6. Export footer — hidden on screen, visible in print/clone
7. Loading/error states
8. Print styles

```css
:root {
    --font: 'Inter', system-ui, -apple-system, sans-serif;
    --radius: 20px;
    --card-w: 340px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
    height: 100%;
    font-family: var(--font);
    -webkit-font-smoothing: antialiased;
}

body {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #f5f5f4;
}

.wotd-page {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    width: 100%;
    min-height: 100vh;
    position: relative;
}

/* Card */
.wotd-card {
    width: var(--card-w);
    max-width: 100%;
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: 0 8px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04);
    position: relative;
    aspect-ratio: 3 / 4;
    display: flex;
    align-items: center;
    justify-content: center;
}

.wotd-card-inner {
    background: rgba(255,255,255,0.88);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-radius: 16px;
    padding: 32px 28px;
    margin: 24px;
    text-align: center;
    width: calc(100% - 48px);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

/* Word as link */
.wotd-word {
    font-size: clamp(36px, 8vw, 52px);
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1;
    color: #1f2937;
    text-decoration: none;
    text-transform: uppercase;
    transition: color 0.15s;
}

.wotd-word:hover {
    color: #2563eb;
}

/* POS pill */
.wotd-pos {
    font-size: 11px;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: #f3f4f6;
    padding: 4px 12px;
    border-radius: 20px;
    display: inline-block;
}

/* Example */
.wotd-example {
    font-size: 15px;
    line-height: 1.7;
    color: #6b7280;
    font-style: italic;
    margin-top: 4px;
    max-width: 260px;
}

.wotd-example::before { content: '\201C'; }
.wotd-example::after { content: '\201D'; }

/* Export buttons — small, top-right */
.wotd-export-actions {
    position: fixed;
    top: 16px;
    right: 16px;
    display: flex;
    gap: 8px;
    z-index: 10;
}

.wotd-export-btn {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: 10px;
    background: rgba(255,255,255,0.7);
    backdrop-filter: blur(4px);
    color: #9ca3af;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
}

.wotd-export-btn:hover {
    border-color: #2563eb;
    color: #2563eb;
}

.wotd-export-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

/* Export footer — hidden on screen */
.wotd-export-footer {
    display: none;
    align-items: center;
    gap: 10px;
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px dashed #e5e7eb;
    width: 100%;
    justify-content: center;
}

.wotd-qr canvas,
.wotd-qr img {
    display: block;
    width: 48px;
    height: 48px;
}

.wotd-qr-url {
    font-size: 11px;
    color: #9ca3af;
    word-break: break-all;
}

/* Background motif classes — each is SVG data URI + gradient */
.bg-1 {
    background:
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Ccircle cx='45' cy='45' r='35' fill='%23fbbf24' opacity='0.25'/%3E%3Ccircle cx='45' cy='45' r='28' fill='%23fbbf24' opacity='0.2'/%3E%3Ccircle cx='120' cy='35' r='20' fill='%23fbbf24' opacity='0.2'/%3E%3Ccircle cx='120' cy='35' r='15' fill='%23fbbf24' opacity='0.15'/%3E%3Ccircle cx='200' cy='50' r='25' fill='%23fbbf24' opacity='0.2'/%3E%3Ccircle cx='200' cy='50' r='18' fill='%23fbbf24' opacity='0.15'/%3E%3Ccircle cx='270' cy='30' r='18' fill='%23fbbf24' opacity='0.2'/%3E%3Cg opacity='0.2'%3E%3Cpath d='M30 100 L 35 115 L 50 115 L 38 125 L 42 140 L 30 130 L 18 140 L 22 125 L 10 115 L 25 115 Z' fill='%23fbbf24'/%3E%3Cpath d='M230 80 L 234 92 L 246 92 L 236 100 L 240 112 L 230 104 L 220 112 L 224 100 L 214 92 L 226 92 Z' fill='%23fbbf24'/%3E%3C/g%3E%3Cg opacity='0.25'%3E%3Cpath d='M60 140 Q 80 110, 110 130 Q 140 150, 160 120 Q 180 90, 210 110 Q 240 130, 260 110' stroke='%23f59e0b' fill='none' stroke-width='2.5' stroke-linecap='round'/%3E%3C/g%3E%3C/svg%3E"),
        linear-gradient(135deg, #fef9c3 0%, #fde047 40%, #fef9c3 100%);
}

.bg-2 {
    background:
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cg opacity='0.3'%3E%3Cpath d='M30 35 Q 45 15, 60 35 Q 75 15, 90 35' stroke='%23a855f7' fill='none' stroke-width='2.5' stroke-linecap='round'/%3E%3Ccircle cx='60' cy='60' r='30' fill='none' stroke='%23a855f7' stroke-width='1.5' opacity='0.5'/%3E%3Ccircle cx='60' cy='60' r='22' fill='none' stroke='%23a855f7' stroke-width='1' opacity='0.3'/%3E%3Cpath d='M40 62 L 60 50 L 80 62' fill='none' stroke='%23a855f7' stroke-width='1.5'/%3E%3C/g%3E%3Cg opacity='0.22'%3E%3Cpath d='M170 40 Q 185 20, 200 40 Q 215 20, 230 40' stroke='%23ec4899' fill='none' stroke-width='2.5' stroke-linecap='round'/%3E%3Ccircle cx='200' cy='65' r='25' fill='none' stroke='%23ec4899' stroke-width='1.5'/%3E%3C/g%3E%3Cg opacity='0.15'%3E%3Cpath d='M40 130 L 44 142 L 56 142 L 46 150 L 50 162 L 40 155 L 30 162 L 34 150 L 24 142 L 36 142 Z' fill='%23a855f7'/%3E%3C/svg%3E"),
        linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #fce7f3 100%);
}

.bg-3 {
    background:
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cg opacity='0.2'%3E%3Cpath d='M50 40 Q 60 20, 70 40 Q 80 20, 90 40' stroke='%2322c55e' fill='none' stroke-width='2' stroke-linecap='round'/%3E%3Cellipse cx='70' cy='55' rx='25' ry='20' fill='%2322c55e' opacity='0.15'/%3E%3C/g%3E%3Cg opacity='0.18'%3E%3Cpath d='M200 50 Q 210 30, 220 50 Q 230 30, 240 50' stroke='%2310b981' fill='none' stroke-width='2' stroke-linecap='round'/%3E%3Cellipse cx='220' cy='65' rx='22' ry='18' fill='%2310b981' opacity='0.12'/%3E%3C/g%3E%3Cg opacity='0.2'%3E%3Ccircle cx='35' cy='110' r='6' fill='%23f59e0b'/%3E%3Ccircle cx='55' cy='120' r='4' fill='%23f59e0b'/%3E%3Ccircle cx='130' cy='100' r='5' fill='%23f59e0b'/%3E%3C/g%3E%3Cg opacity='0.15'%3E%3Cpath d='M30 140 Q 70 160, 110 140 T 190 140 T 270 140' stroke='%2322c55e' fill='none' stroke-width='2' stroke-linecap='round' stroke-dasharray='8 6'/%3E%3C/g%3E%3C/svg%3E"),
        linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #fef9c3 100%);
}

.bg-4 {
    background:
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cg opacity='0.28'%3E%3Cpath d='M30 30 Q 60 10, 80 40 Q 100 70, 130 50 Q 160 30, 180 60' stroke='%230ea5e9' fill='none' stroke-width='3' stroke-linecap='round'/%3E%3Cpath d='M50 50 Q 80 30, 100 60 Q 120 90, 150 70' stroke='%233b82f6' fill='none' stroke-width='2' stroke-linecap='round' opacity='0.6'/%3E%3C/g%3E%3Cg opacity='0.22'%3E%3Ccircle cx='30' cy='80' r='8' fill='%230ea5e9'/%3E%3Ccircle cx='50' cy='95' r='5' fill='%230ea5e9'/%3E%3Ccircle cx='140' cy='30' r='6' fill='%230ea5e9'/%3E%3Ccircle cx='170' cy='45' r='4' fill='%230ea5e9'/%3E%3C/g%3E%3Cg opacity='0.15'%3E%3Cpath d='M20 120 L 25 130 L 35 130 L 27 138 L 30 148 L 20 142 L 10 148 L 13 138 L 5 130 L 15 130 Z' fill='%23fbbf24'/%3E%3Cpath d='M250 40 L 254 50 L 264 50 L 256 57 L 259 67 L 250 60 L 241 67 L 244 57 L 236 50 L 246 50 Z' fill='%23fbbf24'/%3E%3C/g%3E%3C/svg%3E"),
        linear-gradient(135deg, #f0f9ff 0%, #bae6fd 50%, #e0f2fe 100%);
}

.bg-5 {
    background:
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280'%3E%3Cg opacity='0.3'%3E%3Cpath d='M60 30 C 60 10, 90 10, 90 30 C 90 55, 60 50, 60 30 Z' fill='%23f59e0b'/%3E%3Cpath d='M55 35 Q 60 25, 75 25' stroke='%23f59e0b' fill='none' stroke-width='2' stroke-linecap='round'/%3E%3C/g%3E%3Cg opacity='0.2'%3E%3Cpath d='M180 40 C 180 20, 210 20, 210 40 C 210 65, 180 60, 180 40 Z' fill='%23f59e0b'/%3E%3Cpath d='M175 45 Q 180 35, 195 35' stroke='%23f59e0b' fill='none' stroke-width='2' stroke-linecap='round'/%3E%3C/g%3E%3Cg opacity='0.18'%3E%3Ccircle cx='40' cy='90' r='18' fill='%23fbbf24'/%3E%3Ccircle cx='30' cy='85' r='6' fill='%23fef9c3'/%3E%3Ccircle cx='50' cy='82' r='5' fill='%23fef9c3'/%3E%3C/g%3E%3Cg opacity='0.12'%3E%3Cpath d='M30 130 Q 80 100, 140 130 T 250 130' stroke='%23f59e0b' fill='none' stroke-width='2' stroke-linecap='round' stroke-dasharray='6 4'/%3E%3C/g%3E%3C/svg%3E"),
        linear-gradient(135deg, #fefce8 0%, #fed7aa 60%, #ffedd5 100%);
}

.bg-6 {
    background:
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280'%3E%3Cg opacity='0.3'%3E%3Cpath d='M40 40 Q 70 10, 90 40 Q 110 10, 130 40' stroke='%23ec4899' fill='none' stroke-width='3' stroke-linecap='round'/%3E%3Cpath d='M50 55 Q 70 30, 90 55' stroke='%23ec4899' fill='none' stroke-width='2' stroke-linecap='round' opacity='0.6'/%3E%3C/g%3E%3Cg opacity='0.28'%3E%3Ccircle cx='40' cy='100' r='5' fill='%23f43f5e'/%3E%3Ccircle cx='70' cy='120' r='6' fill='%23f43f5e'/%3E%3Ccircle cx='130' cy='105' r='4' fill='%23f43f5e'/%3E%3Ccircle cx='200' cy='95' r='5' fill='%23f43f5e'/%3E%3C/g%3E%3Cg opacity='0.15'%3E%3Ccircle cx='60' cy='160' r='6' fill='%23fbbf24'/%3E%3Ccircle cx='110' cy='155' r='4' fill='%23fbbf24'/%3E%3Ccircle cx='170' cy='160' r='5' fill='%23fbbf24'/%3E%3C/g%3E%3C/svg%3E"),
        linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #ffe4e6 100%);
}

.bg-7 {
    background:
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280'%3E%3Cg opacity='0.25'%3E%3Ccircle cx='50' cy='40' r='20' fill='%23facc15'/%3E%3Cpath d='M40 40 L 60 40 M 50 30 L 50 50' stroke='%23f59e0b' stroke-width='2'/%3E%3C/g%3E%3Cg opacity='0.2'%3E%3Ccircle cx='180' cy='35' r='16' fill='%23facc15'/%3E%3Cpath d='M172 35 L 188 35 M 180 27 L 180 43' stroke='%23f59e0b' stroke-width='2'/%3E%3C/g%3E%3Cg opacity='0.2'%3E%3Ccircle cx='40' cy='90' r='3' fill='%230ea5e9'/%3E%3Ccircle cx='60' cy='105' r='4' fill='%230ea5e9'/%3E%3Ccircle cx='100' cy='95' r='3' fill='%230ea5e9'/%3E%3Ccircle cx='150' cy='85' r='5' fill='%230ea5e9'/%3E%3C/g%3E%3Cg opacity='0.12'%3E%3Cpath d='M30 120 Q 80 100, 140 120 T 260 120' stroke='%23f59e0b' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/g%3E%3C/svg%3E"),
        linear-gradient(135deg, #fef9c3 0%, #fde68a 50%, #fef3c7 100%);
}

.bg-8 {
    background:
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280'%3E%3Cg opacity='0.25'%3E%3Cpath d='M40 50 Q 60 25, 80 50 Q 100 25, 120 50' stroke='%238b5cf6' fill='none' stroke-width='3' stroke-linecap='round'/%3E%3Cpath d='M60 30 Q 80 5, 100 30' stroke='%238b5cf6' fill='none' stroke-width='2' stroke-linecap='round'/%3E%3C/g%3E%3Cg opacity='0.22'%3E%3Ccircle cx='50' cy='90' r='5' fill='%23a855f7'/%3E%3Ccircle cx='90' cy='80' r='4' fill='%23a855f7'/%3E%3Ccircle cx='140' cy='95' r='6' fill='%23a855f7'/%3E%3C/g%3E%3Cg opacity='0.18'%3E%3Cpath d='M30 110 L 35 125 L 45 125 L 38 135 L 40 148 L 30 140 L 20 148 L 22 135 L 15 125 L 25 125 Z' fill='%23fbbf24'/%3E%3C/svg%3E"),
        linear-gradient(135deg, #f5f3ff 0%, #e9d5ff 50%, #f3e8ff 100%);
}

/* Error & loading */
.wotd-error,
.wotd-loading {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    background: #f5f5f4;
    z-index: 10;
}

.wotd-error[hidden],
.wotd-loading[hidden] {
    display: none;
}

.wotd-error-content {
    text-align: center;
    max-width: 360px;
}

.wotd-error-content h2 {
    font-size: 18px;
    margin-bottom: 8px;
    color: #1f2937;
}

.wotd-error-content p {
    font-size: 14px;
    color: #6b7280;
    margin-bottom: 16px;
}

.wotd-retry-btn {
    padding: 8px 20px;
    border: none;
    border-radius: 8px;
    background: #2563eb;
    color: #fff;
    font-family: var(--font);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
}

.wotd-loading-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #e5e7eb;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    margin: 0 auto 12px;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Print / export */
@media print {
    body { background: #fff; }
    .wotd-export-actions { display: none; }
    .wotd-page { padding: 0; min-height: auto; }
    .wotd-card { box-shadow: none; border: 1px solid #e5e7eb; break-inside: avoid; }
    .wotd-export-footer { display: flex; }
    .wotd-loading, .wotd-error { display: none !important; }
}

.wotd-export-clone .wotd-export-footer {
    display: flex;
}
```

- [ ] **Step 2: Commit**

```bash
git add clients/web/word-of-the-day/style.css
git commit -m "refactor: rewrite WOTD CSS with card layout and 8 SVG motifs"
```

---

### Task 3: Rewrite script.js — Minimal Render + Export

**Files:**
- Modify: `clients/web/word-of-the-day/script.js`

- [ ] **Step 1: Replace script.js**

Replace the entire file. Core changes from original:
- Remove all section rendering (confusables, collocations, culture, grammar, family)
- Remove the grid render functions (`getVideoData`, `getConfusables`, etc.)
- Keep: schedule fetch, API call, audio, render word+POS+example, QR code, export (PNG/PDF)
- Add: random background class from `.bg-1` to `.bg-8`
- Add: word as clickable link

```js
(function () {
    'use strict';

    const SCHEDULE_URL = 'https://raw.githubusercontent.com/alex123bob/advanced-english-dictionary/main/data/wotd-schedule.json';
    var configApiHost = window.config && window.config.api ? window.config.api.host : '';
    var API_URL = (configApiHost || '') + '/api/dictionary';

    let currentWord = '';
    let currentData = null;

    const $ = id => document.getElementById(id);
    const el = {
        loading: $('loadingDisplay'),
        error: $('errorDisplay'),
        errorMsg: $('errorMessage'),
        retryBtn: $('retryBtn'),
        page: $('wotdPage'),
        card: $('wotdCard'),
        cardInner: $('wotdCardInner'),
        word: $('wordDisplay'),
        pos: $('posDisplay'),
        example: $('exampleDisplay'),
        qrContainer: $('qrContainer'),
        qrUrl: $('qrUrlDisplay'),
        exportPngBtn: $('exportPngBtn'),
        exportPdfBtn: $('exportPdfBtn'),
    };

    var backgroundClasses = ['bg-1','bg-2','bg-3','bg-4','bg-5','bg-6','bg-7','bg-8'];

    function entry() {
        return currentData && currentData.entries && currentData.entries[0] ? currentData.entries[0] : null;
    }

    function firstSummary() {
        var e = entry();
        return e && e.meanings_summary && e.meanings_summary[0] ? e.meanings_summary[0] : null;
    }

    function firstSense() {
        var s = firstSummary();
        return s && s.senses && s.senses[0] ? s.senses[0] : null;
    }

    function getPos() {
        var e = entry();
        if (e && e.meanings_summary && e.meanings_summary.length > 0) {
            return e.meanings_summary[0].part_of_speech || '';
        }
        return '';
    }

    function getExample() {
        var s = firstSense();
        if (s && s.example) return s.example;
        if (s && s.definition) return s.definition;
        return '';
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function getTodayString() {
        return new Date().toISOString().slice(0, 10);
    }

    // ---- Data fetching ----
    async function fetchSchedule() {
        const res = await fetch(SCHEDULE_URL);
        if (!res.ok) throw new Error('Failed to fetch schedule');
        return res.json();
    }

    async function apiPost(body) {
        var res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('API returned ' + res.status);
        var json = await res.json();
        if (!json.success) throw new Error(json.error || 'API error');
        return json;
    }

    async function fetchWordData(word) {
        var basic = await apiPost({ word: word, section: 'basic', entry_index: 0 });
        var sections = await Promise.allSettled([
            apiPost({ word: word, section: 'frequency', entry_index: 0 })
        ]);
        sections.forEach(function (result) {
            if (result.status === 'fulfilled' && result.value.frequency) {
                basic.frequency = result.value.frequency;
            }
        });
        return basic;
    }

    // ---- Render ----
    function renderWord(data) {
        currentData = data;
        el.loading.hidden = true;
        el.error.hidden = true;
        el.page.hidden = false;

        var word = data.headword || currentWord;
        var url = 'https://www.lijialab.com/?q=' + encodeURIComponent(word);

        el.word.textContent = word;
        el.word.href = url;

        var pos = getPos();
        el.pos.textContent = pos;
        el.pos.style.display = pos ? '' : 'none';

        var example = getExample();
        el.example.textContent = example;
        el.example.style.display = example ? '' : 'none';

        // Random background
        var prevBg = el.card.dataset.bg;
        var available = backgroundClasses.filter(function (c) { return c !== prevBg; });
        var picked = available[Math.floor(Math.random() * available.length)];
        backgroundClasses.forEach(function (c) { el.card.classList.remove(c); });
        el.card.classList.add(picked);
        el.card.dataset.bg = picked;

        // QR code
        el.qrContainer.innerHTML = '';
        new QRCode(el.qrContainer, {
            text: url,
            width: 48,
            height: 48,
            colorDark: '#9ca3af',
            colorLight: 'transparent',
            correctLevel: QRCode.CorrectLevel.M
        });
        el.qrUrl.textContent = url;

        el.exportPngBtn.disabled = false;
        el.exportPdfBtn.disabled = false;
    }

    // ---- Main ----
    async function loadWordOfTheDay() {
        el.loading.hidden = false;
        el.error.hidden = true;
        el.page.hidden = true;

        try {
            const today = getTodayString();
            const schedule = await fetchSchedule();
            const entry = schedule.find(function (e) { return e.date === today; });
            const word = entry ? entry.word : 'serendipity';
            currentWord = word;
            const data = await fetchWordData(word);
            renderWord(data);
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
        var clone = null;
        try {
            el.exportPngBtn.disabled = true;
            clone = el.card.cloneNode(true);
            clone.classList.add('wotd-export-clone');
            clone.style.position = 'absolute';
            clone.style.left = '-9999px';
            clone.style.top = '0';
            clone.style.width = '340px';
            document.body.appendChild(clone);

            var canvas = await html2canvas(clone, {
                scale: 2,
                backgroundColor: null,
                logging: false,
                useCORS: true,
            });

            canvas.toBlob(function (blob) {
                if (blob) {
                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.href = url;
                    a.download = 'wotd-' + currentWord + '.png';
                    a.click();
                    URL.revokeObjectURL(url);
                }
                el.exportPngBtn.disabled = false;
            }, 'image/png');
        } catch (err) {
            console.error('PNG export failed:', err);
            el.exportPngBtn.disabled = false;
        } finally {
            if (clone && clone.parentNode) {
                clone.parentNode.removeChild(clone);
            }
        }
    }

    function exportPdf() {
        window.print();
    }

    el.exportPngBtn.addEventListener('click', exportPng);
    el.exportPdfBtn.addEventListener('click', exportPdf);

    loadWordOfTheDay();

})();
```

- [ ] **Step 2: Commit**

```bash
git add clients/web/word-of-the-day/script.js
git commit -m "refactor: simplify WOTD script to card-only render with random backgrounds"
```

---

### Task 4: Verify

- [ ] **Step 1: Start dev server and check the page loads**

```bash
node clients/web/dev-server.js
```

Open http://localhost:3000/word-of-the-day/ in a browser. Verify:
- Card displays centered vertically and horizontally
- Word appears as clickable link (blue underline on hover)
- POS pill shows
- Example sentence in italics with quotes
- Background is one of the 8 SVG motifs
- Refresh: background changes to a different motif

- [ ] **Step 2: Test PNG export**

Click the PNG button (top-right). Verify:
- A PNG file downloads named `wotd-<word>.png`
- The PNG shows the card with QR code at the bottom
- Card background is preserved

- [ ] **Step 3: Test PDF export**

Click the PDF button. Verify:
- Print dialog opens
- Preview shows card with QR code
- No export buttons visible in print

- [ ] **Step 4: Test error state**

Disconnect from internet. Verify:
- Error message shows with retry button
- Retry works when reconnected

- [ ] **Step 5: Final commit with all changes**

```bash
git add -A
git commit -m "feat: redesign WOTD as minimal card with 8 cartoon backgrounds"
```
