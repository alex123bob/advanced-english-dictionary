# Options Page i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the web dictionary's existing i18n system to the Chrome extension options page, reading the user's language preference from `localStorage['dict_response_language']` and translating all visible text into English or Simplified Chinese.

**Architecture:** New translation keys (prefixed `ext*`) are added to the existing locale files in `clients/web/i18n/locales/`. The options page loads the i18n scripts (already copied to dist by the build), detects locale from localStorage on init, and applies `data-i18n` attribute-driven translations to all text nodes. No build changes needed — `dist/i18n/` is already populated by the existing build script.

**Tech Stack:** Vanilla JS, Chrome Extension MV3, `window.AdvancedDictionaryI18n` (existing bespoke i18n engine), `localStorage`.

---

## File Map

| File | Change |
|---|---|
| `clients/web/i18n/locales/en.js` | Add 19 `ext*` keys |
| `clients/web/i18n/locales/zh-cn.js` | Add 19 `ext*` keys in Chinese |
| `clients/chrome-extension/src/options.html` | Add 3 `<script>` tags; replace all text nodes with `data-i18n` attributes; empty `<option>` text |
| `clients/chrome-extension/src/options.js` | Add locale detection, `t()` helper, `applyTranslations()`; call in `initOptions()` |

---

## Task 1: Add translation keys to `en.js`

**Files:**
- Modify: `clients/web/i18n/locales/en.js`

- [ ] **Step 1: Add the 19 new keys to the English locale**

Open `clients/web/i18n/locales/en.js`. At the end of the dictionary object (before the final `}`), add a comma after the last existing entry (`"sensePlural": "senses"`), then append:

```js
        "extSettingsTitle": "Extension settings",
        "extSettingsLede": "Point the extension at your API and website instance.",
        "extLookupTrigger": "Lookup Trigger",
        "extTriggerTextSelection": "Text selection",
        "extTriggerTextSelectionDesc": "Select text to trigger lookup",
        "extTriggerModifierClick": "Modifier + click",
        "extTriggerModifierClickDesc": "Hold Cmd/Ctrl and click a word",
        "extTriggerModifierHover": "Modifier + hover",
        "extTriggerModifierHoverDesc": "Hold Cmd/Ctrl and hover over a word for 300ms",
        "extModifierKey": "Modifier key",
        "extModifierAuto": "Auto-detect (Cmd on Mac, Ctrl on Windows)",
        "extModifierMeta": "Command (⌘)",
        "extModifierCtrl": "Control (Ctrl)",
        "extModifierAlt": "Alt / Option",
        "extApiBaseUrl": "Dictionary API base URL",
        "extWebsiteUrl": "Website base URL",
        "extSaveSettings": "Save settings",
        "extSaved": "Saved.",
        "extReloadNote": "Changes take effect on the next page load."
```

- [ ] **Step 2: Verify the file is valid JS**

```bash
node -e "require('./clients/web/i18n/locales/en.js')" 2>&1 || node --input-type=module < clients/web/i18n/locales/en.js 2>&1; echo "Exit: $?"
```

Because `en.js` is an IIFE that calls `window.AdvancedDictionaryI18n.registerLanguage`, running it with Node will error on the `window` reference. Instead verify with a syntax check:

```bash
node --check clients/web/i18n/locales/en.js && echo "Syntax OK"
```

Expected: `Syntax OK`

- [ ] **Step 3: Commit**

```bash
git add clients/web/i18n/locales/en.js
git commit -m "feat(i18n): add extension options page translation keys to en.js"
```

---

## Task 2: Add translation keys to `zh-cn.js`

**Files:**
- Modify: `clients/web/i18n/locales/zh-cn.js`

- [ ] **Step 1: Add the 19 new keys to the Chinese locale**

Open `clients/web/i18n/locales/zh-cn.js`. At the end of the dictionary object (before the final `}`), add a comma after the last existing entry (`"sensePlural": "义项"`), then append:

