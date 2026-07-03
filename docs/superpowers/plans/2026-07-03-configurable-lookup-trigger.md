# Configurable Lookup Trigger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded text-selection trigger in the Chrome extension content script with a user-configurable trigger mode (text-selection, modifier+click, or modifier+hover), with platform-aware modifier key defaulting and an options UI to control the setting.

**Architecture:** Settings schema is extended with two new keys (`triggerMode`, `modifierKey`) in the existing `advancedDictionarySettings` sync storage object. The options page gains a new UI section. The content script reads settings on load, resolves the effective modifier key once, and registers only the event listeners appropriate for the chosen mode.

**Tech Stack:** Vanilla JS (ES6+), Chrome Extension MV3, `chrome.storage.sync`, Shadow DOM (existing pattern), no build step for extension source files.

---

## File Map

| File | Change |
|---|---|
| `clients/chrome-extension/src/shared.js` | Add `triggerMode` and `modifierKey` to `DEFAULT_SETTINGS`; update `saveSettings()` to persist them |
| `clients/chrome-extension/src/options.html` | Add "Lookup Trigger" fieldset with radio group and modifier dropdown above existing URL fields |
| `clients/chrome-extension/src/options.js` | Read/write new settings; wire up modifier dropdown disabled state |
| `clients/chrome-extension/src/options.css` | Style new trigger section (fieldset, radio group, select) |
| `clients/chrome-extension/src/content-script.js` | Wrap all init in async settings read; add `isModifierHeld()`, `getWordAtPoint()`, `openDictionaryWord()`, `setupTextSelectionListeners()`, `setupModifierClickListeners()`, `setupModifierHoverListeners()`; update hint text per mode |

---

## Task 1: Extend settings schema in `shared.js`

**Files:**
- Modify: `clients/chrome-extension/src/shared.js:1-4` (DEFAULT_SETTINGS)
- Modify: `clients/chrome-extension/src/shared.js:59-66` (saveSettings)

- [ ] **Step 1: Update `DEFAULT_SETTINGS`**

Replace lines 1–4 of `shared.js`:

```js
const DEFAULT_SETTINGS = {
  apiBaseUrl: 'https://www.lijialab.com',
  websiteUrl: 'https://www.lijialab.com',
  triggerMode: 'text-selection',
  modifierKey: 'auto'
};
```

- [ ] **Step 2: Update `saveSettings()` to persist new keys**

Replace the `saveSettings` function (lines 59–66):

```js
function saveSettings(settings) {
  return chrome.storage.sync.set({
    [STORAGE_KEYS.settings]: {
      apiBaseUrl: normalizeBaseUrl(settings.apiBaseUrl),
      websiteUrl: normalizeBaseUrl(settings.websiteUrl),
      triggerMode: settings.triggerMode || 'text-selection',
      modifierKey: settings.modifierKey || 'auto'
    }
  });
}
```

- [ ] **Step 3: Verify in browser**

Load the unpacked extension. Open the options page. Open DevTools console and run:
```js
chrome.storage.sync.get('advancedDictionarySettings', console.log)
```
Expected: object with `triggerMode: "text-selection"` and `modifierKey: "auto"` (after a save, or as defaults merged by `getSettings()`).

- [ ] **Step 4: Commit**

```bash
git add clients/chrome-extension/src/shared.js
git commit -m "feat(extension): add triggerMode and modifierKey to settings schema"
```

---

## Task 2: Add trigger UI to options page HTML

**Files:**
- Modify: `clients/chrome-extension/src/options.html`

- [ ] **Step 1: Add the trigger fieldset above the URL labels**

Replace the `<form id="optionsForm" ...>` block (lines 17–30 of `options.html`) with:

```html
<form id="optionsForm" class="settings-form">

  <fieldset class="trigger-fieldset">
    <legend class="trigger-legend">Lookup Trigger</legend>

    <div class="trigger-options">
      <label class="trigger-option">
        <input type="radio" name="triggerMode" value="text-selection">
        <span class="trigger-label">
          <span class="trigger-name">Text selection</span>
          <span class="trigger-desc">Select text to trigger lookup</span>
        </span>
      </label>

      <label class="trigger-option">
        <input type="radio" name="triggerMode" value="modifier-click">
        <span class="trigger-label">
          <span class="trigger-name">Modifier + click</span>
          <span class="trigger-desc">Hold Cmd/Ctrl and click a word</span>
        </span>
      </label>

      <label class="trigger-option">
        <input type="radio" name="triggerMode" value="modifier-hover">
        <span class="trigger-label">
          <span class="trigger-name">Modifier + hover</span>
          <span class="trigger-desc">Hold Cmd/Ctrl and hover over a word for 300ms</span>
        </span>
      </label>
    </div>

    <label class="modifier-key-label">
      <span>Modifier key</span>
      <select id="modifierKey">
        <option value="auto">Auto-detect (Cmd on Mac, Ctrl on Windows)</option>
        <option value="meta">Command (⌘)</option>
        <option value="ctrl">Control (Ctrl)</option>
        <option value="alt">Alt / Option</option>
      </select>
    </label>
  </fieldset>

  <label>
    <span>Dictionary API base URL</span>
    <input id="apiBaseUrl" type="url" placeholder="https://www.lijialab.com" required>
  </label>

  <label>
    <span>Website base URL</span>
    <input id="websiteUrl" type="url" placeholder="https://www.lijialab.com" required>
  </label>

  <button type="submit">Save settings</button>
  <p id="savedMessage" class="saved-message" hidden>Saved.</p>
  <p class="reload-note">Changes take effect on the next page load.</p>
</form>
```

- [ ] **Step 2: Commit**

```bash
git add clients/chrome-extension/src/options.html
git commit -m "feat(extension): add trigger mode UI to options page HTML"
```

---

## Task 3: Wire up options page JS

**Files:**
- Modify: `clients/chrome-extension/src/options.js`

- [ ] **Step 1: Replace `options.js` entirely**

```js
const optionsForm = document.getElementById('optionsForm');
const apiBaseUrlInput = document.getElementById('apiBaseUrl');
const websiteUrlInput = document.getElementById('websiteUrl');
const modifierKeySelect = document.getElementById('modifierKey');
const savedMessage = document.getElementById('savedMessage');
const triggerRadios = document.querySelectorAll('input[name="triggerMode"]');

function getSelectedTriggerMode() {
  for (const radio of triggerRadios) {
    if (radio.checked) return radio.value;
  }
  return 'text-selection';
}

function setTriggerMode(value) {
  for (const radio of triggerRadios) {
    radio.checked = radio.value === value;
  }
  updateModifierKeyState(value);
}

function updateModifierKeyState(triggerMode) {
  const needsModifier = triggerMode !== 'text-selection';
  modifierKeySelect.disabled = !needsModifier;
}

// Disable modifier dropdown when text-selection is chosen
triggerRadios.forEach(radio => {
  radio.addEventListener('change', () => updateModifierKeyState(getSelectedTriggerMode()));
});

(async function initOptions() {
  const settings = await getSettings();
  apiBaseUrlInput.value = settings.apiBaseUrl;
  websiteUrlInput.value = settings.websiteUrl;
  setTriggerMode(settings.triggerMode || 'text-selection');
  modifierKeySelect.value = settings.modifierKey || 'auto';
  updateModifierKeyState(settings.triggerMode || 'text-selection');
})();

optionsForm.addEventListener('submit', async event => {
  event.preventDefault();
  await saveSettings({
    apiBaseUrl: apiBaseUrlInput.value,
    websiteUrl: websiteUrlInput.value,
    triggerMode: getSelectedTriggerMode(),
    modifierKey: modifierKeySelect.value
  });
  savedMessage.hidden = false;
  window.setTimeout(() => {
    savedMessage.hidden = true;
  }, 1800);
});
```

- [ ] **Step 2: Verify in browser**

