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
    const frequency = document.getElementById('frequency');
    const wordFrequency = document.getElementById('wordFrequency');
    const entryTabsContainer = document.getElementById('entryTabsContainer');
    const definitionsContent = document.getElementById('definitionsContent');
    const etymologyContent = document.getElementById('etymologyContent');
    const synonymsContent = document.getElementById('synonymsContent');
    const culturalContent = document.getElementById('culturalContent');
    const usageContent = document.getElementById('usageContent');
    const wordFamilyContent = document.getElementById('wordFamilyContent');
    const bilibiliContent = document.getElementById('bilibiliContent');

    // Cache management for API responses
    const CACHE_KEY = 'dict_cache'; // Single localStorage key for all cached data
    const CACHE_VERSION = '1.0.0'; // Increment this when cache structure changes
    const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    function getCacheKey(word, section, index) {
        return `${CACHE_PREFIX}${word.toLowerCase()}_${section}${index !== null ? `_${index}` : ''}`;
    }
    
    function getCachedData(word, section, index = null) {
        try {
            const cacheObject = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
            const cacheKey = `${word.toLowerCase()}_${section}${index !== null ? `_${index}` : ''}`;
            const cacheEntry = cacheObject[cacheKey];
            
            if (!cacheEntry) return null;
            
            const now = Date.now();
            
            // Check if cache version is compatible
            if (cacheEntry.version !== CACHE_VERSION) {
                delete cacheObject[cacheKey];
                localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));
                return null;
            }
            
            // Check if cache is expired
            if (now - cacheEntry.timestamp > CACHE_EXPIRY) {
                delete cacheObject[cacheKey];
                localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));
                return null;
            }
            
            return cacheEntry.data;
        } catch (err) {
            console.error('Error reading cache:', err);
            return null;
        }
    }
    
    function setCachedData(word, section, index, data) {
        try {
            const cacheObject = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
            const cacheKey = `${word.toLowerCase()}_${section}${index !== null ? `_${index}` : ''}`;
            const cacheEntry = {
                data,
                timestamp: Date.now(),
                version: CACHE_VERSION
            };
            cacheObject[cacheKey] = cacheEntry;
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));
        } catch (err) {
            // If localStorage is full or unavailable, just log and continue
            console.warn('Failed to cache data:', err);
        }
    }
    
    function clearExpiredCache() {
        try {
            const cacheObject = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
            const now = Date.now();
            let hasChanges = false;
            
            for (const [key, cacheEntry] of Object.entries(cacheObject)) {
                if (cacheEntry.version !== CACHE_VERSION || now - cacheEntry.timestamp > CACHE_EXPIRY) {
                    delete cacheObject[key];
                    hasChanges = true;
                }
            }
            
            if (hasChanges) {
                localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));
            }
        } catch (err) {
            console.error('Error clearing expired cache:', err);
        }
    }
    
    function clearCacheForWord(word) {
        try {
            const cacheObject = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
            const wordLower = word.toLowerCase();
            let count = 0;
            
            for (const key of Object.keys(cacheObject)) {
                // Match pattern: {word}_*
                if (key.startsWith(wordLower + '_')) {
                    delete cacheObject[key];
                    count++;
                }
            }
            
            if (count > 0) {
                localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));
            }
            
            console.log(`Cleared ${count} cache entries for word: ${word}`);
            return count;
        } catch (err) {
            console.error('Error clearing cache for word:', err);
            return 0;
        }
    }
    
    function clearAllCache() {
        try {
            localStorage.removeItem(CACHE_KEY);
            console.log('Cleared all cache entries');
            return true;
        } catch (err) {
            console.error('Error clearing all cache:', err);
            return false;
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

    function updateHeadwordAndPronunciation(basicData, entryIndex) {
        headword.textContent = basicData.headword;
        
        const entryData = basicData.entries ? basicData.entries[entryIndex] : null;
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

    // Helper function to render pronunciation (audio or IPA text) for inline use
    function renderInlinePronunciation(entryData) {
        if (!entryData) return '';
        
        const audioUrl = entryData.pronunciation || '';
        const ipaText = entryData.ipa || '';
        
        if (!audioUrl && !ipaText) return '';
        
        let html = '<div class="sense-pronunciation">';
        
        if (audioUrl && isAudioUrl(audioUrl)) {
            let audioType = 'audio/mpeg';
            if (audioUrl.endsWith('.wav')) audioType = 'audio/wav';
            else if (audioUrl.endsWith('.ogg')) audioType = 'audio/ogg';
            else if (audioUrl.endsWith('.m4a')) audioType = 'audio/mp4';
            else if (audioUrl.endsWith('.aac')) audioType = 'audio/aac';
            else if (audioUrl.endsWith('.flac')) audioType = 'audio/flac';
            
            html += `
                <audio controls class="pronunciation-audio-small">
                    <source src="${audioUrl}" type="${audioType}">
                    Your browser does not support the audio element.
                </audio>
            `;
        }
        
        if (ipaText) {
            html += `<span class="pronunciation">${ipaText}</span>`;
        }
        
        html += '</div>';
        return html;
    }

    function clearResults() {
        definitionsContent.innerHTML = '';
        etymologyContent.innerHTML = '';
        synonymsContent.innerHTML = '';
        culturalContent.innerHTML = '';
        usageContent.innerHTML = '';
        wordFamilyContent.innerHTML = '';
        bilibiliContent.innerHTML = '';
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
    
    function showSectionLoading(container) {
        container.innerHTML = '<div class="section-loading"><div class="spinner"></div><p>Loading...</p></div>';
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
                ${examplesList.map(ex => `<div class="example-item">${ex}</div>`).join('')}
            </div>` : '';
        
        const collocationsSection = sense.collocations && sense.collocations.length ?
            `<div class="sense-collocations"><strong>Common collocations:</strong><div class="collocation-tags">${sense.collocations.map(col => `<span class="collocation-tag">${col}</span>`).join('')}</div></div>` : '';
        
        const usageNotesSection = sense.usage_notes ? 
            `<div class="usage-notes"><strong>Usage notes:</strong> ${sense.usage_notes}</div>` : '';
        
        const detailsButton = !isDetailed ? 
            `<button class="sense-detail-btn" data-sense-index="${index}" title="Load detailed information">
                <i class="fas fa-info-circle"></i> View Details
            </button>` : 
            `<div class="sense-detailed-badge"><i class="fas fa-check-circle"></i> Detailed view loaded</div>`;
        
        return `
            <div class="sense-definition">
                <strong>${index + 1}.</strong> ${sense.part_of_speech ? `<span class="sense-pos">(${sense.part_of_speech})</span>` : ''} ${sense.definition}
            </div>
            ${metaBadges}
            ${examplesSection}
            ${usageNotesSection}
            ${collocationsSection}
            ${sense.synonyms && sense.synonyms.length ? `<div class="sense-synonyms"><strong>Synonyms:</strong><div class="synonym-tags">${sense.synonyms.map(syn => `<span class="synonym-tag">${syn}</span>`).join('')}</div></div>` : ''}
            ${sense.antonyms && sense.antonyms.length ? `<div class="sense-antonyms"><strong>Antonyms:</strong><div class="antonym-tags">${sense.antonyms.map(ant => `<span class="antonym-tag">${ant}</span>`).join('')}</div></div>` : ''}
            <div class="sense-actions">${detailsButton}</div>
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
 
    // Helper function to render Bilibili videos
    function renderBilibiliVideos(videos) {
        if (!videos || videos.length === 0) {
            return '<div class="no-data">No Bilibili videos available</div>';
        }

        const videoCards = videos.map(video => {
            const durationFormatted = formatDuration(video.duration);
            const pubDate = new Date(video.pubdate * 1000).toLocaleDateString();
            const viewCount = formatNumber(video.view);
            const likeCount = formatNumber(video.like);
            
            // Extract BVID from video URL or use provided bvid
            const bvidMatch = video.video_url.match(/\/(BV[0-9A-Za-z]+)/);
            const bvid = bvidMatch ? bvidMatch[1] : video.bvid;

            // Extract time parameter from video URL if present
            const timeMatch = video.video_url.match(/[?&]t=(\d+)/);
            const timeParam = timeMatch ? `&t=${timeMatch[1]}` : '';

            // Construct iframe URL safely
            const iframeUrl = `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(bvid)}&page=1&autoplay=0&high_quality=0&danmaku=0${timeParam}`;

            return `
                <div class="bilibili-video-card">
                    <div class="video-thumbnail">
                        <iframe 
                            src="${iframeUrl}"
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
                        ${video.description && video.description !== '-' ? 
                            `<div class="video-description">${video.description}</div>` : ''}
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

    async function fetchSection(word, section, indexOrEntryIndex = null, senseIndex = null) {
        // For 2D indexing (detailed_sense, examples, usage_notes with entry_index + sense_index)
        const cacheKey = senseIndex !== null ? `${indexOrEntryIndex}_${senseIndex}` : indexOrEntryIndex;
        const cachedData = getCachedData(word, section, cacheKey);
        if (cachedData) {
            console.log(`Cache hit: ${word} - ${section}${cacheKey !== null ? ` (${cacheKey})` : ''}`);
            return cachedData;
        }
        
        console.log(`Cache miss: ${word} - ${section}${cacheKey !== null ? ` (${cacheKey})` : ''}`);
        
        const apiUrl = config.api.getUrl('dictionary');
        const body = { word, section };
        
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
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || `Failed to fetch ${section}`);
        }
        
        setCachedData(word, section, cacheKey, data);
        
        return data;
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
        
        showEmptyState(false);
        showResults(false);
        showLoading(true);
        clearResults();
        
        try {
            // Step 1: Fetch basic info first (fast ~0.5s)
            const basicData = await fetchSection(query, 'basic');
            
            showLoading(false);
            
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
            showSectionLoading(definitionsContent);
            showSectionLoading(etymologyContent);
            showSectionLoading(synonymsContent);
            showSectionLoading(culturalContent);
            showSectionLoading(usageContent);
            showSectionLoading(wordFamilyContent);
            showSectionLoading(bilibiliContent);
            
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
        
        fetchSection(word, 'frequency', entryIndex).then(data => {
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
        
        fetchSection(word, 'etymology', entryIndex).then(data => {
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
        
        fetchSection(word, 'cultural_notes', entryIndex).then(data => {
            if (data.cultural_notes && data.cultural_notes.notes) {
                culturalContent.innerHTML = enhanceCulturalNotes(data.cultural_notes.notes);
            } else {
                culturalContent.innerHTML = '<div class="no-data">No cultural notes available</div>';
            }
        }).catch(err => {
            console.error('Error fetching cultural_notes:', err);
            culturalContent.innerHTML = '<div class="error-message">Failed to load cultural notes</div>';
        });
        
        fetchSection(word, 'usage_context', entryIndex).then(data => {
            if (data.usage_context) {
                usageContent.innerHTML = enhanceUsageContext(data.usage_context);
            } else {
                usageContent.innerHTML = '<div class="no-data">No usage context available</div>';
            }
        }).catch(err => {
            console.error('Error fetching usage_context:', err);
            usageContent.innerHTML = '<div class="error-message">Failed to load usage context</div>';
        });
        
        fetchSection(word, 'word_family', entryIndex).then(data => {
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
        
        fetchSection(word, 'bilibili_videos').then(data => {
            if (data.bilibili_videos && data.bilibili_videos.length) {
                bilibiliContent.innerHTML = renderBilibiliVideos(data.bilibili_videos);
            } else {
                bilibiliContent.innerHTML = '<div class="no-data">No Bilibili videos available</div>';
            }
        }).catch(err => {
            console.error('Error fetching bilibili_videos:', err);
            bilibiliContent.innerHTML = '<div class="error-message">Failed to load Bilibili videos</div>';
        });
        
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
                
                const cacheKey = `${entryIndex}_${i}`;
                const cachedDetailedSense = getCachedData(word, 'detailed_sense', cacheKey);
                const cachedExamples = getCachedData(word, 'examples', cacheKey);
                const cachedUsageNotes = getCachedData(word, 'usage_notes', cacheKey);
                
                let senseToRender = basicSense;
                let isDetailed = false;
                
                if (cachedDetailedSense && cachedDetailedSense.detailed_sense) {
                    senseToRender = cachedDetailedSense.detailed_sense;
                    isDetailed = true;
                    
                    if (cachedExamples && cachedExamples.examples && cachedExamples.examples.length) {
                        senseToRender.examples = cachedExamples.examples;
                    }
                    if (cachedExamples && cachedExamples.collocations && cachedExamples.collocations.length) {
                        senseToRender.collocations = cachedExamples.collocations;
                    }
                    if (cachedUsageNotes && cachedUsageNotes.usage_notes) {
                        senseToRender.usage_notes = cachedUsageNotes.usage_notes;
                    }
                }
                
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
                        senseItem.innerHTML += '<div class="sense-loading-overlay"><i class="fas fa-spinner fa-spin"></i> Loading detailed information...</div>';
                    } catch (e) {
                        console.warn('Failed to parse basic sense data:', e);
                    }
                } else {
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                }
                
                try {
                    const [senseData, examplesData, usageNotesData] = await Promise.all([
                        fetchSection(word, 'detailed_sense', entryIndex, senseIndex),
                        fetchSection(word, 'examples', entryIndex, senseIndex),
                        fetchSection(word, 'usage_notes', entryIndex, senseIndex)
                    ]);
                    
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
                    
                    // Get pronunciation for this entry
                    const entryData = currentWordData.entries[entryIndex];
                    const pronunciationHtml = renderInlinePronunciation(entryData);
                    
                    senseItem.innerHTML = renderSenseHTML(detailedSense, senseIndex, true);
                    
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
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed - Retry';
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
            <div class="entry-selector-label">
                <span>Word Forms:</span>
                <span class="entry-selector-hint">
                    <i class="fas fa-info-circle" title="This word has multiple forms with different origins and meanings"></i>
                </span>
            </div>
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
        
        const definitionsCard = document.querySelector('.definitions-card');
        if (definitionsCard) {
            const existingLoadMoreBtn = definitionsCard.querySelector('.load-more-btn-header');
            if (existingLoadMoreBtn) {
                existingLoadMoreBtn.remove();
            }
        }
        
        showSectionLoading(definitionsContent);
        showSectionLoading(etymologyContent);
        showSectionLoading(synonymsContent);
        showSectionLoading(culturalContent);
        showSectionLoading(usageContent);
        showSectionLoading(wordFamilyContent);
        showSectionLoading(bilibiliContent);
        
        loadEntryContent(currentWord, entryIndex, currentWordData);
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