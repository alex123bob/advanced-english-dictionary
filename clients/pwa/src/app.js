const DEFAULT_SETTINGS = {
  apiBaseUrl: 'http://localhost:8000',
  websiteUrl: 'https://www.lijialab.com'
};

const STORAGE_KEYS = {
  settings: 'advancedDictionaryPwaSettings',
  recent: 'advancedDictionaryPwaRecent'
};

const elements = {
  form: document.getElementById('searchForm'),
  input: document.getElementById('searchInput'),
  status: document.getElementById('status'),
  result: document.getElementById('result'),
  headword: document.getElementById('headword'),
  pronunciation: document.getElementById('pronunciation'),
  partOfSpeech: document.getElementById('partOfSpeech'),
  definitions: document.getElementById('definitions'),
  openWebsite: document.getElementById('openWebsite'),
  recentList: document.getElementById('recentList'),
  clearRecent: document.getElementById('clearRecent'),
  apiBaseUrl: document.getElementById('apiBaseUrl'),
  websiteUrl: document.getElementById('websiteUrl'),
  saveSettings: document.getElementById('saveSettings')
};

function sanitizeWord(value) {
  return (value || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, '')
    .trim()
    .slice(0, 80);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeBaseUrl(value, fallback) {
  return (value || fallback).trim().replace(/\/+$/, '');
}

function getSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || '{}') };
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({
    apiBaseUrl: normalizeBaseUrl(settings.apiBaseUrl, DEFAULT_SETTINGS.apiBaseUrl),
    websiteUrl: normalizeBaseUrl(settings.websiteUrl, DEFAULT_SETTINGS.websiteUrl)
  }));
}

function getRecent() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.recent) || '[]');
  } catch (error) {
    return [];
  }
}

function setRecent(word) {
  const cleanWord = sanitizeWord(word);
  if (!cleanWord) return;
  const next = [cleanWord, ...getRecent().filter(item => item.toLowerCase() !== cleanWord.toLowerCase())].slice(0, 12);
  localStorage.setItem(STORAGE_KEYS.recent, JSON.stringify(next));
  renderRecent();
}

function setStatus(message, type = '') {
  elements.status.textContent = message;
  elements.status.className = `status ${type}`.trim();
  elements.status.hidden = !message;
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

async function search(word) {
  const cleanWord = sanitizeWord(word);
  if (!cleanWord) return;

  const settings = getSettings();
  const apiUrl = `${normalizeBaseUrl(settings.apiBaseUrl, DEFAULT_SETTINGS.apiBaseUrl)}/api/dictionary`;
  setStatus('Looking up word...');
  elements.result.hidden = true;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: cleanWord, section: 'basic' })
    });

    if (!response.ok) throw new Error(`Dictionary request failed (${response.status}).`);
    const data = await response.json();
    if (!data.success && data.error) throw new Error(data.error);

    const entry = data.entries && data.entries.length ? data.entries[0] : null;
    const senses = getSenses(entry).slice(0, 5);
    elements.headword.textContent = data.headword || cleanWord;
    elements.pronunciation.textContent = entry && entry.pronunciation ? entry.pronunciation : '';
    elements.partOfSpeech.textContent = senses[0] && senses[0].part_of_speech ? senses[0].part_of_speech : 'word';
    elements.definitions.innerHTML = senses.length
      ? senses.map((sense, index) => `
          <article class="definition-item">
            <strong>${index + 1}. ${escapeHtml(sense.definition || 'Definition unavailable in summary.')}</strong>
            ${sense.example ? `<div class="definition-example">${escapeHtml(sense.example)}</div>` : ''}
          </article>
        `).join('')
      : '<article class="definition-item">No definitions returned for this word.</article>';
    elements.openWebsite.href = `${normalizeBaseUrl(settings.websiteUrl, DEFAULT_SETTINGS.websiteUrl)}/?q=${encodeURIComponent(cleanWord)}`;
    elements.result.hidden = false;
    setRecent(cleanWord);
    setStatus('');
  } catch (error) {
    setStatus(`${error.message} Check the API base URL in settings.`, 'error');
  }
}

function renderRecent() {
  const recent = getRecent();
  elements.recentList.innerHTML = recent.length
    ? recent.map(word => `<button class="chip" type="button" data-word="${escapeHtml(word)}">${escapeHtml(word)}</button>`).join('')
    : '<p class="muted">No recent searches yet.</p>';
}

function hydrateSettings() {
  const settings = getSettings();
  elements.apiBaseUrl.value = settings.apiBaseUrl;
  elements.websiteUrl.value = settings.websiteUrl;
}

elements.form.addEventListener('submit', event => {
  event.preventDefault();
  search(elements.input.value);
});

elements.recentList.addEventListener('click', event => {
  const chip = event.target.closest('[data-word]');
  if (chip) {
    elements.input.value = chip.dataset.word;
    search(chip.dataset.word);
  }
});

elements.clearRecent.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEYS.recent);
  renderRecent();
});

elements.saveSettings.addEventListener('click', () => {
  saveSettings({ apiBaseUrl: elements.apiBaseUrl.value, websiteUrl: elements.websiteUrl.value });
  setStatus('Settings saved.');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(error => {
      console.warn('Service worker registration failed:', error);
    });
  });
}

hydrateSettings();
renderRecent();
