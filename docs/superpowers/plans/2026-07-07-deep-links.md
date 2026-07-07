# Deep Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** URL bar auto-updates as user interacts with sections, senses, and comparison chips; visiting a deep link restores that exact view.

**Architecture:** A small `DeepLinks` module in `script.js` owns all hash read/write logic. It exposes `updateHash(token)` for callers and `restoreFromHash()` called after each render completes. `comparison-controller.js` calls `updateHash` after activating a chip. No new files created.

**Tech Stack:** Vanilla JS, `history.replaceState`, `window.location.hash`, existing accordion `<details>` elements.

---

## Hash Token Reference

| Token | Example | Trigger |
|---|---|---|
| Section name | `#etymology` | User opens an accordion |
| Definitions + sense index | `#definitions-2` | User clicks "View Details" on sense 2 (0-indexed) |
| Comparison | `#compare-pipeline` | User clicks a confusion chip |

Closing an accordion clears the hash (sets it to `''`). Searching a new word clears the hash (existing `pushState` call already omits it).

---

## Task 1: Add `DeepLinks` module to `script.js`

**Files:**
- Modify: `clients/web/script.js` — add module after the `AudioManager` block (around line 138), before `document.addEventListener('DOMContentLoaded', ...)`

- [ ] **Step 1: Insert the `DeepLinks` module**

Insert this block immediately after line 137 (`};`) of `script.js` — right after the closing brace of `AudioManager`:

```js
// DeepLinks — read/write URL hash for sections, senses, and comparisons
const DeepLinks = {
    // Section id attribute → short hash token
    SECTION_TO_TOKEN: {
        'definitions-section': 'definitions',
        'etymology-section':   'etymology',
        'synonyms-section':    'synonyms',
        'cultural-section':    'culture',
        'usage-section':       'usage',
        'family-section':      'family',
        'phrases-section':     'phrases',
        'videos-section':      'videos'
    },
    // Short hash token → section id attribute
    TOKEN_TO_SECTION: {
        'definitions': 'definitions-section',
        'etymology':   'etymology-section',
        'synonyms':    'synonyms-section',
        'culture':     'cultural-section',
        'usage':       'usage-section',
        'family':      'family-section',
        'phrases':     'phrases-section',
        'videos':      'videos-section'
    },

    updateHash(token) {
        const url = new URL(window.location.href);
        if (token) {
            url.hash = token;
        } else {
            url.hash = '';
        }
        // replaceState so sub-item navigation doesn't pollute Back stack
        history.replaceState(history.state, '', url.toString().replace(/#$/, ''));
    },

    parseHash() {
        const raw = window.location.hash.replace(/^#/, '').trim();
        if (!raw) return null;

        // Comparison: compare-<word>
        const compareMatch = raw.match(/^compare-(.+)$/);
        if (compareMatch) {
            return { type: 'compare', word: compareMatch[1] };
        }

        // Sense: definitions-<N>
        const senseMatch = raw.match(/^definitions-(\d+)$/);
        if (senseMatch) {
            return { type: 'sense', index: parseInt(senseMatch[1], 10) };
        }

        // Section only
        if (DeepLinks.TOKEN_TO_SECTION[raw]) {
            return { type: 'section', token: raw };
        }

        return null;
    },

    // Called after render completes. stickyTabsFn activates a tab by section id.
    restoreFromHash(stickyTabsFn) {
        const parsed = DeepLinks.parseHash();
        if (!parsed) return;

        if (parsed.type === 'section') {
            const sectionId = DeepLinks.TOKEN_TO_SECTION[parsed.token];
            const el = document.getElementById(sectionId);
            if (!el) return;
            el.open = true;
            if (typeof stickyTabsFn === 'function') stickyTabsFn(sectionId);
            requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        }

        if (parsed.type === 'sense') {
            const definitionsEl = document.getElementById('definitions-section');
            if (definitionsEl) {
                definitionsEl.open = true;
                if (typeof stickyTabsFn === 'function') stickyTabsFn('definitions-section');
            }
            // Trigger click on the matching sense-detail-btn after a short delay
            // to allow the senses list to be in the DOM
            requestAnimationFrame(() => {
                const btn = document.querySelector(
                    `.sense-detail-btn[data-sense-index="${parsed.index}"]`
                );
                if (btn) {
                    btn.click();
                    setTimeout(() => {
                        const senseItem = document.querySelector(
                            `.sense-item-container[data-sense-index="${parsed.index}"]`
                        );
                        if (senseItem) senseItem.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 300);
                }
            });
        }

        if (parsed.type === 'compare') {
            const usageEl = document.getElementById('usage-section');
            if (usageEl) {
                usageEl.open = true;
                if (typeof stickyTabsFn === 'function') stickyTabsFn('usage-section');
            }
            // Trigger click on the matching confusion chip after usage content renders
            requestAnimationFrame(() => {
                const chip = document.querySelector(
                    `.confusion-chip[data-confused-word="${CSS.escape(parsed.word)}"]`
                );
                if (chip) {
                    chip.click();
                    setTimeout(() => {
                        const container = document.querySelector('.confusion-detail-container');
                        if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 200);
                }
            });
        }
    }
};
```

