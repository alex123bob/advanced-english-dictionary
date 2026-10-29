// Quick-definition card palettes. Each theme maps the card's CSS custom
// properties; "*-rgb" values are bare "r, g, b" triplets used inside rgba().
const CARD_THEMES = {
  ember: {
    name: 'Ember',
    description: 'Crimson, ember and amber on warm cream',
    vars: {
      paper: '#fffaf5',
      ink: '#2b1a17',
      heading: '#3b0d0c',
      body: '#3f2a26',
      origin: '#4a2f2a',
      roots: '#6b4a43',
      muted: '#8a6a63',
      faint: '#b08a80',
      ipa: '#9a3412',
      label: '#c2410c',
      accent: '#b91c1c',
      'accent-deep': '#9f1239',
      'on-accent': '#fff7ed',
      'field-text': '#7c2d12',
      field: 'rgba(255, 255, 255, 0.75)',
      highlight: 'rgba(255, 255, 255, 0.9)',
      stripe: 'linear-gradient(90deg, #9f1239, #dc2626 38%, #f97316 78%, #fbbf24)',
      button: 'linear-gradient(135deg, #9f1239, #dc2626 55%, #ea580c)',
      'accent-rgb': '185, 28, 28',
      'warm-rgb': '234, 88, 12',
      'glow-a': '251, 146, 60',
      'glow-b': '220, 38, 38',
      'shadow-rgb': '87, 21, 12',
      'line-rgb': '124, 45, 18'
    }
  },
  bordeaux: {
    name: 'Bordeaux',
    description: 'Deep wine and antique gold on parchment',
    vars: {
      paper: '#fbf6ee',
      ink: '#2a1418',
      heading: '#4a0e1f',
      body: '#3d2a2c',
      origin: '#4a3133',
      roots: '#6e5254',
      muted: '#8c7072',
      faint: '#b29a90',
      ipa: '#8a5a1c',
      label: '#9a6b1f',
      accent: '#7f1d3a',
      'accent-deep': '#5b0f27',
      'on-accent': '#fdf3e1',
      'field-text': '#5b0f27',
      field: 'rgba(255, 252, 245, 0.8)',
      highlight: 'rgba(255, 255, 255, 0.85)',
      stripe: 'linear-gradient(90deg, #5b0f27, #8b1e3f 45%, #b8862f 80%, #e2c27a)',
      button: 'linear-gradient(135deg, #5b0f27, #8b1e3f 60%, #a3542e)',
      'accent-rgb': '127, 29, 58',
      'warm-rgb': '184, 134, 47',
      'glow-a': '226, 194, 122',
      'glow-b': '139, 30, 63',
      'shadow-rgb': '60, 14, 28',
      'line-rgb': '91, 15, 39'
    }
  },
  terracotta: {
    name: 'Terracotta',
    description: 'Fired clay, sienna and sand',
    vars: {
      paper: '#fcf7f1',
      ink: '#2d1d15',
      heading: '#4a2213',
      body: '#3e2d24',
      origin: '#4a372c',
      roots: '#6d5546',
      muted: '#8c7464',
      faint: '#b49d8b',
      ipa: '#9c4f2a',
      label: '#b0612f',
      accent: '#b5532e',
      'accent-deep': '#8a3a1e',
      'on-accent': '#fff6ee',
      'field-text': '#7a3418',
      field: 'rgba(255, 255, 255, 0.75)',
      highlight: 'rgba(255, 255, 255, 0.9)',
      stripe: 'linear-gradient(90deg, #8a3a1e, #c2683f 45%, #d9a066 80%, #ead2a8)',
      button: 'linear-gradient(135deg, #8a3a1e, #b5532e 60%, #cf7a45)',
      'accent-rgb': '181, 83, 46',
      'warm-rgb': '207, 122, 69',
      'glow-a': '234, 210, 168',
      'glow-b': '194, 104, 63',
      'shadow-rgb': '74, 34, 19',
      'line-rgb': '122, 52, 24'
    }
  },
  sage: {
    name: 'Sage',
    description: 'Olive, moss and soft linen',
    vars: {
      paper: '#f8f8f1',
      ink: '#1f2a1f',
      heading: '#1f3a26',
      body: '#2f3a30',
      origin: '#36423a',
      roots: '#56635a',
      muted: '#717d73',
      faint: '#9aa59a',
      ipa: '#5a6b2e',
      label: '#6b7d33',
      accent: '#3f6b48',
      'accent-deep': '#2a4f33',
      'on-accent': '#f4f8ef',
      'field-text': '#2a4f33',
      field: 'rgba(255, 255, 255, 0.78)',
      highlight: 'rgba(255, 255, 255, 0.9)',
      stripe: 'linear-gradient(90deg, #2a4f33, #4f7d58 45%, #9bb06a 80%, #d8d6a0)',
      button: 'linear-gradient(135deg, #2a4f33, #3f6b48 60%, #6b8a4a)',
      'accent-rgb': '63, 107, 72',
      'warm-rgb': '107, 125, 51',
      'glow-a': '216, 214, 160',
      'glow-b': '79, 125, 88',
      'shadow-rgb': '24, 40, 28',
      'line-rgb': '42, 79, 51'
    }
  },
  midnight: {
    name: 'Midnight',
    description: 'Ink-blue night with brass accents',
    vars: {
      paper: '#141a2a',
      ink: '#e7e3d6',
      heading: '#f5efdf',
      body: '#d6d2c6',
      origin: '#d9d3c2',
      roots: '#a9a596',
      muted: '#8f8c82',
      faint: '#6f6e6a',
      ipa: '#e0b866',
      label: '#d9a947',
      accent: '#e0b866',
      'accent-deep': '#f0cf86',
      'on-accent': '#1a1f2e',
      'field-text': '#f0dcae',
      field: 'rgba(255, 255, 255, 0.06)',
      highlight: 'rgba(255, 255, 255, 0.06)',
      stripe: 'linear-gradient(90deg, #8a6a2b, #d9a947 45%, #f0cf86 80%, #fff1c9)',
      button: 'linear-gradient(135deg, #c99a3e, #e0b866 60%, #f0cf86)',
      'accent-rgb': '224, 184, 102',
      'warm-rgb': '217, 169, 71',
      'glow-a': '217, 169, 71',
      'glow-b': '70, 96, 168',
      'shadow-rgb': '0, 0, 0',
      'line-rgb': '240, 220, 174'
    }
  },
  ink: {
    name: 'Ink',
    description: 'Monochrome, like a printed page',
    vars: {
      paper: '#fdfdfb',
      ink: '#161616',
      heading: '#0d0d0d',
      body: '#2b2b2b',
      origin: '#333333',
      roots: '#5c5c5c',
      muted: '#7a7a7a',
      faint: '#a3a3a3',
      ipa: '#4d4d4d',
      label: '#5c5c5c',
      accent: '#1f1f1f',
      'accent-deep': '#000000',
      'on-accent': '#fafafa',
      'field-text': '#1f1f1f',
      field: 'rgba(255, 255, 255, 0.9)',
      highlight: 'rgba(255, 255, 255, 0.9)',
      stripe: 'linear-gradient(90deg, #0d0d0d, #3d3d3d 50%, #8a8a8a)',
      button: 'linear-gradient(135deg, #0d0d0d, #2e2e2e)',
      'accent-rgb': '31, 31, 31',
      'warm-rgb': '92, 92, 92',
      'glow-a': '200, 200, 200',
      'glow-b': '160, 160, 160',
      'shadow-rgb': '0, 0, 0',
      'line-rgb': '0, 0, 0'
    }
  }
};

const DEFAULT_CARD_THEME = 'ember';

function getCardTheme(themeId) {
  return CARD_THEMES[themeId] || CARD_THEMES[DEFAULT_CARD_THEME];
}

function getCardThemeCss(themeId) {
  const vars = getCardTheme(themeId).vars;
  return Object.keys(vars).map(key => `--qc-${key}: ${vars[key]};`).join(' ');
}
