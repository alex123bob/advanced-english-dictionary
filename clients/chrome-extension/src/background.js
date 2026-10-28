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

function isLookupNotFoundError(error) {
  const message = error && error.message ? error.message : '';
  return Boolean(error) && (
    error.status === 404 ||
    /not found|no result|no entry|no definition/i.test(message)
  );
}

// Summary for the in-page card: every entry (form) with its basic definitions
async function lookupQuickDefinition(word) {
  const cleanWord = getSearchableSelection(word);
  if (!cleanWord) {
    return { ok: false, notFound: true };
  }

  try {
    const data = await fetchDictionaryEntry(cleanWord, await getSettings());
    const entries = (data.entries || []).map(entry => {
      const meanings = entry.meanings_summary || [];
      const senses = [];
      meanings.forEach(meaning => {
        (meaning.senses || []).forEach(sense => {
          if (sense && sense.definition) senses.push(sense.definition);
        });
      });

      return {
        ipa: entry.ipa || '',
        partsOfSpeech: meanings.map(meaning => meaning.part_of_speech).filter(Boolean),
        senses
      };
    }).filter(entry => entry.senses.length);

    if (!data.headword || !entries.length) {
      return { ok: false, notFound: true };
    }

    return { ok: true, headword: data.headword, entries };
  } catch (error) {
    return { ok: false, notFound: isLookupNotFoundError(error), error: error.message };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_DICTIONARY_SEARCH') {
    (async () => {
      sendResponse(await openExtensionSearch(message.word));
    })().catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === 'QUICK_DEFINITION_LOOKUP') {
    lookupQuickDefinition(message.word).then(sendResponse);
    return true;
  }

  return false;
});
