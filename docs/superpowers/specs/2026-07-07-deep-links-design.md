# Deep Links Design

**Date:** 2026-07-07  
**Status:** Approved

## Problem

The dictionary has rich per-word content split across multiple sections (Definitions, Etymology, Synonyms, Culture, Usage, Family, Phrases, Videos) and interactive sub-items (individual sense "View Details", word comparison chips). There is currently no way to link directly to a specific section or sub-item — all URLs look like `?q=pipe` with no further precision.

## Goal

- URL updates automatically as the user interacts (URL bar becomes a shareable deep link)
- Visiting a deep link restores the exact view: correct section open, correct sense loaded, or correct comparison card shown
- No extra UI — users copy from the address bar

## Hash Token Namespace

URL structure: `?q=<word>#<token>`

| User action | Hash token written |
|---|---|
| Opens an accordion section | `#definitions`, `#etymology`, `#synonyms`, `#culture`, `#usage`, `#family`, `#phrases`, `#videos` |
| Clicks "View Details" on sense N (0-indexed) | `#definitions-N` e.g. `#definitions-2` |
| Clicks a confusion chip for word X | `#compare-X` e.g. `#compare-pipeline` (lowercased, spaces → hyphens) |

Tokens are short semantic identifiers, not raw DOM element IDs (existing IDs use the `-section` suffix).

## URL Update Behavior

- Sub-item navigation within the same word uses `history.replaceState` — does not pollute the browser Back stack
- Searching a new word uses the existing `history.pushState` — hash is cleared
- Navigating Back/Forward triggers the existing `popstate` handler which re-runs the search; hash restoration runs again after that render completes

## Deep Link Restoration on Page Load

When the page loads with a hash present (e.g., `?q=pipe#compare-pipeline`):

1. Word is fetched normally via `?q=pipe`
2. After initial render completes (async data populated), the hash is read and applied:
   - Section token (`#etymology`) → open that `<details>` accordion, scroll to it
   - Sense token (`#definitions-2`) → open definitions accordion, trigger "View Details" for sense index 2, scroll to it
   - Comparison token (`#compare-pipeline`) → open usage accordion, find and activate the "pipeline" confusion chip, scroll to it
3. Restoration is deferred until after render — not on `DOMContentLoaded` alone

## Scroll Behavior

After restoring from a hash: scroll target element into view with `{ behavior: 'smooth', block: 'start' }`. The `<details>` element is opened before scrolling.

## Edge Cases

- Comparison word not present in current word's data → silently ignore
- Sense index out of range → silently ignore
- Unknown hash token format → silently ignore, no error thrown

## Files Changed

| File | Change |
|---|---|
| `clients/web/script.js` | Add `updateHash(token)` helper; call it on accordion toggle, sense detail click; run hash restoration after render |
| `clients/web/comparison-controller.js` | Call `updateHash('compare-X')` inside `handleChip()` after chip activates |
| `clients/web/index.html` | No changes needed |

## Out of Scope

- Copy-link buttons on sections or comparison cards
- Scroll-based URL updates
- Encoding multiple simultaneous states in a single hash
