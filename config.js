// Configuration for Advanced English Dictionary
// Single source of truth for all environments

const config = {
    api: {
        host: (typeof window !== 'undefined' && window.location.hostname === 'localhost')
            ? 'http://localhost:8000'
            : '',
        
        endpoints: {
            dictionary: '/api/dictionary',
            suggest: '/api/dictionary/suggest'
        }
    },
    
    app: {
        name: 'Advanced English Dictionary',
        version: '1.0.0',
        
        /*
         * Theme Configuration
         * 
         * Available themes (ordered from neutral to vibrant):
         * 
         * NEUTRAL/PROFESSIONAL:
         *   'slate-cyan'        - Neutral, calm, professional (Slate #64748b + Cyan #06b6d4)
         *   'professional-blue' - Light business theme (Bright Blue #3b82f6 + Cyan #06b6d4)
         * 
         * NATURAL/BALANCED:
         *   'teal-emerald'      - Fresh, natural, growth-oriented (Teal #14b8a6 + Emerald #10b981)
         *   'forest-lime'       - Natural, balanced, optimistic (Forest Green #059669 + Lime #84cc16)
         * 
         * LIGHT/POSITIVE (Brightest & Most Optimistic):
         *   'sky-mint'          - Bright, airy, cheerful (Sky Blue #38bdf8 + Mint #34d399)
         *   'bright-teal-lime'  - Vibrant, energetic, fresh (Bright Teal #2dd4bf + Lime #a3e635)
         *   'light-indigo-sky'  - Lighter, softer, dreamy (Light Indigo #818cf8 + Sky Blue #38bdf8)
         * 
         * WARM/ENERGETIC:
         *   'golden-peach'      - Warm, sunny, optimistic (Yellow #fbbf24 + Peach #fb923c)
         *   'amber-orange'      - Vibrant, sunny, energetic (Amber #f59e0b + Orange #fb923c)
         *   'coral-soft-orange' - Warm, friendly, inviting (Coral #ff8a80 + Soft Orange #ffab91)
         * 
         * SOFT/FRIENDLY:
         *   'coral-peach'       - Warm, friendly, uplifting (Coral #ff7b72 + Peach #ffb347)
         *   'indigo-sky'        - Confident, reliable, tech-forward (Indigo #6366f1 + Sky Blue #0ea5e9)
         * 
         * Change the value below to switch themes, then refresh the page.
         */
        theme: 'forest-lime'
    },
    
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
