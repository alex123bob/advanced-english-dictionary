(function () {
  const buttonId = 'advanced-dictionary-selection-button';
  let currentWord = '';
  let hideTimer = null;

  function removeButton() {
    const existingButton = document.getElementById(buttonId);
    if (existingButton) existingButton.remove();
  }

  function getSelectedWord() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const selectedText = selection.toString().trim();
    const word = selectedText
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, '')
      .trim();

    if (!word || word.length > 80 || /\s{2,}/.test(word)) return null;

    return { word, range: selection.getRangeAt(0) };
  }

  function showButton(selectionInfo) {
    removeButton();
    window.clearTimeout(hideTimer);

    currentWord = selectionInfo.word;
    const rect = selectionInfo.range.getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) return;

    const button = document.createElement('button');
    button.id = buttonId;
    button.type = 'button';
    button.textContent = `Define "${currentWord}"`;
    button.style.top = `${Math.max(8, window.scrollY + rect.top - 42)}px`;
    button.style.left = `${Math.min(window.scrollX + rect.left, window.scrollX + document.documentElement.clientWidth - 180)}px`;
    button.addEventListener('mousedown', event => event.preventDefault());
    button.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_DICTIONARY_SEARCH', word: currentWord });
      removeButton();
    });

    document.documentElement.appendChild(button);
    hideTimer = window.setTimeout(removeButton, 6000);
  }

  document.addEventListener('mouseup', () => {
    window.setTimeout(() => {
      const selectionInfo = getSelectedWord();
      if (selectionInfo) {
        showButton(selectionInfo);
      } else {
        removeButton();
      }
    }, 10);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') removeButton();
  });

  document.addEventListener('scroll', removeButton, true);
})();
