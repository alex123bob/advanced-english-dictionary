// What the Chrome Web Store listing asks for, and how each asset is produced.
// Paths are relative to this folder. Edit this file (not generate.js) when
// adding a screenshot or changing a tile.
module.exports = {
  // Every template and screenshot frame is rendered at this canvas colour
  // wherever content does not cover it.
  screenshotBackground: '#EEF0F8',

  sections: {
    icon: {
      title: 'Store icon',
      requirement: '128 x 128 PNG; 96 x 96 artwork with 16 px transparent padding',
      folder: '1-store-icon',
      width: 128,
      height: 128,
      keepAlpha: true,
      items: [
        { name: 'store-icon', template: 'templates/store-icon.html' },
      ],
    },

    screenshots: {
      title: 'Screenshots',
      requirement: 'Up to 5; 1280 x 800 (or 640 x 400); JPEG or 24-bit PNG, no alpha',
      folder: '2-screenshots',
      width: 1280,
      height: 800,
      max: 5,
      // Order here is upload order. Raw captures of any size go in sources/screenshots/.
      items: [
        { name: 'screenshot-1-main-popup', source: 'sources/screenshots/main-popup.png' },
        { name: 'screenshot-2-in-page-card', source: 'sources/screenshots/in-page-card.png' },
        { name: 'screenshot-3-theme-config', source: 'sources/screenshots/theme-config.png' },
        { name: 'screenshot-4-extension-setting', source: 'sources/screenshots/extension-setting.png' },
      ],
    },

    'small-tile': {
      title: 'Small promo tile',
      requirement: '440 x 280; JPEG or 24-bit PNG, no alpha',
      folder: '3-small-promo-tile',
      width: 440,
      height: 280,
      items: [
        { name: 'small-promo-tile', template: 'templates/small-promo-tile.html' },
      ],
    },

    marquee: {
      title: 'Marquee promo tile',
      requirement: '1400 x 560; JPEG or 24-bit PNG, no alpha',
      folder: '4-marquee-promo-tile',
      width: 1400,
      height: 560,
      items: [
        { name: 'marquee-promo-tile', template: 'templates/marquee-promo-tile.html' },
      ],
    },
  },
};
