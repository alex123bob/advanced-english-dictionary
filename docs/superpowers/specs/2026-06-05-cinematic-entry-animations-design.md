# Design Spec: Cinematic Entry Animation System

**Date**: 2026-06-05  
**Status**: Approved  
**Project**: Advanced English Dictionary

---

## Overview

Add a cohesive, choreographed animation system that triggers every time a search resolves. The goal is to make the search result feel like a *reveal* — each element of the word card enters with presence, in a deliberate sequence, rather than appearing all at once.

The entire animation sequence completes in under 380ms perceived time (elements overlap), respects `prefers-reduced-motion`, and requires no new dependencies.

---

## Scope

**In scope:**
- Search result reveal: headword, meta row, sticky tabs, accordion sections
- Skeleton → real content cross-fade on search completion
- Entry tab/sense switch cross-fade

**Out of scope:**
- Scroll-triggered animations (not requested)
- Spring physics (not chosen)
- Interactive control animations (FAB, theme picker, etc.)
- Video section or comparison panel animations

---

## Timing Choreography

Total perceived duration: ≤380ms. Elements animate in overlapping waves.

| Beat | Element | Keyframe | Delay | Duration |
|------|---------|----------|-------|----------|
| 0ms  | Skeleton fade-out | fadeOut | 0ms | 100ms |
| 0ms  | **Headword** (`h2.word-headword`) | slideUpFadeIn | 0ms | 220ms |
| 40ms | POS badge + pronunciation row | fadeIn | 40ms | 180ms |
| 80ms | Frequency chip + entry selector | fadeIn | 80ms | 180ms |
| 120ms | Sticky tab bar (`nav.sticky-tabs`) | slideUpFadeIn (y:-8px) | 120ms | 220ms |
| 160ms | Accordion section 1 (Definitions) | slideUpFadeIn (y:8px) | 160ms | 220ms |
| 200ms | Accordion section 2 (Etymology) | slideUpFadeIn | 200ms | 220ms |
| 240ms | Accordion section 3 (Synonyms) | slideUpFadeIn | 240ms | 220ms |
| … | Each subsequent section | slideUpFadeIn | +40ms each | 220ms |

**Easing**: `cubic-bezier(0.22, 1, 0.36, 1)` — fast-out, natural deceleration (same for all elements).  
**Fill mode**: `both` on all animations (elements start invisible, end at final position).

---

## CSS Design (`styles/09-animations.css`)

### Keyframes

```css
/* Used by all content sections below the header — slides up from below */
@keyframes slideUpFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Used by the sticky tab bar — slides down from above */
@keyframes slideDownFadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to   { opacity: 0; }
}
```

### Utility Classes

```css
.anim-slide-up {
  animation: slideUpFadeIn 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* Sticky tab bar slides down from above */
.anim-slide-down {
  animation: slideDownFadeIn 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.anim-fade-in {
  animation: fadeIn 180ms ease both;
}

.anim-fade-out {
  animation: fadeOut 100ms ease both;
}
```

Delays are applied via inline `style="animation-delay: Xms"` set by the JS orchestrator — CSS stays declarative and reusable.

### Reduced Motion

```css
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

---

## JavaScript Design (`script.js`)

### `AnimationOrchestrator` class

A single class with one public method: `playSearchReveal()`. Called from the existing search completion handler in `script.js` immediately after the DOM has been populated with results.

```js
class AnimationOrchestrator {
  // Stagger delay between accordion sections (ms)
  static SECTION_STAGGER = 40;

  // Sequence config: [selector, cssClass, delayMs]
  static SEQUENCE = [
    ['h2.word-headword',           'anim-slide-up',   0],
    ['.word-pos-badge, .word-pronunciation', 'anim-fade-in', 40],
    ['.word-frequency, #entryTabsContainer', 'anim-fade-in', 80],
    ['nav.sticky-tabs',            'anim-slide-down', 120],  // slides down from above
    // accordion sections are added dynamically (see below)
  ];

