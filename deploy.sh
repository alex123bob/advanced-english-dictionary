#!/bin/bash

# Deployment Script for Advanced English Dictionary
# Usage: ./deploy.sh [environment]

set -e  # Exit on error

ENVIRONMENT=${1:-production}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/${TIMESTAMP}"

echo "🚀 Starting deployment to ${ENVIRONMENT}..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Run this script from the project root."
  exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Create production build
echo "🔨 Creating production build..."
npm run build

# Create backup of current dist if it exists
if [ -d "dist" ]; then
  echo "💾 Creating backup..."
  mkdir -p backups
  cp -r dist "${BACKUP_DIR}"
  echo "✅ Backup created: ${BACKUP_DIR}"
fi

echo ""
echo "✅ Build completed!"
echo ""
echo "📁 Production files are in: dist/"
echo ""
echo "📋 Deployment options:"
echo "1. Manual upload: Upload contents of 'dist/' to your web server"
echo "2. Rsync: rsync -avz dist/ user@yourserver:/path/to/webroot/"
echo "3. S3/Cloud Storage: Upload to your cloud storage bucket"
echo ""
echo "🔧 For cloud server deployment, you might need to:"
echo "   - Set up Nginx/Apache to serve static files"
echo "   - Configure SSL/TLS certificates"
echo "   - Set up CDN for faster delivery"
echo ""
echo "📚 See DEPLOYMENT.md for detailed instructions."