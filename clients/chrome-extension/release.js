#!/usr/bin/env node

/**
 * Release script for the Chrome extension.
 *
 * Usage:
 *   npm run release patch   # 1.0.1 → 1.0.2
 *   npm run release minor   # 1.0.1 → 1.1.0
 *   npm run release major   # 1.0.1 → 2.0.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUMP_TYPES = ['patch', 'minor', 'major'];

// --- Args ---
const bumpType = process.argv[2];
if (!BUMP_TYPES.includes(bumpType)) {
  console.error(`Usage: npm run release <patch|minor|major>`);
  process.exit(1);
}

// --- Paths ---
const rootDir = path.resolve(__dirname, '..', '..');
const pkgPath = path.join(__dirname, 'package.json');
const manifestPath = path.join(__dirname, 'src', 'manifest.json');
const distDir = path.join(__dirname, 'dist');
const zipPath = path.join(__dirname, 'dist.zip');

// --- Bump version ---
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);

let nextVersion;
if (bumpType === 'major') nextVersion = `${major + 1}.0.0`;
else if (bumpType === 'minor') nextVersion = `${major}.${minor + 1}.0`;
else nextVersion = `${major}.${minor}.${patch + 1}`;

console.log(`Releasing: ${pkg.version} → ${nextVersion}`);

// --- Update package.json ---
pkg.version = nextVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`✓ Updated package.json`);

// --- Update manifest.json ---
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.version = nextVersion;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`✓ Updated src/manifest.json`);

// --- Build ---
console.log('Building...');
execSync('node build.js', { cwd: __dirname, stdio: 'inherit' });

// --- Verify version in dist ---
const distManifest = JSON.parse(fs.readFileSync(path.join(distDir, 'manifest.json'), 'utf8'));
if (distManifest.version !== nextVersion) {
  console.error(`✗ dist/manifest.json has version ${distManifest.version}, expected ${nextVersion}`);
  process.exit(1);
}
console.log(`✓ dist/manifest.json version verified`);

// --- Repackage zip ---
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
execSync(`zip -r ../dist.zip .`, { cwd: distDir, stdio: 'inherit' });
console.log(`✓ dist.zip created`);

// --- Commit ---
const tag = `v${nextVersion}`;
execSync(`git add clients/chrome-extension/src/manifest.json clients/chrome-extension/package.json clients/chrome-extension/dist.zip`, { cwd: rootDir, stdio: 'inherit' });
execSync(`git commit -m "chore: bump chrome extension version to ${nextVersion}"`, { cwd: rootDir, stdio: 'inherit' });
console.log(`✓ Committed`);

// --- Tag ---
execSync(`git tag -a ${tag} -m "Chrome extension ${tag}"`, { cwd: rootDir, stdio: 'inherit' });
console.log(`✓ Tagged ${tag}`);

// --- Push ---
execSync(`git push origin main --tags`, { cwd: rootDir, stdio: 'inherit' });
console.log(`✓ Pushed`);

// --- GitHub release ---
const notes = `## Chrome Extension ${tag}

Released via release script.`;
execSync(
  `gh release create ${tag} clients/chrome-extension/dist.zip --title "Chrome Extension ${tag}" --notes "${notes.replace(/"/g, '\\"')}"`,
  { cwd: rootDir, stdio: 'inherit' }
);
console.log(`✓ GitHub release created`);
console.log(`\nDone! Chrome extension ${tag} released.`);
