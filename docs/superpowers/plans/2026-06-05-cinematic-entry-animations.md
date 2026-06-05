# Cinematic Entry Animation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a choreographed stagger animation triggered on every search that makes each result feel like a deliberate cinematic reveal — headword first, then metadata, then sticky tabs, then accordion sections cascading in.

**Architecture:** Pure CSS `@keyframes` animations with utility classes; a single `AnimationOrchestrator` JS class wires delays via `animation-delay` inline styles and resets them on `animationend`. The orchestrator is called at one injection point inside the existing `handleSearch()` flow, and a lighter headword-only animation is called from `switchToEntry()`.

**Tech Stack:** Vanilla CSS (`@keyframes`, `cubic-bezier`), Vanilla JS (class, `querySelectorAll`, `animationend` event, `void el.offsetWidth` reflow trick), `prefers-reduced-motion` media query.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `styles/09-animations.css` | **Create** | All keyframes, utility classes, reduced-motion override |
| `style.css` | **Modify** (line 8) | Add `@import` for the new file |
| `script.js` | **Modify** (multiple locations) | Add `AnimationOrchestrator` class; wire into `handleSearch()` and `switchToEntry()` |

---

## Task 1: Create `styles/09-animations.css`

**Files:**
- Create: `styles/09-animations.css`

- [ ] **Step 1.1: Create the file with all keyframes and utility classes**

Create `/Users/jiali/personal_github_repos/advanced-english-dictionary/styles/09-animations.css` with this exact content:

```css
/* ============================================================
   CINEMATIC ENTRY ANIMATION SYSTEM
   Triggered on every search result reveal.
   Utility classes applied by AnimationOrchestrator in script.js.
   Delays are set via inline style="animation-delay: Xms"
   ============================================================ */

/* --- Keyframes -------------------------------------------- */

/* Used by headword, accordion sections — slides up from below */
@keyframes slideUpFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Used by sticky tab bar — slides down from above */
@keyframes slideDownFadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Used by metadata rows (POS badge, pronunciation, frequency) */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Used for skeleton / content container fade-out */
@keyframes fadeOut {
  from { opacity: 1; }
  to   { opacity: 0; }
}

/* --- Utility classes -------------------------------------- */

.anim-slide-up {
  animation: slideUpFadeIn 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* sticky tab bar only */
.anim-slide-down {
  animation: slideDownFadeIn 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.anim-fade-in {
  animation: fadeIn 180ms ease both;
}

.anim-fade-out {
  animation: fadeOut 100ms ease both;
  pointer-events: none;
}

/* --- Accessibility: honor user motion preference ----------- */

@media (prefers-reduced-motion: reduce) {
  .anim-slide-up,
  .anim-slide-down,
  .anim-fade-in,
  .anim-fade-out {
    animation-duration: 0.01ms !important;
    animation-delay: 0ms !important;
  }
}
```

- [ ] **Step 1.2: Add import to `style.css`**

Open `style.css`. It currently ends at line 8:
```css
@import url("./styles/08-comparison.css");
```

Append one line so the file becomes:
```css
@import url("./styles/01-tokens-base.css");
@import url("./styles/02-shell-search.css");
@import url("./styles/03-floating-panels.css");
@import url("./styles/04-results-definitions.css");
@import url("./styles/05-usage-family.css");
@import url("./styles/06-video-ai.css");
@import url("./styles/07-polish-theme.css");
@import url("./styles/08-comparison.css");
@import url("./styles/09-animations.css");
```

- [ ] **Step 1.3: Verify CSS loads without errors**

Run `npm run dev` (starts the dev server on port 3000). Open http://localhost:3000 in a browser.

Open DevTools → Console. Check: no 404 for `09-animations.css`, no CSS parse errors.

Open DevTools → Elements → select `<body>`. Add class `anim-slide-up` manually in the Styles panel — confirm the element becomes invisible then fades in with an upward motion (220ms).

Remove the manually added class. Confirm element returns to normal.

- [ ] **Step 1.4: Commit**

```bash
git add styles/09-animations.css style.css
git commit -m "feat: add animation keyframes and utility classes"
```

---

## Task 2: Add `AnimationOrchestrator` class to `script.js`

**Files:**
- Modify: `script.js` (add class near the top, before the `DOMContentLoaded` handler or inside it)

The class uses `document.querySelector`/`querySelectorAll`, so it must run after DOM is ready. The easiest placement is **inside the DOMContentLoaded callback**, right before or after the `handleSearch` function definition (~line 1670).

- [ ] **Step 2.1: Locate the insertion point**

Open `script.js`. Search for this exact line (around line 1670):
```js
    async function handleSearch({ skipBrowserHistory = false, skipSearchHistory = false } = {}) {
```

Insert the `AnimationOrchestrator` class definition **immediately before** this function.

- [ ] **Step 2.2: Insert the class**

Insert this block at the insertion point (keep the same indentation level as `handleSearch` — 4 spaces):

