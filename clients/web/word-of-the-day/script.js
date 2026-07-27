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
        page: $('wotdPage'),
        card: $('wotdCard'),
        cardInner: $('wotdCardInner'),
        word: $('wordDisplay'),
        example: $('exampleDisplay'),
        qrContainer: $('qrContainer'),
        qrUrl: $('qrUrlDisplay'),
        exportSvgBtn: $('exportSvgBtn'),
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
        if (s && s.definition) return s.definition;
        return '';
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
    function renderWord(data) {
        currentData = data;
        el.loading.hidden = true;
        el.error.hidden = true;
        el.page.hidden = false;

        var word = data.headword || currentWord;
        var url = 'https://www.lijialab.com/?q=' + encodeURIComponent(word);

        el.word.textContent = word;
        el.word.href = url;

        var example = getExample();
        el.example.textContent = example;
        el.example.style.display = example ? '' : 'none';

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

        el.exportSvgBtn.disabled = false;
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
            renderWord(data);
        } catch (err) {
            console.error('WOTD error:', err);
            el.loading.hidden = true;
            el.error.hidden = false;
            el.errorMsg.textContent = err.message || 'Check back tomorrow.';
        }
    }

    el.retryBtn.addEventListener('click', loadWordOfTheDay);

    // ---- Export ----
    async function exportSvg() {
        var clone = null;
        try {
            el.exportSvgBtn.disabled = true;
            clone = el.card.cloneNode(true);
            clone.classList.add('wotd-export-clone');
            clone.style.position = 'absolute';
            clone.style.left = '-9999px';
            clone.style.top = '0';
            document.body.appendChild(clone);

            var w = clone.offsetWidth;
            var h = clone.offsetHeight;

            var canvas = await html2canvas(clone, {
                scale: 2,
                backgroundColor: null,
                logging: false,
                useCORS: true,
            });

            var imgData = canvas.toDataURL('image/png');
            var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
                '<image href="' + imgData + '" width="' + w + '" height="' + h + '"/>' +
                '</svg>';

            var blob = new Blob([svg], { type: 'image/svg+xml' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'wotd-' + currentWord + '.svg';
            a.click();
            URL.revokeObjectURL(url);
            el.exportSvgBtn.disabled = false;
        } catch (err) {
            console.error('SVG export failed:', err);
            el.exportSvgBtn.disabled = false;
        } finally {
            if (clone && clone.parentNode) {
                clone.parentNode.removeChild(clone);
            }
        }
    }

    function exportPdf() {
        window.print();
    }

    el.exportSvgBtn.addEventListener('click', exportSvg);
    el.exportPdfBtn.addEventListener('click', exportPdf);

    loadWordOfTheDay();

})();
