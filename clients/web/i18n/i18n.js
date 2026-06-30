(function () {
    'use strict';

    const DEFAULT_LANGUAGE = 'en';
    const languages = [];
    const translations = {};
    let currentLanguage = DEFAULT_LANGUAGE;

    function normalizeCode(language) {
        return String(language || '').toLowerCase();
    }

    function hasLanguage(language) {
        const code = normalizeCode(language);
        return languages.some(item => item.code === code);
    }

    function normalizeLanguage(language) {
        const code = normalizeCode(language);
        return hasLanguage(code) ? code : DEFAULT_LANGUAGE;
    }

    function registerLanguage(metadata, dictionary = {}) {
        if (!metadata || !metadata.code) {
            throw new Error('i18n language metadata requires a code');
        }

        const code = normalizeCode(metadata.code);
        const entry = { ...metadata, code };
        const existingIndex = languages.findIndex(language => language.code === code);

        if (existingIndex >= 0) {
            languages[existingIndex] = { ...languages[existingIndex], ...entry };
        } else {
            languages.push(entry);
        }

        translations[code] = { ...(translations[code] || {}), ...dictionary };
    }

    function getLanguages() {
        return languages.map(language => ({ ...language }));
    }

    function getLanguageMeta(language = currentLanguage) {
        const code = normalizeLanguage(language);
        return languages.find(item => item.code === code) || languages.find(item => item.code === DEFAULT_LANGUAGE) || { code: DEFAULT_LANGUAGE, htmlLang: 'en', label: 'English' };
    }

    function setLanguage(language) {
        currentLanguage = normalizeLanguage(language);
        return currentLanguage;
    }

    function getLanguage() {
        return currentLanguage;
    }

    function isLanguage(language) {
        return normalizeLanguage(currentLanguage) === normalizeLanguage(language);
    }

    function t(key, replacements = {}, language = currentLanguage) {
        const code = normalizeLanguage(language);
        const dictionary = translations[code] || translations[DEFAULT_LANGUAGE] || {};
        const fallback = translations[DEFAULT_LANGUAGE] || {};
        const template = dictionary[key] || fallback[key] || key;

        return Object.entries(replacements).reduce((text, [name, value]) => {
            return text.replaceAll(`{${name}}`, value);
        }, template);
    }

    window.AdvancedDictionaryI18n = {
        defaultLanguage: DEFAULT_LANGUAGE,
        registerLanguage,
        getLanguages,
        getLanguageMeta,
        normalizeLanguage,
        setLanguage,
        getLanguage,
        isLanguage,
        t
    };
})();