- [ ] **Step 2: Verify the file still parses**

Open `clients/web/index.html` in a browser (or run `npm run dev`) and check the browser console — confirm no syntax errors.

- [ ] **Step 3: Commit**

```bash
cd clients/web
git add script.js
git commit -m "feat: add DeepLinks module with hash read/write helpers"
```

---

## Task 2: Update hash when user opens an accordion section

**Files:**
- Modify: `clients/web/script.js` — inside `document.addEventListener('DOMContentLoaded', ...)`, find where `accordionSections` is used. The `<details>` toggle is already tracked via scroll spy; we need to also write the hash on user interaction.

- [ ] **Step 1: Find the accordion section click handlers**

Search for the block that sets up tab navigation (around line 2760–2810 in `script.js`). It looks like:

```js
tabLinks.forEach(link => {
    link.addEventListener('click', (e) => {
```

- [ ] **Step 2: Add a `toggle` listener on each accordion section**

After the block that ends `initStickyTabs()` (or wherever `accordionSections` listeners are set up), add the following. The correct place is just after the `initStickyTabs()` call inside `DOMContentLoaded`, or directly inside that function. Add it at the end of `initStickyTabs()`, after the scroll spy listener:

```js
// Update hash when user manually toggles an accordion section
accordionSections.forEach(section => {
    section.addEventListener('toggle', () => {
        const sectionId = section.getAttribute('id');
        const token = DeepLinks.SECTION_TO_TOKEN[sectionId];
        if (section.open && token) {
            DeepLinks.updateHash(token);
        } else if (!section.open) {
            // Closing: only clear hash if this section owns the current hash
            const currentToken = window.location.hash.replace(/^#/, '');
            if (token && currentToken === token) {
                DeepLinks.updateHash('');
            }
        }
    });
});
```

- [ ] **Step 3: Verify in browser**

Run `npm run dev`. Search for "pipe". Open the Etymology accordion. Confirm the URL bar now shows `?q=pipe#etymology`. Close it — confirm hash clears. Open Definitions — confirm `?q=pipe#definitions`.

- [ ] **Step 4: Commit**

```bash
git add clients/web/script.js
git commit -m "feat: write hash to URL when user opens accordion section"
```

---

## Task 3: Update hash when user clicks "View Details" on a sense

**Files:**
- Modify: `clients/web/script.js` — inside `attachDetailButtonHandlers()` (line ~2443)

- [ ] **Step 1: Add `updateHash` call inside the sense detail button handler**

Inside `attachDetailButtonHandlers()`, the handler begins with:

```js
btn.addEventListener('click', async function(e) {
    e.preventDefault();
    const senseIndex = parseInt(this.dataset.senseIndex);
```

Immediately after `const senseIndex = parseInt(this.dataset.senseIndex);`, add:

```js
DeepLinks.updateHash(`definitions-${senseIndex}`);
```

So it looks like:

```js
btn.addEventListener('click', async function(e) {
    e.preventDefault();
    const senseIndex = parseInt(this.dataset.senseIndex);
    DeepLinks.updateHash(`definitions-${senseIndex}`);
    // ... rest of handler unchanged
```

- [ ] **Step 2: Verify in browser**

Search "pipe". Click "View Details" on the second definition (index 1). Confirm URL shows `?q=pipe#definitions-1`.

- [ ] **Step 3: Commit**

```bash
git add clients/web/script.js
git commit -m "feat: write hash to URL when user loads sense details"
```

---

