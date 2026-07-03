# Configurable Lookup Trigger — Design Spec

**Date:** 2026-07-03  
**Scope:** Chrome extension (`clients/chrome-extension/`)  
**Status:** Approved

---

## Overview

Replace the hardcoded text-selection trigger in the content script with a user-configurable trigger mode. Users can choose how they want to invoke word lookups: by selecting text (existing behavior), by holding a modifier key and clicking a word, or by holding a modifier key and hovering over a word. The modifier key itself defaults to platform-appropriate behavior (Cmd on Mac, Ctrl on Windows/Linux) but can be overridden.

---

## Settings Schema

Two new keys are added to the existing `advancedDictionarySettings` object in `chrome.storage.sync`:

```js
{
  apiBaseUrl: "...",         // existing
  websiteUrl: "...",         // existing
  triggerMode: "text-selection",  // NEW
  modifierKey: "auto"             // NEW
}
```

### `triggerMode` values

| Value | Description |
|---|---|
| `"text-selection"` | Select text to trigger lookup (current behavior). Default. |
| `"modifier-click"` | Hold modifier key and click a word to trigger lookup. |
| `"modifier-hover"` | Hold modifier key and hover over a word for 300ms to trigger lookup. |

### `modifierKey` values

| Value | Description |
|---|---|
| `"auto"` | Auto-detect: `metaKey` (Cmd ⌘) on Mac, `ctrlKey` on Windows/Linux. Default. |
| `"meta"` | Always use Command (⌘) — Meta key. |
| `"ctrl"` | Always use Control (Ctrl). |
| `"alt"` | Always use Alt/Option. |

**Defaults:** `triggerMode: "text-selection"`, `modifierKey: "auto"`. Existing users are unaffected — behavior is identical to today.

---

## Options Page UI

A new **"Lookup Trigger"** section is added to `options.html`, above the existing URL fields.

### Trigger Mode (radio group)

```
Lookup Trigger
──────────────────────────────────────────
(•) Text selection     Select text to trigger lookup
( ) Modifier + click   Hold Cmd/Ctrl and click a word
( ) Modifier + hover   Hold Cmd/Ctrl and hover over a word
```

### Modifier Key (select dropdown)

```
Modifier Key
──────────────────────────────────────────
[ Auto-detect (Cmd on Mac, Ctrl on Windows) ▾ ]
  - Auto-detect (Cmd on Mac, Ctrl on Windows)
  - Command (⌘)
  - Control (Ctrl)
  - Alt / Option
```

- The modifier key dropdown is **disabled and visually grayed out** when "Text selection" is chosen.
- On save, both values are written via `saveSettings()`.
- On load, both values are read via `getSettings()` and the UI reflects current state.
- A note below the form reads: *"Changes take effect on the next page load."*

### Changes to `shared.js`

- `getSettings()` default object extended with `triggerMode: "text-selection"` and `modifierKey: "auto"`.
- `saveSettings()` unchanged — already writes the full object.

---

## Content Script Logic

### Initialization

On load, the content script:

1. Calls `getSettings()` to read `triggerMode` and `modifierKey`.
2. Resolves the **effective modifier** once:
   - If `modifierKey === "auto"`: detect platform via `navigator.userAgentData?.platform ?? navigator.platform`. If it contains `"Mac"` (case-insensitive) → use `metaKey`; otherwise → use `ctrlKey`.
   - Otherwise map directly: `"meta"` → `metaKey`, `"ctrl"` → `ctrlKey`, `"alt"` → `altKey`.
   - Produces a helper: `isModifierHeld(event) => boolean`.
3. Registers only the event listeners for the chosen mode (see below).
4. Always registers shared dismiss/cleanup listeners regardless of mode.

### Always-registered listeners (all modes)

| Event | Purpose |
|---|---|
| `pointerdown` (capture) | Dismiss lens on outside click |
| `mousedown` (capture) | Dismiss lens fallback |
| `keydown` Escape | Dismiss lens/hint |
| `scroll` (capture) | Dismiss lens on scroll |
| `pagehide` | Cleanup on navigation |

### Per-mode listeners

**`text-selection`** — unchanged from current behavior:

| Event | Behavior |
|---|---|
| `mouseup` | `scheduleSelectionLookup()` — debounced 90ms |
| `keyup` | `scheduleSelectionLookup()` |
| `touchend` | `scheduleSelectionLookup()` |

Lookup path: `getSelectedLookup()` → `renderLens()` (shows intermediate lens button) → user clicks lens → `openDictionary()`.

**`modifier-click`**:

| Event | Behavior |
|---|---|
| `click` (capture) | If `isModifierHeld(event)`: extract word at point, if found call `openDictionary(word)` directly; if clicked element is or is inside an `<a>`, call `event.preventDefault()` first. |

No lens button shown — lookup fires directly.

**`modifier-hover`**:

| Event | Behavior |
|---|---|
| `mousemove` | Track current word under cursor. If modifier is held and word changes, cancel pending dwell timer and start new 300ms timer. If modifier is not held at mousemove time, cancel any pending timer and do not start a new one. |
| `keydown` | If modifier key is pressed while a word is currently tracked under cursor, start a 300ms dwell timer. |
| `keyup` | If modifier key released, cancel pending dwell timer. |

Dwell timer fires → `openDictionary(word)` directly. No lens button.

### Word extraction at a point

Used by `modifier-click` and `modifier-hover`:

1. `document.caretRangeFromPoint(x, y)` → `Range` with a text node and offset.
2. Expand left/right within the text node to word boundaries (split on `\W` or use regex `\b`).
3. Extract the substring and run through existing `sanitizeWord()`.
4. Return the word string, or `null` if extraction fails.

This is encapsulated in a new helper function `getWordAtPoint(x, y)`.

---

## Error Handling & Edge Cases

| Scenario | Behavior |
|---|---|
| `caretRangeFromPoint` returns null (cursor over image, SVG, non-text) | Silently do nothing |
| Extracted word empty after `sanitizeWord()` | Silently do nothing |
| `getSettings()` fails (storage unavailable) | Fall back to `"text-selection"` + `"auto"` |
| Modifier-hover: cursor leaves word before 300ms | Cancel dwell timer, no lookup |
| Modifier-hover: modifier released before 300ms | Cancel dwell timer, no lookup |
| Modifier-hover: cursor moves to new word | Cancel previous timer, start fresh 300ms timer for new word |
| Modifier-click on `<a>` element | `event.preventDefault()` before lookup (suppresses new-tab behavior) |
| Settings changed in options | Takes effect on next page load (noted in options UI) |

---

## Files Changed

| File | Change |
|---|---|
| `clients/chrome-extension/src/shared.js` | Add `triggerMode` and `modifierKey` to default settings in `getSettings()` |
| `clients/chrome-extension/src/options.html` | Add "Lookup Trigger" section with radio group and modifier dropdown |
| `clients/chrome-extension/src/options.js` | Read/write `triggerMode` and `modifierKey`; disable modifier dropdown for text-selection mode |
| `clients/chrome-extension/src/options.css` | Style the new trigger section |
| `clients/chrome-extension/src/content-script.js` | Refactor listener setup to be settings-driven; add `getWordAtPoint()`; add `isModifierHeld()` |

---

## Out of Scope

- Per-site trigger overrides
- Syncing trigger changes to already-loaded tabs without reload
- Mobile / Firefox support
