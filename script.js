// script.js for Advanced English Dictionary
// Handles search, fetches data from API, and updates UI responsively

// Audio Manager - handles Howler.js playback with one-at-a-time behavior
const AudioManager = {
    currentSound: null,
    currentButton: null,
    
    play(audioUrl, buttonElement) {
        // Stop current sound if playing
        if (this.currentSound) {
            this.currentSound.stop();
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
        
        // Create new Howl instance
        this.currentSound = new Howl({
            src: [audioUrl],
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
    
    updateButtonState(button, isPlaying) {
        const icon = button.querySelector('i');
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

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
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
    let suggestionDebounceTimer;
    let currentFocus = -1;

    const stickyTabs = document.getElementById('stickyTabs');
    const tabLinks = stickyTabs ? stickyTabs.querySelectorAll('.tab-link') : [];
    const accordionSections = document.querySelectorAll('.accordion-section');

    const HISTORY_KEY = 'dict_search_history';
    const MAX_HISTORY_ITEMS = 10;
    const THEME_KEY = 'dict_theme';

    function applyTheme(theme) {
        if (theme) {
            document.documentElement.setAttribute('data-theme', theme);
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        document.querySelectorAll('.theme-swatch').forEach(swatch => {
            swatch.classList.toggle('active', (swatch.dataset.theme || '') === (theme || ''));
        });
    }

    function initTheme() {
        const validThemes = new Set(
            Array.from(document.querySelectorAll('.theme-swatch')).map(s => s.dataset.theme || '')
        );
        const configTheme = config.app.theme || '';
        const saved = sessionStorage.getItem(THEME_KEY);
        const savedIsValid = saved !== null && validThemes.has(saved);
        const resolvedTheme = savedIsValid ? saved : configTheme;
        if (!savedIsValid && saved !== null) {
            sessionStorage.setItem(THEME_KEY, resolvedTheme);
        }
        applyTheme(resolvedTheme);
    }

    initTheme();

    const speedDial = document.getElementById('speedDial');
    const speedDialBtn = document.getElementById('speedDialBtn');
    const themePickerBtn = document.getElementById('themePickerBtn');
    const themePickerPanel = document.getElementById('themePickerPanel');

    function openSpeedDial() {
        speedDial.classList.add('open');
        speedDialBtn.setAttribute('aria-expanded', 'true');
    }

    function closeSpeedDial() {
        speedDial.classList.remove('open');
        speedDialBtn.setAttribute('aria-expanded', 'false');
        themePickerPanel.classList.remove('open');
        themePickerBtn.setAttribute('aria-expanded', 'false');
    }

    speedDialBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (speedDial.classList.contains('open')) {
            closeSpeedDial();
        } else {
            openSpeedDial();
        }
    });

    themePickerBtn.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = themePickerPanel.classList.toggle('open');
        themePickerBtn.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', e => {
        if (!speedDial.contains(e.target) && !themePickerPanel.contains(e.target)) {
            closeSpeedDial();
        }
    });

    themePickerPanel.addEventListener('click', e => {
        const swatch = e.target.closest('.theme-swatch');
        if (!swatch) return;
        const theme = swatch.dataset.theme || '';
        sessionStorage.setItem(THEME_KEY, theme);
        applyTheme(theme);
        themePickerPanel.classList.remove('open');
        themePickerBtn.setAttribute('aria-expanded', 'false');
        closeSpeedDial();
    });
    
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get('q');
    if (queryParam) {
        searchInput.value = queryParam;
        handleSearch();
    }
    
    function getSearchHistory() {
        try {
            const history = localStorage.getItem(HISTORY_KEY);
            return history ? JSON.parse(history) : [];
        } catch (err) {
            console.error('Error reading search history:', err);
            return [];
        }
    }
    
    function addToSearchHistory(word) {
        try {
            let history = getSearchHistory();
            
            // Remove if already exists (we'll add it to the front)
            history = history.filter(item => item.word.toLowerCase() !== word.toLowerCase());
            
            // Add to front with lowercased word
            history.unshift({
                word: word.toLowerCase(),
                timestamp: Date.now()
            });
            
            // Keep only MAX_HISTORY_ITEMS
            history = history.slice(0, MAX_HISTORY_ITEMS);
            
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
            
            updateSearchHistoryUI();
        } catch (err) {
            console.error('Error saving search history:', err);
        }
    }
    
    function updateSearchHistoryUI() {
        const history = getSearchHistory();
        const panelContent = document.getElementById('historyPanelContent');
        const badge = document.getElementById('historyBadge');
        
        if (!panelContent) return;
        
        // Update badge
        if (badge) {
            if (history.length > 0) {
                badge.textContent = history.length;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
        
        if (history.length === 0) {
            panelContent.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-clock"></i>
                    <p>No search history yet</p>
                </div>
            `;
            return;
        }
        
        panelContent.innerHTML = `
            <div class="history-items">
                ${history.map((item, index) => {
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
                            <button class="history-item-delete" data-index="${index}" title="Remove">
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
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return new Date(timestamp).toLocaleDateString();
    }
    
    function removeFromSearchHistory(index) {
        try {
            let history = getSearchHistory();
            
            // Remove from history
            history.splice(index, 1);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
            
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
                            <i class="fas fa-arrow-left"></i> Back
                        </button>
                        <div class="selected-phrase-info">
                            <i class="fas fa-robot"></i>
                            <span>AI Video for: <strong>"${phrase}"</strong></span>
                        </div>
                    </div>
                `;
                
                videoResourcesContent.innerHTML = headerHtml + `
                    <div class="ai-videos-container">
                        <div class="section-loading">
                            <div class="spinner"></div>
                            <p>Checking for existing video...</p>
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
                                        <i class="fas fa-arrow-left"></i> Back
                                    </button>
                                    <div class="selected-phrase-info">
                                        <i class="fas fa-quote-left"></i>
                                        <span>Videos for: <strong>"${phrase}"</strong></span>
                                    </div>
                                </div>
                            `;
                            videoResourcesContent.innerHTML = headerHtml + videoHtml;
                        } else {
                            videoResourcesContent.innerHTML = `
                                <div class="selected-phrase-header">
                                    <button class="back-to-phrases-btn" data-word="${word}">
                                        <i class="fas fa-arrow-left"></i> Back
                                    </button>
                                </div>
                                <div class="bilibili-empty-state">
                                    <div class="bilibili-empty-state-icon">
                                        <i class="fab fa-bilibili"></i>
                                    </div>
                                    <div class="bilibili-empty-state-title">No videos this time</div>
                                    <div class="bilibili-empty-state-desc">Couldn't find anything for <strong>"${phrase}"</strong> — maybe give another phrase a go 🌸</div>
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
                                    <div class="bilibili-empty-state-title">No videos this time</div>
                                    <div class="bilibili-empty-state-desc">Couldn't find anything for <strong>"${phrase}"</strong> — maybe give another phrase a go 🌸</div>
                                </div>`
                            : `<div class="bilibili-error-state">
                                    <div class="bilibili-error-state-icon"><i class="fas fa-circle-exclamation"></i></div>
                                    <div class="bilibili-error-state-title">Couldn't load videos</div>
                                    <div class="bilibili-error-state-desc">Something went wrong while searching for <strong>"${phrase}"</strong>. Please try again.</div>
                                </div>`;
                        videoResourcesContent.innerHTML = `
                            <div class="selected-phrase-header">
                                <button class="back-to-phrases-btn" data-word="${word}">
                                    <i class="fas fa-arrow-left"></i> Back
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
        
        const confusionChip = e.target.closest('.confusion-chip');
        if (confusionChip) {
            e.preventDefault();
            const confusedWord = confusionChip.dataset.confusedWord;
            if (!confusedWord || !currentWord) return;

            const allChips = document.querySelectorAll('.confusion-chip');
            allChips.forEach(c => c.classList.remove('active'));
            confusionChip.classList.add('active');

            const container = document.querySelector('.confusion-detail-container');
            if (!container) return;

            container.innerHTML = renderConfusionScaffold(currentWord, confusedWord);

            const metaSlot     = container.querySelector('.wcd-slot-meta');
            const cardASlot    = container.querySelector('.wcd-slot-card-a');
            const cardBSlot    = container.querySelector('.wcd-slot-card-b');

            let profilesData = null;
            let examplesData = null;

            function tryFillCards() {
                if (!profilesData) return;
                const posMatch = profilesData.searched_word.part_of_speech === profilesData.confused_word.part_of_speech;
                cardASlot.innerHTML = renderWordCard(profilesData.searched_word, examplesData ? examplesData.searched_word : null, currentWord, 'a', posMatch);
                cardBSlot.innerHTML = renderWordCard(profilesData.confused_word, examplesData ? examplesData.confused_word : null, confusedWord, 'b', posMatch);
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
                            metaSlot.innerHTML = renderConfusionMeta(meta, currentWord, confusedWord);
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
        badge.innerHTML = `<i class="fas fa-sync fa-spin"></i> Refreshing...`;
        
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
        resultsContainer.style.display = show ? 'block' : 'none';
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
    
    function renderSenseHTML(sense, index, isDetailed = false) {
        let metaBadges = '';
        if (sense.tone || (sense.usage_register && sense.usage_register.length) || (sense.domain && sense.domain.length)) {
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
                ${examplesList.map(ex => `<div class="example-item"><span class="example-arrow">→</span><em>${makeWordsClickable(ex)}</em></div>`).join('')}
            </div>` : '';
        
        const collocationsSection = sense.collocations && sense.collocations.length ?
            `<div class="sense-collocations"><strong>Common collocations:</strong><div class="collocation-tags">${sense.collocations.map(col => `<span class="collocation-tag" data-lookup-word="${col}">${col}</span>`).join('')}</div></div>` : '';
        
        const usageNotesSection = sense.usage_notes ? 
            `<div class="usage-notes"><strong>Usage notes:</strong> ${makeWordsClickable(sense.usage_notes)}</div>` : '';
        
        const detailsButton = !isDetailed ? 
            `<button class="sense-detail-btn" data-sense-index="${index}" title="Load detailed information">
                <i class="fas fa-info-circle"></i> View Details
            </button>` : 
            `<div class="sense-detailed-badge"><i class="fas fa-check-circle"></i> Detailed view loaded</div>`;
        
        return `
            <div class="sense-definition">
                <strong>${index + 1}.</strong> ${sense.part_of_speech ? `<span class="sense-pos">(${sense.part_of_speech})</span>` : ''} ${makeWordsClickable(sense.definition)}
            </div>
            ${metaBadges}
            ${examplesSection}
            ${usageNotesSection}
            ${collocationsSection}
            ${sense.synonyms && sense.synonyms.length ? `<div class="sense-synonyms"><strong>Synonyms:</strong><div class="synonym-tags">${sense.synonyms.map(syn => `<span class="synonym-tag" data-lookup-word="${syn}">${syn}</span>`).join('')}</div></div>` : ''}
            ${sense.antonyms && sense.antonyms.length ? `<div class="sense-antonyms"><strong>Antonyms:</strong><div class="antonym-tags">${sense.antonyms.map(ant => `<span class="antonym-tag" data-lookup-word="${ant}">${ant}</span>`).join('')}</div></div>` : ''}
            <div class="sense-actions">${detailsButton}</div>
        `;
    }
    
    // Helper function to render structured cultural notes
    function renderCulturalNotes(culturalNotesData) {
        if (!culturalNotesData) return '<div class="no-data">No cultural notes available</div>';
        
        const { historical_context, cultural_associations, social_perceptions } = culturalNotesData;
        
        // Check if we have any data
        if (!historical_context && (!cultural_associations || !cultural_associations.length) && 
            (!social_perceptions || !social_perceptions.length)) {
            return '<div class="no-data">No cultural notes available</div>';
        }
        
        let html = '<div class="cultural-notes-structured">';
        
        // Historical Context Section
        if (historical_context) {
            html += `
                <div class="cultural-section">
                    <div class="cultural-section-header">
                        <i class="fas fa-landmark"></i>
                        <span>Historical Context</span>
                    </div>
                    <div class="cultural-section-content">
                        <p>${makeWordsClickable(historical_context)}</p>
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
                        <span>Cultural Associations</span>
                    </div>
                    <div class="cultural-section-content">
                        <ul class="cultural-list">
                            ${cultural_associations.map(item => `<li>${makeWordsClickable(item)}</li>`).join('')}
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
                        <span>Social Perceptions</span>
                    </div>
                    <div class="cultural-section-content">
                        <ul class="cultural-list">
                            ${social_perceptions.map(item => `<li>${makeWordsClickable(item)}</li>`).join('')}
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
    function enhanceUsageContext(usageContext) {
        if (!usageContext) return '<div class="no-data">No usage context available</div>';
        
        let html = '<div class="usage-context-enhanced">';
        
        // Modern Relevance - Feature Box
        if (usageContext.modern_relevance) {
            const enhancedText = addContextEmoji(usageContext.modern_relevance);
            html += `
                <div class="modern-relevance-feature">
                    <div class="feature-header">
                        <i class="fas fa-lightbulb feature-icon"></i>
                        <span class="feature-label">Modern Relevance</span>
                    </div>
                    <div class="feature-content">${makeWordsClickable(enhancedText)}</div>
                </div>
            `;
        }
        
        // Regional Variations
        if (usageContext.regional_variations && typeof usageContext.regional_variations === 'object' && !Array.isArray(usageContext.regional_variations)) {
            const regionEntries = Object.entries(usageContext.regional_variations);
            if (regionEntries.length > 0) {
                html += '<div class="regional-section">';
                html += '<div class="section-header"><i class="fas fa-globe"></i> Regional Variations</div>';
                
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
                            <div class="region-name">${region}</div>
                            <div class="region-text">${makeWordsClickable(description)}</div>
                        </div>
                    `;
                });
                html += '</div>';
                
                html += '</div>';
            }
        }
        
        // Common Confusions
        if (usageContext.common_confusions && usageContext.common_confusions.length) {
            html += '<div class="confusion-section">';
            html += '<div class="section-header"><i class="fas fa-exclamation-triangle"></i> Commonly Confused With</div>';
            html += '<div class="confusion-chips">';
            
            usageContext.common_confusions.forEach(word => {
                html += `<button class="confusion-chip" data-confused-word="${word}"><span class="confusion-chip-text">${word}</span><i class="fas fa-arrows-alt-h confusion-chip-icon"></i></button>`;
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
            return '<div class="no-data">No common phrases available</div>';
        }

        const phraseButtons = phrases.map(phrase => {
            return `
                <div class="phrase-chip-wrapper">
                    <button class="phrase-chip" data-phrase="${phrase}" data-word="${word}">
                        <i class="fas fa-comment-dots"></i>
                        <span>${phrase}</span>
                    </button>
                    <button class="ai-video-btn" data-phrase="${phrase}" data-word="${word}" title="Generate AI Video">
                        <i class="fas fa-robot"></i>
                    </button>
                </div>
            `;
        }).join('');

        return `
            <div class="phrase-chips-container">
                <div class="phrase-chips-header">
                    <i class="fas fa-lightbulb"></i>
                    <span>Click a phrase to find videos:</span>
                </div>
                <div class="phrase-chips-list">
                    ${phraseButtons}
                </div>
                <div class="phrase-chips-hint">
                    <i class="fas fa-info-circle"></i>
                    <span>Videos will load based on your selected phrase</span>
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
                <div class="empty-state-title">Tap a phrase to load videos</div>
                <div class="empty-state-description">
                    Go to <strong>Phrases</strong> above and tap any phrase to see real-world usage examples
                </div>
            </div>
        `;
    }

    function renderVideoResources(videoGroups) {
        if (!videoGroups || videoGroups.length === 0) {
            return '<div class="no-data">No video resources available</div>';
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
                                <span>Bilibili Videos</span>
                            </div>
                            <span class="video-resource-badge">${videos.length} video${videos.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div class="video-resource-description">
                            Watch real-world usage examples from Bilibili content creators
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
                                <span>AI-Generated Conversation</span>
                            </div>
                            <span class="video-resource-badge">AI Generated</span>
                        </div>
                        <div class="video-resource-description">
                            Learn through AI-generated English conversations featuring this phrase
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
                        <span>Scenario</span>
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
                        <span>Dialogue</span>
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
                        <span>Explanation</span>
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
            return '<div class="ai-videos-container"><div class="no-data">AI-generated videos coming soon...</div></div>';
        }

        const video = videos[0]; // Assuming one video for now

        if (video.status === 'pending' || video.status === 'processing') {
            const progress = video.progress || 0;
            const message = video.message || 'Generating video...';
            
            return `
                <div class="ai-videos-container">
                    <div class="ai-video-status">
                        <div class="ai-status-icon">
                            <i class="fas fa-robot"></i>
                        </div>
                        <div class="ai-status-text">Creating Your Video</div>
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
                            Your browser does not support the video tag.
                        </video>
                    </div>
                    <div class="video-info" style="padding: 1rem 0;">
                        <h4 class="video-title">AI Generated Explanation</h4>
                        <div class="video-description">
                            Custom AI-generated video explanation for "${video.phrase || 'this phrase'}"
                        </div>
                    </div>
                </div>
            `;
        }
        
        return '<div class="ai-videos-container"><div class="error-message">Unknown video status</div></div>';
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
                    <h3 style="margin-bottom: 0.5rem; color: var(--text-color);">Ready to Generate</h3>
                    <p style="margin-bottom: 2rem; color: var(--text-light);">Create a custom AI video explanation for "${phrase}"</p>
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
                        <i class="fas fa-magic"></i> Generate AI Video
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
                    message: 'Initializing generation...'
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
                            message: 'Generating video...'
                        }]);
                        
                        pollVideoStatus(task_id, phrase, word, headerHtml, conversation_script);
                    })
                    .catch(err => {
                        console.error('Error starting AI video generation:', err);
                        videoResourcesContent.innerHTML = headerHtml + `
                            <div class="error-message">Failed to start video generation: ${err.message}</div>
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
                    <div class="error-message">Video generation timed out. Please try again later.</div>
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
                        <div class="error-message">Error getting status: ${data.error || 'Unknown error'}</div>
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
                        <div class="error-message">Video generation failed: ${data.error || 'Unknown error'}</div>
                    `;
                } else {
                    const progress = data.progress || Math.min((attempts / maxAttempts) * 100, 95);
                    const message = data.message || 'Processing video content...';
                    
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
                    <div class="error-message">Failed to check video status: ${error.message}</div>
                `;
            }
        };

        poll();
    }

    function renderBilibiliVideos(videos) {
        if (!videos || videos.length === 0) {
            return `<div class="bilibili-empty-state">
                <div class="bilibili-empty-state-icon"><i class="fab fa-bilibili"></i></div>
                <div class="bilibili-empty-state-title">No videos this time</div>
                <div class="bilibili-empty-state-desc">Nothing came up for this phrase — try another one 🌸</div>
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
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch ${section}`);
        }
        
        const responseData = await response.json();
        
        if (!responseData.success) {
            throw new Error(responseData.error || `Failed to fetch ${section}`);
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

    async function handleSearch() {
        const query = searchInput.value.trim();
        if (!query) {
            // Show a brief visual feedback that input is required
            searchInput.focus();
            searchInput.classList.add('shake');
            setTimeout(() => searchInput.classList.remove('shake'), 500);
            return;
        }
        
        closeSuggestions();
        
        showEmptyState(false);
        showResults(false);
        showLoading(true);
        clearResults();
        
        try {
            // Step 1: Fetch basic info first (fast ~0.5s)

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
            
            // Store current word data for entry switching
            currentWordData = basicData;
            currentWord = query;
            currentSelectedEntry = 0;
            
            // Add to search history
            addToSearchHistory(query);
            
            // Show results container immediately
            showResults(true);
            
            // Populate basic info
            updateHeadwordAndPronunciation(basicData, 0);
            
            // Render entry selector if multiple entries
            renderEntrySelector(basicData);
            
            // Show loading indicators for all sections
            showSectionLoading(definitionsContent, 'cards');
            showSectionLoading(etymologyContent, 'text');
            showSectionLoading(synonymsContent, 'chips');
            showSectionLoading(culturalContent, 'text');
            showSectionLoading(usageContent, 'text');
            showSectionLoading(wordFamilyContent, 'chips');
            showSectionLoading(commonPhrasesContent, 'chips');
            showSectionLoading(videoResourcesContent, 'default');
            
            // Ensure first section is open and active
            if (accordionSections.length > 0) {
                accordionSections.forEach(section => section.open = false);
                accordionSections[0].open = true;
            }
            if (tabLinks.length > 0) {
                activateTab('definitions-section'); // Assumes the first section ID
            }

            loadEntryContent(query, 0, basicData);
            
            // Blur the search input to prevent mobile zoom persistence
            searchInput.blur();
            
        } catch (error) {
            console.error('Search error:', error);
            showLoading(false);
            showEmptyState(true);
        }
    }
    
    function loadEntryContent(word, entryIndex, basicData) {
        const entryData = basicData.entries ? basicData.entries[entryIndex] : null;
        
        fetchSection(word, 'frequency', entryIndex).then(result => {
            const data = result.data;
            if (data.frequency) {
                const freqText = data.frequency
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                frequency.textContent = freqText;
                wordFrequency.style.display = 'flex';
            } else {
                wordFrequency.style.display = 'none';
            }
        }).catch(err => {
            console.error('Error fetching frequency:', err);
            wordFrequency.style.display = 'none';
        });
        
        fetchSection(word, 'etymology', entryIndex).then(result => {
            const data = result.data;
            if (data.etymology) {
                let etymologyHtml = '';
                if (data.etymology.etymology) {
                    etymologyHtml += `<div class="etymology-text">${highlightEtymologyTerms(data.etymology.etymology)}</div>`;
                }
                if (data.etymology.root_analysis) {
                    etymologyHtml += `<div class="root-analysis"><div class="etymology-label">Root Analysis</div><div>${makeWordsClickable(data.etymology.root_analysis)}</div></div>`;
                }
                etymologyContent.innerHTML = etymologyHtml || '<div class="no-data">No etymology information available</div>';
            } else {
                etymologyContent.innerHTML = '<div class="no-data">No etymology information available</div>';
            }
        }).catch(err => {
            console.error('Error fetching etymology:', err);
            etymologyContent.innerHTML = '<div class="error-message">Failed to load etymology</div>';
        });
        
        fetchSection(word, 'cultural_notes', entryIndex).then(result => {
            const data = result.data;
            if (data.cultural_notes) {
                culturalContent.innerHTML = renderCulturalNotes(data.cultural_notes);
            } else {
                culturalContent.innerHTML = '<div class="no-data">No cultural notes available</div>';
            }
        }).catch(err => {
            console.error('Error fetching cultural_notes:', err);
            culturalContent.innerHTML = '<div class="error-message">Failed to load cultural notes</div>';
        });
        
        fetchSection(word, 'usage_context', entryIndex).then(result => {
            const data = result.data;
            if (data.usage_context) {
                usageContent.innerHTML = enhanceUsageContext(data.usage_context);
            } else {
                usageContent.innerHTML = '<div class="no-data">No usage context available</div>';
            }
        }).catch(err => {
            console.error('Error fetching usage_context:', err);
            usageContent.innerHTML = '<div class="error-message">Failed to load usage context</div>';
        });
        
        fetchSection(word, 'word_family', entryIndex).then(result => {
            const data = result.data;
            if (data.word_family && data.word_family.word_family && data.word_family.word_family.length) {
                const displayWords = data.word_family.word_family.slice(0, 20);
                wordFamilyContent.innerHTML = `<div class="word-family-tags">${displayWords.map(wf => `<span class="word-tag" data-lookup-word="${wf}">${wf}</span>`).join('')}</div>`;
            } else {
                wordFamilyContent.innerHTML = '<div class="no-data">No word family available</div>';
            }
        }).catch(err => {
            console.error('Error fetching word_family:', err);
            wordFamilyContent.innerHTML = '<div class="error-message">Failed to load word family</div>';
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
                commonPhrasesContent.innerHTML = '<div class="no-data">No common phrases available</div>';
            }
        }).catch(err => {
            console.error('Error fetching common_phrases:', err);
            commonPhrasesContent.innerHTML = '<div class="error-message">Failed to load common phrases</div>';
        });
        
        videoResourcesContent.innerHTML = renderVideoResourcesEmptyState();
        
        loadSensesForEntry(word, entryIndex, entryData);
    }
    
    function loadSensesForEntry(word, entryIndex, entryData) {
        const totalSensesToLoad = entryData ? entryData.total_senses : 0;
        
        if (!totalSensesToLoad) {
            definitionsContent.innerHTML = '<div class="no-data">No definitions available for this form</div>';
            synonymsContent.innerHTML = '<div class="no-data">No synonyms or antonyms available</div>';
            return;
        }
        
        const preloadedSenses = [];
        if (entryData && entryData.meanings_summary) {
            entryData.meanings_summary.forEach(meaning => {
                if (meaning.senses && Array.isArray(meaning.senses)) {
                    meaning.senses.forEach(sense => {
                        preloadedSenses.push({
                            ...sense,
                            part_of_speech: meaning.part_of_speech
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
                
                let senseToRender = basicSense;
                let isDetailed = false;
                
                senseItem.innerHTML = renderSenseHTML(senseToRender, i, isDetailed);
                
                senseItem.dataset.basicSense = JSON.stringify(basicSense);
                
                if (senseToRender.synonyms) senseToRender.synonyms.forEach(s => allSynonyms.add(s));
                if (senseToRender.antonyms) senseToRender.antonyms.forEach(a => allAntonyms.add(a));
            } else {
                senseItem.innerHTML = `<div class="sense-placeholder-basic">
                    <div class="sense-definition"><strong>${i + 1}.</strong> Definition not available in basic response</div>
                    <button class="sense-detail-btn" data-sense-index="${i}" title="Load full definition">
                        <i class="fas fa-download"></i> Load Definition
                    </button>
                </div>`;
            }
            
            sensesList.appendChild(senseItem);
        }
        
        updateSynonymsSection(allSynonyms, allAntonyms);
        
        attachDetailButtonHandlers();
    }
    
    function attachDetailButtonHandlers() {
        document.querySelectorAll('.sense-detail-btn').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.preventDefault();
                const senseIndex = parseInt(this.dataset.senseIndex);
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
                            actionsDiv.innerHTML = '<div class="sense-detailed-badge sense-loading-badge"><i class="fas fa-spinner fa-spin"></i> Loading details...</div>';
                        }
                    } catch (e) {
                        console.warn('Failed to parse basic sense data:', e);
                    }
                } else {
                    const actionsDiv = this.closest('.sense-actions');
                    if (actionsDiv) {
                        actionsDiv.innerHTML = '<div class="sense-detailed-badge sense-loading-badge"><i class="fas fa-spinner fa-spin"></i> Loading details...</div>';
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
                    
                    const entryData = currentWordData.entries[entryIndex];
                    const pronunciationHtml = renderInlinePronunciation(entryData);
                    
                    senseItem.innerHTML = renderSenseHTML(detailedSense, senseIndex, true);
                    
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
                        synTags.forEach(tag => allSynonyms.add(tag.textContent));
                        
                        const antTags = item.querySelectorAll('.sense-antonyms .antonym-tag');
                        antTags.forEach(tag => allAntonyms.add(tag.textContent));
                    });
                    
                    updateSynonymsSection(allSynonyms, allAntonyms);
                } catch (err) {
                    console.error(`Error loading detailed sense ${senseIndex}:`, err);
                    const actionsDiv = senseItem.querySelector('.sense-actions');
                    if (actionsDiv) {
                        actionsDiv.innerHTML = '<button class="sense-detail-btn" data-sense-index="' + senseIndex + '" title="Load detailed information"><i class="fas fa-exclamation-triangle"></i> Failed - Retry</button>';
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
        const currentPos = currentEntry.meanings_summary.map(m => m.part_of_speech).join(', ');
        const currentText = `Form ${(currentSelectedEntry || 0) + 1}: ${currentPos} (${currentEntry.total_senses} sense${currentEntry.total_senses !== 1 ? 's' : ''})`;
        
        const selectorHTML = `
            <div class="entry-dropdown-container">
                <div class="entry-dropdown-custom" id="entryDropdownCustom">
                    <span class="dropdown-selected">${currentText}</span>
                    <i class="fas fa-chevron-down dropdown-arrow"></i>
                </div>
                <div class="dropdown-menu" id="dropdownMenu" style="display: none;">
                    ${basicData.entries.map((entry, idx) => {
                        const posLabels = entry.meanings_summary.map(m => m.part_of_speech).join(', ');
                        const text = `Form ${idx + 1}: ${posLabels} (${entry.total_senses} sense${entry.total_senses !== 1 ? 's' : ''})`;
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
        
        dropdownCustom.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = dropdownMenu.style.display === 'block';
            dropdownMenu.style.display = isVisible ? 'none' : 'block';
            if (isVisible) {
                dropdownContainer.classList.remove('active');
            } else {
                dropdownContainer.classList.add('active');
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
            if (!dropdownContainer.contains(e.target)) {
                dropdownMenu.style.display = 'none';
                dropdownContainer.classList.remove('active');
            }
        });
    }
    
    function switchToEntry(entryIndex) {
        if (entryIndex === currentSelectedEntry) return;
        
        currentSelectedEntry = entryIndex;
        
        const options = entryTabsContainer.querySelectorAll('.dropdown-option');
        if (options.length > 0) {
            let selectedText = '';
            
            options.forEach(option => {
                option.classList.remove('selected');
                if (parseInt(option.dataset.index) === entryIndex) {
                    option.classList.add('selected');
                    selectedText = option.textContent;
                }
            });
            
            const selectedTextEl = entryTabsContainer.querySelector('.dropdown-selected');
            if (selectedTextEl && selectedText) {
                selectedTextEl.textContent = selectedText;
            }
            
            const dropdownMenu = document.getElementById('dropdownMenu');
            const dropdownContainer = entryTabsContainer.querySelector('.entry-dropdown-container');
            
            if (dropdownMenu) {
                dropdownMenu.style.display = 'none';
            }
            if (dropdownContainer) {
                dropdownContainer.classList.remove('active');
            }
        }
        
        updateHeadwordAndPronunciation(currentWordData, entryIndex);
        
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
        if (allSynonyms.size > 0 || allAntonyms.size > 0) {
            let html = '<div class="synonyms-grid">';
            if (allSynonyms.size > 0) {
                html += `<div class="synonym-group">
                    <div class="synonym-group-header"><i class="fas fa-equals"></i> Synonyms</div>
                    <div class="synonyms-list">${Array.from(allSynonyms).map(s => `<span class="synonym-tag" data-lookup-word="${s}">${s}</span>`).join('')}</div>
                </div>`;
            }
            if (allAntonyms.size > 0) {
                html += `<div class="synonym-group">
                    <div class="synonym-group-header antonym-header"><i class="fas fa-not-equal"></i> Antonyms</div>
                    <div class="antonyms-list">${Array.from(allAntonyms).map(a => `<span class="antonym-tag" data-lookup-word="${a}">${a}</span>`).join('')}</div>
                </div>`;
            }
            html += '</div>';
            synonymsContent.innerHTML = html;
        } else {
            synonymsContent.innerHTML = '<div class="no-data">No synonyms or antonyms available</div>';
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
            if (confirm('Clear all search history?')) {

                
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
                    
                    // Scroll with offset
                    const headerOffset = 140; // Approx header + sticky tabs height
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
    
    // Adjust placeholder text for mobile
    function updatePlaceholder() {
        if (window.innerWidth <= 480) {
            searchInput.placeholder = 'Word or phrase';
        } else if (window.innerWidth <= 768) {
            searchInput.placeholder = 'Search a word or phrase';
        } else {
            searchInput.placeholder = "Enter a word or phrase (e.g., 'pipe', 'serendipity')";
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

    function closeSuggestions() {
        if (suggestionsDropdown) {
            suggestionsDropdown.classList.remove('active');
            suggestionsDropdown.innerHTML = '';
            currentFocus = -1;
            searchInput.setAttribute('aria-expanded', 'false');
            searchInput.removeAttribute('aria-activedescendant');
        }
    }

    async function fetchSuggestions(query) {
        if (!query || query.length < 2) {
            closeSuggestions();
            return;
        }

        try {
            if (!suggestionsDropdown.classList.contains('active') || suggestionsDropdown.querySelector('.suggestions-error')) {
                suggestionsDropdown.innerHTML = `
                    <div class="suggestions-loading">
                        <div class="spinner-small"></div>
                        <span>Loading suggestions...</span>
                    </div>
                `;
                suggestionsDropdown.classList.add('active');
                searchInput.setAttribute('aria-expanded', 'true');
            }

            const apiUrl = config.api.getUrl('suggest');
            const response = await fetch(`${apiUrl}?q=${encodeURIComponent(query)}&limit=10`);
            
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            
            if (data.success && data.suggestions && data.suggestions.length > 0) {
                renderSuggestions(data.suggestions, query);
            } else {
                renderNoSuggestions();
            }
        } catch (error) {
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
        suggestionsDropdown.innerHTML = '<div class="suggestions-empty">No suggestions found</div>';
        suggestionsDropdown.classList.add('active');
        searchInput.setAttribute('aria-expanded', 'true');
    }

    function selectSuggestion(value) {
        searchInput.value = value;
        closeSuggestions();
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
    }
});