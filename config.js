// Configuration for Advanced English Dictionary
// Single source of truth for all environments

const config = {
    // API Configuration
    api: {
        // Base URL for the dictionary API
        // Default: local development on port 8000
        host: 'http://10.197.34.72:8000',
        
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