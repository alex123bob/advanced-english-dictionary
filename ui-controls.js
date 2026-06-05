// Theme picker and floating action controls.
(function () {
    'use strict';

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

    function initTheme(config) {
        const validThemes = new Set(
            Array.from(document.querySelectorAll('.theme-swatch')).map(s => s.dataset.theme || '')
        );
        const configTheme = config && config.app ? (config.app.theme || '') : '';
        const saved = localStorage.getItem(THEME_KEY);
        const savedIsValid = saved !== null && validThemes.has(saved);
        const resolvedTheme = savedIsValid ? saved : configTheme;
        if (!savedIsValid && saved !== null) {
            localStorage.setItem(THEME_KEY, resolvedTheme);
        }
        applyTheme(resolvedTheme);
    }

    function initSpeedDial() {
        const speedDial = document.getElementById('speedDial');
        const speedDialBtn = document.getElementById('speedDialBtn');
        const themePickerBtn = document.getElementById('themePickerBtn');
        const themePickerPanel = document.getElementById('themePickerPanel');

        if (!speedDial || !speedDialBtn || !themePickerBtn || !themePickerPanel) return;

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
            e.stopPropagation();
            const theme = swatch.dataset.theme || '';
            localStorage.setItem(THEME_KEY, theme);
            applyTheme(theme);
        });
    }

    function init(options = {}) {
        initTheme(options.config || window.config || null);
        initSpeedDial();
    }

    window.UIControls = {
        init,
        applyTheme
    };
})();
