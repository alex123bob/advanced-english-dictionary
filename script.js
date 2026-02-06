// script.js for Advanced English Dictionary
// Handles search, fetches data from API, and updates UI responsively

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Configuration - loaded from config.js
    const config = window.config;

    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsContainer = document.getElementById('resultsContainer');
    const loadingContainer = document.getElementById('loadingContainer');
    const emptyState = document.getElementById('emptyState');

    // Result fields
    const headword = document.getElementById('headword');
    const pronunciationContainer = document.getElementById('pronunciationContainer');
    const pronunciation = document.getElementById('pronunciation');
    const frequency = document.getElementById('frequency');
    const totalSenses = document.getElementById('totalSenses');
    const executionTime = document.getElementById('executionTime');
    const definitionsContent = document.getElementById('definitionsContent');
    const etymologyContent = document.getElementById('etymologyContent');
    const synonymsContent = document.getElementById('synonymsContent');
    const culturalContent = document.getElementById('culturalContent');
    const usageContent = document.getElementById('usageContent');
    const wordFamilyContent = document.getElementById('wordFamilyContent');

    // Cache management for API responses
    const CACHE_PREFIX = 'dict_cache_';
    const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    function getCacheKey(word, section, index) {
        return `${CACHE_PREFIX}${word.toLowerCase()}_${section}${index !== null ? `_${index}` : ''}`;
    }
    
    function getCachedData(word, section, index = null) {
        try {
            const key = getCacheKey(word, section, index);
            const cached = localStorage.getItem(key);
            if (!cached) return null;
            
            const { data, timestamp } = JSON.parse(cached);
            const now = Date.now();
            
            // Check if cache is expired
            if (now - timestamp > CACHE_EXPIRY) {
                localStorage.removeItem(key);
                return null;
            }
            
            return data;
        } catch (err) {
            console.error('Error reading cache:', err);
            return null;
        }
    }
    
    function setCachedData(word, section, index, data) {
        try {
            const key = getCacheKey(word, section, index);
            const cacheObject = {
                data,
                timestamp: Date.now()
            };
            localStorage.setItem(key, JSON.stringify(cacheObject));
        } catch (err) {
            // If localStorage is full or unavailable, just log and continue
            console.warn('Failed to cache data:', err);
        }
    }
    
    function clearExpiredCache() {
        try {
            const keys = Object.keys(localStorage);
            const now = Date.now();
            
            keys.forEach(key => {
                if (key.startsWith(CACHE_PREFIX)) {
                    try {
                        const cached = localStorage.getItem(key);
                        const { timestamp } = JSON.parse(cached);
                        
                        if (now - timestamp > CACHE_EXPIRY) {
                            localStorage.removeItem(key);
                        }
                    } catch (err) {
                        // If parsing fails, remove the corrupted cache entry
                        localStorage.removeItem(key);
                    }
                }
            });
        } catch (err) {
            console.error('Error clearing expired cache:', err);
        }
    }
    
    function clearCacheForWord(word) {
        try {
            const wordLower = word.toLowerCase();
            const keys = Object.keys(localStorage);
            let count = 0;
            
            keys.forEach(key => {
                // Match pattern: dict_cache_{word}_*
                if (key.startsWith(CACHE_PREFIX + wordLower + '_')) {
                    localStorage.removeItem(key);
                    count++;
                }
            });
            
            console.log(`Cleared ${count} cache entries for word: ${word}`);
            return count;
        } catch (err) {
            console.error('Error clearing cache for word:', err);
            return 0;
        }
    }
    
    function clearAllCache() {
        try {
            const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
            const count = keys.length;
            
            keys.forEach(key => localStorage.removeItem(key));
            
            console.log(`Cleared ${count} total cache entries`);
            return count;
        } catch (err) {
            console.error('Error clearing all cache:', err);
            return 0;
        }
    }

    // Clear expired cache on page load
    clearExpiredCache();

    // Search history management
    const HISTORY_KEY = 'dict_search_history';
    const MAX_HISTORY_ITEMS = 10;
    
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
            
            // Add to front
            history.unshift({
                word,
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
            const wordToRemove = history[index].word;
            
            // Remove from history
            history.splice(index, 1);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
            
            // Clear all cache for this word
            clearCacheForWord(wordToRemove);
            
            updateSearchHistoryUI();
        } catch (err) {
            console.error('Error removing from search history:', err);
        }
    }
    
    function openHistoryPanel() {
        const panel = document.getElementById('historyPanel');
        const overlay = document.getElementById('historyOverlay');
        
        if (panel && overlay) {
            panel.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
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

    function showLoading(show) {
        loadingContainer.style.display = show ? 'block' : 'none';
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

    // Helper function to render pronunciation (audio or IPA text)
    function renderPronunciation(pronunciationData) {
        if (!pronunciationData) {
            pronunciationContainer.innerHTML = '';
            return;
        }

        if (isAudioUrl(pronunciationData)) {
            // Determine audio type based on file extension
            let audioType = 'audio/mpeg'; // default
            if (pronunciationData.endsWith('.wav')) audioType = 'audio/wav';
            else if (pronunciationData.endsWith('.ogg')) audioType = 'audio/ogg';
            else if (pronunciationData.endsWith('.m4a')) audioType = 'audio/mp4';
            else if (pronunciationData.endsWith('.aac')) audioType = 'audio/aac';
            else if (pronunciationData.endsWith('.flac')) audioType = 'audio/flac';
            
            // Render audio player
            pronunciationContainer.innerHTML = `
                <audio controls class="pronunciation-audio">
                    <source src="${pronunciationData}" type="${audioType}">
                    Your browser does not support the audio element.
                </audio>
                <button class="audio-play-btn" onclick="this.previousElementSibling.play()">
                    <i class="fas fa-volume-up"></i>
                </button>
            `;
        } else {
            // Render IPA text
            pronunciationContainer.innerHTML = `<span class="pronunciation">${pronunciationData}</span>`;
        }
    }

    function clearResults() {
        definitionsContent.innerHTML = '';
        etymologyContent.innerHTML = '';
        synonymsContent.innerHTML = '';
        culturalContent.innerHTML = '';
        usageContent.innerHTML = '';
        wordFamilyContent.innerHTML = '';
    }
    
    function showSectionLoading(container) {
        container.innerHTML = '<div class="section-loading"><div class="spinner"></div><p>Loading...</p></div>';
    }
    
    function renderSenseHTML(sense, index) {
        // Build metadata badges (tone, register, domain)
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
        
        return `
            <div class="sense-definition">
                <strong>${index + 1}.</strong> ${sense.part_of_speech ? `<span class="sense-pos">(${sense.part_of_speech})</span>` : ''} ${sense.definition}
            </div>
            ${metaBadges}
            ${sense.examples && sense.examples.length ? `
                <div class="sense-examples">
                    ${sense.examples.map(ex => `<div class="example-item">${ex}</div>`).join('')}
                </div>
            ` : ''}
            ${sense.usage_notes ? `<div class="usage-notes"><strong>Usage notes:</strong> ${sense.usage_notes}</div>` : ''}
            ${sense.collocations && sense.collocations.length ? `<div class="sense-collocations"><strong>Common collocations:</strong><div class="collocation-tags">${sense.collocations.map(col => `<span class="collocation-tag">${col}</span>`).join('')}</div></div>` : ''}
            ${sense.synonyms && sense.synonyms.length ? `<div class="sense-synonyms"><strong>Synonyms:</strong><div class="synonym-tags">${sense.synonyms.map(syn => `<span class="synonym-tag">${syn}</span>`).join('')}</div></div>` : ''}
            ${sense.antonyms && sense.antonyms.length ? `<div class="sense-antonyms"><strong>Antonyms:</strong><div class="antonym-tags">${sense.antonyms.map(ant => `<span class="antonym-tag">${ant}</span>`).join('')}</div></div>` : ''}
        `;
    }
    
    // Helper function to enhance cultural notes with visual structure
    function enhanceCulturalNotes(notesText) {
        if (!notesText) return '<div class="no-data">No cultural notes available</div>';
        
        // Parse for key insights
        const originMatch = notesText.match(/(originat[es]{2,}|comes? from|derives? from|rooted in)[^.]+\./i);
        const usageMatch = notesText.match(/(modern usage|commonly|often employed|used)[^.,;]+/i);
        const toneMatch = notesText.match(/(tone|manner|style)[^.,;]+/i);
        
        let html = '<div class="cultural-enhanced">';
        
        // Main quote-style text
        html += '<div class="cultural-quote">';
        html += `<p class="cultural-text">${notesText}</p>`;
        html += '</div>';
        
        // Insight badges (only if we found something)
        if (originMatch || usageMatch || toneMatch) {
            html += '<div class="cultural-insights">';
            
            if (originMatch) {
                const originText = originMatch[0];
                html += `
                    <div class="insight-badge">
                        <i class="fas fa-landmark"></i>
                        <div class="insight-label">Origins</div>
                        <div class="insight-value">${originText}</div>
                    </div>
                `;
            }
            
            if (usageMatch) {
                const usageText = usageMatch[0];
                html += `
                    <div class="insight-badge">
                        <i class="fas fa-comments"></i>
                        <div class="insight-label">Modern Usage</div>
                        <div class="insight-value">${usageText}</div>
                    </div>
                `;
            }
            
            if (toneMatch) {
                const toneText = toneMatch[0];
                html += `
                    <div class="insight-badge">
                        <i class="fas fa-volume-up"></i>
                        <div class="insight-label">Tone & Context</div>
                        <div class="insight-value">${toneText}</div>
                    </div>
                `;
            }
            
            html += '</div>';
        }
        
        html += '</div>';
        return html;
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
                    <div class="feature-content">${enhancedText}</div>
                </div>
            `;
        }
        
        // Regional Variations
        if (usageContext.regional_variations && usageContext.regional_variations.length) {
            html += '<div class="regional-section">';
            html += '<div class="section-header"><i class="fas fa-globe"></i> Regional Variations</div>';
            
            const flagMap = {
                'UK': '🇬🇧', 'US': '🇺🇸', 'USA': '🇺🇸', 'United States': '🇺🇸',
                'Australia': '🇦🇺', 'Canada': '🇨🇦', 'India': '🇮🇳', 'Ireland': '🇮🇪',
                'New Zealand': '🇳🇿', 'South Africa': '🇿🇦'
            };
            
            // Try to parse into cards
            const regions = usageContext.regional_variations.map(text => {
                const countryMatch = text.match(/in the (\w+),/i);
                const country = countryMatch ? countryMatch[1] : null;
                const flag = country && flagMap[country] ? flagMap[country] : '🌐';
                return { country, flag, text };
            });
            
            const allHaveCountries = regions.every(r => r.country);
            
            if (allHaveCountries) {
                // Card layout
                html += '<div class="regional-cards">';
                regions.forEach(region => {
                    html += `
                        <div class="region-card">
                            <div class="region-flag">${region.flag}</div>
                            <div class="region-name">${region.country}</div>
                            <div class="region-text">${region.text}</div>
                        </div>
                    `;
                });
                html += '</div>';
            } else {
                // List layout with icons
                html += '<div class="regional-list">';
                regions.forEach(region => {
                    html += `<div class="regional-item"><span class="region-icon">${region.flag}</span> ${region.text}</div>`;
                });
                html += '</div>';
            }
            
            html += '</div>';
        }
        
        // Common Confusions
        if (usageContext.common_confusions && usageContext.common_confusions.length) {
            html += '<div class="confusion-section">';
            html += '<div class="section-header"><i class="fas fa-exclamation-triangle"></i> Commonly Confused With</div>';
            html += '<div class="confusion-list">';
            
            usageContext.common_confusions.forEach(confusion => {
                // Try to extract word and explanation
                const match = confusion.match(/^([^(]+)\s*\((.+)\)$/);
                if (match) {
                    const word = match[1].trim();
                    const explanation = match[2].trim();
                    html += `
                        <div class="confusion-item">
                            <div class="confusion-word">${word}</div>
                            <div class="confusion-arrow">→</div>
                            <div class="confusion-explanation">${explanation}</div>
                        </div>
                    `;
                } else {
                    html += `<div class="confusion-item"><div class="confusion-text">${confusion}</div></div>`;
                }
            });
            
            html += '</div>';
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    }

    async function fetchSection(word, section, index = null) {
        // Check cache first
        const cachedData = getCachedData(word, section, index);
        if (cachedData) {
            console.log(`Cache hit: ${word} - ${section}${index !== null ? ` (index ${index})` : ''}`);
            return cachedData;
        }
        
        console.log(`Cache miss: ${word} - ${section}${index !== null ? ` (index ${index})` : ''}`);
        
        const apiUrl = config.api.getUrl('dictionary');
        const body = { word, section };
        if (index !== null) {
            body.index = index;
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
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || `Failed to fetch ${section}`);
        }
        
        // Cache the successful response
        setCachedData(word, section, index, data);
        
        return data;
    }

    async function handleSearch() {
        const query = searchInput.value.trim();
        if (!query) {
            // Show a brief visual feedback that input is required
            searchInput.focus();
            searchInput.classList.add('shake');
            setTimeout(() => searchInput.classList.remove('shake'), 500);
            return;
        }
        
        showEmptyState(false);
        showResults(false);
        showLoading(true);
        clearResults();
        
        const startTime = performance.now();
        
        try {
            // Step 1: Fetch basic info first (fast ~0.5s)
            const basicData = await fetchSection(query, 'basic');
            
            showLoading(false);
            
            if (!basicData || !basicData.headword) {
                showEmptyState(true);
                return;
            }
            
            // Add to search history
            addToSearchHistory(query);
            
            // Show results container immediately
            showResults(true);
            
            // Populate basic info
            const execTime = ((performance.now() - startTime) / 1000).toFixed(2);
            executionTime.textContent = `${execTime}s`;
            
            headword.textContent = basicData.headword;
            renderPronunciation(basicData.pronunciation);
            
            totalSenses.textContent = basicData.total_senses ? `${basicData.total_senses} sense${basicData.total_senses !== 1 ? 's' : ''}` : '';
            
            // Show loading indicators for all sections
            showSectionLoading(definitionsContent);
            showSectionLoading(etymologyContent);
            showSectionLoading(synonymsContent);
            showSectionLoading(culturalContent);
            showSectionLoading(usageContent);
            showSectionLoading(wordFamilyContent);
            
            // Step 2: Start loading ALL metadata sections immediately in parallel
            // These load independently and won't wait for senses
            
            // Fetch frequency
            fetchSection(query, 'frequency').then(data => {
                if (data.frequency) {
                    // Format frequency: very_common -> Very Common
                    const freqText = data.frequency
                        .split('_')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                    frequency.innerHTML = `<i class="fas fa-chart-line"></i> ${freqText}`;
                    frequency.style.display = '';
                } else {
                    frequency.innerHTML = '';
                    frequency.style.display = 'none';
                }
            }).catch(err => {
                console.error('Error fetching frequency:', err);
                frequency.innerHTML = '';
                frequency.style.display = 'none';
            });
            
            // Fetch etymology (starts immediately, doesn't wait for senses)
            fetchSection(query, 'etymology').then(data => {
                if (data.etymology) {
                    let etymologyHtml = '';
                    if (data.etymology.etymology) {
                        etymologyHtml += `<div class="etymology-text">${data.etymology.etymology}</div>`;
                    }
                    if (data.etymology.root_analysis) {
                        etymologyHtml += `<div class="root-analysis"><div class="etymology-label">Root Analysis</div><div>${data.etymology.root_analysis}</div></div>`;
                    }
                    etymologyContent.innerHTML = etymologyHtml || '<div class="no-data">No etymology information available</div>';
                } else {
                    etymologyContent.innerHTML = '<div class="no-data">No etymology information available</div>';
                }
            }).catch(err => {
                console.error('Error fetching etymology:', err);
                etymologyContent.innerHTML = '<div class="error-message">Failed to load etymology</div>';
            });
            
            // Fetch cultural notes (starts immediately, doesn't wait for senses)
            fetchSection(query, 'cultural_notes').then(data => {
                if (data.cultural_notes && data.cultural_notes.notes) {
                    culturalContent.innerHTML = enhanceCulturalNotes(data.cultural_notes.notes);
                } else {
                    culturalContent.innerHTML = '<div class="no-data">No cultural notes available</div>';
                }
            }).catch(err => {
                console.error('Error fetching cultural_notes:', err);
                culturalContent.innerHTML = '<div class="error-message">Failed to load cultural notes</div>';
            });
            
            // Fetch usage context (starts immediately, doesn't wait for senses)
            fetchSection(query, 'usage_context').then(data => {
                if (data.usage_context) {
                    usageContent.innerHTML = enhanceUsageContext(data.usage_context);
                } else {
                    usageContent.innerHTML = '<div class="no-data">No usage context available</div>';
                }
            }).catch(err => {
                console.error('Error fetching usage_context:', err);
                usageContent.innerHTML = '<div class="error-message">Failed to load usage context</div>';
            });
            
            // Fetch word family (starts immediately, doesn't wait for senses)
            fetchSection(query, 'word_family').then(data => {
                if (data.word_family && data.word_family.word_family && data.word_family.word_family.length) {
                    const displayWords = data.word_family.word_family.slice(0, 20);
                    wordFamilyContent.innerHTML = `<div class="word-family-tags">${displayWords.map(wf => `<span class="word-tag">${wf}</span>`).join('')}</div>`;
                } else {
                    wordFamilyContent.innerHTML = '<div class="no-data">No word family available</div>';
                }
            }).catch(err => {
                console.error('Error fetching word_family:', err);
                wordFamilyContent.innerHTML = '<div class="error-message">Failed to load word family</div>';
            });
            
            // Step 3: Load individual senses one by one (slow ~10-13s each)
            // This happens in parallel with the metadata sections above
            // Load first 3 senses, or all if fewer than 3
            const totalSensesToLoad = basicData.total_senses;
            const initialSensesToLoad = Math.min(3, totalSensesToLoad);
            
            // Create simple scrollable container for senses
            definitionsContent.innerHTML = `<div class="senses-list"></div>`;
            
            const sensesList = definitionsContent.querySelector('.senses-list');
            
            // Load senses sequentially (to avoid overwhelming the API)
            const allSynonyms = new Set();
            const allAntonyms = new Set();
            
            // Create placeholders for initial senses
            for (let i = 0; i < initialSensesToLoad; i++) {
                const senseItem = document.createElement('div');
                senseItem.className = 'sense-item-container sense-placeholder';
                senseItem.dataset.senseIndex = i;
                senseItem.innerHTML = `<div class="section-loading"><div class="spinner"></div><p>Loading sense ${i + 1}...</p></div>`;
                sensesList.appendChild(senseItem);
            }
            
            // Load senses asynchronously without blocking
            (async () => {
                for (let i = 0; i < initialSensesToLoad; i++) {
                    try {
                        const senseData = await fetchSection(query, 'detailed_sense', i);
                        const sense = senseData.detailed_sense;
                        
                        const senseItem = sensesList.querySelector(`[data-sense-index="${i}"]`);
                        if (senseItem && sense) {
                            senseItem.className = 'sense-item-container';
                            senseItem.innerHTML = renderSenseHTML(sense, i);
                            
                            // Collect synonyms and antonyms
                            if (sense.synonyms) sense.synonyms.forEach(s => allSynonyms.add(s));
                            if (sense.antonyms) sense.antonyms.forEach(a => allAntonyms.add(a));
                            
                            // Update synonyms section as we collect them
                            updateSynonymsSection(allSynonyms, allAntonyms);
                        }
                    } catch (err) {
                        console.error(`Error fetching sense ${i}:`, err);
                        const senseItem = sensesList.querySelector(`[data-sense-index="${i}"]`);
                        if (senseItem) {
                            senseItem.innerHTML = `<div class="error-message">Failed to load sense ${i + 1}</div>`;
                        }
                    }
                }
                
                // Show "Load More" button in the card header if there are more senses
                if (totalSensesToLoad > initialSensesToLoad) {
                    const definitionsCard = document.querySelector('.definitions-card');
                    const cardActions = definitionsCard.querySelector('.card-actions');
                    
                    const loadMoreBtn = document.createElement('button');
                    loadMoreBtn.className = 'load-more-btn-header';
                    loadMoreBtn.innerHTML = `<i class="fas fa-plus-circle"></i> Load More (${totalSensesToLoad - initialSensesToLoad})`;
                    loadMoreBtn.title = `Load ${totalSensesToLoad - initialSensesToLoad} more senses`;
                    loadMoreBtn.onclick = () => loadRemainingSenses(query, initialSensesToLoad, totalSensesToLoad, sensesList, allSynonyms, allAntonyms, loadMoreBtn);
                    
                    // Insert before the fullscreen button
                    cardActions.insertBefore(loadMoreBtn, cardActions.firstChild);
                }
            })();
            
        } catch (error) {
            console.error('Search error:', error);
            showLoading(false);
            showEmptyState(true);
        }
    }
    
    async function loadRemainingSenses(word, startIndex, totalSenses, sensesList, allSynonyms, allAntonyms, loadMoreBtn) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        
        // Load 3 senses at a time
        const batchSize = 3;
        const endIndex = Math.min(startIndex + batchSize, totalSenses);
        
        for (let i = startIndex; i < endIndex; i++) {
            try {
                // Create new sense item placeholder
                const senseItem = document.createElement('div');
                senseItem.className = 'sense-item-container sense-placeholder';
                senseItem.dataset.senseIndex = i;
                senseItem.innerHTML = `<div class="section-loading"><div class="spinner"></div><p>Loading sense ${i + 1}...</p></div>`;
                sensesList.appendChild(senseItem);
                
                const senseData = await fetchSection(word, 'detailed_sense', i);
                const sense = senseData.detailed_sense;
                
                if (senseItem && sense) {
                    senseItem.className = 'sense-item-container';
                    senseItem.innerHTML = renderSenseHTML(sense, i);
                    
                    // Collect synonyms and antonyms
                    if (sense.synonyms) sense.synonyms.forEach(s => allSynonyms.add(s));
                    if (sense.antonyms) sense.antonyms.forEach(a => allAntonyms.add(a));
                    
                    // Update synonyms section as we load more
                    updateSynonymsSection(allSynonyms, allAntonyms);
                }
            } catch (err) {
                console.error(`Error fetching sense ${i}:`, err);
                const senseItem = sensesList.querySelector(`[data-sense-index="${i}"]`);
                if (senseItem) {
                    senseItem.innerHTML = `<div class="error-message">Failed to load sense ${i + 1}</div>`;
                }
            }
        }
        
        // Calculate remaining senses
        const remainingSenses = totalSenses - endIndex;
        
        if (remainingSenses > 0) {
            // Update button text and re-enable
            loadMoreBtn.disabled = false;
            loadMoreBtn.innerHTML = `<i class="fas fa-plus-circle"></i> Load More (${remainingSenses})`;
            loadMoreBtn.title = `Load ${remainingSenses} more senses`;
            // Update onclick to continue from endIndex
            loadMoreBtn.onclick = () => loadRemainingSenses(word, endIndex, totalSenses, sensesList, allSynonyms, allAntonyms, loadMoreBtn);
        } else {
            // All senses loaded, show completion and remove button after delay
            loadMoreBtn.innerHTML = '<i class="fas fa-check-circle"></i> All Loaded';
            setTimeout(() => {
                loadMoreBtn.remove();
            }, 2000);
        }
        
        // Update synonyms/antonyms section
        updateSynonymsSection(allSynonyms, allAntonyms);
    }
    
    function updateSynonymsSection(allSynonyms, allAntonyms) {
        if (allSynonyms.size > 0 || allAntonyms.size > 0) {
            let html = '<div class="synonyms-grid">';
            if (allSynonyms.size > 0) {
                html += `<div><strong>Synonyms</strong><div class="synonyms-list">${Array.from(allSynonyms).map(s => `<span class="synonym-tag">${s}</span>`).join('')}</div></div>`;
            }
            if (allAntonyms.size > 0) {
                html += `<div><strong>Antonyms</strong><div class="antonyms-list">${Array.from(allAntonyms).map(a => `<span class="antonym-tag">${a}</span>`).join('')}</div></div>`;
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
            if (confirm('Clear all search history and cached data?')) {
                // Clear all cache
                clearAllCache();
                
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
    
    // Fullscreen toggle functionality
    document.addEventListener('click', (e) => {
        if (e.target.closest('.fullscreen-btn')) {
            const button = e.target.closest('.fullscreen-btn');
            const card = button.closest('.card');
            const icon = button.querySelector('i');
            
            // Toggle fullscreen
            const isFullscreen = card.classList.contains('fullscreen');
            
            if (isFullscreen) {
                // Exit fullscreen
                card.classList.remove('fullscreen');
                icon.classList.remove('fa-compress');
                icon.classList.add('fa-expand');
                removeBackdrop();
            } else {
                // Enter fullscreen
                card.classList.add('fullscreen');
                icon.classList.remove('fa-expand');
                icon.classList.add('fa-compress');
                addBackdrop();
            }
        }
        
        // Click backdrop to exit fullscreen
        if (e.target.classList.contains('fullscreen-backdrop')) {
            exitFullscreen();
        }
    });
    
    function addBackdrop() {
        // Remove any existing backdrop first
        removeBackdrop();
        
        const backdrop = document.createElement('div');
        backdrop.className = 'fullscreen-backdrop';
        document.body.appendChild(backdrop);
    }
    
    function removeBackdrop() {
        const backdrop = document.querySelector('.fullscreen-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
    }
    
    function exitFullscreen() {
        const fullscreenCard = document.querySelector('.card.fullscreen');
        if (fullscreenCard) {
            fullscreenCard.classList.remove('fullscreen');
            const icon = fullscreenCard.querySelector('.fullscreen-btn i');
            if (icon) {
                icon.classList.remove('fa-compress');
                icon.classList.add('fa-expand');
            }
            removeBackdrop();
        }
    }
    
    // Close fullscreen on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            exitFullscreen();
        }
    });
    
    // Adjust placeholder text for mobile
    function updatePlaceholder() {
        if (window.innerWidth <= 480) {
            searchInput.placeholder = 'Word or phrase';
        } else if (window.innerWidth <= 768) {
            searchInput.placeholder = 'Search a word or phrase';
        } else {
            searchInput.placeholder = "Enter a word or phrase (e.g., 'pipe down', 'serendipity')";
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
});