const EXTENSION_SETTINGS_KEY = 'advancedDictionarySettings';
const EXTENSION_PENDING_WORD_KEY = 'advancedDictionaryPendingWord';
const DEFAULT_API_BASE_URL = 'http://localhost:8000';
const DEFAULT_WEBSITE_URL = 'https://www.lijialab.com';

const extensionConfig = {
  api: {
    host: DEFAULT_API_BASE_URL,
    endpoints: {
      dictionary: '/api/dictionary',
      suggest: '/api/dictionary/suggest'
    }
  },
  app: {
    name: 'Advanced English Dictionary',
    version: '1.0.0',
    theme: '',
    websiteUrl: DEFAULT_WEBSITE_URL
  }
};

extensionConfig.api.getUrl = function (endpoint) {
  const path = this.endpoints[endpoint];
  if (!path) {
    throw new Error(`Unknown endpoint: ${endpoint}`);
  }
  return `${this.host}${path}`;
};

function normalizeBaseUrl(value, fallback) {
  const trimmed = (value || '').trim().replace(/\/+$/, '');
  return trimmed || fallback;
}

function setExtensionConfig() {
  window.config = extensionConfig;
  if (!globalThis.chrome || !chrome.storage || !chrome.storage.sync) {
    window.advancedDictionaryConfigReady = Promise.resolve(window.config);
    return;
  }

  window.advancedDictionaryConfigReady = new Promise(resolve => {
    chrome.storage.sync.get(EXTENSION_SETTINGS_KEY, result => {
      const settings = result[EXTENSION_SETTINGS_KEY] || {};
      window.config.api.host = normalizeBaseUrl(settings.apiBaseUrl, DEFAULT_API_BASE_URL);
      window.config.app.websiteUrl = normalizeBaseUrl(settings.websiteUrl, DEFAULT_WEBSITE_URL);
      resolve(window.config);
    });
  });
}

setExtensionConfig();

window.advancedDictionaryGetPendingWord = function () {
  return new Promise(resolve => {
    if (!globalThis.chrome || !chrome.storage || !chrome.storage.local) {
      resolve('');
      return;
    }

    chrome.storage.local.get(EXTENSION_PENDING_WORD_KEY, result => {
      const pendingWord = result[EXTENSION_PENDING_WORD_KEY] || '';
      if (pendingWord) {
        chrome.storage.local.remove(EXTENSION_PENDING_WORD_KEY);
      }
      resolve(pendingWord);
    });
  });
};
