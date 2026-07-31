(function () {
    'use strict';

    const SCHEDULE_URL = 'https://raw.githubusercontent.com/alex123bob/advanced-english-dictionary/main/data/wotd-schedule.json';
    var configApiHost = window.config && window.config.api ? window.config.api.host : '';
    var API_URL = (configApiHost || '') + '/api/dictionary';
    var TRANSLATE_URL = (configApiHost || '') + '/api/translate';

    let currentWord = '';
    let currentData = null;

    const $ = id => document.getElementById(id);
    const el = {
        loading: $('loadingDisplay'),
        error: $('errorDisplay'),
        errorMsg: $('errorMessage'),
        retryBtn: $('retryBtn'),
        page: $('wotdPage'),
        card: $('wotdCard'),
        cardInner: $('wotdCardInner'),
        word: $('wordDisplay'),
        example: $('exampleDisplay'),
        exampleZh: $('exampleZhDisplay'),
        qrContainer: $('qrContainer'),
        qrUrl: $('qrUrlDisplay'),
        exportPngBtn: $('exportPngBtn'),
        exportPdfBtn: $('exportPdfBtn'),
    };

    var backgroundClasses = ['bg-1','bg-2','bg-3','bg-4','bg-5','bg-6','bg-7','bg-8'];

    function entry() {
        return currentData && currentData.entries && currentData.entries[0] ? currentData.entries[0] : null;
    }

    function firstSummary() {
        var e = entry();
        return e && e.meanings_summary && e.meanings_summary[0] ? e.meanings_summary[0] : null;
    }

    function firstSense() {
        var s = firstSummary();
        return s && s.senses && s.senses[0] ? s.senses[0] : null;
    }

    function getExample() {
        var s = firstSense();
        if (s && s.example) return s.example;
        return '';
    }

    // When the first sense has no inline example, load the dedicated `examples`
    // section (entry 0, sense 0) the same way the main dictionary does, and
    // return its first example sentence. Returns '' if none is available.
    async function fetchFirstSenseExample(word) {
        var json = await apiPost({ word: word, section: 'examples', entry_index: 0, sense_index: 0 });
        var examples = json.examples;
        if (examples && examples.length) return examples[0];
        return '';
    }

    async function translateText(text, targetLang) {
        if (!text) return '';
        var res = await fetch(TRANSLATE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ text: text, target_lang: targetLang })
        });
        if (!res.ok) throw new Error('Translate API returned ' + res.status);
        var json = await res.json();
        if (!json.success) throw new Error(json.error || 'Translate API error');
        return json.translation || '';
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function getTodayString() {
        return new Date().toISOString().slice(0, 10);
    }

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

    async function fetchWordData(word) {
        var basic = await apiPost({ word: word, section: 'basic', entry_index: 0 });
        var sections = await Promise.allSettled([
            apiPost({ word: word, section: 'frequency', entry_index: 0 })
        ]);
        sections.forEach(function (result) {
            if (result.status === 'fulfilled' && result.value.frequency) {
                basic.frequency = result.value.frequency;
            }
        });
        return basic;
    }

    // ---- Render ----
    function renderWord(data, example, exampleZh) {
        currentData = data;
        el.loading.hidden = true;
        el.error.hidden = true;
        el.page.hidden = false;

        var word = data.headword || currentWord;
        var url = 'https://www.lijialab.com/?q=' + encodeURIComponent(word);

        el.word.textContent = word;
        el.word.href = url;

        el.example.textContent = example || '';
        el.example.hidden = !example;

        var exampleZhText = exampleZh || '';
        el.exampleZh.textContent = exampleZhText;
        el.exampleZh.hidden = !exampleZhText;

        // Random background
        var prevBg = el.card.dataset.bg;
        var available = backgroundClasses.filter(function (c) { return c !== prevBg; });
        var picked = available[Math.floor(Math.random() * available.length)];
        backgroundClasses.forEach(function (c) { el.card.classList.remove(c); });
        el.card.classList.add(picked);
        el.card.dataset.bg = picked;

        // QR code
        el.qrContainer.innerHTML = '';
        new QRCode(el.qrContainer, {
            text: url,
            width: 72,
            height: 72,
            colorDark: '#111827',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
        el.qrUrl.textContent = url;

        el.exportPngBtn.disabled = false;
        el.exportPdfBtn.disabled = false;
    }

    // ---- Main ----
    async function loadWordOfTheDay() {
        el.loading.hidden = false;
        el.error.hidden = true;
        el.page.hidden = true;

        try {
            const today = getTodayString();
            const schedule = await fetchSchedule();
            const entry = schedule.find(function (e) { return e.date === today; });
            const word = entry ? entry.word : 'serendipity';
            currentWord = word;
            const data = await fetchWordData(word);
            // Get the English example, translate it, then render
            currentData = data; // needed so getExample() can read it
            var englishExample = getExample();
            // If the first sense has no inline example, load the dedicated
            // examples section (as the main dictionary does) before rendering.
            if (!englishExample) {
                try {
                    englishExample = await fetchFirstSenseExample(word);
                } catch (exErr) {
                    console.warn('WOTD: failed to load examples section:', exErr);
                }
            }
            var translateResult = await Promise.allSettled([
                translateText(englishExample, 'zh-cn')
            ]);
            var exampleZh = (translateResult[0].status === 'fulfilled') ? translateResult[0].value : '';
            renderWord(data, englishExample, exampleZh);
        } catch (err) {
            console.error('WOTD error:', err);
            el.loading.hidden = true;
            el.error.hidden = false;
            el.errorMsg.textContent = err.message || 'Check back tomorrow.';
        }
    }

    el.retryBtn.addEventListener('click', loadWordOfTheDay);

    // ---- Export ----
    function downloadBlob(blob, filename) {
        var url = URL.createObjectURL(blob);
        // iOS Safari ignores the `download` attribute on <a> tags and does not
        // support programmatic .click() triggered downloads. Opening the blob
        // URL directly gives users the share/save sheet instead.
        var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
            window.open(url, '_blank');
            setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
            return;
        }
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    // Strip SVG data: URI layers from an element's computed background so that
    // html2canvas (which cannot reliably render inline SVG images on iOS Safari)
    // only sees the CSS gradient layer. Recurses into child elements.
    function stripSvgBackgrounds(el) {
        var computed = window.getComputedStyle(el).backgroundImage;
        if (computed && computed.indexOf('data:image/svg+xml') !== -1) {
            // Split multi-layer background-image and keep only non-SVG layers
            var layers = computed.split(/,(?![^(]*\))/);
            var filtered = layers.filter(function (layer) {
                return layer.indexOf('data:image/svg+xml') === -1;
            });
            el.style.backgroundImage = filtered.length ? filtered.join(', ') : 'none';
        }
        for (var i = 0; i < el.children.length; i++) {
            stripSvgBackgrounds(el.children[i]);
        }
    }

    async function exportPng() {
        var clone = null;
        try {
            el.exportPngBtn.disabled = true;
            clone = el.card.cloneNode(true);
            clone.classList.add('wotd-export-clone');
            clone.style.position = 'absolute';
            clone.style.left = '-9999px';
            clone.style.top = '0';
            document.body.appendChild(clone);

            // Remove SVG data: URI backgrounds before rendering — html2canvas
            // cannot reliably load inline SVG images on iOS Safari, causing the
            // canvas to be blank. The gradient layer alone looks fine in exports.
            stripSvgBackgrounds(clone);

            var canvas = await html2canvas(clone, {
                scale: 3,
                backgroundColor: null,
                logging: false,
                useCORS: true,
            });

            var blob = await new Promise(function (resolve) {
                canvas.toBlob(resolve, 'image/png');
            });

            if (!blob) {
                throw new Error('Failed to create image blob');
            }

            downloadBlob(blob, 'wotd-' + currentWord + '.png');
        } catch (err) {
            console.error('PNG export failed:', err);
        } finally {
            el.exportPngBtn.disabled = false;
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
