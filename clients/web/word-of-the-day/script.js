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

    function entry() {
        return currentData && currentData.entries && currentData.entries[0] ? currentData.entries[0] : null;
    }

    function firstSense() {
        var e = entry();
        return e && e.senses && e.senses[0] ? e.senses[0] : null;
    }

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
        var e = entry();
        if (e && e.pronunciation) {
            playAudio(e.pronunciation);
        }
    });

    // ---- Data fetching ----
    async function fetchSchedule() {
        const res = await fetch(SCHEDULE_URL);
        if (!res.ok) throw new Error('Failed to fetch schedule');
        return res.json();
    }

    async function apiPost(body) {
        var res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('API returned ' + res.status);
        var json = await res.json();
        if (!json.success) throw new Error(json.error || 'API error');
        return json;
    }

    async function apiSection(word, section) {
        return apiPost({ word: word, section: section, entry_index: 0 });
    }

    async function fetchWordData(word) {
        var basic = await apiPost({ word: word, section: 'basic', entry_index: 0 });
        console.log('[WOTD] basic response root keys:', Object.keys(basic));
        if (basic.entries && basic.entries[0]) {
            console.log('[WOTD] entry[0] keys:', Object.keys(basic.entries[0]));
            var e0 = basic.entries[0];
            if (e0.senses && e0.senses[0]) {
                console.log('[WOTD] first sense keys:', Object.keys(e0.senses[0]));
            }
        }

        var sections = await Promise.allSettled([
            apiSection(word, 'cultural_notes'),
            apiSection(word, 'usage_context'),
            apiSection(word, 'word_family'),
            apiSection(word, 'frequency'),
            apiSection(word, 'common_phrases'),
            apiSection(word, 'bilibili_videos')
        ]);

        var sectionDefs = [
            { name: 'cultural_notes', target: ['cultural_notes', 'data'] },
            { name: 'usage_context',   target: ['usage_context', 'data'] },
            { name: 'word_family',     target: ['word_family', 'data'] },
            { name: 'frequency',       target: ['frequency'] },
            { name: 'common_phrases',  target: ['common_phrases'] },
            { name: 'bilibili_videos', target: ['bilibili_videos', 'videos', 'video_resources'] }
        ];

        sections.forEach(function (result, i) {
            var def = sectionDefs[i];
            if (result.status === 'fulfilled') {
                console.log('[WOTD] ' + def.name + ' root keys:', Object.keys(result.value));
                var found = false;
                for (var t = 0; t < def.target.length; t++) {
                    var key = def.target[t];
                    var val = result.value[key];
                    if (val) {
                        basic[key] = val;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    console.log('[WOTD] ' + def.name + ' no matching key from ' + JSON.stringify(def.target));
                }
            } else {
                console.error('[WOTD] ' + def.name + ' failed:', result.reason);
            }
        });

        return basic;
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

    function getCoreSense() {
        var s = firstSense();
        return s ? (s.short_definition || s.definition || '') : '';
    }

    function getPronunciation() {
        var e = entry();
        return e ? (e.ipa || '') : '';
    }

    function getPos() {
        var e = entry();
        if (e && e.meanings_summary && e.meanings_summary.length > 0) {
            return e.meanings_summary[0].part_of_speech || '';
        }
        return '';
    }

    function getAudioUrl() {
        var e = entry();
        return e ? (e.pronunciation || '') : '';
    }

    function getVideoData(data) {
        var videos = data.video_resources || data.bilibili_videos || null;
        if (videos && videos.length > 0) {
            var v = videos[0];
            return { quote: v.context || v.example || '', source: v.title || v.source || '' };
        }
        var s = firstSense();
        if (s && s.examples && s.examples.length > 0) {
            return { quote: s.examples[0], source: 'Example usage' };
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
        if (data.common_phrases && data.common_phrases.length > 0) {
            return data.common_phrases.slice(0, 8);
        }
        if (data.word_family && data.word_family.collocations) {
            return data.word_family.collocations;
        }
        return null;
    }

    function getCultureData(data) {
        var noteData = data.cultural_notes || null;
        var usageData = data.usage_context || null;
        return {
            note: noteData ? (typeof noteData === 'object' ? (noteData.notes || noteData.note || '') : String(noteData)) : '',
            formality: usageData ? (usageData.formality || usageData.formality_level || '') : ''
        };
    }

    function getGrammarData(data) {
        if (data.usage_context && data.usage_context.grammar_notes) {
            var gn = data.usage_context.grammar_notes;
            return {
                pattern: gn.pattern || '',
                tip: gn.common_mistake || gn.tip || ''
            };
        }
        var s = firstSense();
        if (s && (s.grammar_note || s.usage_note)) {
            return {
                pattern: s.grammar_note || '',
                tip: s.usage_note || ''
            };
        }
        return null;
    }

    function getFamilyData(data) {
        var wf = data.word_family || null;
        if (!wf) return null;
        var forms = [];
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
        el.pronunciation.textContent = getPronunciation();
        var pos = getPos();
        el.posBadge.textContent = pos;
        el.posBadge.style.display = pos ? '' : 'none';

        if (data.frequency) {
            el.frequency.textContent = data.frequency;
            el.frequency.style.display = '';
        } else {
            el.frequency.style.display = 'none';
        }

        el.coreSense.textContent = getCoreSense();

        var audioUrl = getAudioUrl();
        el.audioBtn.style.display = audioUrl ? '' : 'none';

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
            el.confusablesBody.innerHTML = confusables.map(c => '\n                <div class="wotd-confusable-item">\n                    <div class="wotd-confusable-word">' + escapeHtml(c.word) + '</div>\n                    <div class="wotd-confusable-tip">' + escapeHtml(c.tip) + '</div>\n                </div>\n            ').join('');
            el.confusablesBlock.hidden = false;
        } else {
            el.confusablesBlock.hidden = true;
        }

        const collocations = getCollocations(data);
        if (collocations) {
            el.collocationsBody.innerHTML = collocations.map(function (c) {
                return '\n                <span class="wotd-chip">' + escapeHtml(typeof c === 'string' ? c : c.word || c) + '</span>\n            ';
            }).join('');
            el.collocationsBlock.hidden = false;
        } else {
            el.collocationsBlock.hidden = true;
        }

        const culture = getCultureData(data);
        if (culture && (culture.note || culture.formality)) {
            var html = '';
            if (culture.note) {
                html += '<p class="wotd-culture-note">' + escapeHtml(culture.note) + '</p>';
            }
            if (culture.formality) {
                var cls = culture.formality.toLowerCase().includes('casual') ? 'casual'
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
            html = '';
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
            el.familyBody.innerHTML = family.map(function (f) {
                return '\n                <div class="wotd-family-item">\n                    <div class="wotd-family-pos">' + escapeHtml(f.pos) + '</div>\n                    <div class="wotd-family-word">' + escapeHtml(f.word) + '</div>\n                </div>\n            ';
            }).join('');
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