```js
    // ── Cinematic Entry Animation System ────────────────────────────────
    class AnimationOrchestrator {
        // ms between each accordion section entering
        static SECTION_STAGGER = 40;

        // [selector, cssClass, delayMs] — elements animated in the header area
        static HEADER_SEQUENCE = [
            ['h2.word-headword',                          'anim-slide-up',   0],
            ['.word-pos-badge, .word-pronunciation',      'anim-fade-in',   40],
            ['.word-frequency, #entryTabsContainer',      'anim-fade-in',   80],
            ['nav.sticky-tabs',                           'anim-slide-down',120],
        ];

        /**
         * Full search reveal: skeleton fade-out + header sequence + accordion stagger.
         * Call immediately after showResults(true) + updateHeadwordAndPronunciation() + renderEntrySelector().
         */
        playSearchReveal() {
            // 1. Cross-fade loading spinner out, results container in
            this._crossFade();
            // 2. Animate header elements in sequence
            AnimationOrchestrator.HEADER_SEQUENCE.forEach(([sel, cls, delay]) => {
                this._animateEl(document.querySelector(sel), cls, delay);
            });
            // 3. Stagger accordion sections
            const sections = document.querySelectorAll('.accordion-section');
            sections.forEach((el, i) => {
                this._animateEl(el, 'anim-slide-up', 160 + i * AnimationOrchestrator.SECTION_STAGGER);
            });
        }

        /**
         * Lightweight headword-only reveal for entry/sense switching.
         * Call after updateHeadwordAndPronunciation() inside switchToEntry().
         */
        playHeadwordReveal() {
            this._animateEl(document.querySelector('h2.word-headword'), 'anim-slide-up', 0);
            this._animateEl(document.querySelector('.word-pos-badge, .word-pronunciation'), 'anim-fade-in', 40);
        }

        /**
         * Apply a CSS animation class to an element, then clean up after it ends.
         * Removing and re-adding the class forces the animation to replay on repeat searches.
         */
        _animateEl(el, cls, delayMs) {
            if (!el) return;
            el.style.animationDelay = `${delayMs}ms`;
            el.classList.remove(cls);
            void el.offsetWidth; // force reflow so the animation restarts
            el.classList.add(cls);
            el.addEventListener('animationend', () => {
                el.classList.remove(cls);
                el.style.animationDelay = '';
            }, { once: true });
        }

        /**
         * Fade the loading container out while fading the results container in.
         * This replaces the abrupt show/hide swap currently in showLoading() / showResults().
         */
        _crossFade() {
            const loading = document.getElementById('loadingContainer');
            const results = document.getElementById('resultsContainer');

            if (loading && loading.style.display !== 'none') {
                loading.classList.add('anim-fade-out');
                loading.addEventListener('animationend', () => {
                    loading.style.display = 'none';
                    loading.classList.remove('anim-fade-out');
                }, { once: true });
            }

            if (results) {
                // ensure the container is visible before animating it in
                results.style.display = 'block';
                this._animateEl(results, 'anim-fade-in', 0);
            }
        }
    }

    const orchestrator = new AnimationOrchestrator();
    // ── End AnimationOrchestrator ────────────────────────────────────────

```

- [ ] **Step 2.3: Verify no syntax errors**

In DevTools Console, type `orchestrator` and press Enter. Expected: the `AnimationOrchestrator` instance logs (not `ReferenceError`).

If you get `ReferenceError: orchestrator is not defined`, the class was placed outside the DOMContentLoaded scope — move it inside.

- [ ] **Step 2.4: Commit**

```bash
git add script.js
git commit -m "feat: add AnimationOrchestrator class"
```

---

## Task 3: Wire the search result reveal

**Files:**
- Modify: `script.js` lines ~1723–1728 (inside `handleSearch()`)

Currently those lines read:
```js
            showResults(true);
            
            updateHeadwordAndPronunciation(basicData, 0);
            
            renderEntrySelector(basicData);
            
            showSectionLoading(definitionsContent, 'cards');
```

- [ ] **Step 3.1: Replace `showResults(true)` call with orchestrator invocation**

Find this exact block in `handleSearch()`:
```js
            showResults(true);
            
            updateHeadwordAndPronunciation(basicData, 0);
            
            renderEntrySelector(basicData);
```

Replace it with:
```js
            // showResults(true) is now handled inside orchestrator._crossFade()
            updateHeadwordAndPronunciation(basicData, 0);
            renderEntrySelector(basicData);
            orchestrator.playSearchReveal();
```

Note: `showResults(true)` is intentionally removed here because `orchestrator._crossFade()` (called inside `playSearchReveal()`) now handles making `resultsContainer` visible with a fade-in. The `showResults(false)` call at line 1682 (before the search starts) is **not** changed — keep that.

- [ ] **Step 3.2: Verify basic animation**

