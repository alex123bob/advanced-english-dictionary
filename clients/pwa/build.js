#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');

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
copyDirectory(sourceDir, distDir);
console.log(`PWA build ready: ${distDir}`);
