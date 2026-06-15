#!/usr/bin/env node

/**
 * Dependency-free production static server.
 * Run with: npm start
 */

const fs = require('fs');
const http = require('http');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8080;
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xml': 'application/opensearchdescription+xml; charset=UTF-8',
  '.txt': 'text/plain; charset=UTF-8'
};

function send(res, statusCode, content, headers = {}) {
  res.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    ...headers
  });
  res.end(content);
}

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      send(res, err.code === 'ENOENT' ? 404 : 500, err.code === 'ENOENT' ? 'Not found' : 'Server error', {
        'Content-Type': 'text/plain; charset=UTF-8'
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const isHtml = ext === '.html';
    send(res, 200, content, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': isHtml ? 'no-cache, no-store, must-revalidate' : 'public, max-age=31536000, immutable',
      Pragma: isHtml ? 'no-cache' : undefined,
      Expires: isHtml ? '0' : undefined
    });
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let pathname = decodeURIComponent(parsedUrl.pathname || '/');

  if (pathname === '/') pathname = '/index.html';

  const requestedPath = path.normalize(path.join(DIST_DIR, pathname));
  if (!requestedPath.startsWith(DIST_DIR)) {
    send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain; charset=UTF-8' });
    return;
  }

  fs.stat(requestedPath, (err, stats) => {
    if (!err && stats.isFile()) {
      serveFile(requestedPath, res);
      return;
    }

    if (path.extname(pathname)) {
      send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=UTF-8' });
      return;
    }

    serveFile(path.join(DIST_DIR, 'index.html'), res);
  });
});

server.listen(PORT, () => {
  console.log(`Production server running on port ${PORT}`);
  console.log(`Open your browser to: http://localhost:${PORT}`);
  console.log(`Serving from: ${DIST_DIR}`);
});