```js
        "extSettingsTitle": "扩展设置",
        "extSettingsLede": "将扩展指向您的 API 和网站实例。",
        "extLookupTrigger": "查词触发方式",
        "extTriggerTextSelection": "选中文本",
        "extTriggerTextSelectionDesc": "选中文本触发查词",
        "extTriggerModifierClick": "修饰键 + 点击",
        "extTriggerModifierClickDesc": "按住 Cmd/Ctrl 点击单词",
        "extTriggerModifierHover": "修饰键 + 悬停",
        "extTriggerModifierHoverDesc": "按住 Cmd/Ctrl 悬停单词 300 毫秒",
        "extModifierKey": "修饰键",
        "extModifierAuto": "自动检测（Mac 用 Cmd，Windows 用 Ctrl）",
        "extModifierMeta": "Command (⌘)",
        "extModifierCtrl": "Control (Ctrl)",
        "extModifierAlt": "Alt / Option",
        "extApiBaseUrl": "词典 API 地址",
        "extWebsiteUrl": "网站地址",
        "extSaveSettings": "保存设置",
        "extSaved": "已保存。",
        "extReloadNote": "更改将在下次页面加载后生效。"
```

- [ ] **Step 2: Verify syntax**

```bash
node --check clients/web/i18n/locales/zh-cn.js && echo "Syntax OK"
```

Expected: `Syntax OK`

- [ ] **Step 3: Commit**

```bash
git add clients/web/i18n/locales/zh-cn.js
git commit -m "feat(i18n): add extension options page translation keys to zh-cn.js"
```

---

## Task 3: Update `options.html` — script tags and `data-i18n` attributes

**Files:**
- Modify: `clients/chrome-extension/src/options.html`

- [ ] **Step 1: Replace the full `<body>` — adds script tags and `data-i18n` attributes in one pass**

Replace the entire `<body>` content with:

```html
<body>
  <main class="options-shell">
    <header>
      <p class="eyebrow">Advanced English Dictionary</p>
      <h1 data-i18n="extSettingsTitle"></h1>
      <p class="lede" data-i18n="extSettingsLede"></p>
    </header>

    <form id="optionsForm" class="settings-form">

      <fieldset class="trigger-fieldset">
        <legend class="trigger-legend" data-i18n="extLookupTrigger"></legend>

        <div class="trigger-options">
          <label class="trigger-option">
            <input type="radio" name="triggerMode" value="text-selection">
            <span class="trigger-label">
              <span class="trigger-name" data-i18n="extTriggerTextSelection"></span>
              <span class="trigger-desc" data-i18n="extTriggerTextSelectionDesc"></span>
            </span>
          </label>

          <label class="trigger-option">
            <input type="radio" name="triggerMode" value="modifier-click">
            <span class="trigger-label">
              <span class="trigger-name" data-i18n="extTriggerModifierClick"></span>
              <span class="trigger-desc" data-i18n="extTriggerModifierClickDesc"></span>
            </span>
          </label>

          <label class="trigger-option">
            <input type="radio" name="triggerMode" value="modifier-hover">
            <span class="trigger-label">
              <span class="trigger-name" data-i18n="extTriggerModifierHover"></span>
              <span class="trigger-desc" data-i18n="extTriggerModifierHoverDesc"></span>
            </span>
          </label>
        </div>

        <label class="modifier-key-label">
          <span data-i18n="extModifierKey"></span>
          <select id="modifierKey">
            <option value="auto"></option>
            <option value="meta"></option>
            <option value="ctrl"></option>
            <option value="alt"></option>
          </select>
        </label>
      </fieldset>

      <label>
        <span data-i18n="extApiBaseUrl"></span>
        <input id="apiBaseUrl" type="url" placeholder="https://www.lijialab.com" required>
      </label>

      <label>
        <span data-i18n="extWebsiteUrl"></span>
        <input id="websiteUrl" type="url" placeholder="https://www.lijialab.com" required>
      </label>

      <button type="submit" data-i18n="extSaveSettings"></button>
      <p id="savedMessage" class="saved-message" data-i18n="extSaved" hidden></p>
      <p class="reload-note" data-i18n="extReloadNote"></p>
    </form>
  </main>

  <script src="i18n/i18n.js"></script>
  <script src="i18n/locales/en.js"></script>
  <script src="i18n/locales/zh-cn.js"></script>
  <script src="shared.js"></script>
  <script src="options.js"></script>
</body>
```

Note: `<p class="eyebrow">Advanced English Dictionary</p>` is intentionally left untranslated — it is a brand name.

- [ ] **Step 3: Commit**

