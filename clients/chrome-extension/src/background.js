importScripts('shared.js');

const CONTEXT_MENU_ID = 'advanced-dictionary-search-selection';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Search "%s" in Dictionary',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;

  const word = getSearchableSelection(info.selectionText);
  if (!word) return;

  await openExtensionSearch(word);
});

async function openExtensionSearch(word) {
  const cleanWord = getSearchableSelection(word);
  if (!cleanWord) {
    return { ok: false, error: 'No searchable word selected.' };
  }

  await addRecentSearch(cleanWord);
  await chrome.storage.local.set({ [STORAGE_KEYS.pendingWord]: cleanWord });

  if (chrome.action && chrome.action.openPopup) {
    try {
      await chrome.action.openPopup();
      return { ok: true, opened: 'popup' };
    } catch (error) {
      console.warn('Could not open extension popup; opening extension page instead.', error);
    }
  }

  await chrome.storage.local.remove(STORAGE_KEYS.pendingWord);
  await chrome.tabs.create({
    url: chrome.runtime.getURL(`popup.html?q=${encodeURIComponent(cleanWord)}`),
    active: true
  });
  return { ok: true, opened: 'tab' };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'OPEN_DICTIONARY_SEARCH') return false;

  (async () => {
    sendResponse(await openExtensionSearch(message.word));
  })().catch(error => sendResponse({ ok: false, error: error.message }));

  return true;
});