Run `npm run dev`. Search for "pipe". Expected sequence:
1. Loading spinner appears
2. Spinner fades out (100ms)
3. Headword "pipe" slides up and fades in (220ms, no delay)
4. POS badge + pronunciation fade in (40ms delay)
5. Frequency chip + entry selector fade in (80ms delay)
6. Sticky tab bar slides down from above (120ms delay)
7. Accordion sections cascade in one by one (160ms + 40ms each)

Total perceived time: ~380ms.

If the results container never appears (white screen), check that `orchestrator._crossFade()` is setting `results.style.display = 'block'` before calling `_animateEl`. Confirm in DevTools Elements panel that `#resultsContainer` gets `display: block` after the search.

- [ ] **Step 3.3: Test re-search (animation replays)**

With "pipe" results visible, search for "serendipity". The animation must replay cleanly — no elements stuck at opacity 0.

If an element gets stuck (invisible), it means the `animationend` cleanup didn't fire. Check the browser console for errors. The most common cause: `animationend` fires before `classList.remove` runs in the previous search. The `void el.offsetWidth` reflow trick in `_animateEl` prevents this — verify it's present.

- [ ] **Step 3.4: Commit**

```bash
git add script.js
git commit -m "feat: wire search reveal animation into handleSearch"
```

---

## Task 4: Wire the entry/sense switch animation

**Files:**
- Modify: `script.js` inside `switchToEntry()` (~line 2117)

Currently `switchToEntry()` calls:
```js
        updateHeadwordAndPronunciation(currentWordData, entryIndex);
```
at line 2117.

- [ ] **Step 4.1: Add headword reveal after entry switch**

Find this exact line inside `switchToEntry()`:
```js
        updateHeadwordAndPronunciation(currentWordData, entryIndex);
```

Replace it with:
```js
        updateHeadwordAndPronunciation(currentWordData, entryIndex);
        orchestrator.playHeadwordReveal();
```

- [ ] **Step 4.2: Verify entry switch animation**

Search for "pipe" (it has multiple entries: noun + verb). Click the entry selector dropdown and switch between entries. Expected: the headword and POS badge animate in with a quick fade/slide each time.

- [ ] **Step 4.3: Commit**

```bash
git add script.js
git commit -m "feat: animate headword on entry/sense switch"
```

---

## Task 5: Verify `prefers-reduced-motion` support

- [ ] **Step 5.1: Test with motion disabled**

In Chrome DevTools: open the Rendering panel (via More Tools → Rendering), find "Emulate CSS media feature prefers-reduced-motion", set to `reduce`.

Reload, search for a word. Expected: results appear instantly with no visible animation (transitions complete in 0.01ms).

Re-run the same test in Firefox via `about:config` → `ui.prefersReducedMotion` = `1` (or use the DevTools media query emulation if available).

- [ ] **Step 5.2: Confirm no layout shift**

With motion enabled (normal mode), search for "pipe". Watch for any flash of unstyled/invisible content. Elements should never be visible in their start-state (opacity: 0) for more than a frame. This is guaranteed by the `fill: both` on all animations — but verify visually.

- [ ] **Step 5.3: Commit (if any fixes were needed)**

```bash
git add styles/09-animations.css script.js
git commit -m "fix: verify reduced-motion and layout stability"
```

---

## Task 6: Mobile performance check

- [ ] **Step 6.1: Throttle CPU in DevTools**

Open Chrome DevTools → Performance tab → click the gear icon → set CPU throttling to "4x slowdown".

Search for "pipe". The animation should still complete smoothly at ~60fps. If you see jank (dropped frames visible in the Performance timeline), the likely culprit is a non-composited property. Check: `transform` and `opacity` are the only animated properties — both are composited and should be smooth.

- [ ] **Step 6.2: Check for scroll interference**

After results load, scroll through the accordion sections. Confirm the page scrolls normally and no animation classes linger on elements (elements stuck partially transparent or translated). If any elements are stuck, it means `animationend` isn't firing — check for `display: none` on the element at animation time (animated elements must be visible when the animation starts).

- [ ] **Step 6.3: Final commit with build verification**

```bash
npm run build
```
Expected: build completes with no errors. Check `dist/` folder for updated files.

```bash
git add -A
git commit -m "chore: verify build passes after animation system"
```

---

## Acceptance Checklist

All of these must pass before the feature is considered complete:

- [ ] Search result reveal plays the full staggered sequence on every successful search
- [ ] Re-searching while results are visible replays the animation cleanly (no stuck elements)
- [ ] With `prefers-reduced-motion: reduce`, all elements appear instantly
- [ ] No layout shift or FOUC during skeleton → content transition
- [ ] Entry/sense switch plays headword + POS badge reveal animation
- [ ] Existing color themes are unaffected (test at least 3 themes)
- [ ] CPU-throttled mobile simulation: animation completes at ~60fps (no jank)
- [ ] `npm run build` passes with exit code 0
