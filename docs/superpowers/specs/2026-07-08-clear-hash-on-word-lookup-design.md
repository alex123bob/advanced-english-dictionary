# Design: Clear Hash and Query Params on New Word Lookup

**Date:** 2026-07-08

## Problem

When a user looks up a new word while the URL contains a hash (e.g. `/?q=pipe#etymology`) or stale query params, the `DeepLinks._pendingHash` mechanism preserves the old hash and applies it to the new word lookup. This causes unexpected scroll behavior — for example, the page scrolls to the `#etymology` section of the new word even though the user never requested that.

## Goal

When a new word is looked up, the URL is updated to `?q=<word>` only — no hash, no carry-over from the previous word. Each lookup starts fresh at the top of the page.

## Scope

Single-file change: `clients/web/script.js`

## Design

### Root cause

In `handleSearch()`, the first thing that happens before `pushState`/`replaceState` is:

```js
DeepLinks._pendingHash = window.location.hash || null;
```

This captures the current URL hash and stores it so that `DeepLinks.restoreFromHash()` can scroll the new word's content to the same section. This was likely added to support bookmarked deep links like `/?q=pipe#etymology` surviving the `pushState` call that wipes the hash. However, it has the side effect of carrying the old hash into every new word lookup.

### Fix

Replace the hash capture with a null assignment:

```js
// Before:
DeepLinks._pendingHash = window.location.hash || null;

// After:
DeepLinks._pendingHash = null;
```

### Behavior after fix

| Scenario | Before | After |
|---|---|---|
| Viewing `/?q=pipe#etymology`, click "fluid" in text | Loads fluid, scrolls to etymology section | Loads fluid, starts at top |
| Viewing `/?q=pipe#etymology`, type new word in search bar | Loads new word, scrolls to etymology section | Loads new word, starts at top |
| Click example chip on home page | Same section carried over | Starts at top |
| Opening a bookmarked URL `/?q=pipe#etymology` directly | Works (handled by page load path, not `handleSearch`) | Unchanged — still works |
| Accordion toggle sets `#etymology` hash on current word | Works | Unchanged |
| Comparison chip sets `#compare-affect` hash | Works | Unchanged |
| Back/Forward navigation | Works | Unchanged |
| Language switch re-search (`skipBrowserHistory: true`) | Works | Unchanged |

### Why this is safe

- `pushState`/`replaceState` calls in `handleSearch()` already produce `?q=<word>` with no hash — the hash was never included in those call arguments. The only source of hash carry-over was `_pendingHash`.
- `DeepLinks.updateHash()` still works normally after render — accordions and comparison chips can still write fresh hashes for the new word.
- The page load path (`handleSearch({ skipBrowserHistory: true })`) reads the hash from `window.location.hash` directly at load time (not via `_pendingHash`), so bookmarked deep links are unaffected.

## Files Changed

| File | Change |
|---|---|
| `clients/web/script.js` | In `handleSearch()`: replace `DeepLinks._pendingHash = window.location.hash \|\| null` with `DeepLinks._pendingHash = null` |

## Out of Scope

- No changes to `DeepLinks` object internals
- No changes to other lookup trigger sites (`lookupWord`, history panel, autocomplete)
- No changes to `popstate` / back-forward handling
