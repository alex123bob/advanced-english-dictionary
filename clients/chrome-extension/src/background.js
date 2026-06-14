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

  const word = sanitizeWord(info.selectionText);
  if (!word) return;

  const settings = await getSettings();
  await addRecentSearch(word);
  chrome.tabs.create({ url: getWebsiteSearchUrl(settings, word) });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'OPEN_DICTIONARY_SEARCH') return false;

  (async () => {
    const word = sanitizeWord(message.word);
    if (!word) {
      sendResponse({ ok: false, error: 'No searchable word selected.' });
      return;
    }

    const settings = await getSettings();
    await addRecentSearch(word);
    await chrome.tabs.create({ url: getWebsiteSearchUrl(settings, word), active: true });
    sendResponse({ ok: true });
  })().catch(error => sendResponse({ ok: false, error: error.message }));

  return true;
});
