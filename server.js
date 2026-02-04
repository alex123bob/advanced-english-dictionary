#!/usr/bin/env node

/**
 * Production Server
 * Run with: npm start
 */

const express = require('express');
const path = require('path');
const compression = require('compression');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(compression()); // Gzip compression
app.use(cors()); // Enable CORS
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1y', // Cache static assets for 1 year
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Don't cache HTML files
    if (path.extname(filePath) === '.html') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Serve index.html for all routes (SPA support)
app.get('*', (req, res) => {
  // Check if the request is for a file with extension
  if (req.path.includes('.')) {
    // If it's a file request that doesn't exist, let it 404
    return res.status(404).send('Not found');
  }
  
  // Otherwise serve the SPA
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).send('Something went wrong!');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Production server running on port ${PORT}`);
  console.log(`📖 Open your browser to: http://localhost:${PORT}`);
  console.log(`📁 Serving from: ${path.join(__dirname, 'dist')}`);
});