## Task 4: Update hash when user clicks a confusion chip

**Files:**
- Modify: `clients/web/comparison-controller.js` — inside `handleChip()` (line ~65)

- [ ] **Step 1: Add `updateHash` call inside `handleChip`**

In `comparison-controller.js`, `handleChip` starts around line 65:

```js
function handleChip(confusionChip, options = {}) {
    const currentWord = options.currentWord;
    const fetchSection = options.fetchSection;
    const confusedWord = confusionChip.dataset.confusedWord;
    if (!confusedWord || !currentWord || typeof fetchSection !== 'function') return;
```

After the guard clause, add:

```js
    // Write deep link hash
    if (window.DeepLinks) {
        const token = 'compare-' + confusedWord.toLowerCase().replace(/\s+/g, '-');
        window.DeepLinks.updateHash(token);
    }
```

So it reads:

```js
function handleChip(confusionChip, options = {}) {
    const currentWord = options.currentWord;
    const fetchSection = options.fetchSection;
    const confusedWord = confusionChip.dataset.confusedWord;
    if (!confusedWord || !currentWord || typeof fetchSection !== 'function') return;

    // Write deep link hash
    if (window.DeepLinks) {
        const token = 'compare-' + confusedWord.toLowerCase().replace(/\s+/g, '-');
        window.DeepLinks.updateHash(token);
    }

    const allChips = document.querySelectorAll('.confusion-chip');
    // ... rest unchanged
```

- [ ] **Step 2: Expose `DeepLinks` on `window` so `comparison-controller.js` can reach it**

`DeepLinks` is declared as a `const` inside `script.js`'s top-level scope (before `DOMContentLoaded`), so it is already accessible as a module-level variable from within `script.js`. But `comparison-controller.js` runs in a separate IIFE and cannot see it.

In `script.js`, at the end of the `DeepLinks` object definition (after the closing `};`), add:

```js
window.DeepLinks = DeepLinks;
```

- [ ] **Step 3: Verify in browser**

Search "pipe". Scroll to Usage section, open it. Click the "pipeline" confusion chip (or whichever confused word appears). Confirm URL shows `?q=pipe#compare-pipeline`.

- [ ] **Step 4: Commit**

```bash
git add clients/web/script.js clients/web/comparison-controller.js
git commit -m "feat: write hash to URL when user selects a confusion chip"
```

---

## Task 5: Restore state from hash on page load

**Files:**
- Modify: `clients/web/script.js` — inside `handleSearch()`, after `loadEntryContent` returns and the basic render is done; also after `loadSensesForEntry` and `usage_context` fetch resolve for the comparison case.

The challenge: sections render asynchronously. The usage section (needed for `#compare-X`) and the definitions senses list (needed for `#definitions-N`) both populate after async fetches. We need to call `restoreFromHash` after those specific fetches complete.

- [ ] **Step 1: Call `restoreFromHash` after basic render (covers section-only hashes)**

In `handleSearch()`, after `loadEntryContent(query, 0, basicData);` (line ~2238), add:

```js
// Restore section-only hash tokens immediately (accordion open + scroll)
// Sense and compare restoration happens after their respective sections load
const _parsedHash = DeepLinks.parseHash();
if (_parsedHash && _parsedHash.type === 'section') {
    // Wait one frame for DOM to update after showResults
    requestAnimationFrame(() => DeepLinks.restoreFromHash(activateTab));
}
```

- [ ] **Step 2: Call `restoreFromHash` after senses list renders (covers `#definitions-N`)**

At the end of `loadSensesForEntry()` (line ~2440, after `attachDetailButtonHandlers();`), add:

```js
// Restore sense deep link if present
const _senseParsed = DeepLinks.parseHash();
if (_senseParsed && _senseParsed.type === 'sense') {
    requestAnimationFrame(() => DeepLinks.restoreFromHash(activateTab));
}
```

- [ ] **Step 3: Call `restoreFromHash` after usage_context fetch resolves (covers `#compare-X`)**

In `loadEntryContent()`, the `usage_context` fetch chain (around line 2322) ends with:

```js
usageContent.innerHTML = enhanceUsageContext(selectedUsageContext, data.usage_context);
```

After that line, add:

```js
// Restore comparison deep link if present
const _compareParsed = DeepLinks.parseHash();
if (_compareParsed && _compareParsed.type === 'compare') {
    requestAnimationFrame(() => DeepLinks.restoreFromHash(activateTab));
}
```

