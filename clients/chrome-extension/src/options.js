const optionsForm = document.getElementById('optionsForm');
const apiBaseUrlInput = document.getElementById('apiBaseUrl');
const websiteUrlInput = document.getElementById('websiteUrl');
const savedMessage = document.getElementById('savedMessage');

(async function initOptions() {
  const settings = await getSettings();
  apiBaseUrlInput.value = settings.apiBaseUrl;
  websiteUrlInput.value = settings.websiteUrl;
})();

optionsForm.addEventListener('submit', async event => {
  event.preventDefault();
  await saveSettings({
    apiBaseUrl: apiBaseUrlInput.value,
    websiteUrl: websiteUrlInput.value
  });
  savedMessage.hidden = false;
  window.setTimeout(() => {
    savedMessage.hidden = true;
  }, 1800);
});
