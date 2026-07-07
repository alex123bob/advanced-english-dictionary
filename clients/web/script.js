// script.js for Advanced English Dictionary
// Handles search, fetches data from API, and updates UI responsively

// Audio Manager - handles Howler.js playback with one-at-a-time behavior
const AudioManager = {
    currentSound: null,
    currentButton: null,

    resolveAudioUrl(audioUrl) {
        if (!audioUrl) return '';

        try {
            return new URL(audioUrl).href;
        } catch {
            const apiHost = window.config && window.config.api ? window.config.api.host : '';
            if (audioUrl.startsWith('/') && apiHost) {
                return `${apiHost.replace(/\/+$/, '')}${audioUrl}`;
            }
            return audioUrl;
        }
    },

    stopCurrentSound() {
        if (!this.currentSound) return;

        if (typeof this.currentSound.stop === 'function') {
            this.currentSound.stop();
        } else if (typeof this.currentSound.pause === 'function') {
            this.currentSound.pause();
            this.currentSound.currentTime = 0;
        }
    },
    
    play(audioUrl, buttonElement) {
        const playableUrl = this.resolveAudioUrl(audioUrl);
        if (!playableUrl) return;

        // Stop current sound if playing
        if (this.currentSound) {
            this.stopCurrentSound();
            if (this.currentButton) {
                this.updateButtonState(this.currentButton, false);
            }
        }
        
        // If clicking the same button, just stop (toggle behavior)
        if (this.currentButton === buttonElement && this.currentSound) {
            this.currentSound = null;
            this.currentButton = null;
            return;
        }

        if (typeof Howl === 'undefined') {
            this.playNativeAudio(playableUrl, buttonElement);
            return;
        }
        
        // Create new Howl instance
        this.currentSound = new Howl({
            src: [playableUrl],
            html5: true, // Use HTML5 Audio for streaming
            volume: 0.8,
            onplay: () => {
                this.updateButtonState(buttonElement, true);
            },
            onend: () => {
                this.updateButtonState(buttonElement, false);
                this.currentSound = null;
                this.currentButton = null;
            },
            onstop: () => {
                this.updateButtonState(buttonElement, false);
            },
            onloaderror: (id, error) => {
                console.error('Audio load error:', error);
                this.updateButtonState(buttonElement, false);
                this.currentSound = null;
                this.currentButton = null;
            },
            onplayerror: (id, error) => {
                console.error('Audio play error:', error);
                this.updateButtonState(buttonElement, false);
                this.currentSound = null;
                this.currentButton = null;
            }
        });
        
        this.currentButton = buttonElement;
        this.currentSound.play();
    },

    playNativeAudio(audioUrl, buttonElement) {
        const audio = new Audio(audioUrl);
        audio.volume = 0.8;

        audio.addEventListener('play', () => {
            this.updateButtonState(buttonElement, true);
        });
        audio.addEventListener('ended', () => {
            this.updateButtonState(buttonElement, false);
            this.currentSound = null;
            this.currentButton = null;
        });
        audio.addEventListener('pause', () => {
            this.updateButtonState(buttonElement, false);
        });
        audio.addEventListener('error', () => {
            console.warn('Audio playback failed:', audio.error || audioUrl);
            this.updateButtonState(buttonElement, false);
            this.currentSound = null;
            this.currentButton = null;
        });

        this.currentSound = audio;
        this.currentButton = buttonElement;
        audio.play().catch(error => {
            console.warn('Audio playback failed:', error);
            this.updateButtonState(buttonElement, false);
            this.currentSound = null;
            this.currentButton = null;
        });
    },
    
    updateButtonState(button, isPlaying) {
        const icon = button.querySelector('i');
        if (!icon) return;
        if (isPlaying) {
            icon.classList.remove('fa-volume-up');
            icon.classList.add('fa-stop');
            button.classList.add('playing');
        } else {
            icon.classList.remove('fa-stop');
            icon.classList.add('fa-volume-up');
            button.classList.remove('playing');
        }
    }
};

