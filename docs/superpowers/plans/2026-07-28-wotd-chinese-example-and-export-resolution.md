# WOTD Chinese Example Translation + Export Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display the Chinese translation of the WOTD example sentence on the card, and increase PNG export resolution from scale 2 to scale 3.

**Architecture:** Three small, focused changes to the WOTD sub-page: (1) add a new DOM element for the Chinese example, (2) add CSS for it, (3) fetch the bilingual `basic` response in parallel and populate the element, and (4) bump the html2canvas scale. The Chinese element degrades gracefully when the backend field is absent.

**Tech Stack:** Vanilla JS, HTML, CSS, html2canvas (already loaded via CDN).

---

## File Map

| File | Change |
|------|--------|
| `clients/web/word-of-the-day/index.html` | Add `#exampleZhDisplay` `<p>` after `#exampleDisplay` |
| `clients/web/word-of-the-day/style.css` | Add `.wotd-example-zh` rule |
| `clients/web/word-of-the-day/script.js` | Parallel bilingual fetch; populate element; scale 2→3 |

---

### Task 1: Add the Chinese example DOM element

**Files:**
- Modify: `clients/web/word-of-the-day/index.html`

- [ ] **Step 1: Open the file and locate `#exampleDisplay`**

Find this line (inside `.wotd-card-inner`):
```html
<p class="wotd-example" id="exampleDisplay"></p>
```

- [ ] **Step 2: Add the Chinese example element directly after it**

Replace:
```html
<p class="wotd-example" id="exampleDisplay"></p>
```
With:
```html
<p class="wotd-example" id="exampleDisplay"></p>
<p class="wotd-example-zh" id="exampleZhDisplay" lang="zh" style="display:none"></p>
```

- [ ] **Step 3: Verify the file renders without errors**

Open `clients/web/word-of-the-day/index.html` in a browser (or via the dev server). The card should look identical to before — the new element is hidden by default.

- [ ] **Step 4: Commit**

```bash
git add clients/web/word-of-the-day/index.html
git commit -m "feat(wotd): add Chinese example placeholder element to card"
```

---

### Task 2: Style the Chinese example element

**Files:**
- Modify: `clients/web/word-of-the-day/style.css`

- [ ] **Step 1: Open style.css and locate the `.wotd-example` rule**

Find:
```css
.wotd-example {
    font-size: 15px;
    line-height: 1.7;
    color: #6b7280;
    font-style: italic;
    margin-top: 4px;
    max-width: 320px;
}
```

- [ ] **Step 2: Add the Chinese example style directly after `.wotd-example::after`**

After the block:
```css
.wotd-example::after { content: '\201D'; }
```

Add:
```css
.wotd-example-zh {
    font-size: 13px;
    line-height: 1.6;
    color: #9ca3af;
    font-style: normal;
    margin-top: 2px;
    max-width: 320px;
}
```

- [ ] **Step 3: Verify visually**

Temporarily change `style="display:none"` to `style=""` on `#exampleZhDisplay` in the HTML and set some placeholder text like `这是一个示例句子。`. Confirm it renders below the English example in a smaller, lighter, non-italic style. Revert the inline style change after checking.

- [ ] **Step 4: Commit**

```bash
git add clients/web/word-of-the-day/style.css
git commit -m "feat(wotd): add style for Chinese example sentence element"
```

---

### Task 3: Fetch bilingual basic data and populate the element

**Files:**
- Modify: `clients/web/word-of-the-day/script.js`

- [ ] **Step 1: Add `exampleZh` to the `el` map**

Find:
```js
const el = {
    loading: $('loadingDisplay'),
    error: $('errorDisplay'),
    errorMsg: $('errorMessage'),
    retryBtn: $('retryBtn'),
    page: $('wotdPage'),
    card: $('wotdCard'),
    cardInner: $('wotdCardInner'),
    word: $('wordDisplay'),
    example: $('exampleDisplay'),
    qrContainer: $('qrContainer'),
    qrUrl: $('qrUrlDisplay'),
    exportPngBtn: $('exportPngBtn'),
    exportPdfBtn: $('exportPdfBtn'),
};
```

