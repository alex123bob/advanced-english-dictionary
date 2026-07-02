const DEFAULT_SETTINGS = {
  apiBaseUrl: 'https://www.lijialab.com',
  websiteUrl: 'https://www.lijialab.com'
};

const STORAGE_KEYS = {
  settings: 'advancedDictionarySettings',
  recentSearches: 'advancedDictionaryRecentSearches',
  pendingWord: 'advancedDictionaryPendingWord'
};

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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeBaseUrl(value) {
  const trimmed = (value || '').trim().replace(/\/+$/, '');
  return trimmed || DEFAULT_SETTINGS.apiBaseUrl;
}

function getDictionaryApiUrl(settings) {
  return `${normalizeBaseUrl(settings.apiBaseUrl)}/api/dictionary`;
}

function getSuggestApiUrl(settings) {
  return `${normalizeBaseUrl(settings.apiBaseUrl)}/api/dictionary/suggest`;
}

function getWebsiteSearchUrl(settings, word) {
  const baseUrl = normalizeBaseUrl(settings.websiteUrl || DEFAULT_SETTINGS.websiteUrl);
  return `${baseUrl}/?q=${encodeURIComponent(word)}`;
}

function getSettings() {
  return new Promise(resolve => {
    chrome.storage.sync.get(STORAGE_KEYS.settings, result => {
      resolve({ ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.settings] || {}) });
    });
  });
}

function saveSettings(settings) {
  return chrome.storage.sync.set({
    [STORAGE_KEYS.settings]: {
      apiBaseUrl: normalizeBaseUrl(settings.apiBaseUrl),
      websiteUrl: normalizeBaseUrl(settings.websiteUrl)
    }
  });
}

function getRecentSearches() {
  return new Promise(resolve => {
    chrome.storage.local.get(STORAGE_KEYS.recentSearches, result => {
      resolve(result[STORAGE_KEYS.recentSearches] || []);
    });
  });
}

async function addRecentSearch(word) {
  const cleanWord = sanitizeWord(word);
  if (!cleanWord) return [];

  const recentSearches = await getRecentSearches();
  const nextSearches = [
    { word: cleanWord, timestamp: Date.now() },
    ...recentSearches.filter(item => item.word.toLowerCase() !== cleanWord.toLowerCase())
  ].slice(0, 10);

  await chrome.storage.local.set({ [STORAGE_KEYS.recentSearches]: nextSearches });
  return nextSearches;
}

async function fetchDictionaryEntry(word, settings) {
  const cleanWord = sanitizeWord(word);
  if (!cleanWord) {
    throw new Error('Enter a word to search.');
  }

  const response = await fetch(getDictionaryApiUrl(settings), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ word: cleanWord, section: 'basic' })
  });

  if (!response.ok) {
    const error = new Error(`Dictionary request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  if (!data.success && data.error) {
    throw new Error(data.error);
  }

  return data;
}
