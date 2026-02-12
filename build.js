#!/usr/bin/env node

/**
 * Build Script
 * Run with: npm run build
 * Creates optimized production bundle in /dist folder
 */

const fs = require('fs');
const path = require('path');

const { promisify } = require('util');
const crypto = require('crypto');
const chalk = require('chalk');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const copyFile = promisify(fs.copyFile);
const stat = promisify(fs.stat);

const SOURCE_DIR = __dirname;
const DIST_DIR = path.join(__dirname, 'dist');

// Files to process
const FILES_TO_PROCESS = [
  'index.html',
  'style.css',
  'script.js',
  'config.js'
];

// Helper to create a hash from file content and current timestamp
function getHash(content) {
  const now = Date.now().toString();
  return crypto.createHash('md5').update(content + now).digest('hex').slice(0, 8);
}

// Minify CSS
async function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/\s*([{}:;,])\s*/g, '$1') // Remove spaces around braces, colons, etc.
    .replace(/;}/g, '}') // Remove trailing semicolons
    .trim();
}

// Minify JS
async function minifyJS(js, isConfig = false) {
  // For config.js, preserve more structure to avoid breaking logic
  if (isConfig) {
    return js
      .replace(/\/\/.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .trim();
  }
  
  // Basic minification for other JS files
  return js
    .replace(/\/\/.*$/gm, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/\s*([=+\-*\/%&|^~!<>?:;,{}()[\]])\s*/g, '$1') // Remove spaces around operators
    .trim();
}

// Optimize HTML and update references to hashed files
async function optimizeHTML(html, cssHashed, jsHashed) {
  // Replace style.css reference with hashed version
  html = html.replace(/href="style\.css"/g, `href="${cssHashed}"`);
  // Replace script.js reference with hashed version
  html = html.replace(/src="script\.js"/g, `src="${jsHashed}"`);
  // Remove live reload script if present
  html = html.replace(/<script>[^<]*live reload[^<]*<\/script>/gi, '');
  // Basic HTML minification
  return html
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/>\s+</g, '><') // Remove spaces between tags
    .trim();
}

// Helper to recursively delete a directory
async function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    for (const file of fs.readdirSync(folderPath)) {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        await deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    }
    fs.rmdirSync(folderPath);
  }
}

// Create production bundle
async function createProductionBundle() {
  console.log(chalk.blue('🔨 Starting production build...'));

  // Delete dist directory if it exists
  if (fs.existsSync(DIST_DIR)) {
    console.log(chalk.yellow('⚠️  Removing existing dist directory...'));
    await deleteFolderRecursive(DIST_DIR);
  }

  // Create dist directory
  try {
    await mkdir(DIST_DIR, { recursive: true });
    console.log(chalk.green('✅ Created dist directory'));
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
    console.log(chalk.yellow('📁 dist directory already exists'));
  }

  // Read and hash CSS and JS
  const cssPath = path.join(SOURCE_DIR, 'style.css');
  const jsPath = path.join(SOURCE_DIR, 'script.js');
  const cssContent = await readFile(cssPath, 'utf8');
  const jsContent = await readFile(jsPath, 'utf8');
  const minifiedCSS = await minifyCSS(cssContent);
  const minifiedJS = await minifyJS(jsContent, false);
  const cssHash = getHash(minifiedCSS);
  const jsHash = getHash(minifiedJS);
  const cssHashed = `style.${cssHash}.css`;
  const jsHashed = `script.${jsHash}.js`;

  // Write hashed CSS and JS
  await writeFile(path.join(DIST_DIR, cssHashed), minifiedCSS, 'utf8');
  console.log(chalk.green(`✅ Minified & Hashed CSS: ${cssHashed}`));
  await writeFile(path.join(DIST_DIR, jsHashed), minifiedJS, 'utf8');
  console.log(chalk.green(`✅ Minified & Hashed JS: ${jsHashed}`));

  // Process other files
  for (const fileName of FILES_TO_PROCESS) {
    if (fileName === 'style.css' || fileName === 'script.js') continue; // Already handled
    const sourcePath = path.join(SOURCE_DIR, fileName);
    let distPath = path.join(DIST_DIR, fileName);

    try {
      await stat(sourcePath);
      let content = await readFile(sourcePath, 'utf8');
      let processedContent = content;

      switch (path.extname(fileName)) {
        case '.html':
          processedContent = await optimizeHTML(content, cssHashed, jsHashed);
          break;
        case '.js':
          // config.js: copy as-is
          break;
        case '.json':
          try {
            const jsonData = JSON.parse(content);
            processedContent = JSON.stringify(jsonData);
          } catch (err) {
            console.warn(chalk.yellow(`⚠️  Could not parse JSON ${fileName}, copying as-is`));
          }
          break;
      }
      await writeFile(distPath, processedContent, 'utf8');
      console.log(chalk.green(`✅ Processed: ${fileName}`));
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.warn(chalk.yellow(`⚠️  Skipping missing file: ${fileName}`));
      } else {
        throw err;
      }
    }
  }
  
  // Create a simple README for the dist folder
  const readmeContent = `# Production Build
  
This folder contains the optimized production build of the Advanced English Dictionary.

## Files
- index.html - Main application (with inlined CSS)
- style.css - Minified styles (also inlined in HTML)
- script.js - Minified JavaScript
- config.js - API configuration

## Deployment
Simply upload the contents of this folder to your web server.

## Development
For development, use the files in the parent directory and run \`npm run dev\` for live reload.

Generated: ${new Date().toISOString()}
`;
  
  await writeFile(path.join(DIST_DIR, 'README.md'), readmeContent, 'utf8');
  console.log(chalk.green('✅ Created dist/README.md'));
  
  // Create .gitignore for dist folder
  const gitignoreContent = `# Ignore everything in dist except README.md
*
!README.md
`;
  
  await writeFile(path.join(DIST_DIR, '.gitignore'), gitignoreContent, 'utf8');
  console.log(chalk.green('✅ Created dist/.gitignore'));
  
  console.log(chalk.green('\n🎉 Build completed successfully!'));
  console.log(chalk.cyan(`📁 Production files are in: ${DIST_DIR}`));
  console.log(chalk.cyan(`🚀 To preview: npm run preview`));
  console.log(chalk.cyan(`🌐 To deploy: Upload contents of ${DIST_DIR} to your web server`));
}

// Run the build
createProductionBundle().catch(err => {
  console.error(chalk.red('❌ Build failed:'), err);
  process.exit(1);
});