Replace with:
```js
const el = {
    loading: $('loadingDisplay'),
    error: $('errorDisplay'),
    errorMsg: $('errorMessage'),
    retryBtn: $('retryBtn'),
    page: $('wotdPage'),
    card: $('wotdCard'),
    cardInner: $('wotdCardInner'),
    word: $('wordDisplay'),
    example: $('exampleDisplay'),
    exampleZh: $('exampleZhDisplay'),
    qrContainer: $('qrContainer'),
    qrUrl: $('qrUrlDisplay'),
    exportPngBtn: $('exportPngBtn'),
    exportPdfBtn: $('exportPdfBtn'),
};
```

- [ ] **Step 2: Add a helper to extract `example_zh` from the bilingual response**

Find:
```js
function getExample() {
    var s = firstSense();
    if (s && s.example) return s.example;
    if (s && s.definition) return s.definition;
    return '';
}
```

Add this function directly after it:
```js
function getExampleZh(basicZhData) {
    if (!basicZhData) return '';
    var entries = basicZhData.entries;
    if (!entries || !entries[0]) return '';
    var ms = entries[0].meanings_summary;
    if (!ms || !ms[0]) return '';
    var senses = ms[0].senses;
    if (!senses || !senses[0]) return '';
    return senses[0].example_zh || '';
}
```

- [ ] **Step 3: Fetch bilingual basic data in parallel**

Find:
```js
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
```

Replace with:
```js
async function fetchWordData(word) {
    var basic = await apiPost({ word: word, section: 'basic', entry_index: 0 });
    var sections = await Promise.allSettled([
        apiPost({ word: word, section: 'frequency', entry_index: 0 }),
        apiPost({ word: word, section: 'basic', lang: 'zh-cn', entry_index: 0 })
    ]);
    sections.forEach(function (result, i) {
        if (result.status !== 'fulfilled') return;
        if (i === 0 && result.value.frequency) {
            basic.frequency = result.value.frequency;
        }
        if (i === 1) {
            basic._basicZh = result.value;
        }
    });
    return basic;
}
```

- [ ] **Step 4: Populate the Chinese example element in `renderWord`**

Find (inside `renderWord`):
```js
var example = getExample();
el.example.textContent = example;
el.example.style.display = example ? '' : 'none';
```

Replace with:
```js
var example = getExample();
el.example.textContent = example;
el.example.style.display = example ? '' : 'none';

var exampleZh = getExampleZh(data._basicZh);
el.exampleZh.textContent = exampleZh;
el.exampleZh.style.display = exampleZh ? '' : 'none';
```

- [ ] **Step 5: Test in browser**

Load the WOTD page. Open DevTools Network tab and confirm two `POST /api/dictionary` calls fire — one without `lang` and one with `lang: zh-cn`. If the backend already returns `example_zh`, it will appear on the card. If not, the element remains hidden (no error, no visual change).

- [ ] **Step 6: Commit**

```bash
git add clients/web/word-of-the-day/script.js
git commit -m "feat(wotd): fetch bilingual basic data and display Chinese example sentence"
```

---

### Task 4: Increase PNG export resolution

**Files:**
- Modify: `clients/web/word-of-the-day/script.js`

- [ ] **Step 1: Change html2canvas scale from 2 to 3**

Find inside `exportPng()`:
```js
var canvas = await html2canvas(clone, {
    scale: 2,
    backgroundColor: null,
    logging: false,
    useCORS: true,
});
```

Replace with:
```js
var canvas = await html2canvas(clone, {
    scale: 3,
    backgroundColor: null,
    logging: false,
    useCORS: true,
});
```

- [ ] **Step 2: Test the export**

Click the PNG export button on the WOTD page. Open the downloaded file and check its pixel dimensions. With a ~440px logical card width, the output should be approximately **1320px wide**. Confirm the image is crisp at 100% zoom.

- [ ] **Step 3: Commit**

```bash
git add clients/web/word-of-the-day/script.js
git commit -m "feat(wotd): increase PNG export resolution to scale 3 (~1320px wide)"
```
