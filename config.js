// Configuration for Advanced English Dictionary
// Single source of truth for all environments

const config = {
    // API Configuration
    api: {
        // Base URL for the dictionary API
        // In production: use relative path (Nginx will proxy to backend)
        // In development: specify full URL with port
        host: (typeof window !== 'undefined' && window.location.hostname === 'localhost')
            ? 'http://localhost:8000'  // Development
            : '',  // Production: relative path (same origin)
        
        // API endpoint paths
        endpoints: {
            dictionary: '/api/dictionary'
        }
    },
    
    // Application settings
    app: {
        name: 'Advanced English Dictionary',
        version: '1.0.0'
    }
};

// Helper function to get full API URL
config.api.getUrl = function(endpoint) {
    const path = this.endpoints[endpoint];
    if (!path) {
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
    return `${this.host}${path}`;
};

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.config = config;
}

// Export for Node.js (for server-side usage if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
}