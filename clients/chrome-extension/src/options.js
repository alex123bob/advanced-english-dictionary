const optionsForm = document.getElementById('optionsForm');
const apiBaseUrlInput = document.getElementById('apiBaseUrl');
const websiteUrlInput = document.getElementById('websiteUrl');
const modifierKeySelect = document.getElementById('modifierKey');
const savedMessage = document.getElementById('savedMessage');
const triggerRadios = document.querySelectorAll('input[name="triggerMode"]');

function getSelectedTriggerMode() {
  for (const radio of triggerRadios) {
    if (radio.checked) return radio.value;
  }
  return 'text-selection';
}

function setTriggerMode(value) {
  for (const radio of triggerRadios) {
    radio.checked = radio.value === value;
  }
  updateModifierKeyState(value);
}

function updateModifierKeyState(triggerMode) {
  const needsModifier = triggerMode !== 'text-selection';
  modifierKeySelect.disabled = !needsModifier;
}

// Disable modifier dropdown when text-selection is chosen
triggerRadios.forEach(radio => {
  radio.addEventListener('change', () => updateModifierKeyState(getSelectedTriggerMode()));
});

(async function initOptions() {
  const settings = await getSettings();
  apiBaseUrlInput.value = settings.apiBaseUrl;
  websiteUrlInput.value = settings.websiteUrl;
  setTriggerMode(settings.triggerMode || 'text-selection');
  modifierKeySelect.value = settings.modifierKey || 'auto';
})();

optionsForm.addEventListener('submit', async event => {
  event.preventDefault();
  await saveSettings({
    apiBaseUrl: apiBaseUrlInput.value,
    websiteUrl: websiteUrlInput.value,
    triggerMode: getSelectedTriggerMode(),
    modifierKey: modifierKeySelect.value
  });
  savedMessage.hidden = false;
  window.setTimeout(() => {
    savedMessage.hidden = true;
  }, 1800);
});