// DeepLinks — read/write URL hash for sections, senses, and comparisons
const DeepLinks = {
    _suppressToggle: false,
    // Section id attribute → short hash token
    SECTION_TO_TOKEN: {
        'definitions-section': 'definitions',
        'etymology-section':   'etymology',
        'synonyms-section':    'synonyms',
        'cultural-section':    'culture',
        'usage-section':       'usage',
        'family-section':      'family',
        'phrases-section':     'phrases',
        'videos-section':      'videos'
    },
    // Short hash token → section id attribute
    TOKEN_TO_SECTION: {
        'definitions': 'definitions-section',
        'etymology':   'etymology-section',
        'synonyms':    'synonyms-section',
        'culture':     'cultural-section',
        'usage':       'usage-section',
        'family':      'family-section',
        'phrases':     'phrases-section',
        'videos':      'videos-section'
    },

    updateHash(token) {
        const url = new URL(window.location.href);
        if (token) {
            url.hash = token;
        } else {
            url.hash = '';
        }
        // replaceState so sub-item navigation doesn't pollute Back stack
        history.replaceState(history.state, '', url.toString().replace(/#$/, ''));
    },

    parseHash() {
        const raw = window.location.hash.replace(/^#/, '').trim();
        if (!raw) return null;

        // Comparison: compare-<word>
        const compareMatch = raw.match(/^compare-(.+)$/);
        if (compareMatch) {
            return { type: 'compare', word: compareMatch[1] };
        }

        // Sense: definitions-<N>
        const senseMatch = raw.match(/^definitions-(\d+)$/);
        if (senseMatch) {
            return { type: 'sense', index: parseInt(senseMatch[1], 10) };
        }

        // Section only
        if (DeepLinks.TOKEN_TO_SECTION[raw]) {
            return { type: 'section', token: raw };
        }

        return null;
    },

    // Called after render completes. stickyTabsFn activates a tab by section id.
    restoreFromHash(stickyTabsFn) {
        const parsed = DeepLinks.parseHash();
        if (!parsed) return;

        if (parsed.type === 'section') {
            const sectionId = DeepLinks.TOKEN_TO_SECTION[parsed.token];
            const el = document.getElementById(sectionId);
            if (!el) return;
            el.open = true;
            if (typeof stickyTabsFn === 'function') stickyTabsFn(sectionId);
            requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        }

        if (parsed.type === 'sense') {
            const definitionsEl = document.getElementById('definitions-section');
            if (definitionsEl) {
                definitionsEl.open = true;
                if (typeof stickyTabsFn === 'function') stickyTabsFn('definitions-section');
            }
            // Trigger click on the matching sense-detail-btn after a short delay
            // to allow the senses list to be in the DOM
            requestAnimationFrame(() => {
                const btn = document.querySelector(
                    `.sense-detail-btn[data-sense-index="${parsed.index}"]`
                );
                if (btn) {
                    btn.click();
                    setTimeout(() => {
                        const senseItem = document.querySelector(
                            `.sense-item-container[data-sense-index="${parsed.index}"]`
                        );
                        if (senseItem) senseItem.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 300);
                }
            });
        }

        if (parsed.type === 'compare') {
            const usageEl = document.getElementById('usage-section');
            if (usageEl) {
                usageEl.open = true;
                if (typeof stickyTabsFn === 'function') stickyTabsFn('usage-section');
            }
            // Trigger click on the matching confusion chip after usage content renders
            requestAnimationFrame(() => {
                const chip = document.querySelector(
                    `.confusion-chip[data-confused-word="${CSS.escape(parsed.word)}"]`
                );
                if (chip) {
                    chip.click();
                    setTimeout(() => {
                        const container = document.querySelector('.confusion-detail-container');
                        if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 200);
                }
            });
        }
    }
};

window.DeepLinks = DeepLinks;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    if (window.advancedDictionaryConfigReady) {
        await window.advancedDictionaryConfigReady;
    }

    const config = window.config;

    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsContainer = document.getElementById('resultsContainer');
    const loadingContainer = document.getElementById('loadingContainer');
    const emptyState = document.getElementById('emptyState');

    const headword = document.getElementById('headword');
    const frequency = document.getElementById('frequency');
    const wordFrequency = document.getElementById('wordFrequency');
    const entryTabsContainer = document.getElementById('entryTabsContainer');
    const definitionsContent = document.getElementById('definitionsContent');
    const etymologyContent = document.getElementById('etymologyContent');
    const synonymsContent = document.getElementById('synonymsContent');
    const culturalContent = document.getElementById('culturalContent');
    const usageContent = document.getElementById('usageContent');
    const wordFamilyContent = document.getElementById('wordFamilyContent');
    const commonPhrasesContent = document.getElementById('commonPhrasesContent');
    const videoResourcesContent = document.getElementById('videoResourcesContent');

    const suggestionsDropdown = document.getElementById('suggestionsDropdown');
    const suggestionsAnchor = searchInput ? searchInput.closest('.search-box') : null;
    if (suggestionsDropdown && suggestionsDropdown.parentElement !== document.body) {
        document.body.appendChild(suggestionsDropdown);
    }

    let suggestionDebounceTimer;
    let suggestionRequestToken = 0;
    let currentFocus = -1;

    const stickyTabs = document.getElementById('stickyTabs');
    const tabLinks = stickyTabs ? stickyTabs.querySelectorAll('.tab-link') : [];
    const accordionSections = document.querySelectorAll('.accordion-section');

    const HISTORY_KEY = 'dict_search_history';
    const MAX_HISTORY_ITEMS = 10;
    const LANGUAGE_KEY = 'dict_response_language';
    const i18n = window.AdvancedDictionaryI18n;
    if (!i18n) {
        throw new Error('AdvancedDictionaryI18n must be loaded before script.js');
    }
    const DEFAULT_RESPONSE_LANG = i18n.defaultLanguage;
    const BILINGUAL_LANG = 'zh-cn';
    const RESPONSE_LANGUAGES = i18n.getLanguages();
    const BILINGUAL_SECTIONS = new Set([
        'basic',
        'common_phrases',
        'etymology',
        'word_family',
        'usage_context',
        'cultural_notes',
        'frequency',
        'detailed_sense',
        'examples',
        'usage_notes',
        'confusion_meta',
        'confusion_profiles',
        'confusion_examples',
        'confusion_all'
    ]);
    let currentResponseLanguage = normalizeResponseLanguage(localStorage.getItem(LANGUAGE_KEY) || 'en');

    i18n.setLanguage(currentResponseLanguage);

    applyLocalizedStaticText();
    UIControls.init({ config, t, getCurrentLanguage: () => currentResponseLanguage });
    ComparisonExport.init({ config, getCurrentWord: () => currentWord });
    initLanguageSelector();

    const urlParams = new URLSearchParams(window.location.search);
    let queryParam = urlParams.get('q');
    if (!queryParam && window.advancedDictionaryGetPendingWord) {
        queryParam = await window.advancedDictionaryGetPendingWord();
        if (queryParam) {
            window.history.replaceState({ word: queryParam }, '', `?q=${encodeURIComponent(queryParam)}`);
        }
    }
    
    // Set initial browser history state so Back can return here
    window.history.replaceState({ word: queryParam || null }, '');
    
    if (queryParam) {
        searchInput.value = queryParam;
        handleSearch({ skipBrowserHistory: true });
    }
    
    // Browser navigation: handle Back/Forward
    window.addEventListener('popstate', (e) => {
        const state = e.state;
        if (state && state.word) {
            searchInput.value = state.word;
            handleSearch({ skipBrowserHistory: true, skipSearchHistory: true });
        } else {
            // Restore empty state
            searchInput.value = '';
            showResults(false);
            showLoading(false);
            showEmptyState(true);
            clearResults();
        }
    });

    function normalizeResponseLanguage(language) {
        return i18n.normalizeLanguage(language);
    }

    function getResponseLanguage(code = currentResponseLanguage) {
        return i18n.getLanguageMeta(code);
    }

    function t(key, replacements = {}) {
        return i18n.t(key, replacements, currentResponseLanguage);
    }

    function applyLocalizedStaticText() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            element.textContent = t(element.dataset.i18n);
        });
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            element.title = t(element.dataset.i18nTitle);
        });
        document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
            element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
        });
    }

    function isBilingualMode() {
        return currentResponseLanguage === BILINGUAL_LANG;
    }

    function shouldRequestBilingualSection(section) {
        return isBilingualMode() && BILINGUAL_SECTIONS.has(section);
    }

    function updateLanguageSelectorUI() {
        const language = getResponseLanguage();
        const selector = document.getElementById('languageSelector');
        const button = document.getElementById('languageSelectorBtn');
        const buttonText = button ? button.querySelector('.language-selector-text') : null;
        const menu = document.getElementById('languageSelectorMenu');

        document.documentElement.dataset.responseLanguage = currentResponseLanguage;
        document.documentElement.lang = language.htmlLang;

        if (selector) {
            selector.dataset.language = currentResponseLanguage;
        }
        if (button) {
            button.setAttribute('aria-label', t('responseLanguage'));
            button.title = t('responseLanguage');
        }
        if (buttonText) {
            buttonText.textContent = language.nativeLabel || language.label;
        }
        if (menu) {
            menu.setAttribute('aria-label', t('responseLanguage'));
        }

        document.querySelectorAll('.language-selector-option').forEach(option => {
            const isActive = normalizeResponseLanguage(option.dataset.language) === currentResponseLanguage;
            option.classList.toggle('active', isActive);
            option.setAttribute('aria-selected', String(isActive));
        });
    }

    function initLanguageSelector() {
        const selector = document.getElementById('languageSelector');
        const button = document.getElementById('languageSelectorBtn');
        const menu = document.getElementById('languageSelectorMenu');
        updateLanguageSelectorUI();

        if (!selector || !button || !menu) return;

        function renderLanguageOptions() {
            menu.innerHTML = RESPONSE_LANGUAGES.map(language => {
            const nativeLabel = language.nativeLabel ? `<span class="language-selector-native">${escapeHtml(language.nativeLabel)}</span>` : '';
            return `
                <button class="language-selector-option" type="button" role="option" data-language="${language.code}">
                    <span class="language-selector-option-main">
                        <span class="language-selector-option-label">${escapeHtml(language.label)}</span>
                        ${nativeLabel}
                    </span>
                    <span class="language-selector-option-desc">${escapeHtml(t(language.descriptionKey))}</span>
                    <i class="fas fa-check language-selector-check" aria-hidden="true"></i>
                </button>
            `;
            }).join('');
        }

        renderLanguageOptions();
        updateLanguageSelectorUI();

        function closeMenu() {
            selector.classList.remove('open');
            button.setAttribute('aria-expanded', 'false');
            menu.style.removeProperty('--language-menu-left');
            menu.style.removeProperty('--language-menu-top');
            menu.style.removeProperty('--language-menu-width');
        }

        function positionMenu() {
            const buttonRect = button.getBoundingClientRect();
            const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
            const edgeGap = viewportWidth < 640 ? 8 : 12;
            const menuWidth = Math.min(viewportWidth - edgeGap * 2, viewportWidth < 640 ? 276 : 292);
            const preferredLeft = buttonRect.right - menuWidth;
            const left = Math.max(edgeGap, Math.min(preferredLeft, viewportWidth - menuWidth - edgeGap));
            const top = buttonRect.bottom + 8;

            menu.style.setProperty('--language-menu-left', `${Math.round(left)}px`);
            menu.style.setProperty('--language-menu-top', `${Math.round(top)}px`);
            menu.style.setProperty('--language-menu-width', `${Math.round(menuWidth)}px`);
        }

        function toggleMenu() {
            const isOpen = selector.classList.toggle('open');
            button.setAttribute('aria-expanded', String(isOpen));
            if (isOpen) {
                positionMenu();
            }
        }

        button.addEventListener('click', event => {
            event.stopPropagation();
            toggleMenu();
        });

        menu.addEventListener('click', event => {
            const option = event.target.closest('.language-selector-option');
            if (!option) return;

            const nextLanguage = normalizeResponseLanguage(option.dataset.language);
            closeMenu();
            if (nextLanguage === currentResponseLanguage) return;

            currentResponseLanguage = nextLanguage;
            i18n.setLanguage(currentResponseLanguage);
            localStorage.setItem(LANGUAGE_KEY, currentResponseLanguage);
            applyLocalizedStaticText();
            renderLanguageOptions();
            updateLanguageSelectorUI();
            updatePlaceholder();
            updateSearchHistoryUI();
            if (window.UIControls && typeof window.UIControls.applyStyleMode === 'function') {
                window.UIControls.applyStyleMode(document.documentElement.getAttribute('data-style-mode') || 'adventure');
            }

            const query = searchInput.value.trim();
            if (query && currentWordData && currentWord) {
                handleSearch({ skipBrowserHistory: true, skipSearchHistory: true });
            }
        });

        document.addEventListener('click', event => {
            if (!selector.contains(event.target)) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                closeMenu();
            }
        });

        window.addEventListener('resize', () => {
            if (selector.classList.contains('open')) {
                positionMenu();
            }
        });
    }
    
    function getSearchHistory() {
        try {
            const historyList = localStorage.getItem(HISTORY_KEY);
            return historyList ? JSON.parse(historyList) : [];
        } catch (err) {
            console.error('Error reading search history:', err);
            return [];
        }
    }
    
    function addToSearchHistory(word) {
        try {
            let historyList = getSearchHistory();
            
            // Remove if already exists (we'll add it to the front)
            historyList = historyList.filter(item => item.word.toLowerCase() !== word.toLowerCase());
            
            // Add to front with lowercased word
            historyList.unshift({
                word: word.toLowerCase(),
                timestamp: Date.now()
            });
            
            // Keep only MAX_HISTORY_ITEMS
            historyList = historyList.slice(0, MAX_HISTORY_ITEMS);
            
            localStorage.setItem(HISTORY_KEY, JSON.stringify(historyList));
            
            updateSearchHistoryUI();
        } catch (err) {
            console.error('Error saving search history:', err);
        }
    }
    
    function updateSearchHistoryUI() {
        const historyList = getSearchHistory();
        const panelContent = document.getElementById('historyPanelContent');
        const badge = document.getElementById('historyBadge');
        
        if (!panelContent) return;
        
        // Update badge
        if (badge) {
            if (historyList.length > 0) {
                badge.textContent = historyList.length;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
        
        if (historyList.length === 0) {
            panelContent.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-clock"></i>
                    <p>${t('noSearchHistory')}</p>
                </div>
            `;
            return;
        }
        
        panelContent.innerHTML = `
            <div class="history-items">
                ${historyList.map((item, index) => {
                    const timeAgo = getTimeAgo(item.timestamp);
                    return `
                        <div class="history-item" data-word="${item.word}">
                            <div class="history-item-content">
                                <i class="fas fa-search"></i>
                                <div class="history-item-text">
                                    <div class="history-item-word">${item.word}</div>
                                    <div class="history-item-time">${timeAgo}</div>
                                </div>
                            </div>
                            <button class="history-item-delete" data-index="${index}" title="${t('remove')}" aria-label="${t('remove')}">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        // Add click handlers for history items
        panelContent.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking delete button
                if (e.target.closest('.history-item-delete')) return;
                
                searchInput.value = item.dataset.word;
                handleSearch();
                closeHistoryPanel();
            });
        });
        
        // Add click handlers for delete buttons
        panelContent.querySelectorAll('.history-item-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                removeFromSearchHistory(index);
            });
        });
    }
    
    function getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return t('justNow');
        if (seconds < 3600) return t('minutesAgo', { count: Math.floor(seconds / 60) });
        if (seconds < 86400) return t('hoursAgo', { count: Math.floor(seconds / 3600) });
        if (seconds < 604800) return t('daysAgo', { count: Math.floor(seconds / 86400) });
        return new Date(timestamp).toLocaleDateString();
    }
    
    function removeFromSearchHistory(index) {
        try {
            let historyList = getSearchHistory();
            
            // Remove from history
            historyList.splice(index, 1);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(historyList));
            
            updateSearchHistoryUI();
        } catch (err) {
            console.error('Error removing from search history:', err);
        }
    }
    
    function openHistoryPanel() {
        const panel = document.getElementById('historyPanel');
        const overlay = document.getElementById('historyOverlay');
        const dial = document.getElementById('speedDial');
        if (panel && overlay) {
            panel.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        if (dial) {
            dial.classList.remove('open');
            document.getElementById('speedDialBtn').setAttribute('aria-expanded', 'false');
        }
    }
    
    function closeHistoryPanel() {
        const panel = document.getElementById('historyPanel');
        const overlay = document.getElementById('historyOverlay');
        
        if (panel && overlay) {
            panel.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    function updateHeadwordAndPronunciation(basicData, entryIndex) {
        headword.textContent = basicData.headword;
        
        const entryData = basicData.entries ? basicData.entries[entryIndex] : null;
        
        const posBadge = document.getElementById('wordPosBadge');
        if (posBadge && entryData && entryData.meanings_summary && entryData.meanings_summary.length > 0) {
            const primaryPos = entryData.meanings_summary[0].part_of_speech;
            if (primaryPos) {
                posBadge.textContent = primaryPos;
                posBadge.style.display = 'inline-block';
            } else {
                posBadge.style.display = 'none';
            }
        } else if (posBadge) {
            posBadge.style.display = 'none';
        }

        const wordPronunciation = document.getElementById('wordPronunciation');
        
        if (wordPronunciation && entryData) {
            const pronunciationHtml = renderInlinePronunciation(entryData);
            if (pronunciationHtml) {
                wordPronunciation.innerHTML = pronunciationHtml;
                wordPronunciation.style.display = 'flex';
            } else {
                wordPronunciation.style.display = 'none';
            }
        }
    }

    document.addEventListener('click', (e) => {
        const audioButton = e.target.closest('.audio-play-btn');
        if (audioButton) {
            e.preventDefault();
            const audioUrl = audioButton.dataset.audioUrl;
            if (audioUrl) {
                AudioManager.play(audioUrl, audioButton);
            }
        }

        const aiVideoBtn = e.target.closest('.ai-video-btn');
        if (aiVideoBtn) {
            e.preventDefault();
            const phrase = aiVideoBtn.dataset.phrase;
            const word = aiVideoBtn.dataset.word;
            
            if (phrase && word) {
                const videoSection = document.getElementById('videos-section');
                if (videoSection && !videoSection.open) {
                    videoSection.open = true;
                }
                
                videoSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                
                const headerHtml = `
                    <div class="selected-phrase-header">
                        <button class="back-to-phrases-btn" data-word="${word}">
                            <i class="fas fa-arrow-left"></i> ${t('back')}
                        </button>
                        <div class="selected-phrase-info">
                            <i class="fas fa-robot"></i>
                            <span>${t('aiVideoFor')} <strong>"${escapeHtml(phrase)}"</strong></span>
                        </div>
                    </div>
                `;
                
                videoResourcesContent.innerHTML = headerHtml + `
                    <div class="ai-videos-container">
                        <div class="section-loading">
                            <div class="spinner"></div>
                            <p>${t('checkingExistingVideo')}</p>
                        </div>
                    </div>
                `;
                
                checkExistingVideos(word, phrase)
                    .then(videos => {
                        console.log('Existing videos:', videos);
                        const video = videos && videos.length > 0 ? videos[0] : null;
                        
                        if (video) {
                            console.log('Video conversation_script:', video.conversation_script);
                            const conversationHtml = renderConversationScript(video.conversation_script);
                            console.log('Existing video conversation HTML length:', conversationHtml.length);
                            
                            if (video.status === 'completed') {
                                videoResourcesContent.innerHTML = headerHtml + conversationHtml + renderAIVideos([video]);
                            } else if (video.status === 'processing' || video.status === 'pending') {
                                videoResourcesContent.innerHTML = headerHtml + conversationHtml + renderAIVideos([video]);
                                if (video.task_id) {
                                    pollVideoStatus(video.task_id, phrase, word, headerHtml, video.conversation_script);
                                }
                            } else {
                                showGenerateButton(headerHtml, phrase, word);
                            }
                        } else {
                            showGenerateButton(headerHtml, phrase, word);
                        }
                    })
                    .catch(err => {
                        console.error('Error checking for existing videos:', err);
                        showGenerateButton(headerHtml, phrase, word);
                    });
            }
            return;
        }

        const phraseChip = e.target.closest('.phrase-chip');
        if (phraseChip) {
            e.preventDefault();
            const phrase = phraseChip.dataset.phrase;
            const word = phraseChip.dataset.word;
            
            if (phrase && word) {
                const videoSection = document.getElementById('videos-section');
                if (videoSection && !videoSection.open) {
                    videoSection.open = true;
                }
                
                videoSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                
                showSectionLoading(videoResourcesContent);
                
                fetchSection(word, 'bilibili_videos', null, null, { phrase })
                    .then(result => {
                        const data = result.data;
                        if (data.bilibili_videos) {
                            const videoHtml = renderVideoResources([{
                                type: 'bilibili',
                                phrase: phrase,
                                videos: [data.bilibili_videos]
                            }]);
                            const headerHtml = `
                                <div class="selected-phrase-header">
                                    <button class="back-to-phrases-btn" data-word="${word}">
                                        <i class="fas fa-arrow-left"></i> ${t('back')}
                                    </button>
                                    <div class="selected-phrase-info">
                                        <i class="fas fa-quote-left"></i>
                                        <span>${t('videosFor')} <strong>"${escapeHtml(phrase)}"</strong></span>
                                    </div>
                                </div>
                            `;
                            videoResourcesContent.innerHTML = headerHtml + videoHtml;
                        } else {
                            videoResourcesContent.innerHTML = `
                                <div class="selected-phrase-header">
                                    <button class="back-to-phrases-btn" data-word="${word}">
                                        <i class="fas fa-arrow-left"></i> ${t('back')}
                                    </button>
                                </div>
                                <div class="bilibili-empty-state">
                                    <div class="bilibili-empty-state-icon">
                                        <i class="fab fa-bilibili"></i>
                                    </div>
                                    <div class="bilibili-empty-state-title">${t('noVideosThisTime')}</div>
                                    <div class="bilibili-empty-state-desc">${t('noVideosForPhrase', { phrase: escapeHtml(phrase) })}</div>
                                </div>
                            `;
                        }
                    })
                    .catch(err => {
                        console.error('Error fetching bilibili_videos for phrase:', err);
                        const isNoResults = err.message && /no video|not found|no result/i.test(err.message);
                        const stateHtml = isNoResults
                            ? `<div class="bilibili-empty-state">
                                    <div class="bilibili-empty-state-icon"><i class="fab fa-bilibili"></i></div>
                                    <div class="bilibili-empty-state-title">${t('noVideosThisTime')}</div>
                                    <div class="bilibili-empty-state-desc">${t('noVideosForPhrase', { phrase: escapeHtml(phrase) })}</div>
                                </div>`
                            : `<div class="bilibili-error-state">
                                    <div class="bilibili-error-state-icon"><i class="fas fa-circle-exclamation"></i></div>
                                    <div class="bilibili-error-state-title">${t('couldNotLoadVideos')}</div>
                                    <div class="bilibili-error-state-desc">${t('videoSearchError', { phrase: escapeHtml(phrase) })}</div>
                                </div>`;
                        videoResourcesContent.innerHTML = `
                            <div class="selected-phrase-header">
                                <button class="back-to-phrases-btn" data-word="${word}">
                                    <i class="fas fa-arrow-left"></i> ${t('back')}
                                </button>
                            </div>
                            ${stateHtml}
                        `;
                    });
            }
        }

        const backButton = e.target.closest('.back-to-phrases-btn');
        if (backButton) {
            e.preventDefault();
            videoResourcesContent.innerHTML = renderVideoResourcesEmptyState();
        }

        const exportButton = e.target.closest('.wcd-b-export-btn');
        if (exportButton) {
            e.preventDefault();
            ComparisonExport.handleExport(exportButton);
            return;
        }
        
        const confusionChip = e.target.closest('.confusion-chip');
        if (confusionChip) {
            e.preventDefault();
            ComparisonController.handleChip(confusionChip, {
                currentWord,
                fetchSection
            });
        }
    });

    function showLoading(show, cacheStatus = null) {
        // If it's a fresh or stale cache hit, we don't need to show the full loading screen
        if (cacheStatus === 'fresh' || cacheStatus === 'stale') {
            show = false;
        }
        loadingContainer.style.display = show ? 'block' : 'none';
    }

    function showStaleRefreshBadge(cacheAge) {
        // Remove existing badge if any
        const existingBadge = document.getElementById('staleRefreshBadge');
        if (existingBadge) existingBadge.remove();

        const badge = document.createElement('div');
        badge.id = 'staleRefreshBadge';
        badge.className = 'stale-refresh-badge';
        badge.innerHTML = `<i class="fas fa-sync fa-spin"></i> ${t('refreshing')}`;
        
        // Style the badge
        Object.assign(badge.style, {
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '5px 10px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            color: '#666',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            zIndex: '1000',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'opacity 0.3s ease'
        });

        // Add to the results container or header area
        const container = document.getElementById('resultsContainer');
        if (container) {
            container.style.position = 'relative'; // Ensure relative positioning
            container.appendChild(badge);
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                badge.style.opacity = '0';
                setTimeout(() => badge.remove(), 300);
            }, 3000);
        }
    }
    function showResults(show) {
        resultsContainer.style.display = show ? '' : 'none';
    }
    function showEmptyState(show) {
        emptyState.style.display = show ? 'block' : 'none';
    }

    // Helper function to check if pronunciation is a URL
    function isAudioUrl(str) {
        if (!str) return false;
        
        // IPA strings typically start and end with / and contain phonetic symbols
        // Example: /paɪp daʊn/ or /həˈloʊ/
        // Check if it looks like IPA notation
        if (str.startsWith('/') && str.endsWith('/') && str.length < 100) {
            // It's likely IPA notation, not a URL
            return false;
        }
        
        // Check for common audio file extensions in the string
        const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
        const hasAudioExtension = audioExtensions.some(ext => str.toLowerCase().endsWith(ext));
        
        // If it has an audio extension, it's likely an audio URL
        if (hasAudioExtension) return true;
        
        // Check if it's a valid absolute URL
        try {
            const url = new URL(str);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            // Not a valid absolute URL, could be relative path to audio
            // Check if it contains common API path patterns
            if (str.includes('/api/') || str.includes('/static/') || str.includes('/audio/')) {
                return true;
            }
            return false;
        }
    }

    // Helper function to render pronunciation (audio or IPA text) for inline use
    function renderInlinePronunciation(entryData) {
        if (!entryData) return '';
        
        const audioUrl = entryData.pronunciation || '';
        const ipaText = entryData.ipa || '';
        
        if (!audioUrl && !ipaText) return '';
        
        let html = '<div class="sense-pronunciation">';
        
        if (audioUrl && isAudioUrl(audioUrl)) {
            const uniqueId = 'audio-' + Math.random().toString(36).substr(2, 9);
            html += `
                <button class="audio-play-btn" data-audio-url="${audioUrl}" id="${uniqueId}">
                    <i class="fas fa-volume-up"></i>
                </button>
            `;
        }
        
        if (ipaText) {
            html += `<span class="pronunciation">${ipaText}</span>`;
        }
        
        html += '</div>';
        return html;
    }

    function lookupWord(word) {
        if (!word || !word.trim()) return;
        searchInput.value = word.trim();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        handleSearch();
    }

    // Matches 2+ letter words (including hyphens/apostrophes), skips HTML tags
    function makeWordsClickable(text) {
        if (!text) return text;
        return text.replace(/\b([a-zA-Z][a-zA-Z'-]{1,})\b/g, '<span class="clickable-word" data-lookup-word="$1">$1</span>');
    }

    resultsContainer.addEventListener('click', (e) => {
        const lookupTarget = e.target.closest('[data-lookup-word]');
        if (lookupTarget) {
            e.preventDefault();
            lookupWord(lookupTarget.dataset.lookupWord);
        }
    });

    function clearResults() {
        definitionsContent.innerHTML = '';
        etymologyContent.innerHTML = '';
        synonymsContent.innerHTML = '';
        culturalContent.innerHTML = '';
        usageContent.innerHTML = '';
        wordFamilyContent.innerHTML = '';
        commonPhrasesContent.innerHTML = '';
        videoResourcesContent.innerHTML = '';
    }
    
    function hasSignificantDifference(basicSense, detailedSense) {
        if (basicSense.definition !== detailedSense.definition) return true;
        
        const basicExamples = basicSense.examples || (basicSense.example ? [basicSense.example] : []);
        const detailedExamples = detailedSense.examples || [];
        if (JSON.stringify(basicExamples) !== JSON.stringify(detailedExamples)) return true;
        
        const basicSynonyms = basicSense.synonyms || [];
        const detailedSynonyms = detailedSense.synonyms || [];
        if (JSON.stringify(basicSynonyms.sort()) !== JSON.stringify(detailedSynonyms.sort())) return true;
        
        const basicAntonyms = basicSense.antonyms || [];
        const detailedAntonyms = detailedSense.antonyms || [];
        if (JSON.stringify(basicAntonyms.sort()) !== JSON.stringify(detailedAntonyms.sort())) return true;
        
        return false;
    }
    
    function showSectionLoading(container, type = 'default') {
        const skeletons = {
            text: `<div class="skeleton-loading">
                <div class="skeleton skeleton-line" style="width:92%"></div>
                <div class="skeleton skeleton-line" style="width:78%"></div>
                <div class="skeleton skeleton-line" style="width:85%"></div>
            </div>`,
            chips: `<div class="skeleton-loading skeleton-chips">
                <div class="skeleton skeleton-chip"></div>
                <div class="skeleton skeleton-chip" style="width:90px"></div>
                <div class="skeleton skeleton-chip" style="width:70px"></div>
                <div class="skeleton skeleton-chip" style="width:100px"></div>
            </div>`,
            cards: `<div class="skeleton-loading">
                <div class="skeleton skeleton-card"></div>
                <div class="skeleton skeleton-card" style="height:60px"></div>
            </div>`,
            default: `<div class="skeleton-loading">
                <div class="skeleton skeleton-line" style="width:85%"></div>
                <div class="skeleton skeleton-line" style="width:70%"></div>
                <div class="skeleton skeleton-line" style="width:80%"></div>
            </div>`
        };
        container.innerHTML = skeletons[type] || skeletons.default;
    }

    function hasContent(value) {
        if (Array.isArray(value)) return value.some(item => hasContent(item));
        if (value && typeof value === 'object') return Object.values(value).some(item => hasContent(item));
        return value !== null && value !== undefined && String(value).trim() !== '';
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getZhData(sectionZh, preferredKey = null) {
        if (!hasContent(sectionZh)) return null;
        if (typeof sectionZh === 'string') return sectionZh;
        if (preferredKey && hasContent(sectionZh[preferredKey])) return sectionZh[preferredKey];
        if (hasContent(sectionZh.zh_data)) return getZhData(sectionZh.zh_data, preferredKey);
        return sectionZh;
    }

    function getZhTextValue(sectionZh, preferredKey = null) {
        const value = getZhData(sectionZh, preferredKey);
        if (!hasContent(value)) return '';
        if (typeof value === 'string' || typeof value === 'number') return String(value);
        if (Array.isArray(value)) return value.filter(hasContent).join('、');
        if (value && typeof value === 'object') {
            const preferredValue = preferredKey && hasContent(value[preferredKey]) ? value[preferredKey] : null;
            if (preferredValue) return getZhTextValue(preferredValue);
            const firstText = Object.values(value).find(item => typeof item === 'string' && item.trim());
            return firstText || '';
        }
        return '';
    }

    function getLocalizedValue(englishValue, zhValue) {
        if (isBilingualMode() && hasContent(zhValue)) return zhValue;
        return englishValue;
    }

    function getLocalizedArray(englishValues = [], zhValues = []) {
        const selectedValues = isBilingualMode() && Array.isArray(zhValues) && zhValues.some(hasContent)
            ? zhValues
            : englishValues;
        return Array.isArray(selectedValues) ? selectedValues.filter(hasContent) : [];
    }

    function renderLanguageText(text) {
        if (!hasContent(text)) return '';
        return isBilingualMode() ? escapeHtml(text) : makeWordsClickable(text);
    }

    function languageLabel(english, chinese) {
        return isBilingualMode() ? chinese : english;
    }

    function renderLanguageTags(values, className, lookupWords = true) {
        if (!Array.isArray(values) || !values.some(hasContent)) return '';
        return values.filter(hasContent).map(value => {
            const text = isBilingualMode() ? escapeHtml(value) : value;
            const lookupAttr = lookupWords && !isBilingualMode() ? ` data-lookup-word="${escapeHtml(value)}"` : '';
            return `<span class="${className}"${lookupAttr}>${text}</span>`;
        }).join('');
    }

    function renderEnglishLookupTags(values, className) {
        if (!Array.isArray(values) || !values.some(hasContent)) return '';
        return values.filter(hasContent).map(value => {
            const text = escapeHtml(value);
            return `<span class="${className}" data-lookup-word="${text}">${text}</span>`;
        }).join('');
    }

    function findBasicZhEntry(basicData, entryIndex) {
        const zhEntries = basicData && basicData.basic_zh && Array.isArray(basicData.basic_zh.entries)
            ? basicData.basic_zh.entries
            : [];
        return zhEntries.find(entry => Number(entry.entry_index) === Number(entryIndex)) || zhEntries[entryIndex] || null;
    }

    function getBasicSenseZh(basicData, entryIndex, meaningIndex, senseIndex) {
        const zhEntry = findBasicZhEntry(basicData, entryIndex);
        const zhMeaning = zhEntry && Array.isArray(zhEntry.meanings_summary)
            ? zhEntry.meanings_summary[meaningIndex]
            : null;
        const zhDefinition = zhMeaning && Array.isArray(zhMeaning.definitions)
            ? zhMeaning.definitions[senseIndex]
            : null;

        if (!zhMeaning && !zhDefinition) return null;

        return {
            definition: zhDefinition && zhDefinition.definition,
            example: zhDefinition && zhDefinition.example,
            synonyms: zhDefinition && zhDefinition.synonyms,
            antonyms: zhDefinition && zhDefinition.antonyms,
            part_of_speech: zhMeaning && zhMeaning.part_of_speech
        };
    }

    function buildDetailedSenseZh(senseData, examplesData, usageNotesData) {
        const detailedZh = senseData.detailed_sense_zh || {};
        const zh = {
            definition: detailedZh.zh_definition,
            part_of_speech: detailedZh.zh_part_of_speech,
            synonyms: detailedZh.zh_synonyms,
            antonyms: detailedZh.zh_antonyms,
            word_specific_phrases: detailedZh.zh_word_specific_phrases,
            examples: examplesData.zh_examples,
            collocations: examplesData.zh_collocations,
            usage_notes: usageNotesData.zh_learner_guidance,
            common_pitfalls: usageNotesData.zh_common_pitfalls
        };
        return hasContent(zh) ? zh : null;
    }

    function getLocalizedSense(englishSense, zhSense = null) {
        if (!isBilingualMode() || !hasContent(zhSense)) return englishSense;

        const localized = {
            ...englishSense,
            definition: zhSense.definition || englishSense.definition,
            part_of_speech: zhSense.part_of_speech || englishSense.part_of_speech,
            usage_notes: zhSense.usage_notes || englishSense.usage_notes,
            common_pitfalls: getLocalizedArray(englishSense.common_pitfalls || [], zhSense.common_pitfalls || [])
        };

        return localized;
    }
    
    function renderSenseHTML(sense, index, isDetailed = false) {
        let metaBadges = '';
        if (!isBilingualMode() && (sense.tone || (sense.usage_register && sense.usage_register.length) || (sense.domain && sense.domain.length))) {
            metaBadges = '<div class="sense-meta">';
            if (sense.tone) {
                metaBadges += `<span class="tone-badge tone-${sense.tone}">${sense.tone}</span>`;
            }
            if (sense.usage_register && sense.usage_register.length) {
                metaBadges += sense.usage_register.map(reg => `<span class="register-badge">${reg}</span>`).join('');
            }
            if (sense.domain && sense.domain.length) {
                metaBadges += sense.domain.map(dom => `<span class="domain-badge">${dom}</span>`).join('');
            }
            metaBadges += '</div>';
        }

        const hasExamples = (sense.examples && sense.examples.length) || sense.example;
        const examplesList = sense.examples || (sense.example ? [sense.example] : []);
        
        const examplesSection = hasExamples ? 
            `<div class="sense-examples">
                ${examplesList.map(ex => `<div class="example-item"><span class="example-arrow">→</span><em>${escapeHtml(ex)}</em></div>`).join('')}
            </div>` : '';
        
        const collocationsSection = sense.collocations && sense.collocations.length ?
            `<div class="sense-collocations"><strong>${languageLabel('Common collocations', '常见搭配')}:</strong><div class="collocation-tags">${renderEnglishLookupTags(sense.collocations, 'collocation-tag')}</div></div>` : '';
        
        const usageNotesSection = sense.usage_notes ? 
            `<div class="usage-notes"><strong>${languageLabel('Usage notes', '用法说明')}:</strong> ${renderLanguageText(sense.usage_notes)}${sense.common_pitfalls && sense.common_pitfalls.length ? `<div class="collocation-tags">${renderLanguageTags(sense.common_pitfalls, 'collocation-tag', false)}</div>` : ''}</div>` : '';

        const wordSpecificPhrasesSection = sense.word_specific_phrases && sense.word_specific_phrases.length ?
            `<div class="sense-collocations"><strong>${languageLabel('Word-specific phrases', '相关词组')}:</strong><div class="collocation-tags">${renderEnglishLookupTags(sense.word_specific_phrases, 'collocation-tag')}</div></div>` : '';
        
        const detailsButton = !isDetailed ? 
            `<button class="sense-detail-btn" data-sense-index="${index}" title="Load detailed information">
                <i class="fas fa-info-circle"></i> ${languageLabel('View Details', '查看详情')}
            </button>` : 
            `<div class="sense-detailed-badge"><i class="fas fa-check-circle"></i> ${languageLabel('Detailed view loaded', '详情已加载')}</div>`;
        
        return `
            <div class="sense-definition">
                <strong>${index + 1}.</strong> ${sense.part_of_speech ? `<span class="sense-pos">(${escapeHtml(sense.part_of_speech)})</span>` : ''} ${renderLanguageText(sense.definition)}
            </div>
            ${metaBadges}
            ${examplesSection}
            ${usageNotesSection}
            ${collocationsSection}
            ${wordSpecificPhrasesSection}
            ${sense.synonyms && sense.synonyms.filter(s => s && s.trim()).length ? `<div class="sense-synonyms"><strong>${languageLabel('Synonyms', '近义词')}:</strong><div class="synonym-tags">${renderEnglishLookupTags(sense.synonyms, 'synonym-tag')}</div></div>` : ''}
            ${sense.antonyms && sense.antonyms.filter(a => a && a.trim()).length ? `<div class="sense-antonyms"><strong>${languageLabel('Antonyms', '反义词')}:</strong><div class="antonym-tags">${renderEnglishLookupTags(sense.antonyms, 'antonym-tag')}</div></div>` : ''}
            <div class="sense-actions">${detailsButton}</div>
        `;
    }
    
    // Helper function to render structured cultural notes
    function renderCulturalNotes(culturalNotesData) {
        if (!culturalNotesData) return `<div class="no-data">${t('noCulturalNotes')}</div>`;
        
        const { historical_context, cultural_associations, social_perceptions } = culturalNotesData;
        
        // Check if we have any data
        if (!historical_context && (!cultural_associations || !cultural_associations.length) && 
            (!social_perceptions || !social_perceptions.length)) {
            return `<div class="no-data">${t('noCulturalNotes')}</div>`;
        }
        
        let html = '<div class="cultural-notes-structured">';
        
        // Historical Context Section
        if (historical_context) {
            html += `
                <div class="cultural-section">
                    <div class="cultural-section-header">
                        <i class="fas fa-landmark"></i>
                        <span>${languageLabel('Historical Context', '历史背景')}</span>
                    </div>
                    <div class="cultural-section-content">
                        <p>${renderLanguageText(historical_context)}</p>
                    </div>
                </div>
            `;
        }
        
        // Cultural Associations Section
        if (cultural_associations && cultural_associations.length > 0) {
            html += `
                <div class="cultural-section">
                    <div class="cultural-section-header">
                        <i class="fas fa-palette"></i>
                        <span>${languageLabel('Cultural Associations', '文化联想')}</span>
                    </div>
                    <div class="cultural-section-content">
                        <ul class="cultural-list">
                            ${cultural_associations.map(item => `<li>${renderLanguageText(item)}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }
        
        // Social Perceptions Section
        if (social_perceptions && social_perceptions.length > 0) {
            html += `
                <div class="cultural-section">
                    <div class="cultural-section-header">
                        <i class="fas fa-users"></i>
                        <span>${languageLabel('Social Perceptions', '社会印象')}</span>
                    </div>
                    <div class="cultural-section-content">
                        <ul class="cultural-list">
                            ${social_perceptions.map(item => `<li>${renderLanguageText(item)}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }
    
    // Helper function to highlight language origin terms in etymology
    function highlightEtymologyTerms(text) {
        if (!text) return text;
        const langTerms = [
            'Old English', 'Middle English', 'Early Modern English',
            'Latin', 'Classical Latin', 'Medieval Latin', 'Late Latin',
            'Greek', 'Ancient Greek', 'Proto-Greek',
            'French', 'Old French', 'Middle French', 'Norman French', 'Anglo-Norman',
            'Germanic', 'Proto-Germanic', 'West Germanic',
            'Proto-Indo-European', 'Indo-European',
            'Norse', 'Old Norse', 'Proto-Norse',
            'Dutch', 'Middle Dutch', 'Old Dutch',
            'German', 'Old High German', 'Middle High German',
            'Italian', 'Spanish', 'Portuguese', 'Romanian',
            'Sanskrit', 'Arabic', 'Persian', 'Hebrew',
            'Celtic', 'Old Irish', 'Gaelic', 'Welsh',
            'Scandinavian', 'Danish', 'Swedish', 'Norwegian'
        ];
        // Sort by length descending so longer terms match before shorter ones (e.g. "Old English" before "English")
        langTerms.sort((a, b) => b.length - a.length);
        let result = text;
        const seen = new Set();
        langTerms.forEach(term => {
            if (seen.has(term)) return;
            const regex = new RegExp(`\\b(${term.replace(/[-]/g, '\\-')})\\b`, 'g');
            result = result.replace(regex, (match) => {
                seen.add(term);
                return `<span class="etymology-lang-term">${match}</span>`;
            });
        });
        return result;
    }

    // Helper function to add contextual emojis to text
    function addContextEmoji(text) {
        if (!text) return text;
        
        const emojiMap = {
            'digital': '📱',
            'voice assistant': '🎤',
            'messaging': '💬',
            'social media': '👥',
            'online': '🌐',
            'telephone': '☎️',
            'phone': '📞',
            'text': '💬',
            'email': '📧',
            'internet': '🌐'
        };
        
        let enhancedText = text;
        for (const [keyword, emoji] of Object.entries(emojiMap)) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            enhancedText = enhancedText.replace(regex, `${keyword} ${emoji}`);
        }
        
        return enhancedText;
    }
    
    // Helper function to enhance usage context with visual structure
    function enhanceUsageContext(usageContext, englishUsageContext = null) {
        if (!usageContext) return `<div class="no-data">${t('noUsageContext')}</div>`;
        
        let html = '<div class="usage-context-enhanced">';
        
        // Modern Relevance - Feature Box
        if (usageContext.modern_relevance) {
            const enhancedText = isBilingualMode() ? usageContext.modern_relevance : addContextEmoji(usageContext.modern_relevance);
            html += `
                <div class="modern-relevance-feature">
                    <div class="feature-header">
                        <i class="fas fa-lightbulb feature-icon"></i>
                        <span class="feature-label">${languageLabel('Modern Relevance', '现代语境')}</span>
                    </div>
                    <div class="feature-content">${renderLanguageText(enhancedText)}</div>
                </div>
            `;
        }
        
        // Regional Variations
        if (usageContext.regional_variations && typeof usageContext.regional_variations === 'object' && !Array.isArray(usageContext.regional_variations)) {
            const regionEntries = Object.entries(usageContext.regional_variations);
            if (regionEntries.length > 0) {
                html += '<div class="regional-section">';
                html += `<div class="section-header"><i class="fas fa-globe"></i> ${languageLabel('Regional Variations', '地区差异')}</div>`;
                
                const flagMap = {
                    'UK': '🇬🇧', 'US': '🇺🇸', 'USA': '🇺🇸', 'United States': '🇺🇸',
                    'Australia': '🇦🇺', 'AU': '🇦🇺', 'Canada': '🇨🇦', 'CA': '🇨🇦',
                    'India': '🇮🇳', 'IN': '🇮🇳', 'Ireland': '🇮🇪', 'IE': '🇮🇪',
                    'New Zealand': '🇳🇿', 'NZ': '🇳🇿', 'South Africa': '🇿🇦', 'ZA': '🇿🇦'
                };
                
                html += '<div class="regional-cards">';
                regionEntries.forEach(([region, description]) => {
                    const flag = flagMap[region] || '🌐';
                    html += `
                        <div class="region-card">
                            <div class="region-flag">${flag}</div>
                            <div class="region-name">${escapeHtml(region)}</div>
                            <div class="region-text">${renderLanguageText(description)}</div>
                        </div>
                    `;
                });
                html += '</div>';
                
                html += '</div>';
            }
        }
        
        // Common Confusions
        const commonConfusions = englishUsageContext && englishUsageContext.common_confusions
            ? englishUsageContext.common_confusions
            : usageContext.common_confusions;

        if (commonConfusions && commonConfusions.length) {
            html += '<div class="confusion-section">';
            html += `<div class="section-header"><i class="fas fa-exclamation-triangle"></i> ${languageLabel('Commonly Confused With', '易混淆词')}</div>`;
            html += '<div class="confusion-chips">';
            
            commonConfusions.forEach(word => {
                const safeWord = escapeHtml(word);
                html += `<button class="confusion-chip" data-confused-word="${safeWord}"><span class="confusion-chip-text">${safeWord}</span><i class="fas fa-arrows-alt-h confusion-chip-icon"></i></button>`;
            });
            
            html += '</div>';
            html += '<div class="confusion-detail-container"></div>';
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    }

    function renderConfusionScaffold(searchedWord, confusedWord) {
        return `
            <div class="wcd-wrap">
                <div class="wcd-slot-meta">
                    <div class="wcd-skeleton wcd-skeleton-meta"></div>
                </div>
                <div class="wcd-slot-card-a">
                    <div class="wcd-skeleton wcd-skeleton-card"></div>
                </div>
                <div class="wcd-bridge">
                    <div class="wcd-bridge-line"></div>
                    <div class="wcd-bridge-badge">
                        <span class="wcd-bridge-word-a">${searchedWord}</span>
                        <span class="wcd-bridge-vs">VS</span>
                        <span class="wcd-bridge-word-b">${confusedWord}</span>
                    </div>
                    <div class="wcd-bridge-line"></div>
                </div>
                <div class="wcd-slot-card-b">
                    <div class="wcd-skeleton wcd-skeleton-card"></div>
                </div>
            </div>
        `;
    }

    function renderConfusionMeta(meta, searchedWord, confusedWord) {
        const { confusion_type, quick_rule, key_differentiator, difficulty } = meta;

        const difficultyConfig = {
            low:    { color: '#10b981', label: 'Easy to tell apart', icon: 'fa-check-circle' },
            medium: { color: '#f59e0b', label: 'Often confused',     icon: 'fa-exclamation-circle' },
            high:   { color: '#ef4444', label: 'Very easily mixed',  icon: 'fa-times-circle' }
        };
        const diff = difficultyConfig[difficulty] || { color: '#94a3b8', label: difficulty || 'Unknown', icon: 'fa-circle' };

        const typeIcons = {
            'near_homophone':     'fa-volume-up',
            'semantic_overlap':   'fa-project-diagram',
            'spelling_similarity':'fa-spell-check',
            'false_friend':       'fa-mask',
            'register_mismatch':  'fa-sliders-h'
        };
        const typeLabels = {
            'near_homophone':     'Sounds alike',
            'semantic_overlap':   'Meaning overlap',
            'spelling_similarity':'Similar spelling',
            'false_friend':       'False friend',
            'register_mismatch':  'Register mismatch'
        };
        const typeIcon  = typeIcons[confusion_type]  || 'fa-question-circle';
        const typeLabel = typeLabels[confusion_type] || confusion_type;

        let html = `
            <div class="wcd-meta-bar">
                <span class="wcd-type-pill"><i class="fas ${typeIcon}"></i> ${typeLabel}</span>
                <span class="wcd-diff-pill" style="background:${diff.color}18;color:${diff.color};border-color:${diff.color}40">
                    <i class="fas ${diff.icon}"></i> ${diff.label}
                </span>
            </div>
        `;

        html += '<div class="wcd-insights">';
        if (quick_rule) {
            html += `<div class="wcd-insight wcd-insight-rule"><i class="fas fa-bolt wcd-insight-icon"></i><div class="wcd-insight-body"><span class="wcd-insight-label">Quick Rule</span><span class="wcd-insight-text">${makeWordsClickable(quick_rule)}</span></div></div>`;
        }
        if (key_differentiator) {
            html += `<div class="wcd-insight wcd-insight-diff"><i class="fas fa-not-equal wcd-insight-icon"></i><div class="wcd-insight-body"><span class="wcd-insight-label">Key Difference</span><span class="wcd-insight-text">${makeWordsClickable(key_differentiator)}</span></div></div>`;
        }
        html += '</div>';

        return html;
    }

    function renderWordCard(profileData, examplesData, wordLabel, side, posMatch, formalityMatch) {
        const posHighlight = !posMatch ? 'wcd-attr-diff' : 'wcd-attr-same';

        const posIcons = { verb: 'fa-running', noun: 'fa-cube', adjective: 'fa-paint-brush', adverb: 'fa-tachometer-alt', preposition: 'fa-arrows-alt', conjunction: 'fa-link', interjection: 'fa-comment-dots' };
        const posIcon  = posIcons[profileData.part_of_speech] || 'fa-tag';

        let html = `<div class="wcd-word-card wcd-card-${side}">`;

        html += `
            <div class="wcd-card-header">
                <span class="wcd-card-word">${wordLabel}</span>
                <div class="wcd-card-attrs">
                    <span class="wcd-attr-pill ${posHighlight}"><i class="fas ${posIcon}"></i> ${profileData.part_of_speech}</span>
                </div>
            </div>
        `;

        html += `
            <div class="wcd-card-meaning">
                <i class="fas fa-book-open wcd-field-icon"></i>
                <span>${makeWordsClickable(profileData.core_meaning)}</span>
            </div>
        `;

        if (examplesData && examplesData.example_sentences && examplesData.example_sentences.length) {
            html += `
                <div class="wcd-card-example">
                    <i class="fas fa-quote-left wcd-field-icon"></i>
                    <em>${makeWordsClickable(examplesData.example_sentences[0])}</em>
                </div>
            `;
        } else if (!examplesData) {
            html += `<div class="wcd-card-example-skeleton wcd-skeleton"></div>`;
        }

        if (examplesData && examplesData.usage_note) {
            html += `
                <div class="wcd-card-usage-note">
                    <i class="fas fa-lightbulb wcd-field-icon"></i>
                    <span>${makeWordsClickable(examplesData.usage_note)}</span>
                </div>
            `;
        }

        if (profileData.collocations && profileData.collocations.length) {
            html += `
                <div class="wcd-card-section">
                    <div class="wcd-card-section-label"><i class="fas fa-link"></i> Goes with</div>
                    <div class="wcd-card-chips">${profileData.collocations.map(c => `<span class="wcd-colloc-chip">${c}</span>`).join('')}</div>
                </div>
            `;
        }

        if (profileData.typical_domains && profileData.typical_domains.length) {
            html += `
                <div class="wcd-card-section">
                    <div class="wcd-card-section-label"><i class="fas fa-layer-group"></i> Used in</div>
                    <div class="wcd-card-chips">${profileData.typical_domains.map(d => `<span class="wcd-domain-chip">${d}</span>`).join('')}</div>
                </div>
            `;
        }

        if (profileData.grammar_note) {
            html += `
                <div class="wcd-card-grammar">
                    <i class="fas fa-cogs wcd-field-icon"></i>
                    <span>${makeWordsClickable(profileData.grammar_note)}</span>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }
 
    // Helper function to render phrase chips for video search
    function renderPhraseChips(phrases, word) {
        if (!phrases || phrases.length === 0) {
            return `<div class="no-data">${t('noCommonPhrases')}</div>`;
        }

        const phraseButtons = phrases.map(phrase => {
            return `
                <div class="phrase-chip-wrapper">
                    <button class="phrase-chip" data-phrase="${phrase}" data-word="${word}">
                        <i class="fas fa-comment-dots"></i>
                        <span>${escapeHtml(phrase)}</span>
                    </button>
                    <button class="ai-video-btn" data-phrase="${phrase}" data-word="${word}" title="${t('generateAiVideo')}" aria-label="${t('generateAiVideo')}">
                        <i class="fas fa-robot"></i>
                    </button>
                </div>
            `;
        }).join('');

        return `
            <div class="phrase-chips-container">
                <div class="phrase-chips-header">
                    <i class="fas fa-lightbulb"></i>
                    <span>${t('clickPhraseToFindVideos')}</span>
                </div>
                <div class="phrase-chips-list">
                    ${phraseButtons}
                </div>
                <div class="phrase-chips-hint">
                    <i class="fas fa-info-circle"></i>
                    <span>${t('videosLoadSelectedPhrase')}</span>
                </div>
            </div>
        `;
    }

    // Helper function to render Bilibili videos
    function renderVideoResourcesEmptyState() {
        return `
            <div class="video-resources-empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-play-circle"></i>
                </div>
                <div class="empty-state-title">${t('tapPhraseToLoadVideos')}</div>
                <div class="empty-state-description">
                    ${t('goToPhrasesForVideos')}
                </div>
            </div>
        `;
    }

    function renderVideoResources(videoGroups) {
        if (!videoGroups || videoGroups.length === 0) {
            return `<div class="no-data">${t('noVideoResources')}</div>`;
        }

        let html = '<div class="video-resources-container">';
        
        videoGroups.forEach(group => {
            const { type, phrase, videos } = group;
            
            if (type === 'bilibili') {
                html += `
                    <div class="video-resource-group bilibili-group">
                        <div class="video-resource-header">
                            <div class="video-resource-title">
                                <i class="fab fa-bilibili bilibili-icon"></i>
                                <span>${t('bilibiliVideos')}</span>
                            </div>
                            <span class="video-resource-badge">${t(videos.length === 1 ? 'videoCount' : 'videoCountPlural', { count: videos.length })}</span>
                        </div>
                        <div class="video-resource-description">
                            ${t('watchRealWorldExamples')}
                        </div>
                        ${renderBilibiliVideos(videos)}
                    </div>
                `;
            } else if (type === 'ai-generated') {
                html += `
                    <div class="video-resource-group ai-group">
                        <div class="video-resource-header">
                            <div class="video-resource-title">
                                <i class="fas fa-robot ai-icon"></i>
                                <span>${t('aiGeneratedConversation')}</span>
                            </div>
                            <span class="video-resource-badge">${t('aiGenerated')}</span>
                        </div>
                        <div class="video-resource-description">
                            ${t('learnThroughAiConversation')}
                        </div>
                        ${renderAIVideos(videos)}
                    </div>
                `;
            }
        });
        
        html += '</div>';
        return html;
    }
    
    function renderConversationScript(conversationScript) {
        if (!conversationScript) return '';
        
        const { scenario, dialogue, phrase_explanation } = conversationScript;
        
        if (!scenario && (!dialogue || dialogue.length === 0) && !phrase_explanation) {
            return '';
        }
        
        let html = '<div class="conversation-script-container">';
        
        // Scenario Section
        if (scenario) {
            html += `
                <div class="conversation-section">
                    <div class="conversation-header">
                        <i class="fas fa-theater-masks"></i>
                        <span>${t('scenario')}</span>
                    </div>
                    <div class="conversation-scenario">
                        ${scenario}
                    </div>
                </div>
            `;
        }
        
        // Dialogue Section
        if (dialogue && dialogue.length > 0) {
            html += `
                <div class="conversation-section">
                    <div class="conversation-header">
                        <i class="fas fa-comments"></i>
                        <span>${t('dialogue')}</span>
                    </div>
                    <div class="conversation-dialogue">
                        ${dialogue.map(line => `
                            <div class="dialogue-line">
                                <div class="dialogue-character">${line.character}:</div>
                                <div class="dialogue-text">${line.text}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Phrase Explanation Section
        if (phrase_explanation) {
            html += `
                <div class="conversation-section">
                    <div class="conversation-header">
                        <i class="fas fa-lightbulb"></i>
                        <span>${t('explanation')}</span>
                    </div>
                    <div class="conversation-explanation">
                        ${phrase_explanation}
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }
    
    function renderAIVideos(videos) {
        if (!videos || videos.length === 0) {
            return `<div class="ai-videos-container"><div class="no-data">${t('aiVideosComingSoon')}</div></div>`;
        }

        const video = videos[0]; // Assuming one video for now

        if (video.status === 'pending' || video.status === 'processing') {
            const progress = video.progress || 0;
            const message = video.message || t('generatingVideo');
            
            return `
                <div class="ai-videos-container">
                    <div class="ai-video-status">
                        <div class="ai-status-icon">
                            <i class="fas fa-robot"></i>
                        </div>
                        <div class="ai-status-text">${t('creatingYourVideo')}</div>
                        <div class="ai-status-subtext">${message}</div>
                        <div class="ai-progress-container">
                            <div class="ai-progress-bar" style="width: ${progress}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (video.status === 'completed' && video.video_url) {
            return `
                <div class="ai-videos-container">
                    <div class="ai-video-player-container">
                        <video class="ai-video-player" controls autoplay playsinline>
                            <source src="${video.video_url}" type="video/mp4">
                            ${t('browserNoVideo')}
                        </video>
                    </div>
                    <div class="video-info" style="padding: 1rem 0;">
                        <h4 class="video-title">${t('aiGeneratedExplanation')}</h4>
                        <div class="video-description">
                            ${t('customAiExplanation', { phrase: escapeHtml(video.phrase || 'this phrase') })}
                        </div>
                    </div>
                </div>
            `;
        }
        
        return `<div class="ai-videos-container"><div class="error-message">${t('unknownVideoStatus')}</div></div>`;
    }

    async function checkExistingVideos(word, phrase) {
        try {
            const baseUrl = config.api.host || '';
            const url = `${baseUrl}/api/ai_phrase_videos?word=${encodeURIComponent(word)}&phrase=${encodeURIComponent(phrase)}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                return [];
            }
            
            const data = await response.json();
            return data.videos || [];
        } catch (error) {
            console.error('Error checking existing videos:', error);
            return [];
        }
    }

    function showGenerateButton(headerHtml, phrase, word) {
        videoResourcesContent.innerHTML = headerHtml + `
            <div class="ai-videos-container">
                <div class="ai-generate-prompt" style="text-align: center; padding: 3rem 1rem;">
                    <div class="ai-prompt-icon" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1.5rem; opacity: 0.8;">
                        <i class="fas fa-robot"></i>
                    </div>
                    <h3 style="margin-bottom: 0.5rem; color: var(--text-color);">${t('readyToGenerate')}</h3>
                    <p style="margin-bottom: 2rem; color: var(--text-light);">${t('createCustomAiVideo', { phrase: escapeHtml(phrase) })}</p>
                    <button id="start-generation-btn" style="
                        padding: 0.8rem 1.8rem; 
                        font-size: 1rem; 
                        border-radius: 50px; 
                        background: var(--primary-color); 
                        color: white; 
                        border: none; 
                        cursor: pointer; 
                        display: inline-flex; 
                        align-items: center; 
                        gap: 0.8rem; 
                        font-weight: 600;
                        box-shadow: 0 4px 12px rgba(20, 184, 166, 0.2);
                        transition: all 0.2s ease;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(20, 184, 166, 0.3)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(20, 184, 166, 0.2)'">
                        <i class="fas fa-magic"></i> ${t('generateAiVideo')}
                    </button>
                </div>
            </div>
        `;
        
        const btn = document.getElementById('start-generation-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                videoResourcesContent.innerHTML = headerHtml + renderAIVideos([{
                    status: 'pending',
                    progress: 0,
                    message: t('initializingGeneration')
                }]);
                
                startAIVideoGeneration(phrase, word)
                    .then(result => {
                        console.log('API Response:', result);
                        const { task_id, conversation_script } = result;
                        console.log('Conversation Script:', conversation_script);
                        
                        const conversationHtml = renderConversationScript(conversation_script);
                        console.log('Conversation HTML length:', conversationHtml.length);
                        videoResourcesContent.innerHTML = headerHtml + conversationHtml + renderAIVideos([{
                            status: 'pending',
                            progress: 5,
                            message: t('generatingVideo')
                        }]);
                        
                        pollVideoStatus(task_id, phrase, word, headerHtml, conversation_script);
                    })
                    .catch(err => {
                        console.error('Error starting AI video generation:', err);
                        videoResourcesContent.innerHTML = headerHtml + `
                            <div class="error-message">${t('failedToStartGeneration', { message: escapeHtml(err.message) })}</div>
                        `;
                    });
            });
        }
    }

    async function startAIVideoGeneration(phrase, word, options = {}) {
        try {
            const requestBody = {
                word: word || "placeholder",
                section: 'ai_generated_phrase_video',
                phrase: phrase
            };
            
            if (options.style) requestBody.style = options.style;
            if (options.duration) requestBody.duration = options.duration;
            if (options.resolution) requestBody.resolution = options.resolution;
            if (options.ratio) requestBody.ratio = options.ratio;
            
            const response = await fetch(config.api.getUrl('dictionary'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            console.log('Full API Response:', JSON.stringify(data, null, 2));
            if (data.error) {
                throw new Error(data.error);
            }

            const videoData = data.ai_generated_phrase_video;
            console.log('Video Data:', JSON.stringify(videoData, null, 2));
            return {
                task_id: videoData.task_id,
                conversation_script: data.conversation_script || null,
                style: videoData.style,
                duration: videoData.duration,
                resolution: videoData.resolution,
                ratio: videoData.ratio
            };
        } catch (error) {
            console.error('Error in startAIVideoGeneration:', error);
            throw error;
        }
    }

    async function pollVideoStatus(taskId, phrase, word, headerHtml, conversationScript = null) {
        const pollInterval = 2000;
        let attempts = 0;
        const maxAttempts = 60;
        
        const conversationHtml = renderConversationScript(conversationScript);

        const poll = async () => {
            if (attempts >= maxAttempts) {
                videoResourcesContent.innerHTML = headerHtml + conversationHtml + `
                    <div class="error-message">${t('videoGenerationTimeout')}</div>
                `;
                return;
            }

            try {
                const response = await fetch(config.api.getUrl('dictionary'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        word: word || "placeholder",
                        section: 'video_status',
                        task_id: taskId
                    })
                });

                if (!response.ok) throw new Error('Network response was not ok');
                
                const data = await response.json();
                
                if (data.error || !data.success) {
                    videoResourcesContent.innerHTML = headerHtml + conversationHtml + `
                        <div class="error-message">${t('statusError', { message: escapeHtml(data.error || t('unknownError')) })}</div>
                    `;
                    return;
                }
                
                if (data.status === 'completed') {
                    videoResourcesContent.innerHTML = headerHtml + conversationHtml + renderAIVideos([{
                        status: 'completed',
                        video_url: data.video_url,
                        phrase: phrase
                    }]);
                } else if (data.status === 'failed') {
                     videoResourcesContent.innerHTML = headerHtml + conversationHtml + `
                        <div class="error-message">${t('videoGenerationFailed', { message: escapeHtml(data.error || t('unknownError')) })}</div>
                    `;
                } else {
                    const progress = data.progress || Math.min((attempts / maxAttempts) * 100, 95);
                    const message = data.message || t('processingVideo');
                    
                    videoResourcesContent.innerHTML = headerHtml + conversationHtml + renderAIVideos([{
                        status: 'pending',
                        progress: progress,
                        message: message
                    }]);
                    
                    attempts++;
                    setTimeout(poll, pollInterval);
                }

            } catch (error) {
                console.error('Error polling video status:', error);
                videoResourcesContent.innerHTML = headerHtml + conversationHtml + `
                    <div class="error-message">${t('failedToCheckVideoStatus', { message: escapeHtml(error.message) })}</div>
                `;
            }
        };

        poll();
    }

    function renderBilibiliVideos(videos) {
        if (!videos || videos.length === 0) {
            return `<div class="bilibili-empty-state">
                <div class="bilibili-empty-state-icon"><i class="fab fa-bilibili"></i></div>
                <div class="bilibili-empty-state-title">${t('noVideosThisTime')}</div>
                <div class="bilibili-empty-state-desc">${t('noVideosForThisPhrase')}</div>
            </div>`;
        }

        const videoCards = videos.map(video => {
            const durationFormatted = formatDuration(video.duration);
            const pubDate = new Date(video.pubdate * 1000).toLocaleDateString();
            const viewCount = formatNumber(video.view);
            const likeCount = formatNumber(video.like);
            
            // Extract BVID from video URL or use provided bvid
            const bvidMatch = video.video_url.match(/\/(BV[0-9A-Za-z]+)/);
            const bvid = bvidMatch ? bvidMatch[1] : video.bvid;

            console.log(`Rendering video: ${video.title} (BVID: ${bvid})`);

            // Extract time parameter from video URL if present
            const timeMatch = video.video_url.match(/[?&]t=(\d+)/);
            const timeParam = timeMatch ? `&t=${timeMatch[1]}` : '';

            return `
                <div class="bilibili-video-card">
                    <div class="video-thumbnail">
                        <iframe 
                            src="//player.bilibili.com/player.html?bvid=${bvid}&page=1&autoplay=0&high_quality=0&danmaku=0${timeParam}"
                            scrolling="no" 
                            border="0" 
                            frameborder="no" 
                            framespacing="0" 
                            allowfullscreen="true"
                            style="width: 100%; height: 100%; border-radius: var(--radius-sm);">
                        </iframe>
                        <div class="video-play-overlay" style="display: none;">
                            <i class="fab fa-bilibili"></i>
                        </div>
                    </div>
                    <div class="video-info">
                        <h4 class="video-title">
                            <a href="${video.video_url}" target="_blank" rel="noopener noreferrer">
                                ${video.title}
                            </a>
                        </h4>
                        <div class="video-meta">
                            <span class="video-author">
                                <i class="fas fa-user"></i> ${video.author}
                            </span>
                            <span class="video-date">
                                <i class="fas fa-calendar"></i> ${pubDate}
                            </span>
                        </div>
                        <div class="video-stats">
                             <span class="video-views">
                                 <i class="fas fa-eye"></i> ${viewCount}
                             </span>
                             <span class="video-likes">
                                 <i class="fas fa-heart"></i> ${likeCount}
                             </span>
                         </div>
                         ${video.description ? 
                             `<div class="video-description">${video.description}</div>` : ''}
                         <div class="video-matched-phrases">
                             <div class="matched-phrases-header">
                                 <i class="fas fa-quote-left"></i>
                                 <span>Matched Phrases</span>
                             </div>
                             <div class="matched-phrases-list">
                                 ${video.matched_phrase && video.matched_phrase.trim() ? 
                                     `<span class="matched-phrase-tag">${video.matched_phrase}</span>` : 
                                     '<span class="no-matched-phrases">No matched phrases found</span>'}
                             </div>
                         </div>
                     </div>
                </div>
            `;
        }).join('');

        return `<div class="bilibili-videos-grid">${videoCards}</div>`;
    }

    // Helper function to format duration in MM:SS
    function formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // Helper function to format large numbers
    function formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    async function fetchSection(word, section, indexOrEntryIndex = null, senseIndex = null, extraParams = {}) {
        const apiUrl = config.api.getUrl('dictionary');
        const body = { word, section, ...extraParams };
        
        if (section === 'detailed_sense' || section === 'examples' || section === 'usage_notes') {
            if (senseIndex !== null && indexOrEntryIndex !== null) {
                // 2D indexing: entry_index + sense_index
                body.entry_index = indexOrEntryIndex;
                body.sense_index = senseIndex;
            } else if (indexOrEntryIndex !== null && section === 'detailed_sense') {
                // DEPRECATED: Flat indexing for backward compatibility
                body.index = indexOrEntryIndex;
            }
        } else if (['etymology', 'word_family', 'usage_context', 'cultural_notes', 'frequency'].includes(section)) {
            if (indexOrEntryIndex !== null) {
                body.entry_index = indexOrEntryIndex;
            }
        } else if (indexOrEntryIndex !== null) {
            body.index = indexOrEntryIndex;
        }

        if (shouldRequestBilingualSection(section)) {
            body.lang = BILINGUAL_LANG;
        }
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const error = new Error(`Failed to fetch ${section}: status ${response.status}`);
            error.status = response.status;
            error.section = section;
            throw error;
        }
        
        const responseData = await response.json();
        
        if (!responseData.success) {
            const error = new Error(responseData.error || `Failed to fetch ${section}`);
            error.section = section;
            throw error;
        }
        
        // Extract metadata fields
        const cacheStatus = responseData._cache_status || 'miss';
        const cacheAge = responseData._cache_age_seconds || 0;
        const waitedForInflight = responseData._waited_for_inflight || false;
        
        return {
            data: responseData,
            cacheStatus,
            cacheAge,
            waitedForInflight
        };
    }

    // Store current entry data globally for entry switching
    let currentWordData = null;
    let currentWord = null;
    let currentSelectedEntry = 0;

    class AnimationOrchestrator {
        static SECTION_STAGGER = 40;

        static HEADER_SEQUENCE = [
            ['h2.word-headword',                     'anim-slide-up',    0],
            ['.word-pos-badge, .word-pronunciation', 'anim-fade-in',    40],
            ['.word-frequency, #entryTabsContainer', 'anim-fade-in',    80],
            ['nav.sticky-tabs',                      'anim-slide-down', 120],
        ];

        playSearchReveal() {
            this._crossFade();
            AnimationOrchestrator.HEADER_SEQUENCE.forEach(([sel, cls, delay]) => {
                this._animateEl(document.querySelector(sel), cls, delay);
            });
            const sections = document.querySelectorAll('.accordion-section');
            sections.forEach((el, i) => {
                this._animateEl(el, 'anim-slide-up', 160 + i * AnimationOrchestrator.SECTION_STAGGER);
            });
        }

        playHeadwordReveal() {
            this._animateEl(document.querySelector('h2.word-headword'), 'anim-slide-up', 0);
            this._animateEl(document.querySelector('.word-pos-badge, .word-pronunciation'), 'anim-fade-in', 40);
        }

        _animateEl(el, cls, delayMs) {
            if (!el) return;
            el.style.animationDelay = `${delayMs}ms`;
            el.classList.remove(cls);
            void el.offsetWidth; // forces reflow — required to restart CSS animation on re-search
            el.classList.add(cls);
            el.addEventListener('animationend', () => {
                el.classList.remove(cls);
                el.style.animationDelay = '';
            }, { once: true });
        }

        _crossFade() {
            const loading = document.getElementById('loadingContainer');
            const results = document.getElementById('resultsContainer');

            if (loading && loading.style.display !== 'none') {
                loading.classList.add('anim-fade-out');
                loading.addEventListener('animationend', () => {
                    loading.style.display = 'none';
                    loading.classList.remove('anim-fade-out');
                }, { once: true });
            }

            if (results) {
                results.style.display = '';
                this._animateEl(results, 'anim-fade-in', 0);
            }
        }
    }

    const orchestrator = new AnimationOrchestrator();

    function isLookupNotFoundError(error) {
        const message = error && error.message ? error.message : '';
        return error && (
            error.status === 404 ||
            /not found|no result|no entry|no definition|status 404|\(404\)/i.test(message)
        );
    }

    async function handleSearch({ skipBrowserHistory = false, skipSearchHistory = false } = {}) {
        const query = searchInput.value.trim();
        if (!query) {
            searchInput.focus();
            searchInput.classList.add('shake');
            setTimeout(() => searchInput.classList.remove('shake'), 500);
            return;
        }

        prepareSearchSubmit();
        
        showEmptyState(false);
        showResults(false);
        showLoading(true);
        clearResults();
        
        try {
            const basicResult = await fetchSection(query, 'basic');
            const basicData = basicResult.data;
            const cacheStatus = basicResult.cacheStatus;
            
            showLoading(false, cacheStatus);
            
            if (cacheStatus === 'stale') {
                showStaleRefreshBadge(basicResult.cacheAge);
                console.log('⚠️ Cache hit (stale, refreshing)');
            } else if (cacheStatus === 'miss') {
                console.log('🌐 Cache miss');
            } else {
                console.log('✅ Cache hit (fresh)');
            }
            if (!basicData || !basicData.headword) {
                showEmptyState(true);
                return;
            }
            
            currentWordData = basicData;
            currentWord = query;
            currentSelectedEntry = 0;
            
            if (!skipSearchHistory) {
                addToSearchHistory(query);
            }
            
            if (!skipBrowserHistory) {
                const currentQ = new URLSearchParams(window.location.search).get('q');
                if (currentQ && currentQ.toLowerCase() === query.toLowerCase()) {
                    window.history.replaceState({ word: query }, '', `?q=${encodeURIComponent(query)}`);
                } else {
                    window.history.pushState({ word: query }, '', `?q=${encodeURIComponent(query)}`);
                }
            }
            
            updateHeadwordAndPronunciation(basicData, 0);
            renderEntrySelector(basicData);
            orchestrator.playSearchReveal();
            
            showSectionLoading(definitionsContent, 'cards');
            showSectionLoading(etymologyContent, 'text');
            showSectionLoading(synonymsContent, 'chips');
            showSectionLoading(culturalContent, 'text');
            showSectionLoading(usageContent, 'text');
            showSectionLoading(wordFamilyContent, 'chips');
            showSectionLoading(commonPhrasesContent, 'chips');
            showSectionLoading(videoResourcesContent, 'default');
            
            if (accordionSections.length > 0) {
                DeepLinks._suppressToggle = true;
                accordionSections.forEach(section => section.open = false);
                accordionSections[0].open = true;
                DeepLinks._suppressToggle = false;
            }
            if (tabLinks.length > 0) {
                activateTab('definitions-section');
            }

            loadEntryContent(query, 0, basicData);
            // Restore section-only hash tokens immediately (accordion open + scroll)
            // Sense and compare restoration happens after their respective sections load
            const _parsedHash = DeepLinks.parseHash();
            if (_parsedHash && _parsedHash.type === 'section') {
                // Wait one frame for DOM to update after showResults
                requestAnimationFrame(() => DeepLinks.restoreFromHash(activateTab));
            }
            
            searchInput.blur();
            
        } catch (error) {
            showLoading(false);
            showEmptyState(true);
            if (isLookupNotFoundError(error)) {
                console.log('Dictionary lookup returned no result:', query);
                return;
            }

            console.error('Search error:', error);
        }
    }
    
    function loadEntryContent(word, entryIndex, basicData) {
        const entryData = basicData.entries ? basicData.entries[entryIndex] : null;
        
        wordFrequency.style.display = 'flex';
        frequency.textContent = '';
        frequency.className = 'frequency-loading';

        fetchSection(word, 'frequency', entryIndex).then(result => {
            const data = result.data;
            frequency.className = '';
            if (data.frequency) {
                const freqText = data.frequency
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                const zhFrequency = getZhTextValue(data.frequency_zh, 'frequency');
                frequency.textContent = isBilingualMode() && hasContent(zhFrequency) ? zhFrequency : freqText;
                wordFrequency.style.display = 'flex';
            } else {
                wordFrequency.style.display = 'none';
            }
        }).catch(err => {
            console.error('Error fetching frequency:', err);
            frequency.className = '';
            wordFrequency.style.display = 'none';
        });
        
        fetchSection(word, 'etymology', entryIndex).then(result => {
            const data = result.data;
            if (data.etymology) {
                const selectedEtymology = getLocalizedValue(data.etymology, getZhData(data.etymology_zh, 'etymology'));
                let etymologyHtml = '';
                const etymologyText = typeof selectedEtymology === 'string'
                    ? selectedEtymology
                    : selectedEtymology && selectedEtymology.etymology;
                const rootAnalysis = selectedEtymology && typeof selectedEtymology === 'object'
                    ? selectedEtymology.root_analysis
                    : '';

                if (etymologyText) {
                    etymologyHtml += `<div class="etymology-text">${isBilingualMode() ? escapeHtml(etymologyText) : highlightEtymologyTerms(etymologyText)}</div>`;
                }
                if (rootAnalysis) {
                    const label = t('rootAnalysis');
                    etymologyHtml += `<div class="root-analysis"><div class="etymology-label">${label}</div><div>${renderLanguageText(rootAnalysis)}</div></div>`;
                }
                etymologyContent.innerHTML = etymologyHtml || `<div class="no-data">${t('noEtymology')}</div>`;
            } else {
                etymologyContent.innerHTML = `<div class="no-data">${t('noEtymology')}</div>`;
            }
        }).catch(err => {
            console.error('Error fetching etymology:', err);
            etymologyContent.innerHTML = `<div class="error-message">${t('failedEtymology')}</div>`;
        });
        
        fetchSection(word, 'cultural_notes', entryIndex).then(result => {
            const data = result.data;
            if (data.cultural_notes) {
                const selectedCulturalNotes = getLocalizedValue(data.cultural_notes, getZhData(data.cultural_notes_zh, 'cultural_notes'));
                culturalContent.innerHTML = renderCulturalNotes(selectedCulturalNotes);
            } else {
                culturalContent.innerHTML = `<div class="no-data">${t('noCulturalNotes')}</div>`;
            }
        }).catch(err => {
            console.error('Error fetching cultural_notes:', err);
            culturalContent.innerHTML = `<div class="error-message">${t('failedCulturalNotes')}</div>`;
        });
        
        fetchSection(word, 'usage_context', entryIndex).then(result => {
            const data = result.data;
            if (data.usage_context) {
                const selectedUsageContext = getLocalizedValue(data.usage_context, getZhData(data.usage_context_zh, 'usage_context'));
                usageContent.innerHTML = enhanceUsageContext(selectedUsageContext, data.usage_context);
            } else {
                usageContent.innerHTML = `<div class="no-data">${t('noUsageContext')}</div>`;
            }
            // Restore comparison deep link if present
            const _compareParsed = DeepLinks.parseHash();
            if (_compareParsed && _compareParsed.type === 'compare') {
                requestAnimationFrame(() => DeepLinks.restoreFromHash(activateTab));
            }
        }).catch(err => {
            console.error('Error fetching usage_context:', err);
            usageContent.innerHTML = `<div class="error-message">${t('failedUsageContext')}</div>`;
            // Still attempt restore in case usage loaded but chip wasn't found
            const _compareParsed = DeepLinks.parseHash();
            if (_compareParsed && _compareParsed.type === 'compare') {
                requestAnimationFrame(() => DeepLinks.restoreFromHash(activateTab));
            }
        });
        
        fetchSection(word, 'word_family', entryIndex).then(result => {
            const data = result.data;
            if (data.word_family && data.word_family.word_family && data.word_family.word_family.length) {
                const displayWords = data.word_family.word_family.slice(0, 20);
                wordFamilyContent.innerHTML = `<div class="word-family-tags">${renderEnglishLookupTags(displayWords, 'word-tag')}</div>`;
            } else {
                wordFamilyContent.innerHTML = `<div class="no-data">${t('noWordFamily')}</div>`;
            }
        }).catch(err => {
            console.error('Error fetching word_family:', err);
            wordFamilyContent.innerHTML = `<div class="error-message">${t('failedWordFamily')}</div>`;
        });
        
        fetchSection(word, 'common_phrases').then(result => {
            const data = result.data;
            const cacheStatus = result.cacheStatus;
            
            if (cacheStatus === 'stale') {
                console.log('⚠️ Cache hit (stale) for common_phrases');
            } else if (cacheStatus === 'miss') {
                console.log('🌐 Cache miss for common_phrases');
            } else {
                console.log('✅ Cache hit (fresh) for common_phrases');
            }
            
            if (data.common_phrases && data.common_phrases.length) {
                commonPhrasesContent.innerHTML = renderPhraseChips(data.common_phrases, word);
            } else {
                commonPhrasesContent.innerHTML = `<div class="no-data">${t('noCommonPhrases')}</div>`;
            }
        }).catch(err => {
            console.error('Error fetching common_phrases:', err);
            commonPhrasesContent.innerHTML = `<div class="error-message">${t('failedCommonPhrases')}</div>`;
        });
        
        videoResourcesContent.innerHTML = renderVideoResourcesEmptyState();
        
        loadSensesForEntry(word, entryIndex, entryData);
    }
    
    function loadSensesForEntry(word, entryIndex, entryData) {
        const totalSensesToLoad = entryData ? entryData.total_senses : 0;
        
        if (!totalSensesToLoad) {
            definitionsContent.innerHTML = `<div class="no-data">${t('noDefinitionsForForm')}</div>`;
            synonymsContent.innerHTML = `<div class="no-data">${t('noSynonymsAntonyms')}</div>`;
            return;
        }
        
        const preloadedSenses = [];
        if (entryData && entryData.meanings_summary) {
            entryData.meanings_summary.forEach((meaning, meaningIndex) => {
                if (meaning.senses && Array.isArray(meaning.senses)) {
                    meaning.senses.forEach((sense, senseIndex) => {
                        const zh = getBasicSenseZh(currentWordData || {}, entryIndex, meaningIndex, senseIndex);
                        preloadedSenses.push({
                            ...sense,
                            part_of_speech: meaning.part_of_speech,
                            ...(zh ? { zh } : {})
                        });
                    });
                }
            });
        }
        
        definitionsContent.innerHTML = `<div class="senses-list"></div>`;
        const sensesList = definitionsContent.querySelector('.senses-list');
        
        const allSynonyms = new Set();
        const allAntonyms = new Set();
        
        for (let i = 0; i < totalSensesToLoad; i++) {
            const senseItem = document.createElement('div');
            senseItem.className = 'sense-item-container';
            senseItem.dataset.senseIndex = i;
            senseItem.dataset.entryIndex = entryIndex;
            senseItem.dataset.word = word;
            
            if (preloadedSenses[i]) {
                const basicSense = preloadedSenses[i];
                const displaySense = getLocalizedSense(basicSense, basicSense.zh);
                
                let senseToRender = displaySense;
                let isDetailed = false;
                
                senseItem.innerHTML = renderSenseHTML(senseToRender, i, isDetailed);
                
                senseItem.dataset.basicSense = JSON.stringify(senseToRender);
                
                if (senseToRender.synonyms) senseToRender.synonyms.filter(s => s && s.trim()).forEach(s => allSynonyms.add(s));
                if (senseToRender.antonyms) senseToRender.antonyms.filter(a => a && a.trim()).forEach(a => allAntonyms.add(a));
            } else {
                senseItem.innerHTML = `<div class="sense-placeholder-basic">
                    <div class="sense-definition"><strong>${i + 1}.</strong> ${t('definitionNotAvailable')}</div>
                    <button class="sense-detail-btn" data-sense-index="${i}" title="${t('loadFullDefinition')}">
                        <i class="fas fa-download"></i> ${t('loadDefinition')}
                    </button>
                </div>`;
            }
            
            sensesList.appendChild(senseItem);
        }
        
        updateSynonymsSection(allSynonyms, allAntonyms);
        
        attachDetailButtonHandlers();
        // Restore sense deep link if present
        const _senseParsed = DeepLinks.parseHash();
        if (_senseParsed && _senseParsed.type === 'sense') {
            requestAnimationFrame(() => DeepLinks.restoreFromHash(activateTab));
        }
    }
    
    function attachDetailButtonHandlers() {
        document.querySelectorAll('.sense-detail-btn').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.preventDefault();
                const senseIndex = parseInt(this.dataset.senseIndex);
                DeepLinks.updateHash(`definitions-${senseIndex}`);
                const senseItem = this.closest('.sense-item-container');
                const word = senseItem.dataset.word;
                const entryIndex = parseInt(senseItem.dataset.entryIndex);
                
                const basicSenseJson = senseItem.dataset.basicSense;
                if (basicSenseJson) {
                    try {
                        const basicSense = JSON.parse(basicSenseJson);
                        senseItem.innerHTML = renderSenseHTML(basicSense, senseIndex, false, '');
                        const actionsDiv = senseItem.querySelector('.sense-actions');
                        if (actionsDiv) {
                            actionsDiv.innerHTML = `<div class="sense-detailed-badge sense-loading-badge"><i class="fas fa-spinner fa-spin"></i> ${t('loadingDetails')}</div>`;
                        }
                    } catch (e) {
                        console.warn('Failed to parse basic sense data:', e);
                    }
                } else {
                    const actionsDiv = this.closest('.sense-actions');
                    if (actionsDiv) {
                        actionsDiv.innerHTML = `<div class="sense-detailed-badge sense-loading-badge"><i class="fas fa-spinner fa-spin"></i> ${t('loadingDetails')}</div>`;
                    }
                }
                
                try {
                    const [senseResult, examplesResult, usageNotesResult] = await Promise.all([
                        fetchSection(word, 'detailed_sense', entryIndex, senseIndex),
                        fetchSection(word, 'examples', entryIndex, senseIndex),
                        fetchSection(word, 'usage_notes', entryIndex, senseIndex)
                    ]);
                    
                    const senseData = senseResult.data;
                    const examplesData = examplesResult.data;
                    const usageNotesData = usageNotesResult.data;

                    const detailedSense = senseData.detailed_sense;
                    
                    if (examplesData.examples && examplesData.examples.length) {
                        detailedSense.examples = examplesData.examples;
                    }
                    if (examplesData.collocations && examplesData.collocations.length) {
                        detailedSense.collocations = examplesData.collocations;
                    }
                    if (usageNotesData.usage_notes) {
                        detailedSense.usage_notes = usageNotesData.usage_notes;
                    }
                    const displayDetailedSense = getLocalizedSense(detailedSense, buildDetailedSenseZh(senseData, examplesData, usageNotesData));
                    
                    const entryData = currentWordData.entries[entryIndex];
                    const pronunciationHtml = renderInlinePronunciation(entryData);
                    
                    senseItem.innerHTML = renderSenseHTML(displayDetailedSense, senseIndex, true);
                    
                    setTimeout(() => {
                        const badge = senseItem.querySelector('.sense-detailed-badge');
                        if (badge) {
                            badge.remove();
                        }
                    }, 3000);
                    
                    const sensesList = senseItem.closest('.senses-list');
                    const allSynonyms = new Set();
                    const allAntonyms = new Set();
                    
                    sensesList.querySelectorAll('.sense-item-container').forEach(item => {
                        const synTags = item.querySelectorAll('.sense-synonyms .synonym-tag');
                        synTags.forEach(tag => { const t = tag.textContent; if (t && t.trim()) allSynonyms.add(t); });
                        
                        const antTags = item.querySelectorAll('.sense-antonyms .antonym-tag');
                        antTags.forEach(tag => { const t = tag.textContent; if (t && t.trim()) allAntonyms.add(t); });
                    });
                    
                    updateSynonymsSection(allSynonyms, allAntonyms);
                } catch (err) {
                    console.error(`Error loading detailed sense ${senseIndex}:`, err);
                    const actionsDiv = senseItem.querySelector('.sense-actions');
                    if (actionsDiv) {
                        actionsDiv.innerHTML = `<button class="sense-detail-btn" data-sense-index="${senseIndex}" title="${t('loadDetailedInfo')}"><i class="fas fa-exclamation-triangle"></i> ${t('failedRetry')}</button>`;
                        attachDetailButtonHandlers();
                    }
                }
            });
        });
    }
    
    function renderEntrySelector(basicData) {
        const hasMultipleEntries = basicData.total_entries && basicData.total_entries > 1;
        
        entryTabsContainer.innerHTML = '';
        
        if (!hasMultipleEntries) {
            entryTabsContainer.style.display = 'none';
            return;
        }
        
        entryTabsContainer.style.display = 'block';
        
        const currentEntry = basicData.entries[currentSelectedEntry || 0];
        const currentZhEntry = findBasicZhEntry(basicData, currentSelectedEntry || 0);
        const currentMeanings = isBilingualMode() && currentZhEntry ? currentZhEntry.meanings_summary : currentEntry.meanings_summary;
        const currentPos = currentMeanings.map(m => m.part_of_speech).filter(Boolean).join(', ');
        const currentText = t('formLabel', {
            index: (currentSelectedEntry || 0) + 1,
            pos: currentPos,
            count: currentEntry.total_senses,
            senseLabel: t(currentEntry.total_senses === 1 ? 'senseSingular' : 'sensePlural')
        });
        
        const selectorHTML = `
            <div class="entry-dropdown-container">
                <div class="entry-dropdown-custom" id="entryDropdownCustom">
                    <span class="dropdown-selected">${currentText}</span>
                    <i class="fas fa-chevron-down dropdown-arrow"></i>
                </div>
                <div class="dropdown-menu" id="dropdownMenu" style="display: none;">
                    ${basicData.entries.map((entry, idx) => {
                        const zhEntry = findBasicZhEntry(basicData, idx);
                        const meanings = isBilingualMode() && zhEntry ? zhEntry.meanings_summary : entry.meanings_summary;
                        const posLabels = meanings.map(m => m.part_of_speech).filter(Boolean).join(', ');
                        const text = t('formLabel', {
                            index: idx + 1,
                            pos: posLabels,
                            count: entry.total_senses,
                            senseLabel: t(entry.total_senses === 1 ? 'senseSingular' : 'sensePlural')
                        });
                        const isSelected = idx === (currentSelectedEntry || 0);
                        return `<div class="dropdown-option ${isSelected ? 'selected' : ''}" data-index="${idx}">${text}</div>`;
                    }).join('')}
                </div>
            </div>
        `;
        
        entryTabsContainer.innerHTML = selectorHTML;
        
        const dropdownContainer = entryTabsContainer.querySelector('.entry-dropdown-container');
        const dropdownCustom = document.getElementById('entryDropdownCustom');
        const dropdownMenu = document.getElementById('dropdownMenu');
        const options = dropdownMenu.querySelectorAll('.dropdown-option');

        // Teleport dropdown to <body> to escape overflow:hidden on .word-header and body.
        dropdownMenu.parentNode.removeChild(dropdownMenu);
        dropdownMenu.style.position = 'fixed';
        dropdownMenu.style.zIndex = '9999';
        dropdownMenu.style.display = 'none';
        document.body.appendChild(dropdownMenu);

        function positionDropdownMenu() {
            const rect = dropdownCustom.getBoundingClientRect();
            const menuWidth = Math.min(rect.width, window.innerWidth - 16);
            const top = rect.bottom + 8;
            const left = Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8));
            dropdownMenu.style.top = `${Math.round(top)}px`;
            dropdownMenu.style.left = `${Math.round(left)}px`;
            dropdownMenu.style.width = `${Math.round(menuWidth)}px`;
        }

        dropdownCustom.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = dropdownMenu.style.display === 'block';
            dropdownMenu.style.display = isVisible ? 'none' : 'block';
            if (isVisible) {
                dropdownContainer.classList.remove('active');
            } else {
                dropdownContainer.classList.add('active');
                positionDropdownMenu();
            }
        });
        
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const entryIndex = parseInt(option.dataset.index);
                
                dropdownMenu.style.display = 'none';
                dropdownContainer.classList.remove('active');
                
                switchToEntry(entryIndex);
            });
        });
        
        document.addEventListener('click', (e) => {
            if (!dropdownContainer.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.style.display = 'none';
                dropdownContainer.classList.remove('active');
            }
        });

        window.addEventListener('scroll', () => {
            if (dropdownMenu.style.display === 'block') {
                dropdownMenu.style.display = 'none';
                dropdownContainer.classList.remove('active');
            }
        }, { passive: true });
    }
    
    function switchToEntry(entryIndex) {
        if (entryIndex === currentSelectedEntry) return;
        
        currentSelectedEntry = entryIndex;
        
        // dropdownMenu is teleported to document.body, so query it there
        const dropdownMenu = document.getElementById('dropdownMenu');
        const options = dropdownMenu ? dropdownMenu.querySelectorAll('.dropdown-option') : [];
        let selectedText = '';

        if (options.length > 0) {
            options.forEach(option => {
                option.classList.remove('selected');
                if (parseInt(option.dataset.index) === entryIndex) {
                    option.classList.add('selected');
                    selectedText = option.textContent;
                }
            });
        }

        const selectedTextEl = entryTabsContainer.querySelector('.dropdown-selected');
        if (selectedTextEl && selectedText) {
            selectedTextEl.textContent = selectedText;
        }

        const dropdownContainer = entryTabsContainer.querySelector('.entry-dropdown-container');

        if (dropdownMenu) {
            dropdownMenu.style.display = 'none';
        }
        if (dropdownContainer) {
            dropdownContainer.classList.remove('active');
        }
        
        updateHeadwordAndPronunciation(currentWordData, entryIndex);
        orchestrator.playHeadwordReveal();
        
        showSectionLoading(definitionsContent, 'cards');
        showSectionLoading(etymologyContent, 'text');
        showSectionLoading(synonymsContent, 'chips');
        showSectionLoading(culturalContent, 'text');
        showSectionLoading(usageContent, 'text');
        showSectionLoading(wordFamilyContent, 'chips');
        showSectionLoading(videoResourcesContent, 'default');
        
        loadEntryContent(currentWord, entryIndex, currentWordData);
    }
    
    function updateSynonymsSection(allSynonyms, allAntonyms) {
        const synList = Array.from(allSynonyms).filter(s => s && s.trim());
        const antList = Array.from(allAntonyms).filter(a => a && a.trim());
        if (synList.length > 0 || antList.length > 0) {
            let html = '<div class="synonyms-grid">';
            if (synList.length > 0) {
                html += `<div class="synonym-group">
                    <div class="synonym-group-header"><i class="fas fa-equals"></i> ${languageLabel('Synonyms', '近义词')}</div>
                    <div class="synonyms-list">${renderEnglishLookupTags(synList, 'synonym-tag')}</div>
                </div>`;
            }
            if (antList.length > 0) {
                html += `<div class="synonym-group">
                    <div class="synonym-group-header antonym-header"><i class="fas fa-not-equal"></i> ${languageLabel('Antonyms', '反义词')}</div>
                    <div class="antonyms-list">${renderEnglishLookupTags(antList, 'antonym-tag')}</div>
                </div>`;
            }
            html += '</div>';
            synonymsContent.innerHTML = html;
        } else {
            synonymsContent.innerHTML = `<div class="no-data">${languageLabel('No synonyms or antonyms available', '暂无近义词或反义词')}</div>`;
        }
    }

    // Example search buttons
    const exampleBtns = document.querySelectorAll('.example-btn');
    exampleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            searchInput.value = btn.dataset.word;
            handleSearch();
        });
    });

    searchButton.addEventListener('click', (e) => {
        handleSearch();
    });
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // History panel toggle
    const historyToggleBtn = document.getElementById('historyToggleBtn');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');
    const historyOverlay = document.getElementById('historyOverlay');
    const clearAllHistoryBtn = document.getElementById('clearAllHistoryBtn');
    
    if (historyToggleBtn) {
        historyToggleBtn.addEventListener('click', openHistoryPanel);
    }
    
    if (closeHistoryBtn) {
        closeHistoryBtn.addEventListener('click', closeHistoryPanel);
    }
    
    if (historyOverlay) {
        historyOverlay.addEventListener('click', closeHistoryPanel);
    }
    
    if (clearAllHistoryBtn) {
        clearAllHistoryBtn.addEventListener('click', () => {
            if (confirm(t('clearAllHistoryConfirm'))) {

                
                // Clear history
                localStorage.removeItem(HISTORY_KEY);
                
                updateSearchHistoryUI();
            }
        });
    }
    
    // Close panel with ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const panel = document.getElementById('historyPanel');
            if (panel && panel.classList.contains('active')) {
                closeHistoryPanel();
            }
        }
    });
    
    // Sticky Tab & Scroll Handling
    function activateTab(targetId) {
        tabLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${targetId}`) {
                link.classList.add('active');
            }
        });
    }

    if (tabLinks.length > 0 && accordionSections.length > 0) {
        // Click handler for tabs
        tabLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const targetSection = document.getElementById(targetId);
                
                if (targetSection) {
                    // Open accordion if closed
                    targetSection.open = true;
                    
                    const stickyTabsHeight = stickyTabs ? stickyTabs.offsetHeight : 0;
                    const headerOffset = stickyTabsHeight + 48;
                    const elementPosition = targetSection.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: "smooth"
                    });
                    
                    activateTab(targetId);
                }
            });
        });
        
        // Scroll spy
        window.addEventListener('scroll', () => {
            let current = '';
            const stickyTabsHeight = stickyTabs ? stickyTabs.offsetHeight : 0;
            const viewportTriggerPoint = stickyTabsHeight + 50;
            
            accordionSections.forEach(section => {
                const rect = section.getBoundingClientRect();
                const isSectionVisible = rect.top <= viewportTriggerPoint && rect.bottom > viewportTriggerPoint;
                
                if (isSectionVisible) {
                    current = section.getAttribute('id');
                }
            });
            
            if (current) {
                activateTab(current);
            }
        });
    }

    // Update hash when user manually toggles an accordion section
    accordionSections.forEach(section => {
        section.addEventListener('toggle', () => {
            if (DeepLinks._suppressToggle) return;
            const sectionId = section.getAttribute('id');
            const token = DeepLinks.SECTION_TO_TOKEN[sectionId];
            if (section.open && token) {
                DeepLinks.updateHash(token);
            } else if (!section.open) {
                // Closing: only clear hash if this section owns the current hash
                const currentToken = window.location.hash.replace(/^#/, '');
                if (token && currentToken === token) {
                    DeepLinks.updateHash('');
                }
            }
        });
    });
    
    // Adjust placeholder text for mobile
    function updatePlaceholder() {
        if (window.innerWidth <= 480) {
            searchInput.placeholder = t('searchPlaceholderMobile');
        } else if (window.innerWidth <= 768) {
            searchInput.placeholder = t('searchPlaceholderTablet');
        } else {
            searchInput.placeholder = t('searchPlaceholderDesktop');
        }
    }
    
    // Set placeholder on load and resize
    updatePlaceholder();
    window.addEventListener('resize', updatePlaceholder);
    
    // Initial state
    showResults(false);
    showLoading(false);
    showEmptyState(true);
    
    // Initialize search history UI
    updateSearchHistoryUI();

    function debounce(func, wait) {
        return function(...args) {
            clearTimeout(suggestionDebounceTimer);
            suggestionDebounceTimer = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function highlightMatch(text, query) {
        if (!query) return text;
        const safeQuery = escapeRegExp(query);
        const regex = new RegExp(`(${safeQuery})`, 'gi');
        return text.replace(regex, '<strong>$1</strong>');
    }

    function clampNumber(value, min, max) {
        return Math.max(min, Math.min(value, max));
    }

    function positionSuggestionsDropdown() {
        if (!suggestionsDropdown || !suggestionsAnchor || !suggestionsDropdown.classList.contains('active')) return;

        const anchorRect = suggestionsAnchor.getBoundingClientRect();
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const edgeGap = viewportWidth < 640 ? 8 : 12;
        const dropdownGap = viewportWidth < 640 ? 6 : 8;
        const width = Math.min(Math.max(anchorRect.width, 260), viewportWidth - edgeGap * 2);
        const left = clampNumber(anchorRect.left, edgeGap, viewportWidth - width - edgeGap);
        const belowSpace = viewportHeight - anchorRect.bottom - dropdownGap - edgeGap;
        const aboveSpace = anchorRect.top - dropdownGap - edgeGap;
        const preferredHeight = Math.min(440, Math.max(300, suggestionsDropdown.scrollHeight || 300));
        const placeAbove = belowSpace < Math.min(260, preferredHeight) && aboveSpace > belowSpace;
        const availableHeight = Math.max(180, placeAbove ? aboveSpace : belowSpace);
        const maxHeight = Math.min(preferredHeight, availableHeight);
        const top = placeAbove
            ? Math.max(edgeGap, anchorRect.top - dropdownGap - maxHeight)
            : Math.min(anchorRect.bottom + dropdownGap, viewportHeight - edgeGap - Math.min(maxHeight, 180));

        suggestionsDropdown.style.setProperty('--suggestions-left', `${Math.round(left)}px`);
        suggestionsDropdown.style.setProperty('--suggestions-top', `${Math.round(top)}px`);
        suggestionsDropdown.style.setProperty('--suggestions-width', `${Math.round(width)}px`);
        suggestionsDropdown.style.setProperty('--suggestions-max-height', `${Math.round(maxHeight)}px`);
    }

    function scheduleSuggestionsDropdownPosition() {
        if (!suggestionsDropdown || !suggestionsDropdown.classList.contains('active')) return;
        requestAnimationFrame(positionSuggestionsDropdown);
    }

    function closeSuggestions() {
        suggestionRequestToken++;
        clearTimeout(suggestionDebounceTimer);
        if (suggestionsDropdown) {
            suggestionsDropdown.classList.remove('active');
            suggestionsDropdown.innerHTML = '';
            suggestionsDropdown.removeAttribute('style');
            currentFocus = -1;
            searchInput.setAttribute('aria-expanded', 'false');
            searchInput.removeAttribute('aria-activedescendant');
        }
    }

    function prepareSearchSubmit() {
        closeSuggestions();
        if (searchInput) {
            searchInput.blur();
            requestAnimationFrame(() => searchInput.blur());
        }
    }

    async function fetchSuggestions(query) {
        if (!query || query.length < 2) {
            closeSuggestions();
            return;
        }

        const requestToken = ++suggestionRequestToken;

        try {
            if (!suggestionsDropdown.classList.contains('active') || suggestionsDropdown.querySelector('.suggestions-error')) {
                suggestionsDropdown.innerHTML = `
                    <div class="suggestions-loading">
                        <div class="spinner-small"></div>
                        <span>${t('loadingSuggestions')}</span>
                    </div>
                `;
                suggestionsDropdown.classList.add('active');
                searchInput.setAttribute('aria-expanded', 'true');
                positionSuggestionsDropdown();
            }

            const apiUrl = config.api.getUrl('suggest');
            const response = await fetch(`${apiUrl}?q=${encodeURIComponent(query)}&limit=15`);
            
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();

            if (requestToken !== suggestionRequestToken || searchInput.value.trim() !== query) {
                return;
            }
            
            if (data.success && data.suggestions && data.suggestions.length > 0) {
                renderSuggestions(data.suggestions, query);
            } else {
                renderNoSuggestions();
            }
        } catch (error) {
            if (requestToken !== suggestionRequestToken) return;
            console.error('Error fetching suggestions:', error);
            closeSuggestions();
        }
    }

    function renderSuggestions(suggestions, query) {
        if (!suggestionsDropdown) return;
        
        const html = suggestions.map((suggestion, index) => `
            <div class="suggestion-item" data-value="${suggestion}" role="option" id="suggestion-${index}">
                <i class="fas fa-search suggestion-icon"></i>
                <span class="suggestion-text">${highlightMatch(suggestion, query)}</span>
            </div>
        `).join('');
        
        suggestionsDropdown.innerHTML = html;
        suggestionsDropdown.classList.add('active');
        searchInput.setAttribute('aria-expanded', 'true');
        positionSuggestionsDropdown();
        currentFocus = -1;

        suggestionsDropdown.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                const value = this.getAttribute('data-value');
                selectSuggestion(value);
            });
        });
    }

    function renderNoSuggestions() {
        suggestionsDropdown.innerHTML = `<div class="suggestions-empty">${t('noSuggestions')}</div>`;
        suggestionsDropdown.classList.add('active');
        searchInput.setAttribute('aria-expanded', 'true');
        positionSuggestionsDropdown();
    }

    function selectSuggestion(value) {
        searchInput.value = value;
        prepareSearchSubmit();
        handleSearch();
    }

    function addActive(items) {
        if (!items) return false;
        removeActive(items);
        if (currentFocus >= items.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (items.length - 1);
        
        items[currentFocus].classList.add('selected');
        items[currentFocus].setAttribute('aria-selected', 'true');
        items[currentFocus].scrollIntoView({ block: 'nearest' });
        
        searchInput.setAttribute('aria-activedescendant', items[currentFocus].id);
    }

    function removeActive(items) {
        for (let i = 0; i < items.length; i++) {
            items[i].classList.remove('selected');
            items[i].removeAttribute('aria-selected');
        }
        searchInput.removeAttribute('aria-activedescendant');
    }

    if (searchInput) {
        searchInput.addEventListener('input', debounce(function(e) {
            const query = this.value.trim();
            if (query.length >= 2) {
                fetchSuggestions(query);
            } else {
                closeSuggestions();
            }
        }, 300));

        searchInput.addEventListener('keydown', function(e) {
            const dropdown = suggestionsDropdown;
            if (!dropdown || !dropdown.classList.contains('active')) return;

            const items = dropdown.querySelectorAll('.suggestion-item');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                currentFocus++;
                addActive(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                currentFocus--;
                addActive(items);
            } else if (e.key === 'Enter') {
                if (currentFocus > -1) {
                    e.preventDefault();
                    if (items[currentFocus]) {
                        items[currentFocus].click();
                    }
                } else {
                    closeSuggestions();
                }
            } else if (e.key === 'Escape') {
                closeSuggestions();
            }
        });
        
        document.addEventListener('click', function(e) {
            if (e.target !== searchInput && e.target !== suggestionsDropdown && !suggestionsDropdown.contains(e.target)) {
                closeSuggestions();
            }
        });

        window.addEventListener('resize', scheduleSuggestionsDropdownPosition);
        window.addEventListener('scroll', scheduleSuggestionsDropdownPosition, true);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', scheduleSuggestionsDropdownPosition);
            window.visualViewport.addEventListener('scroll', scheduleSuggestionsDropdownPosition);
        }
    }
});