Load the unpacked extension. Open the options page. Confirm:
- "Text selection" radio is checked by default.
- The "Modifier key" dropdown is disabled when "Text selection" is selected.
- Selecting "Modifier + click" or "Modifier + hover" enables the dropdown.
- Saving and reopening the options page preserves the chosen values.

- [ ] **Step 3: Commit**

```bash
git add clients/chrome-extension/src/options.js
git commit -m "feat(extension): wire up trigger mode and modifier key in options JS"
```

---

## Task 4: Style the trigger section in options CSS

**Files:**
- Modify: `clients/chrome-extension/src/options.css`

- [ ] **Step 1: Append new styles to `options.css`**

Add the following at the end of `options.css`:

```css
/* Trigger section */
.trigger-fieldset {
  border: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;
}

.trigger-legend {
  font-size: 13px;
  font-weight: 700;
  padding: 0;
  margin-bottom: 4px;
}

.trigger-options {
  display: grid;
  gap: 8px;
}

.trigger-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.trigger-option input[type="radio"] {
  margin: 3px 0 0;
  accent-color: #1d4ed8;
  cursor: pointer;
  flex-shrink: 0;
  width: auto;
  border: none;
  border-radius: 0;
  padding: 0;
}

.trigger-label {
  display: grid;
  gap: 2px;
}

.trigger-name {
  font-size: 13px;
  font-weight: 700;
}

.trigger-desc {
  font-size: 12px;
  color: #64748b;
}

.modifier-key-label {
  display: grid;
  gap: 8px;
}

.modifier-key-label span {
  font-size: 13px;
  font-weight: 700;
}

.settings-form select {
  font: inherit;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  padding: 12px 14px;
  background: white;
  cursor: pointer;
}

.settings-form select:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.reload-note {
  margin: 0;
  color: #94a3b8;
  font-size: 12px;
}
```

- [ ] **Step 2: Verify in browser**

Open the options page. Confirm:
- Trigger options render as styled radio buttons with name + description.
- Modifier key dropdown has matching border-radius and padding to other inputs.
- Dropdown looks visually dimmed when disabled (text-selection mode).

- [ ] **Step 3: Commit**

```bash
git add clients/chrome-extension/src/options.css
git commit -m "feat(extension): style trigger mode section in options page"
```

---

## Task 5: Refactor content script — settings init and helpers

**Files:**
- Modify: `clients/chrome-extension/src/content-script.js`

This task adds the new helper functions and wraps the existing init in an async settings read. The existing event listener block (lines 525–549) is replaced in Task 6.

- [ ] **Step 1: Add `hoverDwellMs` constant and new state variables**

After line 8 (`const hintHideMs = 5600;`), add:

```js
  const hoverDwellMs = 300;
```

After line 13 (`let hintTimer = null;`), add:

```js
  let hoverDwellTimer = null;
  let hoverTrackedWord = null;
```

- [ ] **Step 2: Add `isModifierHeld()` helper**

Add after the `escapeAttribute` function (after line 508):

```js
  function resolveModifierChecker(modifierKey) {
    if (modifierKey === 'auto') {
      const platform = (navigator.userAgentData && navigator.userAgentData.platform)
        || navigator.platform
        || '';
      const isMac = /mac/i.test(platform);
      return isMac
        ? event => event.metaKey
        : event => event.ctrlKey;
    }
    if (modifierKey === 'meta') return event => event.metaKey;
    if (modifierKey === 'ctrl') return event => event.ctrlKey;
    if (modifierKey === 'alt') return event => event.altKey;
    return event => event.ctrlKey; // safe fallback
  }
```

- [ ] **Step 3: Add `getWordAtPoint()` helper**

Add after `resolveModifierChecker`:

```js
  function getWordAtPoint(x, y) {
    let range = null;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(x, y);
    } else if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.setEnd(pos.offsetNode, pos.offset);
      }
    }

    if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) return null;

    const textNode = range.startContainer;
    const offset = range.startOffset;
    const text = textNode.textContent || '';

    // Expand left to word boundary
    let start = offset;
    while (start > 0 && /\w/.test(text[start - 1])) start--;

    // Expand right to word boundary
    let end = offset;
    while (end < text.length && /\w/.test(text[end])) end++;

    if (start === end) return null;

    const word = sanitizeWord(text.slice(start, end));
    return word || null;
  }
```