```bash
git add clients/chrome-extension/src/options.html
git commit -m "feat(i18n): add data-i18n attributes and i18n scripts to options.html"
```

---

## Task 4: Update `options.js` — locale detection and translation application

**Files:**
- Modify: `clients/chrome-extension/src/options.js`

- [ ] **Step 1: Replace `options.js` entirely**

```js
// Locale detection — reads the same key as the web dictionary
let locale = 'en';
try {
  locale = localStorage.getItem('dict_response_language') || 'en';
} catch (_) {}

const i18n = window.AdvancedDictionaryI18n;
i18n.setLanguage(locale);

function t(key) {
  return i18n.t(key);
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });

  // <option> elements require direct text assignment
  document.querySelector('#modifierKey option[value="auto"]').textContent = t('extModifierAuto');
  document.querySelector('#modifierKey option[value="meta"]').textContent = t('extModifierMeta');
  document.querySelector('#modifierKey option[value="ctrl"]').textContent = t('extModifierCtrl');
  document.querySelector('#modifierKey option[value="alt"]').textContent  = t('extModifierAlt');

  // Update <html lang> for screen readers and browser font rendering
  document.documentElement.lang = i18n.getLanguageMeta().htmlLang;
}

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

triggerRadios.forEach(radio => {
  radio.addEventListener('change', () => updateModifierKeyState(getSelectedTriggerMode()));
});

(async function initOptions() {
  applyTranslations();

  const settings = await getSettings();
  apiBaseUrlInput.value = settings.apiBaseUrl;
  websiteUrlInput.value = settings.websiteUrl;
  setTriggerMode(settings.triggerMode || 'text-selection');
  modifierKeySelect.value = settings.modifierKey || 'auto';
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

Key points:
- Locale detection and `i18n` setup run at module top-level, before DOM references
- `applyTranslations()` is the first call inside `initOptions()`, before settings are loaded
- `modifierKeySelect.value` assignment in `initOptions()` runs after `applyTranslations()` has set option text, so the value assignment works correctly

- [ ] **Step 2: Verify the options page renders correctly in English (default)**

Load the extension from `clients/chrome-extension/src/` as an unpacked extension. Open the options page. Confirm:
- All visible text is in English (no empty labels, no raw key strings like `extSaveSettings`)
- The save button reads "Save settings"
- The trigger radio labels read "Text selection", "Modifier + click", "Modifier + hover"
- `<html lang="en">` in DevTools Elements panel

- [ ] **Step 3: Verify Chinese locale**

In DevTools console on the options page, run:
```js
localStorage.setItem('dict_response_language', 'zh-cn')
```
Reload the options page. Confirm:
- Page title `<h1>` reads "扩展设置"
- Trigger legend reads "查词触发方式"
- Radio options read "选中文本", "修饰键 + 点击", "修饰键 + 悬停"
- Save button reads "保存设置"
- `<html lang="zh-CN">` in DevTools Elements panel

Reset after testing:
```js
localStorage.removeItem('dict_response_language')
```

- [ ] **Step 4: Commit**

```bash
git add clients/chrome-extension/src/options.js
git commit -m "feat(i18n): apply locale-aware translations to options page"
```

---

## Task 5: Build and final verification

**Files:**
- No source changes — build only

- [ ] **Step 1: Rebuild the extension dist**

```bash
cd clients/chrome-extension && node build.js
```

Expected output: `Chrome extension build ready: .../clients/chrome-extension/dist`

- [ ] **Step 2: Verify i18n files are present in dist**

```bash
ls clients/chrome-extension/dist/i18n/
```

Expected: `i18n.js`, `locales/` directory containing `en.js` and `zh-cn.js`

```bash
ls clients/chrome-extension/dist/i18n/locales/
```

Expected: `en.js  zh-cn.js`

- [ ] **Step 3: Verify new keys are in dist locale files**

```bash
grep -c "extSettingsTitle" clients/chrome-extension/dist/i18n/locales/en.js
grep -c "extSettingsTitle" clients/chrome-extension/dist/i18n/locales/zh-cn.js
```

Expected: `1` for each

- [ ] **Step 4: Commit dist**

```bash
cd ../..
git add clients/chrome-extension/dist/
git commit -m "build: rebuild extension dist with options page i18n"
```