  playSearchReveal() {
    // 1. Cross-fade skeleton out
    this._crossFadeSkeletonToResults();
    // 2. Animate header elements
    AnimationOrchestrator.SEQUENCE.forEach(([sel, cls, delay]) => {
      this._animateEl(document.querySelector(sel), cls, delay);
    });
    // 3. Stagger accordion sections
    const sections = document.querySelectorAll('.accordion-section');
    sections.forEach((el, i) => {
      this._animateEl(el, 'anim-slide-up', 160 + i * AnimationOrchestrator.SECTION_STAGGER);
    });
  }

  _animateEl(el, cls, delayMs) {
    if (!el) return;
    el.style.animationDelay = `${delayMs}ms`;
    el.classList.remove(cls);   // allow re-triggering on subsequent searches
    void el.offsetWidth;        // force reflow to restart animation
    el.classList.add(cls);
    el.addEventListener('animationend', () => {
      el.classList.remove(cls);
      el.style.animationDelay = '';
    }, { once: true });
  }

  _crossFadeSkeletonToResults() {
    const loading = document.getElementById('loadingContainer');
    const results = document.getElementById('resultsContainer');
    if (loading) {
      loading.classList.add('anim-fade-out');
      loading.addEventListener('animationend', () => {
        loading.style.display = 'none';
        loading.classList.remove('anim-fade-out');
      }, { once: true });
    }
    if (results) {
      results.style.display = '';     // ensure visible before fade-in
      results.classList.add('anim-fade-in');
      results.style.animationDelay = '0ms';
      results.addEventListener('animationend', () => {
        results.classList.remove('anim-fade-in');
        results.style.animationDelay = '';
      }, { once: true });
    }
  }
}
```

### Entry/Sense Switch Cross-fade

When the user switches between multiple senses (e.g. noun vs. verb entry for "pipe"), the content area plays a quick 80ms cross-fade instead of instantly swapping:

```js
function switchEntry(newEntryEl) {
  const content = document.getElementById('definitionsContent');
  content.classList.add('anim-fade-out');
  content.addEventListener('animationend', () => {
    // populate new entry content here
    content.classList.remove('anim-fade-out');
    content.classList.add('anim-fade-in');
    content.addEventListener('animationend', () => {
      content.classList.remove('anim-fade-in');
    }, { once: true });
  }, { once: true });
}
```

---

## Integration Points

The following locations in `script.js` need modification:

1. **Search completion handler** — where `loadingContainer` is hidden and `resultsContainer` is shown. Replace the direct style manipulation with a call to `orchestrator.playSearchReveal()`.

2. **Entry/sense tab click handler** — wrap the content swap in the cross-fade helper above.

3. **Initial page load** — if results are pre-populated on load (e.g. "pipe" default), call `playSearchReveal()` once after `DOMContentLoaded`.

---

## Files Changed

| File | Change |
|------|--------|
| `styles/09-animations.css` | **New** — keyframes (`slideUpFadeIn`, `slideDownFadeIn`, `fadeIn`, `fadeOut`), utility classes, reduced-motion override |
| `style.css` | **Add** `@import url("./styles/09-animations.css")` |
| `script.js` | **Modify** — add `AnimationOrchestrator` class, wire up to search handler and entry switch handler |

No new dependencies. No changes to HTML structure.

---

## Acceptance Criteria

- [ ] Search result reveal plays the full staggered sequence on every successful search
- [ ] Re-searching (searching again while results are shown) also replays the animation cleanly
- [ ] With `prefers-reduced-motion: reduce`, all elements appear instantly (no visible animation)
- [ ] No layout shift or flash of unstyled content during skeleton → content transition
- [ ] Entry/sense switch plays 80ms cross-fade instead of instant swap
- [ ] Existing themes are unaffected (no animation-related color or layout regressions)
- [ ] Works on mobile (no janky 60fps drop on mid-range hardware — test on throttled CPU)
