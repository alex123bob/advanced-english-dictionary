#!/usr/bin/env node

/**
 * Build Script
 * Run with: npm run build
 * Creates optimized production bundle in /dist folder
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
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
  'example.data.json',
  'words.data.json'
];

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
async function minifyJS(js) {
  // Basic minification (for production, you might want to use a proper minifier like terser)
  return js
    .replace(/\/\/.*$/gm, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/\s*([=+\-*\/%&|^~!<>?:;,{}()[\]])\s*/g, '$1') // Remove spaces around operators
    .trim();
}

// Optimize HTML
async function optimizeHTML(html) {
  // Inline critical CSS
  const styleMatch = html.match(/<link[^>]*href="[^"]*style\.css"[^>]*>/);
  if (styleMatch) {
    try {
      const cssPath = path.join(SOURCE_DIR, 'style.css');
      const cssContent = await readFile(cssPath, 'utf8');
      const minifiedCSS = await minifyCSS(cssContent);
      
      // Replace link tag with inline style
      html = html.replace(styleMatch[0], `<style>${minifiedCSS}</style>`);
    } catch (err) {
      console.warn(chalk.yellow('⚠️  Could not inline CSS:', err.message));
    }
  }
  
  // Remove live reload script if present
  html = html.replace(/<script>[^<]*live reload[^<]*<\/script>/gi, '');
  
  // Basic HTML minification
  return html
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/>\s+</g, '><') // Remove spaces between tags
    .trim();
}

// Create production bundle
async function createProductionBundle() {
  console.log(chalk.blue('🔨 Starting production build...'));
  
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
  
  // Process each file
  for (const fileName of FILES_TO_PROCESS) {
    const sourcePath = path.join(SOURCE_DIR, fileName);
    const distPath = path.join(DIST_DIR, fileName);
    
    try {
      // Check if file exists
      await stat(sourcePath);
      
      let content = await readFile(sourcePath, 'utf8');
      let processedContent = content;
      
      // Process based on file type
      switch (path.extname(fileName)) {
        case '.html':
          processedContent = await optimizeHTML(content);
          console.log(chalk.green(`✅ Processed HTML: ${fileName}`));
          break;
          
        case '.css':
          processedContent = await minifyCSS(content);
          console.log(chalk.green(`✅ Minified CSS: ${fileName}`));
          break;
          
        case '.js':
          processedContent = await minifyJS(content);
          console.log(chalk.green(`✅ Minified JS: ${fileName}`));
          break;
          
        case '.json':
          // Minify JSON by parsing and re-stringifying
          try {
            const jsonData = JSON.parse(content);
            processedContent = JSON.stringify(jsonData);
            console.log(chalk.green(`✅ Minified JSON: ${fileName}`));
          } catch (err) {
            console.warn(chalk.yellow(`⚠️  Could not parse JSON ${fileName}, copying as-is`));
          }
          break;
          
        default:
          console.log(chalk.blue(`📄 Copied: ${fileName}`));
      }
      
      await writeFile(distPath, processedContent, 'utf8');
      
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
- example.data.json - Dictionary data
- words.data.json - Additional dictionary data

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