let activeWord = '';

const elements = {
  form: document.getElementById('searchForm'),
  input: document.getElementById('searchInput'),
  status: document.getElementById('statusMessage'),
  resultPanel: document.getElementById('resultPanel'),
  headword: document.getElementById('headword'),
  pronunciation: document.getElementById('pronunciation'),
  partOfSpeech: document.getElementById('partOfSpeech'),
  definitions: document.getElementById('definitions'),
  details: document.getElementById('details'),
  recentList: document.getElementById('recentList'),
  openWebsiteButton: document.getElementById('openWebsiteButton'),
  openOptionsButton: document.getElementById('openOptionsButton'),
  clearRecentButton: document.getElementById('clearRecentButton')
};

function setStatus(message, type = '') {
  elements.status.textContent = message;
  elements.status.className = `status-message ${type}`.trim();
  elements.status.hidden = !message;
}

function getEntry(data) {
  return data.entries && data.entries.length ? data.entries[0] : null;
}

function getSenses(entry) {
  const senses = [];
  if (!entry || !entry.meanings_summary) return senses;

  entry.meanings_summary.forEach(meaning => {
    (meaning.senses || []).forEach(sense => {
      senses.push({ ...sense, part_of_speech: meaning.part_of_speech });
    });
  });

  return senses;
}

function renderDetails(entry, data) {
  const details = [];
  if (entry && entry.total_senses) details.push(['Senses', entry.total_senses]);
  if (data.total_entries) details.push(['Entries', data.total_entries]);
  if (entry && entry.source_dictionary) details.push(['Source', entry.source_dictionary]);

  elements.details.innerHTML = details.map(([label, value]) => `
    <div class="detail-card">
      <div class="detail-label">${escapeHtml(label)}</div>
      <div class="detail-value">${escapeHtml(value)}</div>
    </div>
  `).join('');
}

function renderResult(data) {
  const entry = getEntry(data);
  const senses = getSenses(entry).slice(0, 4);
  const primarySense = senses[0];

  activeWord = sanitizeWord(data.headword || elements.input.value);
  elements.headword.textContent = data.headword || activeWord;
  elements.pronunciation.textContent = entry && entry.pronunciation ? entry.pronunciation : '';
  elements.partOfSpeech.textContent = primarySense && primarySense.part_of_speech ? primarySense.part_of_speech : 'word';
  elements.partOfSpeech.hidden = !elements.partOfSpeech.textContent;

  if (senses.length) {
    elements.definitions.innerHTML = senses.map((sense, index) => `
      <article class="definition-card">
        <div class="definition-text">${index + 1}. ${escapeHtml(sense.definition || 'Definition unavailable in summary.')}</div>
        ${sense.example ? `<div class="definition-example">${escapeHtml(sense.example)}</div>` : ''}
      </article>
    `).join('');
  } else {
    elements.definitions.innerHTML = '<div class="definition-card">No definitions were returned for this entry.</div>';
  }

  renderDetails(entry, data);
  elements.resultPanel.hidden = false;
}

function isLookupNotFoundError(error) {
  const message = error && error.message ? error.message : '';
  return error && (
    error.status === 404 ||
    /not found|no result|no entry|no definition|status 404|\(404\)/i.test(message)
  );
}

async function search(word) {
  const cleanWord = sanitizeWord(word);
  if (!cleanWord) return;

  elements.input.value = cleanWord;
  elements.resultPanel.hidden = true;
  setStatus('Looking up word...');

  try {
    const settings = await getSettings();
    const data = await fetchDictionaryEntry(cleanWord, settings);
    renderResult(data);
    await addRecentSearch(cleanWord);
    await renderRecentSearches();
    setStatus('');
  } catch (error) {
    if (isLookupNotFoundError(error)) {
      console.log('Dictionary lookup returned no result:', cleanWord);
      setStatus('No dictionary entry found for this selection.', '');
      return;
    }

    setStatus(`${error.message} Check the extension options if the API URL is not configured correctly.`, 'error');
  }
}

async function renderRecentSearches() {
  const searches = await getRecentSearches();
  if (!searches.length) {
    elements.recentList.innerHTML = '<div class="empty-recent">No searches yet. Select a word on any page or search here.</div>';
    return;
  }

  elements.recentList.innerHTML = searches.map(item => `
    <button class="recent-chip" type="button" data-word="${escapeHtml(item.word)}">${escapeHtml(item.word)}</button>
  `).join('');
}

elements.form.addEventListener('submit', event => {
  event.preventDefault();
  search(elements.input.value);
});

elements.recentList.addEventListener('click', event => {
  const chip = event.target.closest('.recent-chip');
  if (chip) search(chip.dataset.word);
});

elements.openWebsiteButton.addEventListener('click', async () => {
  const word = sanitizeWord(activeWord || elements.input.value);
  if (!word) return;
  const settings = await getSettings();
  chrome.tabs.create({ url: getWebsiteSearchUrl(settings, word) });
});

elements.openOptionsButton.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

elements.clearRecentButton.addEventListener('click', async () => {
  await chrome.storage.local.set({ [STORAGE_KEYS.recentSearches]: [] });
  renderRecentSearches();
});

(async function init() {
  await renderRecentSearches();

  chrome.storage.local.get(STORAGE_KEYS.pendingWord, result => {
    const pendingWord = sanitizeWord(result[STORAGE_KEYS.pendingWord]);
    if (pendingWord) {
      chrome.storage.local.remove(STORAGE_KEYS.pendingWord);
      search(pendingWord);
    }
  });
})();
