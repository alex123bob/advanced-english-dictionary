# Deployment Guide

This guide explains how to deploy the Advanced English Dictionary to various cloud platforms.

## Quick Start

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Deploy the `dist/` folder** to your preferred hosting service.

## Deployment Options

### Option 1: Manual Upload (Simplest)

1. Run `npm run build`
2. Upload the entire `dist/` folder to your web server
3. Configure your web server to serve `index.html` as the default document

### Option 2: Using the Deployment Script

```bash
# Make the script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

The script will:
- Install dependencies if needed
- Create a production build
- Create a backup of previous build
- Provide deployment instructions

## Cloud Platform Guides

### AWS S3 + CloudFront (Static Website)

1. **Create S3 bucket:**
   - Name: `your-dictionary-bucket`
   - Disable "Block all public access"
   - Enable static website hosting

2. **Upload files:**
   ```bash
   aws s3 sync dist/ s3://your-dictionary-bucket/ --delete
   ```

3. **Set up CloudFront:**
   - Create distribution
   - Origin: S3 bucket
   - Default root object: `index.html`
   - Configure SSL certificate

4. **Configure error pages:**
   - 404 → `/index.html` (for SPA routing)

### Google Cloud Storage

1. **Create bucket:**
   ```bash
   gsutil mb gs://your-dictionary-bucket
   gsutil defacl set public-read gs://your-dictionary-bucket
   ```

2. **Upload files:**
   ```bash
   gsutil -m rsync -r dist/ gs://your-dictionary-bucket
   ```

3. **Configure as website:**
   ```bash
   gsutil web set -m index.html -e index.html gs://your-dictionary-bucket
   ```

### Vercel / Netlify (Easiest)

1. Connect your GitHub repository
2. Configure build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
3. Deploy!

### Traditional VPS (Nginx)

1. **Install Nginx:**
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. **Copy files:**
   ```bash
   sudo cp -r dist/* /var/www/html/
   ```

3. **Configure Nginx:**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       root /var/www/html;
       index index.html;
       
       # SPA routing - redirect all requests to index.html
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       # Cache static assets
       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

4. **Set up SSL (Let's Encrypt):**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

## Environment Variables

The application can be configured with these environment variables:

- `PORT`: Server port (default: 8080 for production, 3000 for development)
- `NODE_ENV`: Environment (development/production)

## Monitoring & Maintenance

### Logs
- Check server logs for errors
- Monitor traffic and performance

### Updates
1. Pull latest changes
2. Run `npm run build`
3. Deploy new `dist/` folder

### Backups
The deployment script automatically creates backups in the `backups/` folder.

## Troubleshooting

### Common Issues

1. **404 errors after page refresh (SPA routing)**
   - Ensure your server is configured to redirect all routes to `index.html`

2. **CORS errors**
   - Check that your server includes proper CORS headers
   - For development, the dev server includes CORS middleware

3. **Slow loading**
   - Enable compression (gzip/brotli)
   - Use CDN for static assets
   - Implement caching headers

### Debugging
- Check browser console for JavaScript errors
- Verify network requests are successful
- Test with different browsers

## Security Considerations

1. **HTTPS:** Always use HTTPS in production
2. **CSP:** Consider adding Content Security Policy headers
3. **Headers:** Set security headers (X-Frame-Options, X-Content-Type-Options, etc.)
4. **Monitoring:** Set up monitoring and alerts

## Performance Optimization

1. **Enable compression** (gzip/brotli)
2. **Set cache headers** for static assets
3. **Use CDN** for global distribution
4. **Minify assets** (already done in build process)
5. **Lazy load** components if the app grows

## Support

For issues with deployment:
1. Check the browser console for errors
2. Verify file permissions on server
3. Ensure all required files are in `dist/`
4. Check server configuration matches this guide