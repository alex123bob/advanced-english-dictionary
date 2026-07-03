// Locale detection — reads the same key as the web dictionary
let locale = 'en';
try {
  locale = localStorage.getItem('dict_response_language') || 'en';
} catch (_) {}

const i18n = window.AdvancedDictionaryI18n;
i18n.setLanguage(locale);

function t(key) {
  return i18n.t(key);
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });

  // <option> elements require direct text assignment
  document.querySelector('#modifierKey option[value="auto"]').textContent = t('extModifierAuto');
  document.querySelector('#modifierKey option[value="meta"]').textContent = t('extModifierMeta');
  document.querySelector('#modifierKey option[value="ctrl"]').textContent = t('extModifierCtrl');
  document.querySelector('#modifierKey option[value="alt"]').textContent = t('extModifierAlt');

  // Update <html lang> for screen readers and browser font rendering
  document.documentElement.lang = i18n.getLanguageMeta().htmlLang;
}

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

triggerRadios.forEach(radio => {
  radio.addEventListener('change', () => updateModifierKeyState(getSelectedTriggerMode()));
});

(async function initOptions() {
  applyTranslations();

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
