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
function hasContent(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasContent);
  if (typeof value === 'object') return Object.values(value).some(hasContent);
  return true;
}

// The API wraps translations in zh_data and/or a section key; unwrap to the payload
function unwrapZhData(sectionZh, preferredKey) {
  if (!hasContent(sectionZh)) return null;
  if (typeof sectionZh === 'string') return sectionZh;
  if (preferredKey && hasContent(sectionZh[preferredKey])) return sectionZh[preferredKey];
  if (hasContent(sectionZh.zh_data)) return unwrapZhData(sectionZh.zh_data, preferredKey);
  return sectionZh;
}

function findZhEntry(data, entryIndex, position) {
  const zhEntries = data.basic_zh && Array.isArray(data.basic_zh.entries) ? data.basic_zh.entries : [];
  return zhEntries.find(entry => Number(entry.entry_index) === Number(entryIndex)) || zhEntries[position] || null;
}

function getLangParams(lang) {
  return lang && lang !== 'en' ? { lang } : {};
}

async function lookupQuickDefinition(word, lang) {
  const cleanWord = getSearchableSelection(word);
  if (!cleanWord) {
    return { ok: false, notFound: true };
  }

  try {
    const data = await fetchDictionaryEntry(cleanWord, await getSettings(), 'basic', getLangParams(lang));
    const entries = (data.entries || []).map((entry, index) => {
      const meanings = entry.meanings_summary || [];
      const zhEntry = findZhEntry(data, entry.entry_index != null ? entry.entry_index : index, index);
      const senses = [];
      meanings.forEach((meaning, meaningIndex) => {
        const zhMeaning = zhEntry && Array.isArray(zhEntry.meanings_summary) ? zhEntry.meanings_summary[meaningIndex] : null;
        (meaning.senses || []).forEach((sense, senseIndex) => {
          if (!sense || !sense.definition) return;
          const zhSense = zhMeaning && Array.isArray(zhMeaning.definitions) ? zhMeaning.definitions[senseIndex] : null;
          senses.push(zhSense && hasContent(zhSense.definition) ? zhSense.definition : sense.definition);
        });
      });

      return {
        entryIndex: entry.entry_index != null ? entry.entry_index : index,
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

async function lookupQuickEtymology(word, entryIndex, lang) {
  const cleanWord = getSearchableSelection(word);
  if (!cleanWord) {
    return { ok: false, notFound: true };
  }

  try {
    const data = await fetchDictionaryEntry(cleanWord, await getSettings(), 'etymology', { entry_index: entryIndex || 0, ...getLangParams(lang) });
    const zhEtymology = unwrapZhData(data.etymology_zh, 'etymology');
    const etymology = hasContent(zhEtymology) ? zhEtymology : data.etymology;
    if (!etymology) {
      return { ok: false, notFound: true };
    }

    return typeof etymology === 'string'
      ? { ok: true, etymology, rootAnalysis: '' }
      : { ok: true, etymology: etymology.etymology || '', rootAnalysis: etymology.root_analysis || '' };
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
    lookupQuickDefinition(message.word, message.lang).then(sendResponse);
    return true;
  }

  if (message.type === 'QUICK_ETYMOLOGY_LOOKUP') {
    lookupQuickEtymology(message.word, message.entryIndex, message.lang).then(sendResponse);
    return true;
  }

  return false;
});
