(function () {
  const cardHostId = 'advanced-dictionary-quick-card';
  const hintHostId = 'advanced-dictionary-selection-hint';
  const hintDismissedStorageKey = 'advancedDictionarySelectionHintDismissed';
  const selectionDelayMs = 90;
  const cardWidthPx = 300;
  const cardGapPx = 10;
  const cardEdgePx = 10;
  const hintDelayMs = 1200;
  const hintHideMs = 5600;
  const hoverDwellMs = 300;

  let activeWord = '';
  let cardRequestToken = 0;
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

  function removeCard() {
    removeElement(cardHostId);
    activeWord = '';
    cardRequestToken++;
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
      removeCard();
    }
  }

  function requestQuickDefinition(word) {
    return new Promise(resolve => {
      const runtime = globalThis.chrome && chrome.runtime;
      if (!runtime || typeof runtime.sendMessage !== 'function') {
        resolve({ ok: false, error: 'Extension runtime is unavailable.' });
        return;
      }

      try {
        runtime.sendMessage({ type: 'QUICK_DEFINITION_LOOKUP', word }, response => {
          if (runtime.lastError || !response) {
            resolve({ ok: false, error: runtime.lastError ? runtime.lastError.message : 'No response.' });
            return;
          }
          resolve(response);
        });
      } catch (error) {
        resolve({ ok: false, error: error.message });
      }
    });
  }

  function getAnchorRect(range) {
    const rects = Array.from(range.getClientRects()).filter(rect => rect.width || rect.height);
    const rect = rects[0] || range.getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) return null;

    return { left: rect.left, top: rect.top, bottom: rect.bottom, width: rect.width };
  }

  // Prefer the space above the word; flip below when there is no room
  function placeCard(host, anchorRect) {
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const width = host.offsetWidth;
    const height = host.offsetHeight;
    const centerX = anchorRect.left + anchorRect.width / 2;

    let top = anchorRect.top - height - cardGapPx;
    if (top < cardEdgePx) top = anchorRect.bottom + cardGapPx;

    host.style.left = `${window.scrollX + clamp(centerX - width / 2, cardEdgePx, viewportWidth - width - cardEdgePx)}px`;
    host.style.top = `${window.scrollY + clamp(top, cardEdgePx, viewportHeight - height - cardEdgePx)}px`;
  }

  const quickCardStyles = `
    :host {
      position: absolute;
      z-index: 2147483647;
      pointer-events: auto;
      font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #172033;
    }

    .card {
      box-sizing: border-box;
      width: ${cardWidthPx}px;
      border: 1px solid rgba(255, 255, 255, 0.74);
      border-radius: 18px;
      padding: 12px 14px;
      background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(239, 253, 250, 0.95)),
        radial-gradient(circle at 12% 10%, rgba(45, 212, 191, 0.36), transparent 34%);
      box-shadow: 0 18px 42px rgba(15, 23, 42, 0.26), 0 0 0 1px rgba(20, 184, 166, 0.14);
      animation: cardIn 160ms cubic-bezier(.2,.8,.2,1);
      -webkit-backdrop-filter: blur(18px) saturate(1.35);
      backdrop-filter: blur(18px) saturate(1.35);
    }

    .header {
      display: flex;
      align-items: baseline;
      gap: 8px;
      min-width: 0;
    }

    .word {
      overflow: hidden;
      color: #111827;
      font-size: 16px;
      font-weight: 850;
      line-height: 1.25;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ipa {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      color: #64748b;
      font-size: 12px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .close {
      align-self: flex-start;
      border: 0;
      border-radius: 50%;
      width: 22px;
      height: 22px;
      margin: -2px -4px 0 auto;
      padding: 0;
      background: transparent;
      color: #64748b;
      font-size: 16px;
      line-height: 22px;
      cursor: pointer;
    }

    .close:hover,
    .close:focus-visible {
      outline: none;
      background: rgba(15, 23, 42, 0.08);
      color: #111827;
    }

    .body {
      margin: 8px 0 10px;
    }

    .sense,
    .message {
      margin: 0 0 6px;
      font-size: 13px;
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .message {
      color: #64748b;
    }

    .pos {
      margin-right: 6px;
      color: #0f766e;
      font-size: 11px;
      font-style: italic;
      font-weight: 750;
    }

    .skeleton {
      display: block;
      height: 10px;
      margin: 6px 0;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(148, 163, 184, 0.18), rgba(148, 163, 184, 0.36), rgba(148, 163, 184, 0.18));
      background-size: 200% 100%;
      animation: shimmer 1.1s linear infinite;
    }

    .skeleton.short {
      width: 62%;
    }

    .open {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      border: 0;
      border-radius: 999px;
      padding: 6px 10px;
      background: #172554;
      color: #f8fafc;
      font: inherit;
      font-size: 11px;
      font-weight: 800;
      cursor: pointer;
    }

    .open::after {
      content: "\\2197";
      font-size: 11px;
    }

    .open:hover,
    .open:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.3);
    }

    @keyframes cardIn {
      from { opacity: 0; transform: translateY(6px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes shimmer {
      from { background-position: 200% 0; }
      to { background-position: -200% 0; }
    }

    @media (prefers-reduced-motion: reduce) {
      .card,
      .skeleton {
        animation: none;
      }
    }
  `;

  function renderQuickCardResult(shadow, result) {
    const body = shadow.querySelector('.body');

    if (!result.ok) {
      const message = result.notFound
        ? 'No quick definition found for this word.'
        : 'Couldn’t load a quick definition.';
      body.innerHTML = `<p class="message">${message}</p>`;
      return;
    }

    if (result.headword) shadow.querySelector('.word').textContent = result.headword;
    shadow.querySelector('.ipa').textContent = result.ipa || '';

    body.innerHTML = result.senses.length
      ? result.senses.map(sense => `
          <p class="sense">${sense.partOfSpeech ? `<span class="pos">${escapeHtml(sense.partOfSpeech)}</span>` : ''}${escapeHtml(sense.definition)}</p>
        `).join('')
      : '<p class="message">No short definition available.</p>';
  }

  function renderQuickCard(word, range) {
    const cleanWord = sanitizeWord(word);
    if (!cleanWord) return;
    if (cleanWord === activeWord && document.getElementById(cardHostId)) return;

    const anchorRect = getAnchorRect(range);
    if (!anchorRect) return;

    removeHint();
    removeCard();
    activeWord = cleanWord;
    const requestToken = ++cardRequestToken;

    const host = document.createElement('div');
    host.id = cardHostId;
    host.style.position = 'absolute';
    host.style.zIndex = '2147483647';
    host.style.pointerEvents = 'auto';

    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${quickCardStyles}</style>
      <div class="card" role="dialog" aria-label="Quick definition of ${escapeAttribute(cleanWord)}">
        <div class="header">
          <span class="word">${escapeHtml(cleanWord)}</span>
          <span class="ipa"></span>
          <button class="close" type="button" aria-label="Close quick definition">×</button>
        </div>
        <div class="body" aria-live="polite">
          <span class="skeleton"></span>
          <span class="skeleton short"></span>
        </div>
        <button class="open" type="button">Open full entry</button>
      </div>
    `;

    // Keep the page selection intact while interacting with the card
    shadow.querySelector('.card').addEventListener('mousedown', event => event.preventDefault());
    shadow.querySelector('.close').addEventListener('click', () => {
      removeCard();
      clearPageSelection();
    });
    shadow.querySelector('.open').addEventListener('click', openDictionary);

    document.documentElement.appendChild(host);
    placeCard(host, anchorRect);

    requestQuickDefinition(cleanWord).then(result => {
      if (requestToken !== cardRequestToken || !host.isConnected) return;
      renderQuickCardResult(shadow, result);
      placeCard(host, anchorRect);
    });
  }

  function isEventFromCard(event) {
    const cardHost = document.getElementById(cardHostId);
    if (!cardHost || !event || typeof event.composedPath !== 'function') return false;
    return event.composedPath().includes(cardHost);
  }

  function scheduleSelectionLookup(event) {
    if (isEventFromCard(event) || (event && event.key === 'Escape')) return;

    window.clearTimeout(selectionTimer);
    selectionTimer = window.setTimeout(() => {
      const selectionInfo = getSelectedLookup();
      if (selectionInfo) {
        renderQuickCard(selectionInfo.word, selectionInfo.range);
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
    if (document.getElementById(hintHostId) || document.getElementById(cardHostId)) return;
    const storage = getLocalStorage();

    const showHint = () => {
      window.setTimeout(() => {
        if (!document.getElementById(cardHostId)) {
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
          <span class="title">Quick Definitions</span>
          <span class="body">Select any word to see a quick definition.</span>
        </span>
        <button class="close" type="button" aria-label="Dismiss quick definitions hint">×</button>
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

  function getWordRangeAtPoint(x, y) {
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
    if (!word) return null;

    const wordRange = document.createRange();
    wordRange.setStart(textNode, start);
    wordRange.setEnd(textNode, end);
    return { word, range: wordRange };
  }

  function getWordAtPoint(x, y) {
    const wordInfo = getWordRangeAtPoint(x, y);
    return wordInfo ? wordInfo.word : null;
  }

  function showQuickCardAtPoint(x, y) {
    const wordInfo = getWordRangeAtPoint(x, y);
    if (wordInfo) renderQuickCard(wordInfo.word, wordInfo.range);
  }

  function clearPageSelection() {
    const selection = window.getSelection && window.getSelection();
    if (selection && selection.rangeCount > 0) {
      selection.removeAllRanges();
    }
  }

  function handleOutsidePointerDown(event) {
    if (!document.getElementById(cardHostId) || isEventFromCard(event)) return;

    window.clearTimeout(selectionTimer);
    removeCard();
    clearPageSelection();
  }

  function setupAlwaysListeners() {
    document.addEventListener('pointerdown', handleOutsidePointerDown, true);
    document.addEventListener('mousedown', handleOutsidePointerDown, true);

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        window.clearTimeout(selectionTimer);
        removeHint();
        removeCard();
      }
    });

    document.addEventListener('scroll', () => {
      window.clearTimeout(selectionTimer);
      removeCard();
    }, true);

    window.addEventListener('pagehide', () => {
      removeHint();
      removeCard();
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

      removeHighlight();
      showQuickCardAtPoint(event.clientX, event.clientY);
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
      if (isEventFromCard(event)) return;

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
            showQuickCardAtPoint(lastMouseX, lastMouseY);
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
          showQuickCardAtPoint(lastMouseX, lastMouseY);
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
          showQuickCardAtPoint(lastMouseX, lastMouseY);
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
