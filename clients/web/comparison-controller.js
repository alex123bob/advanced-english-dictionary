// Loading controller for usage-section word comparison cards.
(function () {
    'use strict';

    function hasText(value) {
        return value !== null && value !== undefined && String(value).trim() !== '';
    }

    function isZhMode() {
        return document.documentElement.dataset.responseLanguage === 'zh-cn';
    }

    function t(en, zh) {
        return isZhMode() ? zh : en;
    }

    function localizedText(enValue, zhValue) {
        return isZhMode() && hasText(zhValue) ? zhValue : enValue;
    }

    function localizedMeta(meta, metaZh) {
        if (!meta) return meta;
        return {
            ...meta,
            quick_rule: localizedText(meta.quick_rule, metaZh && metaZh.quick_rule),
            key_differentiator: localizedText(meta.key_differentiator, metaZh && metaZh.key_differentiator)
        };
    }

    function localizedProfile(profile, profileZh) {
        if (!profile) return profile;
        return {
            ...profile,
            core_meaning: localizedText(profile.core_meaning, profileZh && profileZh.core_meaning),
            grammar_note: localizedText(profile.grammar_note, profileZh && profileZh.grammar_note)
        };
    }

    function localizedProfiles(profiles, profilesZh) {
        if (!profiles) return profiles;
        return {
            ...profiles,
            searched_word: localizedProfile(profiles.searched_word, profilesZh && profilesZh.searched_word),
            confused_word: localizedProfile(profiles.confused_word, profilesZh && profilesZh.confused_word)
        };
    }

    function localizedExampleSide(examples, examplesZh) {
        if (!examples) return examples;
        return {
            ...examples,
            usage_note: localizedText(examples.usage_note, examplesZh && examplesZh.usage_note)
        };
    }

    function localizedExamples(examples, examplesZh) {
        if (!examples) return examples;
        return {
            ...examples,
            searched_word: localizedExampleSide(examples.searched_word, examplesZh && examplesZh.searched_word),
            confused_word: localizedExampleSide(examples.confused_word, examplesZh && examplesZh.confused_word)
        };
    }

    function handleChip(confusionChip, options = {}) {
        const currentWord = options.currentWord;
        const fetchSection = options.fetchSection;
        const confusedWord = confusionChip.dataset.confusedWord;
        if (!confusedWord || !currentWord || typeof fetchSection !== 'function') return;

        // Write deep link hash
        if (window.DeepLinks) {
            const token = 'compare-' + confusedWord.toLowerCase().replace(/\s+/g, '-');
            window.DeepLinks.updateHash(token);
        }
    
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
        let profilesZhData = null;
        let examplesZhData = null;
        let metaZhData = null;
    
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
            const displayProfiles = localizedProfiles(profilesData, profilesZhData);
            const displayExamples = localizedExamples(examplesData, examplesZhData);
            cardASlot.innerHTML = ConfusionUI.renderCard(displayProfiles.searched_word, displayExamples ? displayExamples.searched_word : null, currentWord, 'a', posMatch);
            cardBSlot.innerHTML = ConfusionUI.renderCard(displayProfiles.confused_word, displayExamples ? displayExamples.confused_word : null, confusedWord, 'b', posMatch);
            ComparisonExport.updateState(container, true);
        }
    
        function updateExportData() {
            const displayProfiles = localizedProfiles(profilesData, profilesZhData);
            const displayExamples = localizedExamples(examplesData, examplesZhData);
            container.__comparisonExportData = {
                word: currentWord,
                confusedWord,
                language: isZhMode() ? 'zh-cn' : 'en',
                meta: localizedMeta(metaData, metaZhData),
                profiles: displayProfiles,
                examples: displayExamples
            };
        }
    
        function renderSectionError(slot, label, retryFn) {
            slot.innerHTML = `
                <div class="wcd-section-error">
                    <i class="fas fa-circle-exclamation"></i>
                    <span>${label} ${t('failed to load', '加载失败')}</span>
                    <button class="wcd-retry-btn"><i class="fas fa-rotate-right"></i> ${t('Retry', '重试')}</button>
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
                        metaZhData = result.data.confusion_meta_zh || null;
                        updateExportData();
                        metaSlot.innerHTML = ConfusionUI.renderMeta(localizedMeta(metaData, metaZhData), currentWord, confusedWord);
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
                    profilesZhData = result.data.confusion_profiles_zh || null;
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
                    examplesZhData = result.data.confusion_examples_zh || null;
                    updateExportData();
                    if (examplesData) tryFillCards();
                })
                .catch(err => {
                    console.error('Error fetching confusion_examples:', err);
                    if (profilesData) {
                        const examplesRetryBtnA = cardASlot.querySelector('.wcd-examples-retry-wrap');
                        const examplesRetryBtnB = cardBSlot.querySelector('.wcd-examples-retry-wrap');
                        if (!examplesRetryBtnA) {
                            const retryHtml = `<div class="wcd-examples-retry-wrap"><button class="wcd-retry-btn wcd-examples-retry"><i class="fas fa-rotate-right"></i> ${t('Retry examples', '重试例句')}</button></div>`;
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