Also handle the error branch (the `.catch`) — in that path add the same guard:

```js
}).catch(err => {
    console.error('Error fetching usage_context:', err);
    usageContent.innerHTML = `<div class="error-message">${t('failedUsageContext')}</div>`;
    // Still attempt restore in case usage loaded but chip wasn't found
    const _compareParsed = DeepLinks.parseHash();
    if (_compareParsed && _compareParsed.type === 'compare') {
        requestAnimationFrame(() => DeepLinks.restoreFromHash(activateTab));
    }
});
```

- [ ] **Step 4: Verify section restore**

Open `http://localhost:3000?q=pipe#etymology` directly. Confirm the page loads, fetches "pipe", and scrolls to the Etymology section with it open.

- [ ] **Step 5: Verify sense restore**

Open `http://localhost:3000?q=pipe#definitions-1` directly. Confirm the Definitions section opens, "View Details" fires for sense index 1, and the page scrolls to that sense.

- [ ] **Step 6: Verify comparison restore**

Open `http://localhost:3000?q=pipe#compare-pipeline` (or whichever confused word is valid for "pipe"). Confirm the Usage section opens, the matching chip activates, and the comparison card loads.

- [ ] **Step 7: Verify edge cases**

- Open `?q=pipe#compare-nonexistent` — page loads normally, no error, no chip activated.
- Open `?q=pipe#definitions-99` — page loads normally, no error.
- Open `?q=pipe#unknowntoken` — page loads normally, no error.

- [ ] **Step 8: Commit**

```bash
git add clients/web/script.js
git commit -m "feat: restore deep link state on page load for sections, senses, and comparisons"
```

---

## Task 6: Clear hash when searching a new word

**Files:**
- Modify: `clients/web/script.js` — `handleSearch()`, the `pushState` call (line ~2213)

The existing `pushState` at line ~2213 already omits the hash:

```js
window.history.pushState({ word: query }, '', `?q=${encodeURIComponent(query)}`);
```

This naturally clears the hash. No code change needed — just verify.

- [ ] **Step 1: Verify hash clears on new word search**

With `?q=pipe#etymology` in the URL bar, type "serendipity" and press Enter. Confirm URL becomes `?q=serendipity` with no hash.

- [ ] **Step 2: Commit (no-op — just documentation)**

```bash
git commit --allow-empty -m "chore: verify hash clears on new word search (no code change needed)"
```

---

## Task 7: Handle Back/Forward navigation with hash

**Files:**
- Modify: `clients/web/script.js` — the existing `popstate` handler (line ~233)

The existing handler re-runs `handleSearch` on Back/Forward. Since `restoreFromHash` is now called inside `handleSearch` after render, deep links are restored automatically when navigating history. Verify this works.

- [ ] **Step 1: Verify Back/Forward restores hash state**

1. Search "pipe" — URL is `?q=pipe`
2. Open Etymology accordion — URL is `?q=pipe#etymology`
3. Search "serendipity" — URL is `?q=serendipity`
4. Press Back — URL returns to `?q=pipe#etymology`, Etymology accordion opens

- [ ] **Step 2: Commit if any fix was needed, otherwise note no change**

```bash
git add clients/web/script.js
git commit -m "feat: deep link restoration works with browser Back/Forward"
```

---

## Task 8: Final smoke test

- [ ] **Step 1: Run full manual test pass**

| Scenario | Expected |
|---|---|
| Search "pipe", open Etymology, copy URL, paste in new tab | Etymology open, scrolled to |
| Search "pipe", click View Details on sense 0, copy URL, paste in new tab | Sense 0 detail loaded |
| Search "pipe", click a confusion chip (e.g., "pipeline"), copy URL, paste in new tab | Usage open, pipeline chip active, card loaded |
| Search "pipe" with hash present, then search "serendipity" | Hash cleared |
| Back button after above | Returns to pipe with hash restored |
| `?q=pipe#compare-xyznotreal` | Loads normally, no error |
| `?q=pipe#badtoken` | Loads normally, no error |

- [ ] **Step 2: Check browser console for errors during all scenarios**

Confirm no uncaught exceptions, no 404s introduced, no broken behaviour in existing features.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: deep links complete — section, sense, and comparison hash navigation"
```
