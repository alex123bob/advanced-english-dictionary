(function () {
    var posIcons = {
        verb: 'fa-running', noun: 'fa-cube', adjective: 'fa-paint-brush',
        adverb: 'fa-tachometer-alt', preposition: 'fa-arrows-alt',
        conjunction: 'fa-link', interjection: 'fa-comment-dots'
    };

    function renderScaffold(searchedWord, confusedWord) {
        return '<div class="wcd-b-wrap">' +
            '<div class="wcd-slot-meta"><div class="wcd-skeleton wcd-skeleton-meta"></div></div>' +
            '<div class="wcd-b-cards-row">' +
                '<div class="wcd-slot-card-a"><div class="wcd-skeleton wcd-skeleton-card"></div></div>' +
                '<div class="wcd-b-vs-divider"><div class="wcd-b-vs-badge">VS</div></div>' +
                '<div class="wcd-slot-card-b"><div class="wcd-skeleton wcd-skeleton-card"></div></div>' +
            '</div>' +
        '</div>';
    }

    function renderMeta(meta, searchedWord, confusedWord) {
        var confusion_type = meta.confusion_type;
        var quick_rule = meta.quick_rule;
        var key_differentiator = meta.key_differentiator;
        var difficulty = meta.difficulty;

        var difficultyConfig = {
            low:    { color: '#10b981', label: 'Easy to tell apart', icon: 'fa-check-circle' },
            medium: { color: '#f59e0b', label: 'Often confused',     icon: 'fa-exclamation-circle' },
            high:   { color: '#ef4444', label: 'Very easily mixed',  icon: 'fa-times-circle' }
        };
        var diff = difficultyConfig[difficulty] || { color: '#94a3b8', label: difficulty || 'Unknown', icon: 'fa-circle' };

        var typeIcons = {
            near_homophone: 'fa-volume-up', semantic_overlap: 'fa-project-diagram',
            spelling_similarity: 'fa-spell-check', false_friend: 'fa-mask', register_mismatch: 'fa-sliders-h'
        };
        var typeLabels = {
            near_homophone: 'Sounds alike', semantic_overlap: 'Meaning overlap',
            spelling_similarity: 'Similar spelling', false_friend: 'False friend', register_mismatch: 'Register mismatch'
        };
        var typeIcon  = typeIcons[confusion_type]  || 'fa-question-circle';
        var typeLabel = typeLabels[confusion_type] || confusion_type;
        var mwc = typeof makeWordsClickable === 'function' ? makeWordsClickable : function (t) { return t; };

        var html = '';

        html += '<div class="wcd-b-tags">' +
            '<span class="wcd-b-type-pill"><i class="fas ' + typeIcon + '"></i> ' + typeLabel + '</span>' +
            '<span class="wcd-b-diff-pill" style="background:' + diff.color + '18;color:' + diff.color + ';border-color:' + diff.color + '40">' +
                '<i class="fas ' + diff.icon + '"></i> ' + diff.label +
            '</span>' +
        '</div>';

        if (quick_rule) {
            html += '<div class="wcd-b-quick-rule">' +
                '<div class="wcd-b-quick-rule-icon"><i class="fas fa-bolt"></i></div>' +
                '<div class="wcd-b-quick-rule-body">' +
                    '<div class="wcd-b-quick-rule-label">Quick Rule</div>' +
                    '<div class="wcd-b-quick-rule-text">' + mwc(quick_rule) + '</div>' +
                '</div>' +
            '</div>';
        }

        if (key_differentiator) {
            html += '<div class="wcd-b-key-diff">' +
                '<div class="wcd-b-key-diff-icon"><i class="fas fa-not-equal"></i></div>' +
                '<div class="wcd-b-key-diff-body">' +
                    '<div class="wcd-b-key-diff-label">Key Difference</div>' +
                    '<div class="wcd-b-key-diff-text">' + mwc(key_differentiator) + '</div>' +
                '</div>' +
            '</div>';
        }

        return html;
    }

    function renderCard(profileData, examplesData, wordLabel, side, posMatch) {
        var posHighlight = !posMatch ? 'wcd-b-attr-diff' : 'wcd-b-attr-same';
        var posIcon = posIcons[profileData.part_of_speech] || 'fa-tag';
        var mwc = typeof makeWordsClickable === 'function' ? makeWordsClickable : function (t) { return t; };

        var html = '<div class="wcd-b-card wcd-b-card-' + side + '">';

        html += '<div class="wcd-b-card-head">' +
            '<span class="wcd-b-card-word">' + wordLabel + '</span>' +
            '<span class="wcd-b-attr-pill ' + posHighlight + '"><i class="fas ' + posIcon + '"></i> ' + profileData.part_of_speech + '</span>' +
        '</div>';

        html += '<div class="wcd-b-card-body">';

        html += '<div class="wcd-b-card-meaning">' + mwc(profileData.core_meaning) + '</div>';

        if (examplesData && examplesData.example_sentences && examplesData.example_sentences.length) {
            html += '<div class="wcd-b-card-example"><em>' + mwc(examplesData.example_sentences[0]) + '</em></div>';
        } else if (!examplesData) {
            html += '<div class="wcd-b-card-example-skeleton wcd-skeleton"></div>';
        }

        if (examplesData && examplesData.usage_note) {
            html += '<div class="wcd-b-card-usage-note"><i class="fas fa-lightbulb wcd-field-icon"></i><span>' + mwc(examplesData.usage_note) + '</span></div>';
        }

        if (profileData.collocations && profileData.collocations.length) {
            html += '<div class="wcd-b-card-section">' +
                '<div class="wcd-b-card-section-label"><i class="fas fa-link"></i> Goes with</div>' +
                '<div class="wcd-b-card-chips">' + profileData.collocations.map(function (c) { return '<span class="wcd-b-colloc-chip">' + c + '</span>'; }).join('') + '</div>' +
            '</div>';
        }

        if (profileData.grammar_note) {
            html += '<div class="wcd-b-card-grammar"><i class="fas fa-cogs wcd-field-icon"></i><span>' + mwc(profileData.grammar_note) + '</span></div>';
        }

        html += '</div></div>';
        return html;
    }

    window.ConfusionUI = {
        renderScaffold: renderScaffold,
        renderMeta: renderMeta,
        renderCard: renderCard
    };
})();
