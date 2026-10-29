(function () {
  const cardHostId = 'advanced-dictionary-quick-card';
  const hintHostId = 'advanced-dictionary-selection-hint';
  const hintDismissedStorageKey = 'advancedDictionarySelectionHintDismissed';
  const selectionDelayMs = 90;
  const cardWidthPx = 420;
  const cardMaxHeightPx = 560;
  const cardGapPx = 12;
  const cardEdgePx = 12;
  const quickCardSenseLimit = 4;
  const hintDelayMs = 1200;
  const hintHideMs = 5600;
  const hoverDwellMs = 300;

  let activeWord = '';
  let cardThemeId = DEFAULT_CARD_THEME;
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

  function requestFromBackground(message) {
    return new Promise(resolve => {
      const runtime = globalThis.chrome && chrome.runtime;
      if (!runtime || typeof runtime.sendMessage !== 'function') {
        resolve({ ok: false, error: 'Extension runtime is unavailable.' });
        return;
      }

      try {
        runtime.sendMessage(message, response => {
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

  function requestQuickDefinition(word) {
    return requestFromBackground({ type: 'QUICK_DEFINITION_LOOKUP', word });
  }

  function requestEtymology(word, entryIndex) {
    return requestFromBackground({ type: 'QUICK_ETYMOLOGY_LOOKUP', word, entryIndex });
  }

  function getAnchorRect(range) {
    const rects = Array.from(range.getClientRects()).filter(rect => rect.width || rect.height);
    const rect = rects[0] || range.getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) return null;

    return { left: rect.left, top: rect.top, bottom: rect.bottom, width: rect.width };
  }

  // Prefer the space above the word; flip below when there is no room
  function placeCard(host, anchorRect) {
    // window.inner* stays correct on quirks-mode pages, where documentElement.client* is the page size
    const viewportWidth = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
    const viewportHeight = window.innerHeight;
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
      color: var(--qc-ink);
      font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    .card {
      position: relative;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      width: min(${cardWidthPx}px, calc(100vw - ${cardEdgePx * 2}px));
      max-height: min(${cardMaxHeightPx}px, calc(100vh - ${cardEdgePx * 2}px));
      overflow: hidden;
      border: 1px solid rgba(var(--qc-accent-rgb), 0.14);
      border-radius: 22px;
      background:
        radial-gradient(120% 60% at 100% 0%, rgba(var(--qc-glow-a), 0.16), transparent 60%),
        radial-gradient(90% 50% at 0% 0%, rgba(var(--qc-glow-b), 0.10), transparent 55%),
        var(--qc-paper);
      box-shadow:
        0 30px 70px -18px rgba(var(--qc-shadow-rgb), 0.38),
        0 10px 24px -12px rgba(var(--qc-shadow-rgb), 0.22),
        inset 0 1px 0 var(--qc-highlight);
      animation: cardIn 200ms cubic-bezier(.2,.8,.2,1);
    }

    .card::before {
      content: "";
      position: absolute;
      inset: 0 0 auto;
      height: 4px;
      background: var(--qc-stripe);
    }

    .header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 26px 26px 0;
    }

    .title {
      flex: 1;
      min-width: 0;
    }

    .word {
      display: block;
      overflow: hidden;
      color: var(--qc-heading);
      font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif;
      font-size: 30px;
      font-weight: 600;
      letter-spacing: -0.01em;
      line-height: 1.1;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      min-height: 22px;
    }

    .ipa {
      color: var(--qc-ipa);
      font-family: "Iowan Old Style", Palatino, Georgia, serif;
      font-size: 15px;
      font-style: italic;
    }

    .ipa:empty {
      display: none;
    }

    .pos {
      border-radius: 999px;
      padding: 3px 10px;
      background: rgba(var(--qc-accent-rgb), 0.08);
      color: var(--qc-accent);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .close {
      flex: none;
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      margin: -4px -8px 0 0;
      border: 0;
      border-radius: 50%;
      padding: 0;
      background: transparent;
      color: var(--qc-faint);
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
      transition: background 140ms ease, color 140ms ease;
    }

    .close:hover,
    .close:focus-visible {
      outline: none;
      background: rgba(var(--qc-accent-rgb), 0.08);
      color: var(--qc-heading);
    }

    .forms {
      position: relative;
      margin: 18px 26px 0;
    }

    .forms[hidden] {
      display: none;
    }

    .forms::after {
      content: "";
      position: absolute;
      right: 16px;
      top: 50%;
      width: 7px;
      height: 7px;
      border-right: 1.5px solid var(--qc-accent);
      border-bottom: 1.5px solid var(--qc-accent);
      transform: translateY(-70%) rotate(45deg);
      pointer-events: none;
    }

    .form-select {
      box-sizing: border-box;
      width: 100%;
      border: 1px solid rgba(var(--qc-accent-rgb), 0.18);
      border-radius: 12px;
      padding: 10px 40px 10px 14px;
      background: var(--qc-field);
      color: var(--qc-field-text);
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      -webkit-appearance: none;
      appearance: none;
      transition: border-color 140ms ease, box-shadow 140ms ease;
    }

    .form-select:hover {
      border-color: rgba(var(--qc-accent-rgb), 0.38);
    }

    .form-select:focus-visible {
      outline: none;
      border-color: rgba(var(--qc-warm-rgb), 0.6);
      box-shadow: 0 0 0 3px rgba(var(--qc-warm-rgb), 0.22);
    }

    .scroll {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 0 26px;
      scrollbar-width: thin;
      scrollbar-color: rgba(var(--qc-accent-rgb), 0.25) transparent;
    }

    .section {
      padding: 20px 0 4px;
    }

    .section + .section {
      margin-top: 8px;
      border-top: 1px solid rgba(var(--qc-line-rgb), 0.1);
    }

    .label {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 12px;
      color: var(--qc-label);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .label::after {
      content: "";
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, rgba(var(--qc-warm-rgb), 0.3), transparent);
    }

    .senses {
      margin: 0;
      padding: 0;
      list-style: none;
      counter-reset: sense;
    }

    .sense {
      position: relative;
      margin: 0 0 14px;
      padding-left: 30px;
      color: var(--qc-body);
      font-size: 14.5px;
      line-height: 1.6;
      counter-increment: sense;
    }

    .sense::before {
      content: counter(sense);
      position: absolute;
      left: 0;
      top: 1px;
      display: grid;
      place-items: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(var(--qc-accent-rgb), 0.09);
      color: var(--qc-accent);
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
    }

    .more {
      margin: -4px 0 6px 30px;
      border: 0;
      padding: 0;
      background: none;
      color: var(--qc-label);
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    .more:hover,
    .more:focus-visible {
      outline: none;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .origin {
      margin: 0 0 14px;
      color: var(--qc-origin);
      font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
      font-size: 15px;
      line-height: 1.65;
    }

    .lang {
      color: var(--qc-accent-deep);
      font-style: italic;
    }

    .roots {
      margin: 0 0 14px;
      border-left: 2px solid rgba(var(--qc-warm-rgb), 0.45);
      padding: 2px 0 2px 14px;
      color: var(--qc-roots);
      font-size: 13px;
      line-height: 1.6;
    }

    .message {
      margin: 4px 0 14px;
      color: var(--qc-muted);
      font-size: 14px;
      line-height: 1.55;
    }

    .skeleton {
      display: block;
      height: 11px;
      margin: 10px 0;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(var(--qc-warm-rgb), 0.08), rgba(var(--qc-warm-rgb), 0.2), rgba(var(--qc-warm-rgb), 0.08));
      background-size: 200% 100%;
      animation: shimmer 1.2s linear infinite;
    }

    .skeleton.mid {
      width: 82%;
    }

    .skeleton.short {
      width: 56%;
    }

    .footer {
      flex: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 26px 20px;
      border-top: 1px solid rgba(var(--qc-line-rgb), 0.08);
      background: linear-gradient(180deg, transparent, rgba(var(--qc-glow-a), 0.12));
    }

    .brand {
      color: var(--qc-faint);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
    }

    .open {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 0;
      border-radius: 999px;
      padding: 10px 18px;
      background: var(--qc-button);
      box-shadow: 0 10px 22px -10px rgba(var(--qc-accent-rgb), 0.7);
      color: var(--qc-on-accent);
      font: inherit;
      font-size: 13px;
      font-weight: 650;
      cursor: pointer;
      transition: transform 140ms ease, box-shadow 140ms ease;
    }

    .open::after {
      content: "\\2192";
      transition: transform 140ms ease;
    }

    .open:hover,
    .open:focus-visible {
      outline: none;
      transform: translateY(-1px);
      box-shadow: 0 14px 26px -10px rgba(var(--qc-accent-rgb), 0.8), 0 0 0 3px rgba(var(--qc-warm-rgb), 0.3);
    }

    .open:hover::after {
      transform: translateX(3px);
    }

    @keyframes cardIn {
      from { opacity: 0; transform: translateY(8px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes shimmer {
      from { background-position: 200% 0; }
      to { background-position: -200% 0; }
    }

    @media (prefers-reduced-motion: reduce) {
      .card,
      .skeleton,
      .open,
      .open::after {
        animation: none;
        transition: none;
      }
    }
  `;

  const etymologyLanguages = [
    'Proto-Indo-European', 'Proto-Germanic', 'West Germanic', 'Germanic', 'Indo-European',
    'Old English', 'Middle English', 'Early Modern English',
    'Classical Latin', 'Medieval Latin', 'Late Latin', 'Latin',
    'Ancient Greek', 'Greek',
    'Old French', 'Middle French', 'Anglo-Norman', 'Norman French', 'French',
    'Old Norse', 'Norse', 'Middle Dutch', 'Dutch',
    'Old High German', 'Middle High German', 'German',
    'Italian', 'Spanish', 'Portuguese', 'Sanskrit', 'Arabic', 'Persian', 'Hebrew',
    'Old Irish', 'Celtic', 'Gaelic', 'Welsh'
  ];
  const etymologyLanguagePattern = new RegExp(`\\b(${etymologyLanguages.join('|')})\\b`, 'g');

  function highlightLanguages(text) {
    return escapeHtml(text).replace(etymologyLanguagePattern, '<span class="lang">$1</span>');
  }

  function getFormLabel(entry, index) {
    const count = entry.senses.length;
    const pos = entry.partsOfSpeech.join(', ') || 'word';
    return `Form ${index + 1} \u00b7 ${pos} \u00b7 ${count} ${count === 1 ? 'sense' : 'senses'}`;
  }

  function renderSkeleton(lines) {
    return lines.map(width => `<span class="skeleton ${width}"></span>`).join('');
  }

  function renderSenses(container, senses) {
    const visible = senses.slice(0, quickCardSenseLimit);
    const hiddenCount = senses.length - visible.length;

    container.innerHTML = `
      <ol class="senses">
        ${visible.map(definition => `<li class="sense">${escapeHtml(definition)}</li>`).join('')}
      </ol>
      ${hiddenCount > 0 ? `<button class="more" type="button">Show ${hiddenCount} more ${hiddenCount === 1 ? 'sense' : 'senses'}</button>` : ''}
    `;

    const more = container.querySelector('.more');
    if (more) {
      more.addEventListener('click', () => {
        more.remove();
        container.querySelector('.senses').insertAdjacentHTML('beforeend',
          senses.slice(visible.length).map(definition => `<li class="sense">${escapeHtml(definition)}</li>`).join(''));
      });
    }
  }

  function renderEtymology(container, result) {
    if (!result.ok || (!result.etymology && !result.rootAnalysis)) {
      container.innerHTML = '<p class="message">No origin notes for this word yet.</p>';
      return;
    }

    container.innerHTML = `
      ${result.etymology ? `<p class="origin">${highlightLanguages(result.etymology)}</p>` : ''}
      ${result.rootAnalysis ? `<p class="roots">${highlightLanguages(result.rootAnalysis)}</p>` : ''}
    `;
  }

  // Etymology is fetched per form and cached so switching back is instant
  function showEntry(shadow, state, index) {
    const entry = state.entries[index];
    state.selected = index;

    shadow.querySelector('.ipa').textContent = entry.ipa;
    shadow.querySelector('.pos').textContent = entry.partsOfSpeech.join(' · ') || 'word';
    shadow.querySelector('.pos').hidden = false;
    shadow.querySelector('.form-select').value = String(index);

    renderSenses(shadow.querySelector('.definitions'), entry.senses);
    shadow.querySelector('.scroll').scrollTop = 0;

    const originSection = shadow.querySelector('.origin-section');
    originSection.hidden = false;
    const originBody = shadow.querySelector('.origin-body');
    const entryIndex = entry.entryIndex;

    if (state.etymology.has(entryIndex)) {
      renderEtymology(originBody, state.etymology.get(entryIndex));
      return;
    }

    originBody.innerHTML = renderSkeleton(['', 'mid', 'short']);
    requestEtymology(state.word, entryIndex).then(result => {
      state.etymology.set(entryIndex, result);
      if (state.token !== cardRequestToken || state.selected !== index) return;
      renderEtymology(originBody, result);
    });
  }

  function renderQuickCardResult(shadow, result, state) {
    const definitions = shadow.querySelector('.definitions');

    if (!result.ok) {
      definitions.innerHTML = result.notFound
        ? '<p class="message">No entry found for this word. The full dictionary may still have suggestions.</p>'
        : '<p class="message">Couldn’t load a quick definition. Check your connection and try again.</p>';
      return;
    }

    state.word = result.headword || state.word;
    state.entries = result.entries;
    shadow.querySelector('.word').textContent = state.word;

    if (result.entries.length > 1) {
      const select = shadow.querySelector('.form-select');
      select.innerHTML = result.entries
        .map((entry, index) => `<option value="${index}">${escapeHtml(getFormLabel(entry, index))}</option>`)
        .join('');
      select.addEventListener('change', () => showEntry(shadow, state, Number(select.value)));
      shadow.querySelector('.forms').hidden = false;
    }

    showEntry(shadow, state, 0);
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
    const state = { token: ++cardRequestToken, word: cleanWord, entries: [], selected: 0, etymology: new Map() };

    const host = document.createElement('div');
    host.id = cardHostId;
    host.style.position = 'absolute';
    host.style.zIndex = '2147483647';
    host.style.pointerEvents = 'auto';

    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>:host { ${getCardThemeCss(cardThemeId)} }${quickCardStyles}</style>
      <div class="card" role="dialog" aria-label="Quick look at ${escapeAttribute(cleanWord)}">
        <div class="header">
          <div class="title">
            <span class="word">${escapeHtml(cleanWord)}</span>
            <div class="meta">
              <span class="ipa"></span>
              <span class="pos" hidden></span>
            </div>
          </div>
          <button class="close" type="button" aria-label="Close">×</button>
        </div>
        <div class="forms" hidden>
          <select class="form-select" aria-label="Word forms"></select>
        </div>
        <div class="scroll">
          <section class="section">
            <h3 class="label">Meaning</h3>
            <div class="definitions" aria-live="polite">${renderSkeleton(['', 'mid', '', 'short'])}</div>
          </section>
          <section class="section origin-section" hidden>
            <h3 class="label">Origin</h3>
            <div class="origin-body" aria-live="polite"></div>
          </section>
        </div>
        <div class="footer">
          <span class="brand">Advanced English Dictionary</span>
          <button class="open" type="button">Full entry</button>
        </div>
      </div>
    `;

    // Keep the page selection intact while interacting with the card
    shadow.querySelector('.card').addEventListener('mousedown', event => {
      if (!event.target.closest('select')) event.preventDefault();
    });
    shadow.querySelector('.close').addEventListener('click', () => {
      removeCard();
      clearPageSelection();
    });
    shadow.querySelector('.open').addEventListener('click', openDictionary);

    document.documentElement.appendChild(host);
    placeCard(host, anchorRect);

    // Sections load at different times; keep the card on screen as it grows
    if (typeof ResizeObserver === 'function') {
      const resizeObserver = new ResizeObserver(() => {
        if (!host.isConnected) {
          resizeObserver.disconnect();
          return;
        }
        placeCard(host, anchorRect);
      });
      resizeObserver.observe(shadow.querySelector('.card'));
    }

    requestQuickDefinition(cleanWord).then(result => {
      if (state.token !== cardRequestToken || !host.isConnected) return;
      renderQuickCardResult(shadow, result, state);
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
          ${getCardThemeCss(cardThemeId)}
          color: var(--qc-ink);
          font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .hint {
          color: var(--qc-ink);
          font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          display: grid;
          grid-template-columns: 30px minmax(0, 1fr) 22px;
          align-items: center;
          gap: 10px;
          max-width: min(330px, calc(100vw - 36px));
          border: 1px solid rgba(var(--qc-accent-rgb), 0.14);
          border-radius: 16px;
          padding: 10px;
          background: var(--qc-paper);
          box-shadow: 0 22px 50px -16px rgba(var(--qc-shadow-rgb), 0.38), inset 0 1px 0 var(--qc-highlight);
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
          background: var(--qc-button);
          color: var(--qc-on-accent);
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
          color: var(--qc-label);
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.08em;
          line-height: 1;
          text-transform: uppercase;
        }

        .body {
          margin-top: 3px;
          color: var(--qc-heading);
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
          color: var(--qc-muted);
          font-size: 12px;
          font-weight: 650;
          cursor: pointer;
          user-select: none;
        }

        .never input {
          width: 14px;
          height: 14px;
          margin: 0;
          accent-color: var(--qc-accent);
          cursor: pointer;
        }

        .close {
          display: grid;
          place-items: center;
          width: 22px;
          height: 22px;
          border: 0;
          border-radius: 50%;
          background: rgba(var(--qc-accent-rgb), 0.08);
          color: var(--qc-muted);
          cursor: pointer;
          font: inherit;
          line-height: 1;
        }

        .close:hover,
        .close:focus-visible {
          outline: none;
          background: rgba(var(--qc-accent-rgb), 0.14);
          color: var(--qc-heading);
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

    document.addEventListener('scroll', event => {
      if (isEventFromCard(event)) return;
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
          :host { display: block; ${getCardThemeCss(cardThemeId)} }
          .hl {
            position: absolute;
            inset: 0;
            border-bottom: 2px dashed var(--qc-accent);
            border-radius: 1px;
            background: rgba(var(--qc-accent-rgb), 0.08);
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
          :host { display: block; ${getCardThemeCss(cardThemeId)} }
          .hl {
            position: absolute;
            inset: 0;
            border-bottom: 2px dashed var(--qc-accent);
            border-radius: 1px;
            background: rgba(var(--qc-accent-rgb), 0.08);
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

    cardThemeId = settings.cardTheme || DEFAULT_CARD_THEME;

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