- [ ] **Step 4: Add `openDictionaryWord()` helper**

Add after `getWordAtPoint`:

```js
  function openDictionaryWord(word) {
    const clean = sanitizeWord(word);
    if (!clean) return;
    activeWord = clean;
    sendOpenDictionaryMessage(clean);
    activeWord = '';
  }
```

- [ ] **Step 5: Commit**

```bash
git add clients/chrome-extension/src/content-script.js
git commit -m "feat(extension): add isModifierHeld, getWordAtPoint, openDictionaryWord helpers"
```

---

## Task 6: Refactor content script — settings-driven listener setup

**Files:**
- Modify: `clients/chrome-extension/src/content-script.js`

- [ ] **Step 1: Add per-mode listener setup functions**

Add after `openDictionaryWord` (before the existing event listener block at line 525):

```js
  function setupAlwaysListeners() {
    document.addEventListener('pointerdown', handleOutsidePointerDown, true);
    document.addEventListener('mousedown', handleOutsidePointerDown, true);

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        window.clearTimeout(selectionTimer);
        removeHint();
        removeLens();
      }
    });

    document.addEventListener('scroll', () => {
      window.clearTimeout(selectionTimer);
      removeLens();
    }, true);

    window.addEventListener('pagehide', () => {
      removeHint();
      removeLens();
    });
  }

  function setupTextSelectionListeners() {
    document.addEventListener('mouseup', scheduleSelectionLookup);
    document.addEventListener('keyup', scheduleSelectionLookup);
    document.addEventListener('touchend', scheduleSelectionLookup, { passive: true });
  }

  function setupModifierClickListeners(isModifierHeld) {
    document.addEventListener('click', event => {
      if (!isModifierHeld(event)) return;

      const word = getWordAtPoint(event.clientX, event.clientY);
      if (!word) return;

      // Prevent default for anchor clicks (suppresses open-in-new-tab)
      let el = event.target;
      while (el) {
        if (el.tagName === 'A') {
          event.preventDefault();
          break;
        }
        el = el.parentElement;
      }

      openDictionaryWord(word);
    }, true);
  }

  function setupModifierHoverListeners(isModifierHeld) {
    document.addEventListener('mousemove', event => {
      const word = getWordAtPoint(event.clientX, event.clientY);

      // Word changed or left — cancel pending timer
      if (word !== hoverTrackedWord) {
        window.clearTimeout(hoverDwellTimer);
        hoverDwellTimer = null;
        hoverTrackedWord = word;

        // Only start timer if modifier is currently held
        if (word && isModifierHeld(event)) {
          hoverDwellTimer = window.setTimeout(() => {
            openDictionaryWord(hoverTrackedWord);
          }, hoverDwellMs);
        }
      }
    });

    document.addEventListener('keydown', event => {
      // Modifier pressed while hovering over a word — start dwell timer
      if (hoverTrackedWord && isModifierHeld(event) && !hoverDwellTimer) {
        hoverDwellTimer = window.setTimeout(() => {
          openDictionaryWord(hoverTrackedWord);
        }, hoverDwellMs);
      }
    });

    document.addEventListener('keyup', event => {
      // Modifier released — cancel pending timer
      // Check all modifier keys; if none held, cancel
      if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        window.clearTimeout(hoverDwellTimer);
        hoverDwellTimer = null;
      }
    });
  }
```

- [ ] **Step 2: Replace the existing hard-coded listener block and `maybeShowSelectionHint()` call**

Remove lines 525–549 (the existing direct `addEventListener` calls and `maybeShowSelectionHint()`) and replace with:

