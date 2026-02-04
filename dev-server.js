#!/usr/bin/env node

/**
 * Development Server with Live Reload
 * Run with: npm run dev
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const chalk = require('chalk');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Bind to all network interfaces

// MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain'
};

// Live reload script to inject into HTML
const LIVE_RELOAD_SCRIPT = `
<script>
  // Live reload functionality
  (function() {
    let socket = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    const reconnectDelay = 2000; // 2 seconds
    
    function connectWebSocket() {
      try {
        // Use current hostname and port for WebSocket connection
        const wsHost = window.location.hostname;
        const wsPort = window.location.port || (window.location.protocol === 'https:' ? 443 : 80);
        socket = new WebSocket('ws://' + wsHost + ':' + wsPort + '/_ws');
        
        socket.addEventListener('message', function(event) {
          if (event.data === 'reload') {
            console.log('🔄 Live reload triggered by file change');
            window.location.reload();
          }
        });
        
        socket.addEventListener('open', function() {
          console.log('🔗 Connected to live reload server');
          reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        });
        
        socket.addEventListener('close', function(event) {
          console.log('🔌 Disconnected from live reload server');
          
          // Only attempt reconnection if it wasn't a normal closure
          if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log('🔄 Attempting to reconnect (' + reconnectAttempts + '/' + maxReconnectAttempts + ')...');
            setTimeout(connectWebSocket, reconnectDelay);
          }
        });
        
        socket.addEventListener('error', function(error) {
          console.error('❌ WebSocket error:', error);
        });
        
      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
      }
    }
    
    // Initial connection
    connectWebSocket();
    
    // Also provide a manual reload function for debugging
    window.manualReload = function() {
      console.log('🔄 Manual reload triggered');
      window.location.reload();
    };
  })();
</script>
`;

// Create HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;
  
  // Handle WebSocket upgrade for live reload
  if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
    handleWebSocket(req, res);
    return;
  }
  
  // Handle API endpoints
  if (pathname === '/api/dictionary') {
    handleDictionaryAPI(req, res);
    return;
  }
  
  // Default to index.html
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  // Remove leading slash
  const filePath = path.join(process.cwd(), pathname.substring(1));
  
  // Check if file exists
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // File not found, try to serve index.html
      if (pathname !== '/index.html') {
        const indexPath = path.join(process.cwd(), 'index.html');
        serveFile(indexPath, res, true);
      } else {
        serve404(res);
      }
      return;
    }
    
    serveFile(filePath, res);
  });
});

// WebSocket handling for live reload
const WebSocket = require('ws');
const wss = new WebSocket.Server({ noServer: true });

function handleWebSocket(req, socket, head) {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
}

// Mock dictionary API handler
function handleDictionaryAPI(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Length': '0'
    });
    res.end();
    return;
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.writeHead(405, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    return;
  }
  
  // Parse JSON body
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    let word;
    try {
      const data = JSON.parse(body);
      word = data.word;
    } catch (error) {
      res.writeHead(400, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      return;
    }
    
    if (!word) {
      res.writeHead(400, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ error: 'Missing word field in request body' }));
      return;
    }
  
    // Mock response data
    const mockData = {
      word: word,
      pronunciation: `/${word.charAt(0)}ˈ${word.slice(1)}/`,
      partOfSpeech: 'noun',
      frequency: 'high',
      senses: [
        {
          definition: `The meaning or significance of "${word}"`,
          usage_notes: 'Commonly used in formal contexts',
          collocations: [`common ${word}`, `${word} usage`, `advanced ${word}`]
        },
        {
          definition: `An alternative meaning for "${word}"`,
          usage_notes: 'Often used in technical writing',
          collocations: [`technical ${word}`, `${word} analysis`, `complex ${word}`]
        }
      ],
      examples: [
        `This is an example sentence using the word "${word}".`,
        `Another example showing how "${word}" can be used in context.`,
        `"${word}" appears frequently in academic literature.`
      ],
      etymology: `From Latin "${word}us", meaning "related to ${word}"`,
      synonyms: ['synonym1', 'synonym2', 'synonym3'],
      antonyms: ['antonym1', 'antonym2'],
      culturalNotes: `"${word}" has cultural significance in various contexts.`,
      usageContext: 'Formal and academic writing',
      wordFamily: [`${word}ly`, `${word}ness`, `${word}ful`, `un${word}`]
    };
    
    // Simulate network delay
    setTimeout(() => {
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end(JSON.stringify(mockData));
    }, 300); // 300ms delay to simulate network
  });
}

// Watch for file changes
const watchedFiles = new Set();

function watchFile(filePath) {
  if (watchedFiles.has(filePath)) return;
  
  fs.watch(filePath, (eventType) => {
    if (eventType === 'change') {
      console.log(chalk.yellow(`📁 File changed: ${path.relative(process.cwd(), filePath)}`));
      
      // Notify all connected clients to reload
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send('reload');
        }
      });
    }
  });
  
  watchedFiles.add(filePath);
}

// Serve a file
function serveFile(filePath, res, isFallback = false) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (isFallback) {
        serve404(res);
      } else {
        serve500(res, err);
      }
      return;
    }
    
    // Inject live reload script into HTML files
    if (ext === '.html') {
      let html = content.toString();
      
      // Inject before closing </body> tag
      const bodyCloseIndex = html.lastIndexOf('</body>');
      if (bodyCloseIndex !== -1) {
        html = html.substring(0, bodyCloseIndex) + LIVE_RELOAD_SCRIPT + html.substring(bodyCloseIndex);
      }
      
      content = Buffer.from(html, 'utf8');
      
      // Watch this file for changes
      watchFile(filePath);
    } else if (['.js', '.css'].includes(ext)) {
      // Watch JS and CSS files too
      watchFile(filePath);
    }
    
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.end(content);
  });
}

// 404 handler
function serve404(res) {
  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end(`
    <html>
      <head><title>404 Not Found</title></head>
      <body>
        <h1>404 - Page Not Found</h1>
        <p>The requested page could not be found.</p>
        <p><a href="/">Go to homepage</a></p>
      </body>
    </html>
  `);
}

// 500 handler
function serve500(res, err) {
  console.error(chalk.red('Server error:'), err);
  res.writeHead(500, { 'Content-Type': 'text/html' });
  res.end(`
    <html>
      <head><title>500 Internal Server Error</title></head>
      <body>
        <h1>500 - Internal Server Error</h1>
        <p>Something went wrong on the server.</p>
        <pre>${err.message}</pre>
        <p><a href="/">Go to homepage</a></p>
      </body>
    </html>
  `);
}

// Start the server
server.listen(PORT, HOST, () => {
  console.log(chalk.green('🚀 Development server started!'));
  console.log(chalk.cyan(`📖 Open your browser to: http://${HOST}:${PORT}`));
  console.log(chalk.yellow('🔄 Live reload is enabled'));
  console.log(chalk.gray('Press Ctrl+C to stop the server\n'));
  
  // Watch all existing files
  const filesToWatch = ['index.html', 'style.css', 'script.js', 'config.js', 'config.json'];
  filesToWatch.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      watchFile(filePath);
    }
  });
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n👋 Shutting down server...'));
  server.close(() => {
    console.log(chalk.green('✅ Server stopped'));
    process.exit(0);
  });
});