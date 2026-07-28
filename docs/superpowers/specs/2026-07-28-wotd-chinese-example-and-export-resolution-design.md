# Design: WOTD Chinese Example Translation + Export Resolution

**Date:** 2026-07-28  
**Scope:** `clients/web/word-of-the-day/`

---

## Problem

1. The WOTD card shows an English example sentence but no Chinese translation, making the card less useful for Chinese-learning users.
2. The PNG export uses `html2canvas` at `scale: 2`, producing a ~880px-wide image — too low-resolution for sharing on WeChat/social media.

---

## Changes

### 1. Chinese Example Sentence on Card

**Data fetch (`script.js`):**
- Add a parallel bilingual API call alongside the existing `basic` fetch:
  ```
  POST /api/dictionary
  { word, section: 'basic', lang: 'zh-cn', entry_index: 0 }
  ```
- Extract `example_zh` from `basicZh.entries[0].meanings_summary[0].senses[0].example_zh`.
- Store alongside the English example in `renderWord`.
- Graceful degradation: if the field is absent or empty, the Chinese element is hidden. No error thrown.

**HTML (`index.html`):**
- Add `<p class="wotd-example-zh" id="exampleZhDisplay"></p>` directly below the existing `#exampleDisplay`.

**CSS (`style.css`):**
- `.wotd-example-zh`: font-size 13px, same italic style, slightly more muted color (`#9ca3af`), line-height 1.6, `lang="zh"` attribute for correct font rendering, hidden by default, shown when content is available.

**Render (`script.js`):**
- Populate `el.exampleZh.textContent` with the Chinese text.
- Toggle `display` based on whether the value is non-empty.
- The element is included in the export clone, so it appears in the PNG automatically.

---

### 2. Export Resolution

**`script.js` — `exportPng()`:**
- Change `html2canvas` option `scale: 2` → `scale: 3`.
- Output: card at ~440px logical width → ~1320px physical width PNG. Suitable for WeChat/social sharing at high DPI.
- No other export changes needed.

---

## Backend Requirement

> **Endpoint:** `POST /api/dictionary`
>
> **Request:** `{ "word": "<word>", "section": "basic", "lang": "zh-cn", "entry_index": 0 }`
>
> **Required addition:** Each sense object inside `entries[].meanings_summary[].senses[]` must include an `example_zh` field (string) — the Chinese translation of the English `example` on that same sense. If `example` is empty, `example_zh` may be null or omitted.

---

## Files Changed

| File | Change |
|------|--------|
| `clients/web/word-of-the-day/script.js` | Add bilingual fetch; populate `exampleZh` element; bump export scale to 3 |
| `clients/web/word-of-the-day/index.html` | Add `#exampleZhDisplay` paragraph element |
| `clients/web/word-of-the-day/style.css` | Add `.wotd-example-zh` styles |

---

## Out of Scope

- No changes to other card types (comparison cards, main dictionary senses).
- No changes to export PDF flow.
- No backend implementation (handled separately by backend team).
