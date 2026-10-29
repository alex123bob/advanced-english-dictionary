# Chrome Web Store assets

Generates every image the Chrome Web Store listing asks for, each one named for and saved into the upload section it belongs to. It needs Node and Google Chrome and nothing else (no npm install).

```
store-assets/
├── store-assets.config.js   # sections, sizes, and which items each one contains
├── generate.js              # the generator / checker
├── lib/png.js               # PNG reader/writer that strips alpha
├── sources/screenshots/     # raw captures of the extension, any size
├── templates/               # HTML designs for the icon and promo tiles
└── upload/                  # OUTPUT: one folder per upload section in the store
    ├── 1-store-icon/            128 x 128
    ├── 2-screenshots/           1280 x 800, up to 5
    ├── 3-small-promo-tile/      440 x 280
    └── 4-marquee-promo-tile/    1400 x 560
```

## Commands

Run from this folder:

| Command | What it does |
|---|---|
| `npm run generate` | Regenerate every section |
| `node generate.js screenshots marquee` | Regenerate only the sections you name |
| `npm run generate:icon` / `:screenshots` / `:small-tile` / `:marquee` | Regenerate one section |
| `npm run check` | Check the files in `upload/` against the store rules (size, count, no alpha) |
| `npm run list` | List the sections and their requirements |

From `clients/chrome-extension`, `npm run store-assets` runs the same generator, and arguments go after `--` (for example `npm run store-assets -- marquee`).

Generating a section clears its `upload/` folder and writes it again, then runs the check. If Chrome is somewhere unusual, set `CHROME_PATH`.

## For each release

1. Take fresh captures of the extension and replace the files in `sources/screenshots/` (keep the same names, or update the config).
2. To add, remove, or reorder screenshots, edit the `screenshots.items` list in `store-assets.config.js`. The list order is the upload order, and the store allows at most 5.
3. Change the wording or layout of the tiles in `templates/*.html`. The marquee reuses `main-popup.png` and `in-page-card.png` from `sources/screenshots/`.
4. Run `npm run generate`, look over `upload/`, commit, then upload each folder to its matching section in the store.

## Notes

- **Store icon**: rendered from `../src/icons/icon.svg`, so it always matches the extension icon. Following the store's image guidelines, the 96 x 96 artwork sits inside 16 px of transparent padding. This is the only output that keeps transparency.
- **Screenshots**: each capture is scaled down to fit and centered on a `#EEF0F8` canvas, never cropped. Captures with roughly a 16:10 shape fill the frame best.
- Every output other than the icon is a 24-bit PNG with no alpha channel, as the store requires.
