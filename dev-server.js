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
            console.log('🔄 Live reload triggered');
            window.location.reload();
          }
        });
        
        socket.addEventListener('close', function() {
          console.log('🔌 WebSocket disconnected');
          socket = null;
          
          // Attempt to reconnect
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(\`🔄 Attempting to reconnect (\${reconnectAttempts}/\${maxReconnectAttempts})...\`);
            setTimeout(connectWebSocket, reconnectDelay);
          }
        });
        
        socket.addEventListener('error', function(error) {
          console.error('❌ WebSocket error:', error);
        });
        
        console.log('✅ WebSocket connected for live reload');
        reconnectAttempts = 0; // Reset on successful connection
      } catch (error) {
        console.error('❌ Failed to connect WebSocket:', error);
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

// Serve a file with proper MIME type
function serveFile(filePath, res, isFallback = false) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        serve404(res);
      } else {
        serve500(res, err);
      }
      return;
    }
    
    // Inject live reload script into HTML files
    if (ext === '.html' && !isFallback) {
      let html = content.toString();
      
      // Inject the live reload script before closing </body> tag
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${LIVE_RELOAD_SCRIPT}</body>`);
      } else {
        html += LIVE_RELOAD_SCRIPT;
      }
      
      content = Buffer.from(html, 'utf8');
      
      // Watch this HTML file for changes
      watchFile(filePath);
    } else if (ext === '.js' || ext === '.css') {
      // Watch JS and CSS files for changes
      watchFile(filePath);
    }
    
    res.writeHead(200, {
      'Content-Type': mimeType,
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
    <!DOCTYPE html>
    <html>
    <head>
      <title>404 - Not Found</title>
      <style>
        body { font-family: sans-serif; padding: 40px; text-align: center; }
        h1 { color: #666; }
      </style>
    </head>
    <body>
      <h1>404 - File Not Found</h1>
      <p>The requested file could not be found.</p>
    </body>
    </html>
  `);
}

// 500 handler
function serve500(res, err) {
  console.error(chalk.red('❌ Server error:', err));
  res.writeHead(500, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>500 - Internal Server Error</title>
      <style>
        body { font-family: sans-serif; padding: 40px; text-align: center; }
        h1 { color: #c00; }
        pre { background: #f0f0f0; padding: 20px; border-radius: 5px; text-align: left; }
      </style>
    </head>
    <body>
      <h1>500 - Internal Server Error</h1>
      <p>Something went wrong on the server.</p>
      <pre>${err.toString()}</pre>
    </body>
    </html>
  `);
}

// Upgrade handler for WebSocket
server.on('upgrade', (req, socket, head) => {
  if (req.url === '/_ws') {
    handleWebSocket(req, socket, head);
  } else {
    socket.destroy();
  }
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(chalk.green(`🚀 Development server running at:`));
  console.log(chalk.cyan(`   Local: http://localhost:${PORT}`));
  console.log(chalk.cyan(`   Network: http://${HOST}:${PORT}`));
  console.log(chalk.yellow(`📁 Watching for file changes...`));
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n👋 Shutting down development server...'));
  wss.close();
  server.close();
  process.exit(0);
});