```js
  async function init() {
    let settings;
    try {
      settings = await getSettings();
    } catch (_) {
      settings = { triggerMode: 'text-selection', modifierKey: 'auto' };
    }

    const triggerMode = settings.triggerMode || 'text-selection';
    const modifierKey = settings.modifierKey || 'auto';
    const isModifierHeld = resolveModifierChecker(modifierKey);

    setupAlwaysListeners();

    if (triggerMode === 'text-selection') {
      setupTextSelectionListeners();
      maybeShowSelectionHint();
    } else if (triggerMode === 'modifier-click') {
      setupModifierClickListeners(isModifierHeld);
    } else if (triggerMode === 'modifier-hover') {
      setupModifierHoverListeners(isModifierHeld);
    }
  }

  init();
```

- [ ] **Step 3: Verify `getSettings` is accessible in content script**

`getSettings` is defined in `shared.js` which is listed as a content script alongside `content-script.js` in `manifest.json`. Confirm both are in the `content_scripts[0].js` array:

```json
"js": ["shared.js", "content-script.js"]
```

Open `clients/chrome-extension/src/manifest.json` and verify the order. `shared.js` must come before `content-script.js`.

- [ ] **Step 4: Verify default behavior (text-selection) is unchanged**

Load the unpacked extension. Navigate to any webpage. Select a word — the lens button should appear as before. Click the lens — the dictionary popup should open.

- [ ] **Step 5: Verify modifier-click mode**

Open extension options. Choose "Modifier + click", save. Reload the test page. Hold Cmd (Mac) or Ctrl (Windows/Linux) and click any word — dictionary should open immediately without a lens button. Click a link while holding Cmd/Ctrl — dictionary opens, link does NOT open in new tab.

- [ ] **Step 6: Verify modifier-hover mode**

Open extension options. Choose "Modifier + hover", save. Reload the test page. Hold Cmd/Ctrl and hover over a word for ~300ms — dictionary should open. Move cursor away before 300ms — no lookup. Release modifier before 300ms — no lookup.

- [ ] **Step 7: Commit**

```bash
git add clients/chrome-extension/src/content-script.js
git commit -m "feat(extension): settings-driven trigger mode in content script"
```

---

## Task 7: Update selection hint text for modifier modes

**Files:**
- Modify: `clients/chrome-extension/src/content-script.js` (`renderSelectionHint`, line ~473)

The hint currently says "Select any word to look it up." This is only shown in text-selection mode (Task 6 already gates `maybeShowSelectionHint()` behind `triggerMode === 'text-selection'`), so no code change is needed here — the hint text remains correct.

- [ ] **Step 1: Confirm hint is gated**

In the `init()` function written in Task 6, verify `maybeShowSelectionHint()` is called only inside `if (triggerMode === 'text-selection')`. No code change needed if correct.

- [ ] **Step 2: Commit (no-op if no changes needed)**

If `init()` already gates it, skip this commit. Otherwise:

```bash
git add clients/chrome-extension/src/content-script.js
git commit -m "fix(extension): only show selection hint in text-selection mode"
```

---

## Task 8: Final integration smoke test

- [ ] **Step 1: Build the extension**

```bash
cd clients/chrome-extension && node build.js
```

Expected: `dist/` folder updated with no errors.

- [ ] **Step 2: Test all three modes end-to-end**

Load the `dist/` folder as an unpacked extension (replace the `src/` version if loaded).

| Mode | Action | Expected |
|---|---|---|
| Text selection (default) | Select a word | Lens button appears; click opens dictionary |
| Modifier + click (auto) | Hold Cmd (Mac) / Ctrl (Win), click word | Dictionary opens immediately |
| Modifier + hover (auto) | Hold Cmd/Ctrl, hover 300ms | Dictionary opens |
| Modifier + hover (auto) | Hold Cmd/Ctrl, move away before 300ms | No lookup |
| Modifier + hover (auto) | Release modifier before 300ms | No lookup |
| Any mode, Escape key | Press Escape | Lens dismissed |
| Options page | Switch modes, save, reload page | Mode takes effect |
| Options page | Text-selection selected | Modifier key dropdown is disabled |

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(extension): configurable lookup trigger with platform-aware modifier key"
```
