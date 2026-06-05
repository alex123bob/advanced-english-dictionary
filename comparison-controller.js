// Loading controller for usage-section word comparison cards.
(function () {
    'use strict';

    function handleChip(confusionChip, options = {}) {
        const currentWord = options.currentWord;
        const fetchSection = options.fetchSection;
        const confusedWord = confusionChip.dataset.confusedWord;
        if (!confusedWord || !currentWord || typeof fetchSection !== 'function') return;
    
        const allChips = document.querySelectorAll('.confusion-chip');
        allChips.forEach(c => c.classList.remove('active'));
        confusionChip.classList.add('active');
    
        const container = document.querySelector('.confusion-detail-container');
        if (!container) return;
    
        container.innerHTML = ConfusionUI.renderScaffold(currentWord, confusedWord);
    
        const metaSlot     = container.querySelector('.wcd-slot-meta');
        const cardASlot    = container.querySelector('.wcd-slot-card-a');
        const cardBSlot    = container.querySelector('.wcd-slot-card-b');
    
        let profilesData = null;
        let examplesData = null;
        let metaData = null;
    
        container.__comparisonExportData = {
            word: currentWord,
            confusedWord,
            meta: null,
            profiles: null,
            examples: null
        };
    
        function tryFillCards() {
            if (!profilesData) return;
            const posMatch = profilesData.searched_word.part_of_speech === profilesData.confused_word.part_of_speech;
            cardASlot.innerHTML = ConfusionUI.renderCard(profilesData.searched_word, examplesData ? examplesData.searched_word : null, currentWord, 'a', posMatch);
            cardBSlot.innerHTML = ConfusionUI.renderCard(profilesData.confused_word, examplesData ? examplesData.confused_word : null, confusedWord, 'b', posMatch);
            ComparisonExport.updateState(container, true);
        }
    
        function updateExportData() {
            container.__comparisonExportData = {
                word: currentWord,
                confusedWord,
                meta: metaData,
                profiles: profilesData,
                examples: examplesData
            };
        }
    
        function renderSectionError(slot, label, retryFn) {
            slot.innerHTML = `
                <div class="wcd-section-error">
                    <i class="fas fa-circle-exclamation"></i>
                    <span>${label} failed to load</span>
                    <button class="wcd-retry-btn"><i class="fas fa-rotate-right"></i> Retry</button>
                </div>
            `;
            slot.querySelector('.wcd-retry-btn').addEventListener('click', () => {
                slot.innerHTML = '<div class="wcd-skeleton wcd-skeleton-card"></div>';
                retryFn();
            });
        }
    
        function loadMeta() {
            fetchSection(currentWord, 'confusion_meta', null, null, { confused_word: confusedWord })
                .then(result => {
                    const meta = result.data.confusion_meta;
                    if (meta) {
                        metaData = meta;
                        updateExportData();
                        metaSlot.innerHTML = ConfusionUI.renderMeta(meta, currentWord, confusedWord);
                    } else {
                        metaSlot.innerHTML = '';
                    }
                })
                .catch(err => {
                    console.error('Error fetching confusion_meta:', err);
                    renderSectionError(metaSlot, 'Overview', loadMeta);
                });
        }
    
        function loadProfiles() {
            fetchSection(currentWord, 'confusion_profiles', null, null, { confused_word: confusedWord })
                .then(result => {
                    profilesData = result.data.confusion_profiles;
                    updateExportData();
                    if (profilesData) tryFillCards();
                    else { cardASlot.innerHTML = ''; cardBSlot.innerHTML = ''; }
                })
                .catch(err => {
                    console.error('Error fetching confusion_profiles:', err);
                    renderSectionError(cardASlot, 'Word profiles', loadProfiles);
                    cardBSlot.innerHTML = '';
                });
        }
    
        function loadExamples() {
            fetchSection(currentWord, 'confusion_examples', null, null, { confused_word: confusedWord })
                .then(result => {
                    examplesData = result.data.confusion_examples;
                    updateExportData();
                    if (examplesData) tryFillCards();
                })
                .catch(err => {
                    console.error('Error fetching confusion_examples:', err);
                    if (profilesData) {
                        const examplesRetryBtnA = cardASlot.querySelector('.wcd-examples-retry-wrap');
                        const examplesRetryBtnB = cardBSlot.querySelector('.wcd-examples-retry-wrap');
                        if (!examplesRetryBtnA) {
                            const retryHtml = `<div class="wcd-examples-retry-wrap"><button class="wcd-retry-btn wcd-examples-retry"><i class="fas fa-rotate-right"></i> Retry examples</button></div>`;
                            cardASlot.insertAdjacentHTML('beforeend', retryHtml);
                            cardBSlot.insertAdjacentHTML('beforeend', retryHtml);
                            cardASlot.querySelector('.wcd-examples-retry').addEventListener('click', () => {
                                cardASlot.querySelector('.wcd-examples-retry-wrap').remove();
                                cardBSlot.querySelector('.wcd-examples-retry-wrap').remove();
                                loadExamples();
                            });
                        }
                    }
                });
        }
    
        loadMeta();
        loadProfiles();
        loadExamples();
    }

    window.ComparisonController = {
        handleChip
    };
})();
