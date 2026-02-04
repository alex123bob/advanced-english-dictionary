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
    const pronunciation = document.getElementById('pronunciation');
    const partOfSpeech = document.getElementById('partOfSpeech');
    const frequency = document.getElementById('frequency');
    const totalSenses = document.getElementById('totalSenses');
    const executionTime = document.getElementById('executionTime');
    const definitionsContent = document.getElementById('definitionsContent');
    const examplesContent = document.getElementById('examplesContent');
    const etymologyContent = document.getElementById('etymologyContent');
    const synonymsContent = document.getElementById('synonymsContent');
    const culturalContent = document.getElementById('culturalContent');
    const usageContent = document.getElementById('usageContent');
    const wordFamilyContent = document.getElementById('wordFamilyContent');

    function showLoading(show) {
        loadingContainer.style.display = show ? 'block' : 'none';
    }
    function showResults(show) {
        resultsContainer.style.display = show ? 'block' : 'none';
    }
    function showEmptyState(show) {
        emptyState.style.display = show ? 'block' : 'none';
    }

    function clearResults() {
        definitionsContent.innerHTML = '';
        examplesContent.innerHTML = '';
        etymologyContent.innerHTML = '';
        synonymsContent.innerHTML = '';
        culturalContent.innerHTML = '';
        usageContent.innerHTML = '';
        wordFamilyContent.innerHTML = '';
    }

    async function handleSearch() {
        const query = searchInput.value.trim();
        if (!query) {
            return;
        }
        
        showEmptyState(false);
        showResults(false);
        showLoading(true);
        clearResults();
        
        const startTime = performance.now();
        
        try {
            // Fetch from real API endpoint
            const apiUrl = config.api.getUrl('dictionary');
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ word: query })
            });
            
            showLoading(false);
            
            if (!response.ok) {
                if (response.status === 404) {
                    showEmptyState(true);
                    return;
                }
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data || !data.headword) {
                showEmptyState(true);
                return;
            }
            
            // Populate results from API response
            const execTime = ((performance.now() - startTime) / 1000).toFixed(2);
            executionTime.textContent = `${execTime}s`;
                    
            // Populate results from API response
            headword.textContent = data.headword;
            pronunciation.textContent = data.pronunciation || '';
            // Get part of speech from first sense
            const firstSense = data.detailed_senses && data.detailed_senses[0];
            partOfSpeech.textContent = firstSense ? firstSense.part_of_speech || '' : '';
            frequency.textContent = data.frequency ? `${data.frequency} frequency` : '';
            totalSenses.textContent = data.total_senses ? `${data.total_senses} sense${data.total_senses !== 1 ? 's' : ''}` : '';
            
            // Definitions from detailed_senses
            if (data.detailed_senses && data.detailed_senses.length) {
                definitionsContent.innerHTML = data.detailed_senses.map((sense, i) => `
                    <div class="sense-item">
                        <div class="sense-definition"><strong>${i+1}.</strong> ${sense.definition}</div>
                        ${sense.usage_notes ? `<div class="usage-notes"><strong>Usage notes:</strong> ${sense.usage_notes}</div>` : ''}
                        ${sense.collocations && sense.collocations.length ? `<div><strong>Common collocations:</strong> ${sense.collocations.join(', ')}</div>` : ''}
                        ${sense.synonyms && sense.synonyms.length ? `<div><strong>Synonyms:</strong> ${sense.synonyms.join(', ')}</div>` : ''}
                        ${sense.antonyms && sense.antonyms.length ? `<div><strong>Antonyms:</strong> ${sense.antonyms.join(', ')}</div>` : ''}
                    </div>
                `).join('');
            }
            
            // Examples - combine examples from all senses
            const allExamples = [];
            if (data.detailed_senses) {
                data.detailed_senses.forEach(sense => {
                    if (sense.examples && sense.examples.length) {
                        allExamples.push(...sense.examples);
                    }
                });
            }
            if (allExamples.length > 0) {
                examplesContent.innerHTML = allExamples.map(ex => `<div class="example-item">${ex}</div>`).join('');
            }
            
            // Etymology
            if (data.etymology_info && data.etymology_info.etymology) {
                etymologyContent.innerHTML = `<div class="etymology-content">${data.etymology_info.etymology}</div>`;
            }
            
            // Synonyms/Antonyms - combine from all senses
            const allSynonyms = new Set();
            const allAntonyms = new Set();
            if (data.detailed_senses) {
                data.detailed_senses.forEach(sense => {
                    if (sense.synonyms) {
                        sense.synonyms.forEach(s => allSynonyms.add(s));
                    }
                    if (sense.antonyms) {
                        sense.antonyms.forEach(a => allAntonyms.add(a));
                    }
                });
            }
            
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
            }
            
            // Cultural notes
            if (data.cultural_notes_info && data.cultural_notes_info.notes) {
                culturalContent.innerHTML = `<div class="cultural-content">${data.cultural_notes_info.notes}</div>`;
            }
            
            // Usage context
            if (data.usage_context_info) {
                let usageHtml = '<div class="context-item">';
                if (data.usage_context_info.modern_relevance) {
                    usageHtml += `<div class="context-label">Modern Relevance</div><div>${data.usage_context_info.modern_relevance}</div>`;
                }
                if (data.usage_context_info.regional_variations && data.usage_context_info.regional_variations.length) {
                    usageHtml += `<div class="context-label">Regional Variations</div><div>${data.usage_context_info.regional_variations.join(', ')}</div>`;
                }
                if (data.usage_context_info.common_confusions && data.usage_context_info.common_confusions.length) {
                    usageHtml += `<div class="context-label">Common Confusions</div><div>${data.usage_context_info.common_confusions.join(', ')}</div>`;
                }
                usageHtml += '</div>';
                usageContent.innerHTML = usageHtml;
            }
            
            // Word family
            if (data.word_family_info && data.word_family_info.word_family && data.word_family_info.word_family.length) {
                // Limit to first 20 words for display
                const displayWords = data.word_family_info.word_family.slice(0, 20);
                wordFamilyContent.innerHTML = `<div class="word-family-tags">${displayWords.map(wf => `<span class="word-tag">${wf}</span>`).join('')}</div>`;
            }
            
            showResults(true);
            
        } catch (error) {
            console.error('Search error:', error);
            showLoading(false);
            showEmptyState(true);
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
    
    // Initial state
    showResults(false);
    showLoading(false);
    showEmptyState(true);
});