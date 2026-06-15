// Theme picker and floating action controls.
(function () {
    'use strict';

    const THEME_KEY = 'dict_theme';
    const STYLE_MODE_KEY = 'dict_style_mode';
    const STYLE_MODES = new Set(['adventure', 'professional']);

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

    function applyStyleMode(mode) {
        const resolved = STYLE_MODES.has(mode) ? mode : 'adventure';
        const adventureLink = document.getElementById('adventureStyleLink');
        const toggleBtn = document.getElementById('styleModeToggleBtn');
        const isProfessional = resolved === 'professional';

        document.documentElement.setAttribute('data-style-mode', resolved);
        if (adventureLink) {
            adventureLink.disabled = isProfessional;
        }
        if (toggleBtn) {
            toggleBtn.setAttribute('aria-pressed', String(isProfessional));
            toggleBtn.setAttribute(
                'aria-label',
                isProfessional ? 'Switch to Adventure style' : 'Switch to Professional style'
            );
            toggleBtn.title = isProfessional ? 'Switch to Adventure style' : 'Switch to Professional style';
            toggleBtn.innerHTML = isProfessional
                ? '<i class="fas fa-wand-magic-sparkles"></i><span>Adventure</span>'
                : '<i class="fas fa-store"></i><span>Professional</span>';
        }
    }

    function initStyleMode() {
        const saved = localStorage.getItem(STYLE_MODE_KEY);
        const resolved = STYLE_MODES.has(saved) ? saved : 'adventure';
        const toggleBtn = document.getElementById('styleModeToggleBtn');

        applyStyleMode(resolved);

        if (toggleBtn) {
            toggleBtn.addEventListener('click', e => {
                e.stopPropagation();
                const current = document.documentElement.getAttribute('data-style-mode') || 'adventure';
                const next = current === 'professional' ? 'adventure' : 'professional';
                localStorage.setItem(STYLE_MODE_KEY, next);
                applyStyleMode(next);
            });
        }
    }

    function initScrollTop() {
        const scrollTopBtn = document.getElementById('scrollTopBtn');
        if (!scrollTopBtn) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let ticking = false;

        function updateVisibility() {
            scrollTopBtn.classList.toggle('visible', window.scrollY > 420);
            ticking = false;
        }

        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(updateVisibility);
        }, { passive: true });

        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: prefersReducedMotion.matches ? 'auto' : 'smooth'
            });
        });

        updateVisibility();
    }

    function init(options = {}) {
        initTheme(options.config || window.config || null);
        initStyleMode();
        initSpeedDial();
        initScrollTop();
    }

    window.UIControls = {
        init,
        applyTheme,
        applyStyleMode
    };
})();
