(function () {
    'use strict';

    const SCHEDULE_URL = 'https://raw.githubusercontent.com/alex123bob/advanced-english-dictionary/main/data/wotd-schedule.json';
    var configApiHost = window.config && window.config.api ? window.config.api.host : '';
    var API_URL = (configApiHost || '') + '/api/dictionary';

    let currentWord = '';
    let currentData = null;

    const $ = id => document.getElementById(id);
    const el = {
        loading: $('loadingDisplay'),
        error: $('errorDisplay'),
        errorMsg: $('errorMessage'),
        retryBtn: $('retryBtn'),
        date: $('wotdDate'),
        word: $('wordDisplay'),
        pronunciation: $('pronunciationDisplay'),
        posBadge: $('posBadge'),
        frequency: $('frequencyDisplay'),
        coreSense: $('coreSenseDisplay'),
        audioBtn: $('audioBtn'),
        videoQuote: $('videoQuote'),
        videoSource: $('videoSource'),
        videoBlock: $('videoBlock'),
        confusablesBody: $('confusablesBody'),
        confusablesBlock: $('confusablesBlock'),
        collocationsBody: $('collocationsBody'),
        collocationsBlock: $('collocationsBlock'),
        cultureBody: $('cultureBody'),
        cultureBlock: $('cultureBlock'),
        grammarBody: $('grammarBody'),
        grammarBlock: $('grammarBlock'),
        familyBody: $('familyBody'),
        familyBlock: $('familyBlock'),
        exportPngBtn: $('exportPngBtn'),
        exportPdfBtn: $('exportPdfBtn'),
        card: $('wotdCard'),
        qrContainer: $('qrContainer'),
        qrUrl: $('qrUrlDisplay'),
        page: $('wotdPage'),
    };

    // ---- Audio ----
    let currentSound = null;

    function playAudio(url) {
        if (!url) return;

        if (currentSound) {
            currentSound.pause();
            currentSound = null;
            el.audioBtn.classList.remove('playing');
            return;
        }

        const audio = new Audio(url);
        audio.volume = 0.8;
        audio.addEventListener('play', () => el.audioBtn.classList.add('playing'));
        audio.addEventListener('ended', () => {
            el.audioBtn.classList.remove('playing');
            currentSound = null;
        });
        audio.addEventListener('error', () => {
            el.audioBtn.classList.remove('playing');
            currentSound = null;
        });
        currentSound = audio;
        audio.play().catch(() => {
            el.audioBtn.classList.remove('playing');
            currentSound = null;
        });
    }

    el.audioBtn.addEventListener('click', () => {
        if (currentData && currentData.pronunciation_audio) {
            playAudio(currentData.pronunciation_audio);
        }
    });

    // ---- Data fetching ----
    async function fetchSchedule() {
        const res = await fetch(SCHEDULE_URL);
        if (!res.ok) throw new Error('Failed to fetch schedule');
        return res.json();
    }

    async function fetchWordData(word) {
        const url = `${API_URL}?q=${encodeURIComponent(word)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        return res.json();
    }

    // ---- Render ----
    function getTodayString() {
        return new Date().toISOString().slice(0, 10);
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function getCoreSense(data) {
        if (data.detailed_senses && data.detailed_senses.length > 0) {
            const sense = data.detailed_senses[0];
            return sense.short_definition || sense.definition || '';
        }
        return '';
    }

    function getVideoData(data) {
        if (data.video_resources && data.video_resources.length > 0) {
            const v = data.video_resources[0];
            return { quote: v.context || v.example || '', source: v.title || v.source || '' };
        }
        if (data.detailed_senses && data.detailed_senses.length > 0) {
            const examples = data.detailed_senses[0].examples || [];
            if (examples.length > 0) {
                return { quote: examples[0], source: 'Example usage' };
            }
        }
        return null;
    }

    function getConfusables(data) {
        if (data.confusion_pairs && data.confusion_pairs.length > 0) {
            return data.confusion_pairs.slice(0, 3).map(p => ({
                word: p.word || p.confused_word || '',
                tip: p.tip || p.differentiation || ''
            }));
        }
        if (data.common_misused_words) {
            return data.common_misused_words.slice(0, 3).map(w => ({
                word: typeof w === 'string' ? w : w.word || '',
                tip: w.tip || w.note || ''
            }));
        }
        return null;
    }

    function getCollocations(data) {
        if (data.collocations && data.collocations.length > 0) {
            return data.collocations;
        }
        if (data.word_family && data.word_family.collocations) {
            return data.word_family.collocations;
        }
        return null;
    }

    function getCultureData(data) {
        const note = data.cultural_notes_info || data.cultural_notes || null;
        const usage = data.usage_context_info || data.usage_context || null;
        return {
            note: note ? (note.notes || note.note || '') : '',
            formality: usage ? (usage.formality || usage.formality_level || '') : ''
        };
    }

    function getGrammarData(data) {
        if (data.usage_context_info && data.usage_context_info.grammar_notes) {
            return {
                pattern: data.usage_context_info.grammar_notes.pattern || '',
                tip: data.usage_context_info.grammar_notes.common_mistake || data.usage_context_info.grammar_notes.tip || ''
            };
        }
        if (data.detailed_senses && data.detailed_senses.length > 0) {
            for (const sense of data.detailed_senses) {
                if (sense.grammar_note || sense.usage_note) {
                    return {
                        pattern: sense.grammar_note || '',
                        tip: sense.usage_note || ''
                    };
                }
            }
        }
        return null;
    }

    function getFamilyData(data) {
        const wf = data.word_family_info || data.word_family || null;
        if (!wf) return null;
        const forms = [];
        if (wf.noun) forms.push({ pos: 'noun', word: wf.noun });
        if (wf.verb) forms.push({ pos: 'verb', word: wf.verb });
        if (wf.adjective) forms.push({ pos: 'adjective', word: wf.adjective });
        if (wf.adverb) forms.push({ pos: 'adverb', word: wf.adverb });
        return forms.length > 0 ? forms : null;
    }

    function renderWord(data) {
        currentData = data;
        el.loading.hidden = true;
        el.error.hidden = true;
        el.page.hidden = false;

        el.word.textContent = data.headword || currentWord;
        el.pronunciation.textContent = data.pronunciation || '';
        el.posBadge.textContent = data.part_of_speech || data.pos || '';
        el.posBadge.style.display = data.part_of_speech || data.pos ? '' : 'none';

        if (data.frequency) {
            el.frequency.textContent = data.frequency;
            el.frequency.style.display = '';
        } else {
            el.frequency.style.display = 'none';
        }

        el.coreSense.textContent = getCoreSense(data);
        el.audioBtn.style.display = data.pronunciation_audio ? '' : 'none';

        const video = getVideoData(data);
        if (video) {
            el.videoQuote.textContent = video.quote;
            el.videoSource.textContent = video.source;
            el.videoBlock.hidden = false;
        } else {
            el.videoBlock.hidden = true;
        }

        const confusables = getConfusables(data);
        if (confusables) {
            el.confusablesBody.innerHTML = confusables.map(c => `
                <div class="wotd-confusable-item">
                    <div class="wotd-confusable-word">${escapeHtml(c.word)}</div>
                    <div class="wotd-confusable-tip">${escapeHtml(c.tip)}</div>
                </div>
            `).join('');
            el.confusablesBlock.hidden = false;
        } else {
            el.confusablesBlock.hidden = true;
        }

        const collocations = getCollocations(data);
        if (collocations) {
            el.collocationsBody.innerHTML = collocations.map(c => `
                <span class="wotd-chip">${escapeHtml(typeof c === 'string' ? c : c.word || c)}</span>
            `).join('');
            el.collocationsBlock.hidden = false;
        } else {
            el.collocationsBlock.hidden = true;
        }

        const culture = getCultureData(data);
        if (culture && (culture.note || culture.formality)) {
            let html = '';
            if (culture.note) {
                html += '<p class="wotd-culture-note">' + escapeHtml(culture.note) + '</p>';
            }
            if (culture.formality) {
                const cls = culture.formality.toLowerCase().includes('casual') ? 'casual'
                    : culture.formality.toLowerCase().includes('formal') ? 'formal'
                    : 'neutral';
                html += '<span class="wotd-formality-badge ' + cls + '">' + escapeHtml(culture.formality) + '</span>';
            }
            el.cultureBody.innerHTML = html;
            el.cultureBlock.hidden = false;
        } else {
            el.cultureBlock.hidden = true;
        }

        const grammar = getGrammarData(data);
        if (grammar && (grammar.pattern || grammar.tip)) {
            let html = '';
            if (grammar.pattern) {
                html += '<p class="wotd-grammar-pattern">' + escapeHtml(grammar.pattern) + '</p>';
            }
            if (grammar.tip) {
                html += '<div class="wotd-grammar-tip"><span class="wotd-grammar-tip-icon">&#x1f4a1;</span><span>' + escapeHtml(grammar.tip) + '</span></div>';
            }
            el.grammarBody.innerHTML = html;
            el.grammarBlock.hidden = false;
        } else {
            el.grammarBlock.hidden = true;
        }

        const family = getFamilyData(data);
        if (family) {
            el.familyBody.innerHTML = family.map(f => `
                <div class="wotd-family-item">
                    <div class="wotd-family-pos">${escapeHtml(f.pos)}</div>
                    <div class="wotd-family-word">${escapeHtml(f.word)}</div>
                </div>
            `).join('');
            el.familyBlock.hidden = false;
        } else {
            el.familyBlock.hidden = true;
        }

        el.exportPngBtn.disabled = false;
        el.exportPdfBtn.disabled = false;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    // ---- Main ----
    async function loadWordOfTheDay() {
        el.loading.hidden = false;
        el.error.hidden = true;
        el.page.hidden = true;

        try {
            const today = getTodayString();
            el.date.textContent = formatDate(today);

            const schedule = await fetchSchedule();
            const entry = schedule.find(e => e.date === today);

            const word = entry ? entry.word : 'serendipity';
            currentWord = word;

            const data = await fetchWordData(word);
            renderWord(data);

            const qrUrl = 'https://www.lijialab.com/?q=' + encodeURIComponent(word);
            el.qrUrl.textContent = qrUrl;
            new QRCode(el.qrContainer, {
                text: qrUrl,
                width: 72,
                height: 72,
                colorDark: '#111827',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
        } catch (err) {
            console.error('WOTD error:', err);
            el.loading.hidden = true;
            el.error.hidden = false;
            el.errorMsg.textContent = err.message || 'Check back tomorrow.';
        }
    }

    el.retryBtn.addEventListener('click', loadWordOfTheDay);

    // ---- Export ----
    async function exportPng() {
        var clone = null;
        try {
            el.exportPngBtn.disabled = true;
            el.exportPngBtn.textContent = 'Rendering...';

            clone = el.card.cloneNode(true);
            clone.classList.add('wotd-export-clone');
            clone.style.position = 'absolute';
            clone.style.left = '-9999px';
            clone.style.top = '0';
            clone.style.width = '800px';
            clone.style.background = '#ffffff';

            document.body.appendChild(clone);

            var canvas = await html2canvas(clone, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: true,
            });

            canvas.toBlob(function (blob) {
                if (blob) {
                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.href = url;
                    a.download = 'wotd-' + currentWord + '.png';
                    a.click();
                    URL.revokeObjectURL(url);
                }
                el.exportPngBtn.disabled = false;
                el.exportPngBtn.textContent = 'PNG';
            }, 'image/png');
        } catch (err) {
            console.error('PNG export failed:', err);
            el.exportPngBtn.disabled = false;
            el.exportPngBtn.textContent = 'PNG';
        } finally {
            if (clone && clone.parentNode) {
                clone.parentNode.removeChild(clone);
            }
        }
    }

    function exportPdf() {
        window.print();
    }

    el.exportPngBtn.addEventListener('click', exportPng);
    el.exportPdfBtn.addEventListener('click', exportPdf);

    loadWordOfTheDay();

})();
