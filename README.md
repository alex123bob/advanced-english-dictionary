# Advanced English Dictionary

A modern, responsive web-based English dictionary with detailed word definitions, etymology, usage examples, and cultural context.

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

1. **"pipe down"** - Detailed phrasal verb with comprehensive analysis
2. **"serendipity"** - Noun describing fortunate discoveries by chance
3. **"ubiquitous"** - Adjective meaning present everywhere
4. **"ephemeral"** - Adjective describing short-lived phenomena

## Project Structure

```
advanced-english-dictionary/
├── index.html          # Main HTML page
├── style.css           # CSS styles
├── script.js           # JavaScript functionality
├── config.js           # Configuration for API endpoints
├── LICENSE             # MIT License
├── README.md           # This file
├── package.json        # Node.js dependencies and scripts
├── dev-server.js       # Development server with live reload
├── server.js           # Production server
├── build.js            # Build script for production
├── deploy.sh           # Deployment automation script
├── DEPLOYMENT.md       # Detailed deployment guide
└── dist/               # Production build (generated)
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
2. **Start the development server** with live reload:
```bash
npm run dev
```
3. Open http://localhost:3000 in your browser.

The frontend will communicate with your API at http://localhost:8000/api/dictionary

### Production Build

Create an optimized production bundle:
```bash
npm run build
```
The production files will be in the `dist/` folder.

### Production Server

Preview the production build:
```bash
npm run preview
```
Open http://localhost:8080 in your browser.

## How to Use

1. Open the application in a web browser
2. Type a word in the search box (try "pipe down", "serendipity", "ubiquitous", or "ephemeral")
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

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions to various cloud platforms.

### Quick Deployment Options:

1. **Vercel/Netlify**: Connect GitHub repo, set build command to `npm run build`
2. **AWS S3**: Upload `dist/` folder to S3 bucket with static hosting enabled
3. **Traditional VPS**: Copy `dist/` to web server directory

## Development

### Adding Features

1. Modify `script.js` for new functionality
2. Update `style.css` for styling changes
3. Edit `index.html` for structural changes
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