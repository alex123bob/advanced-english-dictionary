// Comparison export module for word comparison cards.
(function () {
    'use strict';

    let config = null;
    let getCurrentWord = function () { return ''; };

    function init(options = {}) {
        config = options.config || window.config || null;
        getCurrentWord = typeof options.getCurrentWord === 'function' ? options.getCurrentWord : getCurrentWord;
    }

    function updateComparisonExportState(container, isReady) {
        const wrap = container.querySelector('.wcd-b-wrap');
        if (!wrap) return;
    
        wrap.querySelectorAll('.wcd-b-export-btn').forEach(button => {
            button.disabled = !isReady;
            button.title = isReady
                ? `Export as ${button.dataset.exportFormat.toUpperCase()}`
                : 'Export available after the comparison loads';
        });
    }
    
    function setComparisonExportStatus(wrap, message, state = '') {
        const status = wrap ? wrap.querySelector('.wcd-b-export-status') : null;
        if (!status) return;
    
        status.textContent = message || '';
        status.className = `wcd-b-export-status${state ? ` ${state}` : ''}`;
    }
    
    function getComparisonExportData(wrap, format) {
        const container = wrap.closest('.confusion-detail-container');
        const data = (container && container.__comparisonExportData) || {};
        const surface = wrap.querySelector('.wcd-b-export-surface');
    
        return {
            type: 'word_comparison',
            format,
            word: data.word || getCurrentWord() || '',
            confused_word: data.confusedWord || '',
            comparison: {
                meta: data.meta || null,
                profiles: data.profiles || null,
                examples: data.examples || null
            },
            html: surface ? surface.outerHTML : wrap.outerHTML,
            theme: document.documentElement.getAttribute('data-theme') || '',
            created_at: new Date().toISOString()
        };
    }
    
    function getExportFilename(payload, format) {
        const base = `${payload.word || 'word'}-vs-${payload.confused_word || 'comparison'}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'word-comparison';
        return `${base}.${format}`;
    }
    
    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    
    function base64ToBlob(base64, contentType) {
        const byteCharacters = atob(base64);
        const byteArrays = [];
    
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            byteArrays.push(new Uint8Array(byteNumbers));
        }
    
        return new Blob(byteArrays, { type: contentType });
    }
    
    function getExportEndpointCandidates() {
        const host = config && config.api ? (config.api.host || '') : '';
        return [
            `${host}/api/dictionary/export`,
            `${host}/api/export/word-comparison`,
            `${host}/api/export/confusion`
        ];
    }
    
    async function requestBackendComparisonExport(payload, format) {
        const endpoints = getExportEndpointCandidates();
        let lastError = null;
    
        for (const endpoint of endpoints) {
            const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const timeout = controller ? setTimeout(() => controller.abort(), 20000) : null;
    
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json, application/pdf, image/png',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload),
                    signal: controller ? controller.signal : undefined,
                    redirect: 'follow'
                });
    
                if (timeout) clearTimeout(timeout);
    
                if (response.status === 404 || response.status === 405) {
                    lastError = new Error(`No export route at ${endpoint}`);
                    continue;
                }
    
                if (!response.ok) {
                    throw new Error(`Export failed with ${response.status}`);
                }
    
                const contentType = response.headers.get('Content-Type') || '';
                const disposition = response.headers.get('Content-Disposition') || '';
                const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
                const filename = filenameMatch ? filenameMatch[1] : getExportFilename(payload, format);
                const expectedBinaryType = contentTypeForFormat(format).split(';')[0];
    
                if (response.redirected || contentType.includes('text/html')) {
                    lastError = new Error(`No export file returned from ${endpoint}`);
                    continue;
                }
    
                if (contentType.includes('application/json')) {
                    const result = await response.json();
                    if (result.url || result.download_url || result.file_url) {
                        const fileUrl = result.url || result.download_url || result.file_url;
                        const link = document.createElement('a');
                        link.href = fileUrl;
                        link.download = result.filename || filename;
                        link.rel = 'noopener';
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        return true;
                    }
    
                    if (result.content || result.data || result.base64) {
                        const base64 = result.content || result.data || result.base64;
                        const blob = base64ToBlob(base64, result.content_type || contentTypeForFormat(format));
                        downloadBlob(blob, result.filename || filename);
                        return true;
                    }
    
                    if (result.success === false) {
                        throw new Error(result.error || 'Backend export failed');
                    }
                } else {
                    if (!contentType.includes(expectedBinaryType)) {
                        lastError = new Error(`Unexpected export content type: ${contentType || 'unknown'}`);
                        continue;
                    }
    
                    const blob = await response.blob();
                    if (blob.size > 0) {
                        downloadBlob(blob, filename);
                        return true;
                    }
                }
            } catch (err) {
                if (timeout) clearTimeout(timeout);
                lastError = err;
            }
        }
    
        throw lastError || new Error('No backend export endpoint responded');
    }
    
    function contentTypeForFormat(format) {
        if (format === 'pdf') return 'application/pdf';
        if (format === 'png') return 'image/png';
        return 'text/html;charset=utf-8';
    }

    function canReadStylesheet(sheet) {
        return !sheet.href || sheet.href.startsWith(window.location.origin);
    }

    function appendStylesheetCss(sheet, visitedSheets) {
        if (!sheet || visitedSheets.has(sheet)) return '';
        visitedSheets.add(sheet);

        let css = '';
        if (!canReadStylesheet(sheet)) return css;

        try {
            Array.from(sheet.cssRules || []).forEach(rule => {
                if (rule.styleSheet) {
                    css += appendStylesheetCss(rule.styleSheet, visitedSheets);
                } else {
                    css += `${rule.cssText}\n`;
                }
            });
        } catch (err) {
            // Cross-origin stylesheets such as icon fonts are skipped by browser security.
        }

        return css;
    }
    
    function collectExportCss() {
        let css = '';
        const visitedSheets = new Set();

        Array.from(document.styleSheets).forEach(sheet => {
            css += appendStylesheetCss(sheet, visitedSheets);
        });
    
        css += `
            * { box-sizing: border-box; }
            body, .wcd-export-foreign {
                margin: 0;
                background: #ffffff;
                color: var(--text-color);
                font-family: Inter, Arial, sans-serif;
            }
            .wcd-export-page {
                width: 100%;
                padding: 24px;
                background: #ffffff;
            }
            .wcd-b-export-surface {
                animation: none !important;
            }
            .wcd-b-export-surface * {
                animation: none !important;
                transition: none !important;
            }
            .clickable-word {
                color: inherit;
                text-decoration: none;
                border-bottom: 0;
                cursor: default;
            }
            .wcd-export-icon-fallback {
                font-family: Inter, Arial, sans-serif !important;
                font-style: normal !important;
                font-weight: 800 !important;
                line-height: 1 !important;
            }
            .wcd-export-icon-fallback::before {
                content: none !important;
            }
        `;
    
        return css;
    }
    
    function iconExportFallback(icon) {
        const classList = icon.classList;
        if (classList.contains('fa-quote-left')) return '"';
        if (classList.contains('fa-lightbulb')) return '!';
        if (classList.contains('fa-cogs')) return '*';
        if (classList.contains('fa-cube')) return '□';
        if (classList.contains('fa-link')) return '~';
        if (classList.contains('fa-file-pdf')) return 'PDF';
        if (classList.contains('fa-file-image')) return 'PNG';
        if (classList.contains('fa-bolt')) return '!';
        if (classList.contains('fa-not-equal')) return '≠';
        return '•';
    }
    
    function cloneExportSurface(surface) {
        const clone = surface.cloneNode(true);
        clone.querySelectorAll('[data-lookup-word]').forEach(el => {
            el.removeAttribute('data-lookup-word');
        });
        clone.querySelectorAll('i.fas').forEach(icon => {
            icon.textContent = iconExportFallback(icon);
            icon.classList.add('wcd-export-icon-fallback');
        });
        return clone;
    }
    
    function buildExportHtml(surface) {
        const theme = document.documentElement.getAttribute('data-theme') || '';
        const clone = cloneExportSurface(surface);
    
        return `<!doctype html>
            <html lang="en" data-theme="${theme}">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Word comparison export</title>
                <style>${collectExportCss()}</style>
            </head>
            <body>
                <main class="wcd-export-page">${clone.outerHTML}</main>
            </body>
            </html>`;
    }
    
    function dataUrlToBlob(dataUrl) {
        const parts = dataUrl.split(',');
        const contentType = parts[0].match(/:(.*?);/)[1];
        return base64ToBlob(parts[1], contentType);
    }
    
    function canvasToBlob(canvas, contentType) {
        return new Promise(resolve => {
            if (canvas.toBlob) {
                canvas.toBlob(resolve, contentType);
            } else {
                resolve(dataUrlToBlob(canvas.toDataURL(contentType)));
            }
        });
    }
    
    function getThemeColor(name, fallback) {
        const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return value || fallback;
    }
    
    function hexToRgb(color) {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillStyle = color;
        const normalized = ctx.fillStyle;
        const match = normalized.match(/^#([0-9a-f]{6})$/i);
        if (!match) return { r: 0, g: 0, b: 0 };
    
        const value = parseInt(match[1], 16);
        return {
            r: (value >> 16) & 255,
            g: (value >> 8) & 255,
            b: value & 255
        };
    }
    
    function mixWithWhite(color, amount) {
        const rgb = hexToRgb(color);
        const mix = channel => Math.round(channel + ((255 - channel) * amount));
        return `rgb(${mix(rgb.r)}, ${mix(rgb.g)}, ${mix(rgb.b)})`;
    }
    
    function themeExportPalette() {
        const primary = getThemeColor('--primary-color', '#7c3aed');
        const primaryDark = getThemeColor('--primary-dark', primary);
        const secondary = getThemeColor('--secondary-color', '#10b981');
        const text = getThemeColor('--text-color', '#111827');
        const textLight = getThemeColor('--text-light', '#64748b');
        const textLighter = getThemeColor('--text-lighter', '#94a3b8');
        const border = getThemeColor('--border-color', '#e5e7eb');
        const card = getThemeColor('--card-bg', '#ffffff');
        const section = getThemeColor('--section-bg', mixWithWhite(primary, 0.92));
    
        return {
            primary,
            primaryDark,
            secondary,
            text,
            textLight,
            textLighter,
            border,
            card,
            section,
            primarySoft: mixWithWhite(primary, 0.9),
            primarySofter: mixWithWhite(primary, 0.95),
            secondarySoft: mixWithWhite(secondary, 0.9),
            secondarySofter: mixWithWhite(secondary, 0.95),
            warning: '#d97706',
            warningSoft: '#fffbeb',
            warningBorder: '#fde68a',
            danger: '#dc2626',
            dangerSoft: '#fff7f7',
            dangerBorder: '#fecaca'
        };
    }
    
    function drawRoundedRect(ctx, x, y, width, height, radius) {
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + width, y, x + width, y + height, r);
        ctx.arcTo(x + width, y + height, x, y + height, r);
        ctx.arcTo(x, y + height, x, y, r);
        ctx.arcTo(x, y, x + width, y, r);
        ctx.closePath();
    }
    
    function wrapCanvasLines(ctx, text, maxWidth) {
        const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ');
        const lines = [];
        let line = '';
    
        words.forEach(word => {
            const testLine = line ? `${line} ${word}` : word;
            if (ctx.measureText(testLine).width > maxWidth && line) {
                lines.push(line);
                line = word;
            } else {
                line = testLine;
            }
        });
    
        if (line) lines.push(line);
        return lines.length ? lines : [''];
    }
    
    function drawWrappedCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
        const lines = wrapCanvasLines(ctx, text, maxWidth);
        lines.forEach((line, index) => {
            ctx.fillText(line, x, y + (index * lineHeight));
        });
        return y + (lines.length * lineHeight);
    }
    
    function getCanvasBlockHeight(ctx, text, maxWidth, lineHeight, paddingY) {
        return (wrapCanvasLines(ctx, text, maxWidth).length * lineHeight) + (paddingY * 2);
    }
    
    function drawCanvasPill(ctx, text, x, y, fill, stroke, color) {
        ctx.font = '700 22px Arial, sans-serif';
        const width = ctx.measureText(text).width + 34;
        drawRoundedRect(ctx, x, y, width, 38, 19);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillText(text, x + 17, y + 26);
        return width;
    }
    
    function drawCanvasInfoBlock(ctx, label, text, x, y, width, fill, stroke, labelColor, textColor) {
        const padding = 24;
        ctx.font = '700 18px Arial, sans-serif';
        const textMaxWidth = width - (padding * 2);
        ctx.font = '400 24px Arial, sans-serif';
        const height = getCanvasBlockHeight(ctx, text, textMaxWidth, 34, padding) + 34;
    
        drawRoundedRect(ctx, x, y, width, height, 14);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
    
        ctx.font = '800 18px Arial, sans-serif';
        ctx.fillStyle = labelColor;
        ctx.fillText(label.toUpperCase(), x + padding, y + padding + 4);
    
        ctx.font = '400 24px Arial, sans-serif';
        ctx.fillStyle = textColor;
        drawWrappedCanvasText(ctx, text, x + padding, y + padding + 42, textMaxWidth, 34);
        return height;
    }

    function drawCanvasLabBackdrop(ctx, width, height, palette) {
        const bg = ctx.createLinearGradient(0, 0, width, height);
        bg.addColorStop(0, '#101322');
        bg.addColorStop(0.48, mixWithWhite(palette.primaryDark || palette.primary, 0.08));
        bg.addColorStop(1, '#0f172a');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        const glowA = ctx.createRadialGradient(170, 120, 10, 170, 120, 360);
        glowA.addColorStop(0, mixWithWhite(palette.primary, 0.28));
        glowA.addColorStop(1, 'rgba(16, 19, 34, 0)');
        ctx.fillStyle = glowA;
        ctx.fillRect(0, 0, width, 520);

        const glowB = ctx.createRadialGradient(width - 130, 150, 10, width - 130, 150, 380);
        glowB.addColorStop(0, mixWithWhite(palette.secondary, 0.24));
        glowB.addColorStop(1, 'rgba(16, 19, 34, 0)');
        ctx.fillStyle = glowB;
        ctx.fillRect(0, 0, width, 560);
    }

    function drawCanvasLabPill(ctx, text, x, y, fill, stroke, color) {
        ctx.font = '800 18px Arial, sans-serif';
        const width = ctx.measureText(text).width + 34;
        drawRoundedRect(ctx, x, y, width, 36, 18);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillText(text, x + 17, y + 24);
        return width;
    }

    function getCanvasMetaTileHeight(ctx, label, text, width) {
        const padding = 22;
        ctx.font = '400 22px Arial, sans-serif';
        return Math.max(132, getCanvasTextHeight(ctx, text, width - (padding * 2), 31) + 76);
    }

    function drawCanvasMetaTile(ctx, label, text, x, y, width, fill, stroke, accent) {
        const height = getCanvasMetaTileHeight(ctx, label, text, width);
        const padding = 22;

        drawRoundedRect(ctx, x, y, width, height, 18);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = accent;
        ctx.fillRect(x + padding, y + padding, 34, 4);

        ctx.font = '800 17px Arial, sans-serif';
        ctx.fillStyle = 'rgba(248, 250, 252, 0.64)';
        ctx.fillText(label.toUpperCase(), x + padding, y + padding + 30);

        ctx.font = '400 22px Arial, sans-serif';
        ctx.fillStyle = '#f8fafc';
        drawWrappedCanvasText(ctx, text, x + padding, y + padding + 66, width - (padding * 2), 31);
        return height;
    }

    function drawCanvasVsMedallion(ctx, x, y) {
        const radius = 39;
        const halo = ctx.createRadialGradient(x, y, 4, x, y, radius + 24);
        halo.addColorStop(0, 'rgba(254, 243, 199, 0.9)');
        halo.addColorStop(0.42, 'rgba(254, 243, 199, 0.2)');
        halo.addColorStop(1, 'rgba(254, 243, 199, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y, radius + 24, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#101322';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.font = '900 24px Arial, sans-serif';
        ctx.fillStyle = '#fef3c7';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('VS', x, y + 1);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }
    
    function drawCanvasCircleIcon(ctx, symbol, x, y, size, fill, stroke, color) {
        drawRoundedRect(ctx, x, y, size, size, size / 2);
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.font = '800 18px Arial, sans-serif';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, x + (size / 2), y + (size / 2) + 1);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }
    
    function getCanvasTextHeight(ctx, text, maxWidth, lineHeight) {
        return wrapCanvasLines(ctx, text, maxWidth).length * lineHeight;
    }
    
    function getCanvasNoteHeight(ctx, text, maxWidth) {
        ctx.font = '400 21px Arial, sans-serif';
        return Math.max(84, getCanvasTextHeight(ctx, text, maxWidth - 86, 29) + 52);
    }
    
    function drawCanvasNote(ctx, label, text, symbol, x, y, width, palette, accent, accentSoft) {
        const height = getCanvasNoteHeight(ctx, text, width);
        drawRoundedRect(ctx, x, y, width, height, 16);
        ctx.fillStyle = mixWithWhite(accent, 0.94);
        ctx.fill();
        ctx.strokeStyle = mixWithWhite(accent, 0.72);
        ctx.lineWidth = 2;
        ctx.stroke();
    
        drawCanvasCircleIcon(ctx, symbol, x + 22, y + 22, 34, accentSoft, mixWithWhite(accent, 0.68), accent);
    
        ctx.font = '800 18px Arial, sans-serif';
        ctx.fillStyle = palette.textLighter;
        ctx.fillText(label.toUpperCase(), x + 72, y + 34);
    
        ctx.font = '400 21px Arial, sans-serif';
        ctx.fillStyle = palette.textLight;
        drawWrappedCanvasText(ctx, text, x + 72, y + 62, width - 96, 29);
        return height;
    }
    
    function getCanvasInsightPanelHeight(ctx, example, usage, grammar, width) {
        const padding = 18;
        const gap = 16;
        let height = padding * 2;
    
        if (example) {
            ctx.font = 'italic 22px Arial, sans-serif';
            height += Math.max(84, getCanvasTextHeight(ctx, example, width - 116, 32) + 42);
        }
        if (usage) {
            if (height > padding * 2) height += gap;
            height += getCanvasNoteHeight(ctx, usage, width - (padding * 2));
        }
        if (grammar) {
            if (height > padding * 2) height += gap;
            height += getCanvasNoteHeight(ctx, grammar, width - (padding * 2));
        }
    
        return height;
    }
    
    function drawCanvasInsightPanel(ctx, example, usage, grammar, x, y, width, palette, accent, accentSoft) {
        const padding = 18;
        const gap = 16;
        const height = getCanvasInsightPanelHeight(ctx, example, usage, grammar, width);
    
        drawRoundedRect(ctx, x, y, width, height, 18);
        const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
        gradient.addColorStop(0, mixWithWhite(accent, 0.86));
        gradient.addColorStop(0.48, palette.card);
        gradient.addColorStop(1, mixWithWhite(accent, 0.91));
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = mixWithWhite(accent, 0.68);
        ctx.lineWidth = 2;
        ctx.stroke();
    
        let cursorY = y + padding;
    
        if (example) {
            ctx.font = 'italic 22px Arial, sans-serif';
            const quoteHeight = Math.max(84, getCanvasTextHeight(ctx, example, width - 116, 32) + 42);
            drawRoundedRect(ctx, x + padding, cursorY, width - (padding * 2), quoteHeight, 16);
            const quoteGradient = ctx.createLinearGradient(x + padding, cursorY, x + width, cursorY + quoteHeight);
            quoteGradient.addColorStop(0, mixWithWhite(accent, 0.93));
            quoteGradient.addColorStop(1, palette.card);
            ctx.fillStyle = quoteGradient;
            ctx.fill();
            ctx.strokeStyle = mixWithWhite(accent, 0.7);
            ctx.lineWidth = 2;
            ctx.stroke();
    
            drawCanvasCircleIcon(ctx, '"', x + padding + 24, cursorY + 26, 36, accentSoft, null, accent);
    
            ctx.fillStyle = palette.textLight;
            ctx.font = 'italic 22px Arial, sans-serif';
            drawWrappedCanvasText(ctx, example, x + padding + 78, cursorY + 43, width - 120, 32);
            cursorY += quoteHeight + gap;
        }
    
        if (usage) {
            const noteHeight = drawCanvasNote(ctx, 'Use when', usage, '!', x + padding, cursorY, width - (padding * 2), palette, accent, accentSoft);
            cursorY += noteHeight + gap;
        }
    
        if (grammar) {
            drawCanvasNote(ctx, 'Grammar', grammar, '*', x + padding, cursorY, width - (padding * 2), palette, accent, accentSoft);
        }
    
        return height;
    }
    
    function getCanvasChipsHeight(ctx, chips, maxWidth) {
        if (!chips.length) return 0;
        ctx.font = 'italic 20px Arial, sans-serif';
        let rowWidth = 0;
        let rows = 1;
        chips.forEach(chip => {
            const chipWidth = ctx.measureText(chip).width + 38;
            if (rowWidth && rowWidth + chipWidth + 12 > maxWidth) {
                rows += 1;
                rowWidth = 0;
            }
            rowWidth += chipWidth + 12;
        });
        return 34 + (rows * 38) + ((rows - 1) * 10);
    }
    
    function drawCanvasChips(ctx, chips, x, y, maxWidth, palette, accent) {
        if (!chips.length) return 0;
        ctx.font = '800 17px Arial, sans-serif';
        ctx.fillStyle = palette.textLighter;
        ctx.fillText('EXPLORE WITH', x, y + 18);
    
        ctx.font = 'italic 20px Arial, sans-serif';
        let chipX = x;
        let chipY = y + 34;
        chips.forEach(chip => {
            const chipWidth = ctx.measureText(chip).width + 38;
            if (chipX > x && chipX + chipWidth > x + maxWidth) {
                chipX = x;
                chipY += 48;
            }
            drawRoundedRect(ctx, chipX, chipY, chipWidth, 38, 19);
            ctx.fillStyle = mixWithWhite(accent, 0.9);
            ctx.fill();
            ctx.strokeStyle = mixWithWhite(accent, 0.58);
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = palette.text;
            ctx.fillText(chip, chipX + 19, chipY + 25);
            chipX += chipWidth + 12;
        });
    
        return (chipY - y) + 44;
    }
    
    function drawCanvasCard(ctx, word, profile, examples, x, y, width, color, softColor, palette, marker) {
        const padding = 26;
        const bodyWidth = width - (padding * 2);
        const meaning = profile && profile.core_meaning ? profile.core_meaning : '';
        const example = examples && examples.example_sentences && examples.example_sentences.length ? examples.example_sentences[0] : '';
        const usage = examples && examples.usage_note ? examples.usage_note : '';
        const collocations = profile && profile.collocations ? profile.collocations.slice(0, 4) : [];
        const grammar = profile && profile.grammar_note ? profile.grammar_note : '';
    
        ctx.font = '700 25px Arial, sans-serif';
        const meaningHeight = getCanvasBlockHeight(ctx, meaning, bodyWidth, 34, 0);
        const insightHeight = (example || usage || grammar) ? getCanvasInsightPanelHeight(ctx, example, usage, grammar, bodyWidth) : 0;
        const collocHeight = getCanvasChipsHeight(ctx, collocations, bodyWidth);
        const height = 104 + padding + 28 + meaningHeight + (insightHeight ? insightHeight + 22 : 0) + collocHeight + 28;
    
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.24)';
        ctx.shadowBlur = 32;
        ctx.shadowOffsetY = 18;
        drawRoundedRect(ctx, x, y, width, height, 18);
        ctx.fillStyle = palette.card;
        ctx.fill();
        ctx.restore();

        drawRoundedRect(ctx, x, y, width, height, 18);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
        ctx.lineWidth = 2;
        ctx.stroke();
    
        drawRoundedRect(ctx, x, y, width, 96, 16);
        const headGradient = ctx.createLinearGradient(x, y, x + width, y + 96);
        headGradient.addColorStop(0, softColor);
        headGradient.addColorStop(1, palette.card);
        ctx.fillStyle = headGradient;
        ctx.fill();
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width, 8);

        drawRoundedRect(ctx, x + padding, y + 25, 46, 46, 14);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.font = '900 22px Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(marker || '', x + padding + 23, y + 49);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        ctx.font = '800 34px Arial, sans-serif';
        ctx.fillStyle = color;
        ctx.fillText(word, x + padding + 64, y + 60);

        ctx.font = '700 20px Arial, sans-serif';
        const pos = (profile && profile.part_of_speech) || 'word';
        const posWidth = Math.min(150, ctx.measureText(pos).width + 34);
        drawRoundedRect(ctx, x + width - padding - posWidth, y + 32, posWidth, 34, 17);
        ctx.fillStyle = mixWithWhite(color, 0.9);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.fillText(pos, x + width - padding - posWidth + 17, y + 55);
    
        let cursorY = y + 126;
        ctx.font = '800 17px Arial, sans-serif';
        ctx.fillStyle = palette.textLighter;
        ctx.fillText('CORE SENSE', x + padding, cursorY);
        cursorY += 36;
    
        ctx.font = '700 25px Arial, sans-serif';
        ctx.fillStyle = palette.text;
        cursorY = drawWrappedCanvasText(ctx, meaning, x + padding, cursorY, bodyWidth, 34) + 24;
    
        if (insightHeight) {
            cursorY += drawCanvasInsightPanel(ctx, example, usage, grammar, x + padding, cursorY, bodyWidth, palette, color, softColor) + 22;
        }
    
        if (collocations.length) {
            drawCanvasChips(ctx, collocations, x + padding, cursorY, bodyWidth, palette, color);
        }
    
        return height;
    }
    
    async function exportComparisonPng(payload, filename) {
        const data = payload.comparison || {};
        const profiles = data.profiles || {};
        if (!profiles.searched_word || !profiles.confused_word) {
            throw new Error('Comparison data is not ready for PNG export');
        }
    
        const canvas = document.createElement('canvas');
        const width = 1200;
        const workHeight = 2600;
        const scale = 2;
        canvas.width = width * scale;
        canvas.height = workHeight * scale;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        const palette = themeExportPalette();
    
        drawCanvasLabBackdrop(ctx, width, workHeight, palette);
    
        const margin = 54;
        let y = 54;
        const primary = palette.primaryDark || palette.primary;
        const secondary = palette.secondary;

        drawCanvasLabPill(ctx, 'WORD LAB', margin, y, 'rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.2)', 'rgba(248, 250, 252, 0.78)');
        y += 78;
    
        const wordA = payload.word || 'word';
        const wordB = payload.confused_word || 'comparison';
        ctx.font = '900 50px Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(wordA, margin, y);
        const wordWidth = ctx.measureText(wordA).width;
        ctx.font = '900 25px Arial, sans-serif';
        const vsX = margin + wordWidth + 24;
        drawRoundedRect(ctx, vsX, y - 38, 58, 38, 19);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fef3c7';
        ctx.fillText('vs', vsX + 17, y - 11);
        ctx.font = '900 50px Arial, sans-serif';
        ctx.fillStyle = mixWithWhite(secondary, 0.5);
        ctx.fillText(wordB, vsX + 82, y);
        y += 58;

        ctx.font = '400 22px Arial, sans-serif';
        ctx.fillStyle = 'rgba(248, 250, 252, 0.66)';
        ctx.fillText('A focused comparison card for choosing the right word in context.', margin, y);
        y += 50;
    
        const meta = data.meta || {};
        const tileGap = 18;
        const tileWidth = (width - (margin * 2) - (tileGap * 2)) / 3;
        const typeText = meta.confusion_type ? String(meta.confusion_type).replace(/_/g, ' ') : 'word choice';
        const difficultyText = meta.difficulty ? String(meta.difficulty) : 'context check';
        const tagText = `${typeText} • ${difficultyText}`;
        const ruleText = meta.quick_rule || 'Choose by the job the word performs in the sentence.';
        const diffText = meta.key_differentiator || 'Compare the core sense, grammar pattern, and natural collocations.';
        const tagHeight = drawCanvasMetaTile(ctx, 'Signal', tagText, margin, y, tileWidth, 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.2)', mixWithWhite(primary, 0.52));
        const ruleHeight = drawCanvasMetaTile(ctx, 'Rule', ruleText, margin + tileWidth + tileGap, y, tileWidth, 'rgba(250,204,21,0.16)', 'rgba(250,204,21,0.25)', '#facc15');
        const diffHeight = drawCanvasMetaTile(ctx, 'Difference', diffText, margin + ((tileWidth + tileGap) * 2), y, tileWidth, 'rgba(244,63,94,0.16)', 'rgba(244,63,94,0.25)', '#fb7185');
        y += Math.max(tagHeight, ruleHeight, diffHeight) + 42;
    
        const cardGap = 28;
        const cardWidth = (width - (margin * 2) - cardGap) / 2;
        const examples = data.examples || {};
        const cardAHeight = drawCanvasCard(ctx, wordA, profiles.searched_word, examples.searched_word, margin, y, cardWidth, primary, palette.primarySofter, palette, 'A');
        const cardBHeight = drawCanvasCard(ctx, wordB, profiles.confused_word, examples.confused_word, margin + cardWidth + cardGap, y, cardWidth, secondary, palette.secondarySofter, palette, 'B');
        drawCanvasVsMedallion(ctx, width / 2, y + 82);
        y += Math.max(cardAHeight, cardBHeight) + 54;

        ctx.font = '800 15px Arial, sans-serif';
        ctx.fillStyle = 'rgba(248, 250, 252, 0.52)';
        ctx.fillText('Advanced English Dictionary • Word Lab export', margin, y);
        y += 36;
    
        const output = document.createElement('canvas');
        output.width = width * scale;
        output.height = Math.ceil(y) * scale;
        const outputCtx = output.getContext('2d');
        outputCtx.drawImage(canvas, 0, 0);
        const blob = await canvasToBlob(output, 'image/png');
        if (!blob) throw new Error('PNG rendering failed');
        downloadBlob(blob, filename);
    }
    
    function exportComparisonPdf(surface) {
        const iframe = document.createElement('iframe');
        iframe.className = 'wcd-print-frame';
        iframe.setAttribute('aria-hidden', 'true');
        document.body.appendChild(iframe);
    
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(buildExportHtml(surface));
        doc.close();
    
        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => iframe.remove(), 1000);
        }, 250);
    }
    
    async function handleComparisonExport(button) {
        const wrap = button.closest('.wcd-b-wrap');
        const surface = wrap ? wrap.querySelector('.wcd-b-export-surface') : null;
        const format = button.dataset.exportFormat;
    
        if (!wrap || !surface || !format || button.disabled) return;
    
        const payload = getComparisonExportData(wrap, format);
        const filename = getExportFilename(payload, format);
        button.disabled = true;
        setComparisonExportStatus(wrap, `Preparing ${format.toUpperCase()}...`, 'is-loading');
    
        try {
            await requestBackendComparisonExport(payload, format);
            setComparisonExportStatus(wrap, `${format.toUpperCase()} export ready.`, 'is-success');
        } catch (backendErr) {
            try {
                if (format === 'pdf') {
                    exportComparisonPdf(surface);
                    setComparisonExportStatus(wrap, 'Print dialog opened. Choose Save as PDF.', 'is-success');
                } else if (format === 'png') {
                    await exportComparisonPng(payload, filename);
                    setComparisonExportStatus(wrap, 'PNG downloaded.', 'is-success');
                }
            } catch (fallbackErr) {
                console.error('Comparison export failed:', backendErr, fallbackErr);
                setComparisonExportStatus(wrap, `Could not export ${format.toUpperCase()}.`, 'is-error');
            }
        } finally {
            button.disabled = false;
            setTimeout(() => {
                if (wrap && !wrap.querySelector('.wcd-b-export-status.is-loading')) {
                    setComparisonExportStatus(wrap, '');
                }
            }, 5000);
        }
    }
    
    
    window.ComparisonExport = {
        init,
        updateState: updateComparisonExportState,
        handleExport: handleComparisonExport
    };
})();
