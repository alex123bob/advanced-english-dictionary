# Options Page i18n — Design Spec

**Date:** 2026-07-03
**Scope:** Chrome extension (`clients/chrome-extension/`) + web app locale files (`clients/web/i18n/`)
**Status:** Approved

---

## Overview

Apply the web dictionary's existing i18n system to the Chrome extension options page. The options page reads the user's language preference from `localStorage['dict_response_language']` (the same key written by the web dictionary), loads the matching locale, and applies translated strings to all visible text. Supports English (`en`) and Simplified Chinese (`zh-cn`). Defaults to English when no preference is stored.

---

## Translation Keys

New keys added to both `clients/web/i18n/locales/en.js` and `clients/web/i18n/locales/zh-cn.js`:

| Key | English | Chinese (Simplified) |
|---|---|---|
| `extSettingsTitle` | Extension settings | 扩展设置 |
| `extSettingsLede` | Point the extension at your API and website instance. | 将扩展指向您的 API 和网站实例。 |
| `extLookupTrigger` | Lookup Trigger | 查词触发方式 |
| `extTriggerTextSelection` | Text selection | 选中文本 |
| `extTriggerTextSelectionDesc` | Select text to trigger lookup | 选中文本触发查词 |
| `extTriggerModifierClick` | Modifier + click | 修饰键 + 点击 |
| `extTriggerModifierClickDesc` | Hold Cmd/Ctrl and click a word | 按住 Cmd/Ctrl 点击单词 |
| `extTriggerModifierHover` | Modifier + hover | 修饰键 + 悬停 |
| `extTriggerModifierHoverDesc` | Hold Cmd/Ctrl and hover over a word for 300ms | 按住 Cmd/Ctrl 悬停单词 300 毫秒 |
| `extModifierKey` | Modifier key | 修饰键 |
| `extModifierAuto` | Auto-detect (Cmd on Mac, Ctrl on Windows) | 自动检测（Mac 用 Cmd，Windows 用 Ctrl） |
| `extModifierMeta` | Command (⌘) | Command (⌘) |
| `extModifierCtrl` | Control (Ctrl) | Control (Ctrl) |
| `extModifierAlt` | Alt / Option | Alt / Option |
| `extApiBaseUrl` | Dictionary API base URL | 词典 API 地址 |
| `extWebsiteUrl` | Website base URL | 网站地址 |
| `extSaveSettings` | Save settings | 保存设置 |
| `extSaved` | Saved. | 已保存。 |
| `extReloadNote` | Changes take effect on the next page load. | 更改将在下次页面加载后生效。 |

---

## Script Loading

`options.html` gains three `<script>` tags before `shared.js`, loading the i18n engine and both locale files (already present in `dist/i18n/` via the existing build — no build script changes needed):

```html
<script src="i18n/i18n.js"></script>
<script src="i18n/locales/en.js"></script>
<script src="i18n/locales/zh-cn.js"></script>
<script src="shared.js"></script>
<script src="options.js"></script>
```

---

## Locale Detection

At the top of `options.js`, before any DOM manipulation:

```js
let locale = 'en';
try {
  locale = localStorage.getItem('dict_response_language') || 'en';
} catch (_) {}

const i18n = window.AdvancedDictionaryI18n;
i18n.setLanguage(locale);

function t(key) { return i18n.t(key); }
```

**Fallback chain:**
1. `localStorage['dict_response_language']` — written by the web dictionary
2. `'en'` — if key absent or localStorage unavailable (e.g. storage blocked)
3. The existing `i18n.t()` fallback: current language → English → key string itself

Locale is read once on page load. No dynamic re-translation. If the user changes language in the dictionary and reopens the options page, the new locale is picked up automatically.

---

## Translation Application

`options.js` calls `applyTranslations()` as the first thing in `initOptions()`, before populating form values:

```js
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });

  // <option> elements require direct assignment
  document.querySelector('#modifierKey option[value="auto"]').textContent = t('extModifierAuto');
  document.querySelector('#modifierKey option[value="meta"]').textContent = t('extModifierMeta');
  document.querySelector('#modifierKey option[value="ctrl"]').textContent = t('extModifierCtrl');
  document.querySelector('#modifierKey option[value="alt"]').textContent  = t('extModifierAlt');

  // Update <html lang> for screen readers and browser font rendering
  document.documentElement.lang = i18n.getLanguageMeta().htmlLang;
}
```

---

## HTML Changes (`options.html`)

All visible text strings replaced with `data-i18n` attributes. Element IDs, structure, class names, and form attributes are unchanged.

### Header

```html
<h1 data-i18n="extSettingsTitle"></h1>
<p class="lede" data-i18n="extSettingsLede"></p>
```

### Trigger fieldset

```html
<legend class="trigger-legend" data-i18n="extLookupTrigger"></legend>

<span class="trigger-name" data-i18n="extTriggerTextSelection"></span>
<span class="trigger-desc" data-i18n="extTriggerTextSelectionDesc"></span>

<span class="trigger-name" data-i18n="extTriggerModifierClick"></span>
<span class="trigger-desc" data-i18n="extTriggerModifierClickDesc"></span>

<span class="trigger-name" data-i18n="extTriggerModifierHover"></span>
<span class="trigger-desc" data-i18n="extTriggerModifierHoverDesc"></span>
```

### Modifier key label and select

```html
<span data-i18n="extModifierKey"></span>
<select id="modifierKey">
  <option value="auto"></option>
  <option value="meta"></option>
  <option value="ctrl"></option>
  <option value="alt"></option>
</select>
```

(Option text filled by `applyTranslations()` in JS.)

### URL inputs

```html
<span data-i18n="extApiBaseUrl"></span>
<span data-i18n="extWebsiteUrl"></span>
```

### Footer elements

```html
<button type="submit" data-i18n="extSaveSettings"></button>
<p id="savedMessage" class="saved-message" data-i18n="extSaved" hidden></p>
<p class="reload-note" data-i18n="extReloadNote"></p>
```

---

## `options.js` Changes

- Add locale detection block at top of file (before DOM references)
- Add `t()` helper function
- Add `applyTranslations()` function
- Call `applyTranslations()` as the first statement inside `initOptions()`

No changes to save/load logic, radio group management, or modifier dropdown disabled state.

---

## Files Changed

| File | Change |
|---|---|
| `clients/web/i18n/locales/en.js` | Add 19 new `ext*` keys |
| `clients/web/i18n/locales/zh-cn.js` | Add 19 new `ext*` keys in Chinese |
| `clients/chrome-extension/src/options.html` | Add 3 script tags; replace text nodes with `data-i18n` attributes; empty `<option>` text content |
| `clients/chrome-extension/src/options.js` | Add locale detection, `t()`, `applyTranslations()`; call it in `initOptions()` |

No changes to: `build.js`, `shared.js`, `content-script.js`, `manifest.json`, `options.css`.

---

## Out of Scope

- Language switcher on the options page itself
- i18n for content-script UI (lens button, selection hint)
- Adding more languages beyond `en` and `zh-cn`
- Dynamic re-translation without page reload
