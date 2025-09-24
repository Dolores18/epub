# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a modern web-based EPUB reader application with Japanese language support and dictionary features. The project consists of:

- **Frontend**: Pure HTML/CSS/JavaScript (no build tools required)
- **Backend**: Python HTTP server with REST API
- **Architecture**: Modular, file-based design using epub.js library
- **Features**: PWA support, Japanese dictionary integration, reading progress tracking, annotations, themes

## Development Commands

### Starting the Application
```bash
# Start the local development server (port 8088)
python3 start-server.py

# Alternative: Start with specific port
PORT=8080 python3 start-server.py
```

### Testing
```bash
# Run dictionary functionality tests
# Open http://localhost:8088/tests/test-dictionary.html

# Run theme tests
# Open http://localhost:8088/tests/theme-test.html

# Run book info tests
# Open http://localhost:8088/tests/test-book-info.html

# Run text selection tests
# Open http://localhost:8088/tests/test-selection.html
```

### Data Management
```bash
# View stored book data
cat books_data.json | python3 -m json.tool

# Clear all book data (for testing)
rm -f books_data.json
rm -rf books/
```

## Architecture

### Core Components

**Entry Points:**
- `index.html` - Main bookshelf/library interface 
- `epub-reader.html` - EPUB reading interface
- `start-server.py` - Python backend server with REST API

**Key JavaScript Modules:**
- `assets/js/epub-reader.js` - Main reading logic and epub.js integration
- `assets/js/bookshelf.js` - Library management and book loading
- `assets/js/dictionary.js` - Japanese dictionary API integration
- `assets/js/menu.js` - Theme management and UI controls
- `assets/js/bookManager.js` - Book metadata and file handling
- `assets/js/annotations.js` - Note-taking and highlighting system
- `assets/js/page.js` - Reading progress and pagination

**Backend Architecture:**
- `data.py` - Data management layer (books, progress, annotations)
- `annotations_manager.py` - Annotation persistence and retrieval
- REST API endpoints for book management, progress tracking, and annotations

### Data Flow

1. **Book Import**: EPUB files uploaded via `/api/upload` → stored in `books/` directory → metadata in `books_data.json`
2. **Reading Session**: Book served via `/api/book/<bookId>` → epub.js parsing → reading interface rendering
3. **Progress Tracking**: Reading position saved via `/api/progress` → stored in `reading_progress` section
4. **Dictionary Lookups**: Text selection → API call to `https://dict.3049589.xyz/api/japanese/definition`

### File Organization

```
├── index.html                 # Bookshelf interface
├── epub-reader.html          # Reading interface
├── start-server.py          # Backend server
├── data.py                  # Data management
├── assets/
│   ├── css/                 # Stylesheets and themes
│   ├── js/                  # JavaScript modules
│   └── html/               # HTML fragments loaded dynamically
├── books/                   # EPUB file storage (auto-created)
├── tests/                   # Manual test pages
└── docs/                    # Technical documentation
```

## Key Technologies

- **epub.js**: Core EPUB parsing and rendering engine
- **JSZip**: EPUB file extraction and manipulation
- **Python HTTP Server**: Backend API with multipart form handling
- **Japanese Dictionary API**: Real-time word lookups for language learning
- **CSS Grid/Flexbox**: Responsive layout without CSS frameworks
- **Service Worker**: PWA functionality and offline support

## Development Guidelines

### JavaScript Patterns
- **No build tools**: Pure ES5/ES6, directly loaded in browser
- **Modular design**: Each JS file handles specific functionality
- **Global object patterns**: `Dictionary`, `ThemeManager`, etc.
- **Event-driven**: Heavy use of custom events for component communication

### CSS Architecture
- **Theme system**: Base styles + dynamically loaded theme CSS files
- **Responsive design**: Mobile-first approach with desktop enhancements
- **Component-based**: Each major UI component has isolated styles

### Python Backend
- **RESTful API**: Standard HTTP methods for CRUD operations
- **File-based storage**: JSON files for metadata, filesystem for binaries
- **CORS enabled**: Cross-origin requests supported for development

### Data Persistence
- `books_data.json`: Central metadata store (books, progress, fonts)
- `annotations.json`: Note and highlight data
- `books/`: EPUB file storage with generated IDs
- `books/covers/`: Extracted or uploaded book covers

## Common Development Tasks

### Adding New Themes
1. Create CSS file in `assets/css/theme/epub-[name]-theme.css`
2. Add theme configuration in `assets/js/menu.js` ThemeManager
3. Include CSS link in `assets/html/theme-css-links.html`

### Extending Dictionary Support
- Modify `assets/js/dictionary.js` to add new language APIs
- Update `DICTIONARY-FEATURE.md` documentation
- Add test cases in `tests/test-dictionary.html`

### API Endpoint Development
- Add route handler in `start-server.py` `do_GET`/`do_POST` methods
- Use `data_manager` for data persistence operations
- Follow existing patterns for JSON responses and error handling

### Frontend Module Development
- Create new JS file in `assets/js/`
- Use global object pattern for public API
- Emit/listen for custom events for inter-module communication
- Add corresponding CSS in `assets/css/` if UI components involved

## Important Implementation Notes

### EPUB Rendering Configuration
- **Pagination mode**: Uses `flow: 'paginated'` to prevent line truncation issues
- **Font handling**: Auto-detection based on content language, with manual override options
- **Responsive design**: Automatic column adjustment based on screen size

### Dictionary Integration
- **Japanese focus**: Primary support for Japanese text with furigana and kanji
- **Real-time lookup**: Text selection triggers automatic API queries
- **Offline fallback**: Local dictionary data for common words

### Progress Tracking Precision
- **CFI-based**: Uses EPUB Canonical Fragment Identifier for exact positioning
- **Chapter awareness**: Tracks both percentage and chapter titles
- **Cross-device sync**: Server-side storage enables reading continuation across devices

### PWA Capabilities
- **Offline reading**: Service worker caches books and core functionality
- **Install prompt**: Native app-like installation on mobile devices
- **Theme persistence**: Settings maintained across sessions

This codebase prioritizes simplicity and maintainability over complex tooling, making it accessible for rapid development and customization while supporting advanced EPUB reading features.