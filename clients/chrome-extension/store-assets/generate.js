#!/usr/bin/env node
// Generates Chrome Web Store listing images into upload/, one folder per
// upload section on the store dashboard. See README.md for usage.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');
const config = require('./store-assets.config');
const { readInfo, toRgbPng } = require('./lib/png');

const rootDir = __dirname;
const uploadDir = path.join(rootDir, 'upload');
const sectionNames = Object.keys(config.sections);

function usage() {
  console.log(`Usage: node generate.js [command] [section ...]

Commands:
  (none) | all        Generate every section
  <section ...>       Generate only the named sections
  check [section ...] Verify files in upload/ meet the store requirements
  list                Show sections and their requirements

Sections: ${sectionNames.join(', ')}

Set CHROME_PATH if Google Chrome is not in a standard location.`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error('Google Chrome not found. Set CHROME_PATH to its executable.');
  return found;
}

function hexToRgb(hex) {
  const value = parseInt(hex.replace('#', ''), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function capture(chrome, pageUrl, width, height, outputPath, transparent) {
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'store-assets-chrome-'));
  try {
    execFileSync(chrome, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--allow-file-access-from-files',
      `--user-data-dir=${profileDir}`,
      '--force-device-scale-factor=1',
      `--window-size=${width},${height}`,
      ...(transparent ? ['--default-background-color=00000000'] : []),
      `--screenshot=${outputPath}`,
      pageUrl,
    ], { stdio: 'ignore', timeout: 60000 });
  } finally {
    fs.rmSync(profileDir, { recursive: true, force: true });
  }
  if (!fs.existsSync(outputPath)) throw new Error(`Chrome produced no screenshot for ${pageUrl}`);
}

// Fits a raw capture of any size inside the canvas, centred, without cropping.
function screenshotFrameHtml(sourcePath, section) {
  const padding = Math.round(section.height * 0.075);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:${section.width}px;height:${section.height}px;overflow:hidden;background:${config.screenshotBackground}}
  body{display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:${padding}px}
  img{max-width:100%;max-height:100%;object-fit:contain;display:block}
</style></head><body><img src="${pathToFileURL(sourcePath).href}" alt=""></body></html>`;
}

function generateSection(chrome, key) {
  const section = config.sections[key];
  if (section.max && section.items.length > section.max) {
    throw new Error(`${key}: ${section.items.length} items configured, store allows ${section.max}`);
  }
  const outDir = path.join(uploadDir, section.folder);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'store-assets-'));

  try {
    for (const item of section.items) {
      let pageUrl;
      if (item.template) {
        pageUrl = pathToFileURL(path.join(rootDir, item.template)).href;
      } else {
        const sourcePath = path.join(rootDir, item.source);
        if (!fs.existsSync(sourcePath)) throw new Error(`${key}: missing source ${item.source}`);
        const framePath = path.join(workDir, `${item.name}.html`);
        fs.writeFileSync(framePath, screenshotFrameHtml(sourcePath, section), 'utf8');
        pageUrl = pathToFileURL(framePath).href;
      }

      const rawPath = path.join(workDir, `${item.name}.raw.png`);
      capture(chrome, pageUrl, section.width, section.height, rawPath, section.keepAlpha);
      const outputPath = path.join(outDir, `${item.name}.png`);
      const raw = fs.readFileSync(rawPath);
      fs.writeFileSync(outputPath, section.keepAlpha ? raw : toRgbPng(raw, hexToRgb(config.screenshotBackground)));
      console.log(`  ✓ ${path.relative(rootDir, outputPath)}`);
    }
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

function checkSection(key) {
  const section = config.sections[key];
  const outDir = path.join(uploadDir, section.folder);
  const files = fs.existsSync(outDir) ? fs.readdirSync(outDir).filter((file) => file.endsWith('.png')) : [];
  const problems = [];
  if (files.length === 0) problems.push('no images generated');
  if (section.max && files.length > section.max) problems.push(`${files.length} images, maximum is ${section.max}`);

  for (const file of files) {
    const info = readInfo(fs.readFileSync(path.join(outDir, file)));
    if (info.width !== section.width || info.height !== section.height) {
      problems.push(`${file} is ${info.width}x${info.height}, expected ${section.width}x${section.height}`);
    }
    const hasAlpha = info.colorType === 4 || info.colorType === 6;
    if (!section.keepAlpha && (hasAlpha || info.colorType !== 2 || info.bitDepth !== 8)) {
      problems.push(`${file} is not 24-bit RGB without alpha`);
    }
  }

  const label = `${section.title} (${section.folder})`;
  if (problems.length) {
    console.log(`✗ ${label}`);
    for (const problem of problems) console.log(`    ${problem}`);
    return false;
  }
  console.log(`✓ ${label}: ${files.length} file(s)`);
  return true;
}

function resolveSections(names) {
  if (names.length === 0 || (names.length === 1 && names[0] === 'all')) return sectionNames;
  const unknown = names.filter((name) => !config.sections[name]);
  if (unknown.length) throw new Error(`Unknown section(s): ${unknown.join(', ')}. Choose from: ${sectionNames.join(', ')}`);
  return names;
}

function main(args) {
  const [command, ...rest] = args;
  if (command === '-h' || command === '--help' || command === 'help') return usage();

  if (command === 'list') {
    for (const key of sectionNames) {
      const section = config.sections[key];
      console.log(`${key.padEnd(12)} ${section.title} → upload/${section.folder}/ (${section.items.length} item(s))`);
      console.log(`${''.padEnd(12)} ${section.requirement}`);
    }
    return;
  }

  if (command === 'check') {
    const ok = resolveSections(rest).map(checkSection).every(Boolean);
    process.exitCode = ok ? 0 : 1;
    return;
  }

  const keys = resolveSections(args);
  const chrome = findChrome();
  for (const key of keys) {
    console.log(`${config.sections[key].title}:`);
    generateSection(chrome, key);
  }
  console.log('');
  const ok = keys.map(checkSection).every(Boolean);
  process.exitCode = ok ? 0 : 1;
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(`✗ ${error.message}`);
  process.exitCode = 1;
}
