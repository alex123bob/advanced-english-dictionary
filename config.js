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
         * Available themes:
         *
         * NEUTRAL/PROFESSIONAL:
         *   'slate-cyan'        - Neutral, calm, professional (Slate #64748b + Cyan #06b6d4)
         *   'professional-blue' - Light business theme (Bright Blue #3b82f6 + Cyan #06b6d4)
         *   'navy-gray'         - Conservative, formal, traditional (Navy #1e3a8a + Gray #6b7280)
         *   'corporate-teal'    - Professional, trustworthy, stable (Dark Teal #0d9488 + Teal #14b8a6)
         *   'enterprise-blue'   - Corporate, authoritative, reliable (Deep Blue #1d4ed8 + Blue #3b82f6)
         *   'linear'            - Sleek, minimal, product-tool feel (Violet-gray #5e6ad2, Linear.app inspired)
         *   'graphite'          - GitHub-style neutral, high contrast (Charcoal #24292f + Blue #0969da)
         *   'notion-cream'      - Minimal on warm cream, Notion aesthetic (Near-black #2e2e2e + Cream bg)
         *   'vercel-midnight'   - True dark mode (Near-black #111 bg + Blue #0070f3 accent)
         *   'stripe-purple'     - SaaS/fintech, Stripe brand (Violet #635bff + Cyan #00d4ff)
         *   'figma-cool'        - Multi-accent, Figma identity (Cyan #1abcfe + Purple #a259ff)
         *   'sapphire'          - Deep navy-blue, trust-inducing jewel tone (Navy #1e40af)
         *
         * NATURAL/BALANCED:
         *   'teal-emerald'      - Fresh, natural, growth-oriented (Teal #14b8a6 + Emerald #10b981)
         *   'forest-lime'       - Natural, balanced, optimistic (Forest Green #059669 + Lime #84cc16)
         *   'emerald-jewel'     - Deep saturated emerald, richer tone (Emerald #059669 + Dark #065f46)
         *   'moss-rain'         - Muted forest green, damp woodland (Moss #4a7c59 + Sage #7aab8a)
         *   'ocean-depths'      - Deep cyan-teal, underwater serenity (Cyan #0e7490 + Teal #0891b2)
         *   'mint-cream'        - Soft aqua-mint, clean and refreshing (Aqua #34a899 + Mint #68c9bb)
         *
         * IDYLLIC/NATURE:
         *   'sage-stone'        - Pastoral, calming, earthy (Sage #6a8a6e + Stone #a09b7e)
         *   'warm-parchment'    - Linen, countryside, antique warmth (Ochre #b07d4a + Sand #c9a96e)
         *   'terracotta'        - Warm fired-clay, Mediterranean feel (Clay #c2714f + Peach #d4956e)
         *   'lavender-field'    - Provence fields, soft purple-gray (Lavender #7c6fa0 + Mauve #a89cc8)
         *   'wabi-sabi'         - Japanese imperfect beauty, warm neutrals (Brown #8c7355 + Sand #b8a080)
         *
         * LIGHT/POSITIVE:
         *   'sky-mint'          - Bright, airy, cheerful (Sky Blue #38bdf8 + Mint #34d399)
         *   'bright-teal-lime'  - Vibrant, energetic, fresh (Bright Teal #2dd4bf + Lime #a3e635)
         *   'light-indigo-sky'  - Lighter, softer, dreamy (Light Indigo #818cf8 + Sky Blue #38bdf8)
         *   'nordic-snow'       - Scandinavian winter minimalism (Steel Blue #4a90b8 + Ice #8ab4cc)
         *
         * WARM/ENERGETIC:
         *   'golden-peach'      - Warm, sunny, optimistic (Yellow #fbbf24 + Peach #fb923c)
         *   'amber-orange'      - Vibrant, sunny, energetic (Amber #f59e0b + Orange #fb923c)
         *   'coral-soft-orange' - Warm, friendly, inviting (Coral #ff8a80 + Soft Orange #ffab91)
         *   'peach-parfait'     - Warm peach-coral, dessert soft (Peach #e8825c + Sand #f4a882)
         *   'autumn-spice'      - Fall harvest warmth (Burnt Orange #c2540a + Amber #d97706)
         *
         * SOFT/FRIENDLY:
         *   'coral-peach'       - Warm, friendly, uplifting (Coral #ff7b72 + Peach #ffb347)
         *   'indigo-sky'        - Confident, reliable, tech-forward (Indigo #6366f1 + Sky Blue #0ea5e9)
         *   'cotton-candy'      - Playful and soft (Pink #ec4899 + Violet #a78bfa)
         *   'dusk-lilac'        - Evening sky, muted purple (Lilac #9d6fb5 + Mauve #c3a8d4)
         *   'sakura'            - Japanese cherry blossom spring (Rose #d4607a + Blush #e8909e)
         *   'mint-cream'        - Soft aqua-mint, clean (Aqua #34a899)
         *
         * MATURE/ELEGANT:
         *   'rose-blush'        - Sophisticated rose, editorial feel (Rose #be4b7a + Blush #d97fa8)
         *   'ruby-deep'         - Deep crimson, bold and editorial (Ruby #be123c + Red #e11d48)
         *   'amethyst'          - Rich violet-purple jewel tone (Violet #7c3aed + Purple #9333ea)
         *
         * Change the value below to switch the default theme (overridden by sessionStorage).
         */
        theme: 'amethyst',
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
