#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');
const webDir = path.join(__dirname, '..', 'web');

const extensionFiles = [
  'manifest.json',
  'background.js',
  'content-script.js',
  'content-script.css',
  'shared.js',
  'extension-config.js',
  'extension-popup.css',
  'options.html',
  'options.css',
  'options.js'
];

const webFiles = [
  'style.css',
  'confusion-ui.js',
  'ui-controls.js',
  'comparison-export.js',
  'comparison-controller.js',
  'script.js',
  'favicon.ico',
  'opensearch.xml'
];

function removeDirectory(directory) {
  if (!fs.existsSync(directory)) return;

  for (const entry of fs.readdirSync(directory)) {
    const entryPath = path.join(directory, entry);
    if (fs.lstatSync(entryPath).isDirectory()) {
      removeDirectory(entryPath);
    } else {
      fs.unlinkSync(entryPath);
    }
  }

  fs.rmdirSync(directory);
}

function copyDirectory(from, to) {
  fs.mkdirSync(to, { recursive: true });

  for (const entry of fs.readdirSync(from)) {
    const sourcePath = path.join(from, entry);
    const targetPath = path.join(to, entry);

    if (fs.lstatSync(sourcePath).isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

removeDirectory(distDir);
fs.mkdirSync(distDir, { recursive: true });

for (const fileName of extensionFiles) {
  fs.copyFileSync(path.join(sourceDir, fileName), path.join(distDir, fileName));
}

for (const fileName of webFiles) {
  fs.copyFileSync(path.join(webDir, fileName), path.join(distDir, fileName));
}

copyDirectory(path.join(webDir, 'styles'), path.join(distDir, 'styles'));
copyDirectory(path.join(webDir, 'i18n'), path.join(distDir, 'i18n'));
copyDirectory(path.join(sourceDir, 'icons'), path.join(distDir, 'icons'));
copyDirectory(path.join(sourceDir, 'vendor'), path.join(distDir, 'vendor'));

const webIndex = fs.readFileSync(path.join(webDir, 'index.html'), 'utf8');
const popupHtml = webIndex
  .replace(/\s*<link rel="manifest" href="manifest\.webmanifest">\n?/g, '\n')
  .replace(/\s*<meta name="theme-color"[^>]*>\n?/g, '\n')
  .replace(/\s*<meta name="apple-mobile-web-app-capable"[^>]*>\n?/g, '\n')
  .replace(/\s*<meta name="apple-mobile-web-app-title"[^>]*>\n?/g, '\n')
  .replace(/\s*<link rel="apple-touch-icon"[^>]*>\n?/g, '\n')
  .replace(/\s*<script>\s*if \('serviceWorker' in navigator\)[\s\S]*?<\/script>\n?/g, '\n')
  .replace(/\s*<link rel="stylesheet" href="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/6\.4\.0\/css\/all\.min\.css"[^>]*>\n?/g, '\n    <link rel="stylesheet" href="vendor/fontawesome/css/all.min.css">\n')
  .replace(/\s*<link href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]+"[^>]*>\n?/g, '')
  .replace(/<link href="(https:\/\/fonts\.loli\.net\/css2\?[^"]+)"[^>]*>/, '<link href="$1" rel="stylesheet">')
  .replace(/\s*<noscript>[\s\S]*?<\/noscript>\n?/g, '')
  .replace(/\s*<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/howler@2\.2\.4\/dist\/howler\.min\.js" defer><\/script>\n?/g, '')
  .replace('<script src="config.js"></script>', '<script src="extension-config.js"></script>')
  .replace(/\s*<!-- OpenSearch autodiscovery[\s\S]*?<link rel="search" type="application\/opensearchdescription\+xml" href="opensearch\.xml" title="Dictionary Search">\s*/g, '\n')
  .replace('<script src="script.js" onload="console.log(\'script.js loaded successfully\')" onerror="console.error(\'Failed to load script.js\')"></script>', '<script src="script.js"></script>')
  .replace(/\s*<script src="extension-config\.js"><\/script>\s*/g, '\n    <script src="extension-config.js"></script>\n')
  .replace('</head>', '    <link rel="stylesheet" href="extension-popup.css">\n</head>');

fs.writeFileSync(path.join(distDir, 'popup.html'), popupHtml, 'utf8');

console.log(`Chrome extension build ready: ${distDir}`);
