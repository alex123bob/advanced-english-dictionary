# Advanced English Dictionary

A multi-client English dictionary workspace with a browser website, Chrome extension, and reserved folders for future native and cross-platform clients.

**Production**: [https://www.lijialab.com](https://www.lijialab.com)

## Features

- **Detailed Word Lookup**: Search for English words and phrases
- **Comprehensive Information**: Includes definitions, pronunciation, part of speech, frequency
- **Rich Context**: Etymology, cultural notes, usage context, and word families
- **Examples & Usage**: Real-world examples with correct/incorrect usage notes
- **Synonyms & Antonyms**: Related words with visual tagging
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern UI**: Clean, accessible interface with smooth animations

## Available Words

The dictionary currently includes:

1. **"pipe"** - Detailed phrasal verb with comprehensive analysis
2. **"serendipity"** - Noun describing fortunate discoveries by chance
3. **"ubiquitous"** - Adjective meaning present everywhere
4. **"ephemeral"** - Adjective describing short-lived phenomena

## Project Structure

```
advanced-english-dictionary/
├── clients/
│   ├── web/            # Existing browser website and build system
│   ├── chrome-extension/ # Chrome extension client
│   ├── macos-native/   # SwiftUI macOS starter
│   ├── windows-native/  # WinUI-style Windows starter
│   ├── ios-app/        # SwiftUI iOS starter
│   ├── android-app/    # Jetpack Compose Android starter
│   └── pwa/            # Installable PWA starter
├── package.json        # Workspace-level scripts
├── LICENSE             # MIT License
├── README.md           # This file
└── node_modules/       # Workspace dependencies
```

## Quick Start

### Prerequisites
- Node.js 14+ and npm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd advanced-english-dictionary
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

1. **Start your real API server** on port 8000 (your dictionary API)
2. **Start the development server** with live reload for the website client:
```bash
npm run dev
```
3. Open http://localhost:3000 in your browser.

The website and Chrome extension both communicate with your API at `http://localhost:8000/api/dictionary` by default.

### Production Build

Create optimized production bundles for all shipped clients:
```bash
npm run build
```
The website build will be in `clients/web/dist/`, the extension build will be in `clients/chrome-extension/dist/`, and the PWA build will be in `clients/pwa/dist/`.

### Production Server

Preview the website production build:
```bash
npm run preview
```
Open http://localhost:8080 in your browser.

## How to Use

1. Open the application in a web browser
2. Type a word in the search box (try "pipe", "serendipity", "ubiquitous", or "ephemeral")
3. Click "Look Up" or press Enter
4. View detailed information including:
   - Definitions with usage notes
   - Examples with correct/incorrect usage
   - Etymology and word origins
   - Synonyms and antonyms
   - Cultural context and modern relevance
   - Word family relationships

## Technical Details

- **Pure HTML/CSS/JavaScript**: No external dependencies required
- **Responsive Design**: Uses CSS Grid and Flexbox for layout
- **Modern JavaScript**: Uses ES6+ features (fetch API, template literals, arrow functions)
- **Data Structure**: JSON files with detailed linguistic information
- **Performance**: Optimized loading with proper error handling

## Data Structure

The dictionary connects to a real API endpoint at `http://localhost:8000/api/dictionary` (configurable in `config.js`).

The API is expected to return data in the following format:
- `headword`: The word being looked up
- `pronunciation`: Phonetic pronunciation
- `detailed_senses`: Array of sense objects with definitions, examples, synonyms, etc.
- `etymology_info.etymology`: Word origin information
- `cultural_notes_info.notes`: Cultural context
- `usage_context_info`: Usage context and formality
- `word_family_info.word_family`: Related words

## Browser Compatibility

Works in all modern browsers that support:
- ES6 JavaScript features
- CSS Grid and Flexbox
- Fetch API

## License

MIT License - See LICENSE file for details.

## Deployment

See [clients/web/DEPLOYMENT.md](clients/web/DEPLOYMENT.md) for detailed deployment instructions to various cloud platforms.

### Quick Deployment Options:

1. **Vercel/Netlify**: Connect GitHub repo, set build command to `npm run build`
2. **AWS S3**: Upload `clients/web/dist/` to S3 bucket with static hosting enabled
3. **Traditional VPS**: Copy `clients/web/dist/` to web server directory

## Development

### Adding Features

1. Modify files under `clients/web/` for the existing browser app
2. Update `clients/chrome-extension/` for extension-specific behavior
3. Use the native starter folders under `clients/` when expanding platform-specific apps
4. Test with `npm run dev`

### Code Style

- Use meaningful variable names
- Add comments for complex logic
- Follow existing patterns in the codebase

## Future Enhancements

Potential improvements:
- Add more words to the dictionary
- Implement voice pronunciation
- Add word history/favorites
- Include word origin maps
- Add quiz/test functionality
- Implement offline storage
- Add API integration for more words
