(function () {
  const lensHostId = 'advanced-dictionary-inspection-lens';
  const hintHostId = 'advanced-dictionary-selection-hint';
  const hintDismissedStorageKey = 'advancedDictionarySelectionHintDismissed';
  const selectionDelayMs = 90;
  const lensHideMs = 2600;
  const hintDelayMs = 1200;
  const hintHideMs = 5600;
  const hoverDwellMs = 300;

  let activeWord = '';
  let lensHideTimer = null;
  let selectionTimer = null;
  let hintTimer = null;
  let hoverDwellTimer = null;
  let hoverTrackedWord = null;

  function sanitizeWord(value) {
    return (value || '')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/\s+/g, ' ')
      .replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, '')
      .trim();
  }

  function getSearchableSelection(value) {
    return sanitizeWord(value);
  }

  function removeElement(id) {
    const element = document.getElementById(id);
    if (element) element.remove();
  }

  function removeLens() {
    removeElement(lensHostId);
    activeWord = '';
    window.clearTimeout(lensHideTimer);
  }

  function removeHint() {
    removeElement(hintHostId);
    window.clearTimeout(hintTimer);
  }

  function getSelectedLookup() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

    const selectedText = selection.toString().trim();
    const word = getSearchableSelection(selectedText);
    if (!word) return null;

    return {
      word,
      range: selection.getRangeAt(0).cloneRange()
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  function getPlacement(range, width, height) {
    const rects = Array.from(range.getClientRects()).filter(rect => rect.width || rect.height);
    const rect = rects[0] || range.getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) return null;

    const centerX = window.scrollX + rect.left + rect.width / 2;
    const top = window.scrollY + rect.top - height - 12;

    return {
      left: clamp(centerX - width / 2, window.scrollX + 10, window.scrollX + document.documentElement.clientWidth - width - 10),
      top: clamp(top, window.scrollY + 10, window.scrollY + document.documentElement.clientHeight - height - 10),
      width
    };
  }

  function sendOpenDictionaryMessage(word) {
    const runtime = globalThis.chrome && chrome.runtime;
    if (!runtime || typeof runtime.sendMessage !== 'function') {
      console.warn('Advanced English Dictionary runtime is unavailable. Reload this page after reloading the extension.');
      return false;
    }

    try {
      runtime.sendMessage({ type: 'OPEN_DICTIONARY_SEARCH', word }, () => {
        if (runtime.lastError) {
          console.warn('Advanced English Dictionary could not open lookup:', runtime.lastError.message);
        }
      });
      return true;
    } catch (error) {
      console.warn('Advanced English Dictionary could not open lookup:', error);
      return false;
    }
  }

  function openDictionary() {
    const word = sanitizeWord(activeWord);
    if (!word) return;

    if (sendOpenDictionaryMessage(word)) {
      removeLens();
    }
  }

  function scheduleLensHide() {
    window.clearTimeout(lensHideTimer);
    lensHideTimer = window.setTimeout(removeLens, lensHideMs);
  }

  function renderLens(lookupInfo) {
    const placement = getPlacement(lookupInfo.range, 236, 54);
    if (!placement) return;

    removeHint();
    removeLens();
    activeWord = lookupInfo.word;

    const host = document.createElement('div');
    host.id = lensHostId;
    host.style.position = 'absolute';
    host.style.zIndex = '2147483647';
    host.style.pointerEvents = 'auto';
    host.style.left = `${placement.left}px`;
    host.style.top = `${placement.top}px`;
    host.style.width = `${placement.width}px`;

    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host {
          position: absolute;
          z-index: 2147483647;
          pointer-events: auto;
          font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #172033;
        }

        .lens {
          position: relative;
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.74);
          border-radius: 18px;
          padding: 8px 9px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.97), rgba(239, 253, 250, 0.93)),
            radial-gradient(circle at 18% 16%, rgba(45, 212, 191, 0.42), transparent 32%);
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.26), 0 0 0 1px rgba(20, 184, 166, 0.12);
          cursor: pointer;
          transform-origin: 50% 100%;
          animation: lensIn 160ms cubic-bezier(.2,.8,.2,1);
          -webkit-backdrop-filter: blur(18px) saturate(1.35);
          backdrop-filter: blur(18px) saturate(1.35);
        }

        .lens::after {
          content: "";
          position: absolute;
          inset: -5px;
          border-radius: 22px;
          border: 1px solid rgba(45, 212, 191, 0.34);
          pointer-events: none;
        }

        .lens:hover,
        .lens:focus-visible {
          outline: none;
          transform: translateY(-2px) scale(1.012);
          box-shadow: 0 24px 54px rgba(15, 23, 42, 0.31), 0 0 0 4px rgba(20, 184, 166, 0.16);
        }

        .mark {
          position: relative;
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: conic-gradient(from 210deg, #22d3ee, #14b8a6, #8b5cf6, #22d3ee);
          color: white;
          box-shadow: 0 8px 22px rgba(20, 184, 166, 0.35);
        }

        .mark::before {
          content: "";
          width: 15px;
          height: 15px;
          border: 2px solid currentColor;
          border-radius: 50%;
          transform: translate(-2px, -1px);
        }

        .mark::after {
          content: "";
          position: absolute;
          width: 9px;
          height: 2px;
          border-radius: 999px;
          background: currentColor;
          transform: translate(8px, 9px) rotate(45deg);
        }

        .copy {
          min-width: 0;
        }

        .kicker {
          display: block;
          color: #0f766e;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.08em;
          line-height: 1;
          text-transform: uppercase;
        }

        .word {
          display: block;
          overflow: hidden;
          color: #111827;
          font-size: 14px;
          font-weight: 850;
          line-height: 1.18;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .action {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border-radius: 999px;
          padding: 6px 8px;
          background: #172554;
          color: #f8fafc;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .action::after {
          content: "\\2197";
          font-size: 11px;
        }

        @keyframes lensIn {
          from { opacity: 0; transform: translateY(6px) scale(0.94); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @media (prefers-reduced-motion: reduce) {
          .lens {
            animation: none;
          }
        }
      </style>
      <button class="lens" type="button" aria-label="Look up ${escapeAttribute(activeWord)} in Advanced English Dictionary">
        <span class="mark" aria-hidden="true"></span>
        <span class="copy">
          <span class="kicker">Selected text</span>
          <span class="word">${escapeHtml(activeWord)}</span>
        </span>
        <span class="action">Open</span>
      </button>
    `;

    const button = shadow.querySelector('button');
    button.addEventListener('mousedown', event => event.preventDefault());
    button.addEventListener('click', openDictionary);
    button.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openDictionary();
      }
    });
    button.addEventListener('mouseenter', () => window.clearTimeout(lensHideTimer));
    button.addEventListener('mouseleave', scheduleLensHide);

    document.documentElement.appendChild(host);
    scheduleLensHide();
  }

  function scheduleSelectionLookup() {
    window.clearTimeout(selectionTimer);
    selectionTimer = window.setTimeout(() => {
      const selectionInfo = getSelectedLookup();
      if (selectionInfo) {
        renderLens(selectionInfo);
      }
    }, selectionDelayMs);
  }

  function getLocalStorage() {
    return globalThis.chrome && chrome.storage && chrome.storage.local;
  }

  function setHintDismissed() {
    const storage = getLocalStorage();
    if (!storage) return;
    storage.set({ [hintDismissedStorageKey]: true });
  }

  function maybeShowSelectionHint() {
    if (document.getElementById(hintHostId) || document.getElementById(lensHostId)) return;
    const storage = getLocalStorage();

    const showHint = () => {
      window.setTimeout(() => {
        if (!document.getElementById(lensHostId)) {
          renderSelectionHint();
        }
      }, hintDelayMs);
    };

    if (!storage) {
      showHint();
      return;
    }

    storage.get(hintDismissedStorageKey, result => {
      if (result && result[hintDismissedStorageKey]) return;
      showHint();
    });
  }

  function renderSelectionHint() {
    if (document.getElementById(hintHostId)) return;

    const host = document.createElement('div');
    host.id = hintHostId;
    host.style.position = 'fixed';
    host.style.right = '18px';
    host.style.bottom = '18px';
    host.style.zIndex = '2147483646';
    host.style.pointerEvents = 'auto';

    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host {
          color: #172033;
          font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .hint {
          display: grid;
          grid-template-columns: 30px minmax(0, 1fr) 22px;
          align-items: center;
          gap: 10px;
          max-width: min(330px, calc(100vw - 36px));
          border: 1px solid rgba(255, 255, 255, 0.72);
          border-radius: 16px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(20, 184, 166, 0.1);
          -webkit-backdrop-filter: blur(18px) saturate(1.3);
          backdrop-filter: blur(18px) saturate(1.3);
          animation: hintIn 180ms cubic-bezier(.2,.8,.2,1);
        }

        .main {
          min-width: 0;
        }

        .icon {
          position: relative;
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg, #22d3ee, #14b8a6 52%, #6366f1);
          color: white;
        }

        .icon::before {
          content: "";
          width: 13px;
          height: 13px;
          border: 2px solid currentColor;
          border-radius: 50%;
          transform: translate(-2px, -1px);
        }

        .icon::after {
          content: "";
          position: absolute;
          width: 8px;
          height: 2px;
          border-radius: 999px;
          background: currentColor;
          transform: translate(7px, 8px) rotate(45deg);
        }

        .title {
          color: #0f766e;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.08em;
          line-height: 1;
          text-transform: uppercase;
        }

        .body {
          margin-top: 3px;
          color: #111827;
          font-size: 13px;
          font-weight: 750;
          line-height: 1.25;
        }

        .never {
          grid-column: 2 / 4;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          width: fit-content;
          margin-top: 2px;
          color: #475569;
          font-size: 12px;
          font-weight: 650;
          cursor: pointer;
          user-select: none;
        }

        .never input {
          width: 14px;
          height: 14px;
          margin: 0;
          accent-color: #0f766e;
          cursor: pointer;
        }

        .close {
          display: grid;
          place-items: center;
          width: 22px;
          height: 22px;
          border: 0;
          border-radius: 50%;
          background: rgba(15, 23, 42, 0.06);
          color: #475569;
          cursor: pointer;
          font: inherit;
          line-height: 1;
        }

        .close:hover,
        .close:focus-visible {
          outline: none;
          background: rgba(15, 23, 42, 0.12);
          color: #0f172a;
        }

        @keyframes hintIn {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @media (prefers-reduced-motion: reduce) {
          .hint {
            animation: none;
          }
        }
      </style>
      <div class="hint" role="status">
        <span class="icon" aria-hidden="true"></span>
        <span class="main">
          <span class="title">Dictionary Lens</span>
          <span class="body">Select any word to look it up.</span>
        </span>
        <button class="close" type="button" aria-label="Dismiss Dictionary Lens hint">×</button>
        <label class="never">
          <input class="never-checkbox" type="checkbox">
          <span>Don’t show again</span>
        </label>
      </div>
    `;

    shadow.querySelector('.close').addEventListener('click', () => {
      removeHint();
    });
    shadow.querySelector('.never-checkbox').addEventListener('change', event => {
      if (event.target.checked) {
        setHintDismissed();
        removeHint();
      }
    });

    document.documentElement.appendChild(host);
    hintTimer = window.setTimeout(removeHint, hintHideMs);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

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
    while (start > 0 && /[\w']/.test(text[start - 1])) start--;

    // Expand right to word boundary
    let end = offset;
    while (end < text.length && /[\w']/.test(text[end])) end++;

    if (start === end) return null;

    const word = sanitizeWord(text.slice(start, end));
    return word || null;
  }

  function openDictionaryWord(word) {
    const clean = sanitizeWord(word);
    if (!clean) return;
    sendOpenDictionaryMessage(clean);
  }

  function handleOutsidePointerDown(event) {
    const lensHost = document.getElementById(lensHostId);
    if (!lensHost) return;

    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    if (path.includes(lensHost)) return;

    window.clearTimeout(selectionTimer);
    removeLens();
    const selection = window.getSelection && window.getSelection();
    if (selection && selection.rangeCount > 0) {
      selection.removeAllRanges();
    }
  }

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
    const highlightHostId = 'advanced-dictionary-hover-highlight';
    let cursorStyleEl = null;
    let modifierCurrentlyHeld = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let highlightedWord = null;

    function removeHighlight() {
      const existing = document.getElementById(highlightHostId);
      if (existing) existing.remove();
      highlightedWord = null;
    }

    function showHighlight(x, y) {
      removeHighlight();

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
      if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) return;

      const textNode = range.startContainer;
      const offset = range.startOffset;
      const text = textNode.textContent || '';
      let start = offset;
      while (start > 0 && /[\w']/.test(text[start - 1])) start--;
      let end = offset;
      while (end < text.length && /[\w']/.test(text[end])) end++;
      if (start === end) return;

      const wordRange = document.createRange();
      wordRange.setStart(textNode, start);
      wordRange.setEnd(textNode, end);
      const rect = wordRange.getBoundingClientRect();
      if (!rect.width) return;

      highlightedWord = text.slice(start, end);

      const host = document.createElement('div');
      host.id = highlightHostId;
      host.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 2147483646;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
      `;
      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <style>
          :host { display: block; }
          .hl {
            position: absolute;
            inset: 0;
            border-bottom: 2px dashed #14b8a6;
            border-radius: 1px;
            background: rgba(20, 184, 166, 0.08);
          }
        </style>
        <div class="hl"></div>
      `;
      document.documentElement.appendChild(host);
    }

    function setPointerCursor() {
      if (cursorStyleEl) return;
      cursorStyleEl = document.createElement('style');
      cursorStyleEl.id = 'advanced-dictionary-cursor-override';
      cursorStyleEl.textContent = '*, *::before, *::after { cursor: pointer !important; }';
      document.documentElement.appendChild(cursorStyleEl);
    }

    function clearPointerCursor() {
      if (cursorStyleEl) {
        cursorStyleEl.remove();
        cursorStyleEl = null;
      }
    }

    function resetAll() {
      modifierCurrentlyHeld = false;
      clearPointerCursor();
      removeHighlight();
    }

    // Show pointer cursor and highlight while modifier is held
    document.addEventListener('keydown', event => {
      if (!isModifierHeld(event)) return;
      modifierCurrentlyHeld = true;
      setPointerCursor();
      const word = getWordAtPoint(lastMouseX, lastMouseY);
      if (word) showHighlight(lastMouseX, lastMouseY);
    });

    document.addEventListener('keyup', event => {
      if (!event.metaKey && !event.ctrlKey && !event.altKey) resetAll();
    });

    // Track mouse position and update highlight when modifier is held
    document.addEventListener('mousemove', event => {
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      if (!modifierCurrentlyHeld) return;
      const word = getWordAtPoint(event.clientX, event.clientY);
      if (word !== highlightedWord) {
        if (word) showHighlight(event.clientX, event.clientY);
        else removeHighlight();
      }
    });

    // Reset when window loses focus (e.g. popup opens — keyup never fires)
    window.addEventListener('blur', resetAll);

    // Prevent text selection when modifier is held (mousedown fires before click)
    document.addEventListener('mousedown', event => {
      if (isModifierHeld(event)) {
        event.preventDefault();
      }
    }, true);

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

      removeHighlight();
      openDictionaryWord(word);
    }, true);

    // Clean up on scroll
    document.addEventListener('scroll', () => {
      removeHighlight();
      clearPointerCursor();
    }, true);
  }

  function setupModifierHoverListeners(isModifierHeld) {
    const highlightHostId = 'advanced-dictionary-hover-highlight';

    function removeHighlight() {
      const existing = document.getElementById(highlightHostId);
      if (existing) existing.remove();
    }

    function showHighlight(x, y) {
      removeHighlight();

      // Get the range for the tracked word to position the highlight
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
      if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) return;

      const textNode = range.startContainer;
      const offset = range.startOffset;
      const text = textNode.textContent || '';
      let start = offset;
      while (start > 0 && /[\w']/.test(text[start - 1])) start--;
      let end = offset;
      while (end < text.length && /[\w']/.test(text[end])) end++;
      if (start === end) return;

      const wordRange = document.createRange();
      wordRange.setStart(textNode, start);
      wordRange.setEnd(textNode, end);
      const rect = wordRange.getBoundingClientRect();
      if (!rect.width) return;

      const host = document.createElement('div');
      host.id = highlightHostId;
      host.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 2147483646;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
      `;
      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <style>
          :host { display: block; }
          .hl {
            position: absolute;
            inset: 0;
            border-bottom: 2px dashed #14b8a6;
            border-radius: 1px;
            background: rgba(20, 184, 166, 0.08);
            cursor: pointer;
          }
        </style>
        <div class="hl"></div>
      `;
      document.documentElement.appendChild(host);
    }

    // Track last mouse position to show highlight on keydown
    let lastMouseX = 0;
    let lastMouseY = 0;
    let modifierCurrentlyHeld = false;
    let cursorStyleEl = null;

    function setPointerCursor() {
      if (cursorStyleEl) return;
      cursorStyleEl = document.createElement('style');
      cursorStyleEl.id = 'advanced-dictionary-cursor-override';
      cursorStyleEl.textContent = '*, *::before, *::after { cursor: pointer !important; }';
      document.documentElement.appendChild(cursorStyleEl);
    }

    function clearPointerCursor() {
      if (cursorStyleEl) {
        cursorStyleEl.remove();
        cursorStyleEl = null;
      }
    }

    function resetAll() {
      modifierCurrentlyHeld = false;
      clearPointerCursor();
      window.clearTimeout(hoverDwellTimer);
      hoverDwellTimer = null;
      hoverTrackedWord = null;
      removeHighlight();
    }

    // Suppress text selection when modifier is held
    document.addEventListener('mousedown', event => {
      if (isModifierHeld(event)) event.preventDefault();
    }, true);

    document.addEventListener('mousemove', event => {
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;

      const word = getWordAtPoint(event.clientX, event.clientY);

      // Word changed or left — cancel pending timer
      if (word !== hoverTrackedWord) {
        window.clearTimeout(hoverDwellTimer);
        hoverDwellTimer = null;
        hoverTrackedWord = word;

        if (word && modifierCurrentlyHeld) {
          showHighlight(event.clientX, event.clientY);
          hoverDwellTimer = window.setTimeout(() => {
            removeHighlight();
            openDictionaryWord(hoverTrackedWord);
          }, hoverDwellMs);
        } else {
          removeHighlight();
        }
      }

      // If modifier held but no timer running (e.g. moved to same word), ensure highlight
      if (word && modifierCurrentlyHeld && !hoverDwellTimer) {
        showHighlight(event.clientX, event.clientY);
        hoverDwellTimer = window.setTimeout(() => {
          removeHighlight();
          openDictionaryWord(hoverTrackedWord);
        }, hoverDwellMs);
      }
    });

    document.addEventListener('keydown', event => {
      if (!isModifierHeld(event)) return;
      modifierCurrentlyHeld = true;
      setPointerCursor();
      // Modifier pressed while hovering over a word — show highlight and start dwell timer
      if (hoverTrackedWord && !hoverDwellTimer) {
        showHighlight(lastMouseX, lastMouseY);
        hoverDwellTimer = window.setTimeout(() => {
          removeHighlight();
          openDictionaryWord(hoverTrackedWord);
        }, hoverDwellMs);
      }
    });

    document.addEventListener('keyup', event => {
      // Modifier released — cancel pending timer and remove highlight
      if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        resetAll();
      }
    });

    // Reset when window loses focus (e.g. popup opens — keyup never fires)
    window.addEventListener('blur', resetAll);

    // Clean up highlight and cursor on scroll
    document.addEventListener('scroll', resetAll, true);
  }

  async function init() {
    setupAlwaysListeners(); // register unconditional listeners immediately, before async gap

    let settings;
    try {
      settings = await getSettings();
    } catch (_) {
      settings = { triggerMode: 'text-selection', modifierKey: 'auto' };
    }

    const triggerMode = settings.triggerMode || 'text-selection';
    const modifierKey = settings.modifierKey || 'auto';
    const isModifierHeld = resolveModifierChecker(modifierKey);

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
})();
