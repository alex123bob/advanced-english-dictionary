# Clear Hash on New Word Lookup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a new word is looked up, discard the previous URL hash so the page starts fresh at the top instead of scrolling to a stale section.

**Architecture:** One-line change in `handleSearch()` in `clients/web/script.js`. The existing `DeepLinks._pendingHash` capture is replaced with a null assignment, preventing any old hash from being replayed against the new word's content. No other files or subsystems are affected.

**Tech Stack:** Vanilla JavaScript, native History API (`window.history.pushState`/`replaceState`), no build step required.

---

### Task 1: Null out `_pendingHash` in `handleSearch()`

**Files:**
- Modify: `clients/web/script.js:2312`

- [ ] **Step 1: Verify the current line before editing**

Open `clients/web/script.js` and confirm line 2312 reads:

```js
DeepLinks._pendingHash = window.location.hash || null;
```

Also confirm the surrounding comment on line 2311:
```js
// Capture hash NOW before pushState/replaceState wipes it
```

- [ ] **Step 2: Replace the hash capture with a null assignment**

Change lines 2311–2312 from:

```js
        // Capture hash NOW before pushState/replaceState wipes it
        DeepLinks._pendingHash = window.location.hash || null;
```

To:

```js
        // Clear any stale hash — each new word lookup starts fresh
        DeepLinks._pendingHash = null;
```

- [ ] **Step 3: Manual smoke test — fresh lookup clears hash**

1. Open `clients/web/index.html` in a browser (or the running dev server).
2. Look up the word `pipe`.
3. Expand the "Etymology" section — the URL should update to `?q=pipe#etymology`.
4. Now click the word "fluid" (or any clickable word in the definition text), or type a new word and press Enter.
5. Verify the URL becomes `?q=fluid` (or `?q=<new-word>`) with **no hash**.
6. Verify the page starts at the top, not scrolled to the etymology section.

- [ ] **Step 4: Manual smoke test — bookmarked deep link still works**

1. Navigate directly to `?q=pipe#etymology` (paste in address bar and load fresh).
2. Verify the Etymology section opens and the page scrolls to it.
3. This path goes through the page-load `handleSearch({ skipBrowserHistory: true })` code, not the modified line — it should be unaffected.

- [ ] **Step 5: Manual smoke test — accordion hash still updates after lookup**

1. Look up any word (e.g. `pipe`).
2. Expand the "Etymology" section.
3. Verify the URL updates to `?q=pipe#etymology` — `DeepLinks.updateHash()` still works normally post-render.

- [ ] **Step 6: Commit**

```bash
git add clients/web/script.js
git commit -m "fix: clear stale hash when looking up a new word"
```
