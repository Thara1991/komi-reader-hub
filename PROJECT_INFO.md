# Komi Reader Hub - Project Information

## 🎯 Project Overview

**Komi Reader Hub** is a standalone Electron-based manga/comic reader application designed for offline use. The app provides a comprehensive solution for organizing, reading, and managing digital comics stored locally on your computer.

## ✨ Key Features

### 📚 Comic Management
- **Directory Scanning**: Automatically scan and index comic folders
- **Smart Organization**: Group comics by series, author, and genre
- **Metadata Management**: Edit comic titles, authors, descriptions, and genres
- **Cover Image Support**: Automatic cover image detection from first page

### 🎨 Genre System
- **Comic Genres**: 4-tier genre assignment system for individual comics
  - Protagonist genres
  - Antagonist genres  
  - Supporting genres
  - Narrative genres
- **Genre Catalog**: 3-category system for organizing available genres
  - Personality: Character traits (shy, brave, timid, etc.)
  - Verb: Action-based genres (fighting, killing, abusing, etc.)
  - Plot: Story themes (comedy, fantasy, horror, etc.)
- **Custom Genre Creation**: Add and manage custom genre tags in Genre Catalog
- **Genre Filtering**: Advanced search and filter by multiple genre categories

### 📖 Reading Experience
- **Page Navigation**: Smooth page-by-page reading
- **Reading Progress**: Automatic progress tracking and resume functionality
- **Multiple Formats**: Support for JPG, PNG, WebP, and GIF formats
- **Full-Screen Reading**: Immersive reading mode

### 🗂️ Library Management
- **Card View**: Visual comic cards with thumbnails and metadata
- **List View**: Detailed comic information in list format
- **Search & Filter**: Find comics by title, author, or genre
- **Bulk Operations**: Edit multiple comics simultaneously

### 🔄 Refresh Metadata System
- **Manual Refresh**: "Refresh Metadata" button in ComicsLibrary header that reloads comic metadata without full directory scan
- **Auto-Refresh Hook**: `useAutoRefreshMetadata` hook that automatically refreshes metadata when forms become visible
- **Form Coverage**: Auto-refresh implemented in ComicsLibrary, ComicCard, LibraryManager, ComicGenreAssignment, and BulkGenreAssignment
- **Smart Cooldown**: 5-second cooldown between auto-refreshes to prevent excessive API calls
- **Notification System**: Green popup notification in bottom-right corner when metadata is refreshed successfully
- **Genre Updates**: Automatically updates genre assignments and available genres across all forms
- **Performance**: Only refreshes when forms become visible, not continuously

### 📱 Notification System
- **Success Notifications**: Green popup notifications for successful operations
- **Position**: Bottom-right corner with smooth slide-in animation
- **Duration**: 3-second display with auto-dismiss
- **Icons**: CheckCircle icon for success states
- **Z-Index**: High z-index (50) to ensure visibility above other content


## 🏗️ Technical Architecture

### **Frontend (React + TypeScript)**
- **Framework**: React 18 with TypeScript
- **UI Library**: Custom UI components with Tailwind CSS
- **State Management**: React hooks (useState, useEffect)
- **Routing**: Custom page management system

### **Backend (Electron)**
- **Runtime**: Electron (Node.js + Chromium)
- **File System**: Native Node.js file operations
- **IPC Communication**: Secure inter-process communication
- **Data Storage**: Local JSON files for persistence

### **Data Management**
- **Centralized Storage**: All data stored in `json` folder
- **File Types**:
  - `library.json` - List of each comic data
    - **library.json Roles**:
    - **Name**: Genre for male type.
    - **Author**: Genre for male type.
    - **Description**: Genre for male type.
    - **Genre Male**: Genre for male type.
    - **Genre Female**: Genre for female type.
    - **Genre ThirdParty**: Genre for third party type.
    - **Genre Story**: Genre for story type.

  - `genres.json` - List of Genre definitions seperate by sub genre
    - **genres.json Roles**:
    - **Genre Male**: Genre for male type.
    - **Genre Female**: Genre for female type.
    - **Genre ThirdParty**: Genre for third party type.
    - **Genre Story**: Genre for story type.

  - `settings.json` - Application settings
    - **Settings.json Roles**:
    - **Directory Path**: Main comics source path. Used on startup to auto-load the library.
    - **Reader Mode**: Default reading mode when opening the reader. Options: `webtoon` or `classic` (page-to-page). Persisted between sessions.
    - **Dark Mode**: Boolean controlling dark theme (`true` for dark, `false` for light). Persisted between sessions.

  - `reading-progress.json` - Reading progress tracking



### **File Structure**
```
komi-reader-hub-1/
├── electron/           # Electron main process
├── src/               # React application
│   ├── components/    # UI components
│   ├── pages/         # Application pages
│   ├── types/         # TypeScript definitions
│   ├── utils/         # Utility functions
│   └── lib/           # Core libraries
├── public/            # Static assets
└── json/              # Data storage (created at runtime)
```


### **Main Views**
1. **ComicsLibrary**: Grid view of all comics with search and filters
   -- Header Structure
       - **Logo Menu**: "Manga Reader" title acts as a clickable dropdown button containing all app functions
         - **Library Management Section**:
           - Refresh Library: Full directory scan and comic discovery
           - Manage Library: Access to bulk comic editing and management
           - Comic Info: Edit individual comic metadata and genres
         - **View & Settings Section**:
           - ComicBook/ComicTree Toggle: Switch between display modes
           - Directory Settings: Set and change main comics directory
         - **Theme Section**:
           - Dark/Light Mode Toggle: Switch between themes with settings persistence
       - **Directory Status Bar**: Shows current directory path and comic count below the header
   -- View Modes
       - ComicBook view: Grid layout with comic thumbnails and metadata
       - ComicTree view: Tree/list layout with keyboard navigation (arrow keys)
       - View mode preference saved in settings.json
   -- Features
       - Search by title, author, or description
       - Advanced genre filtering (Personality, Verb, Plot categories)
        - **Filter Modes**: Toggle between "Match Any" and "Match All" behaviors
        - **Match Any**: Shows comics with at least one of the selected genres (OR logic)
        - **Match All**: Shows comics with all of the selected genres (AND logic)
        - **Real-time Results**: Filter results update immediately when switching modes
        - **Three-Click Genre System**: Include (1st click), Exclude (2nd click), Neutral (3rd click)
       - Directory scanning and refresh functionality
       - Path validation with error indicators and alerts
       - Individual comic editing via Edit button on each comic
       - NO bulk edit functionality in this view

2. **ComicCard**: Detailed comic information and editing interface
   -- EditComic Form (Single Mode)
       - Edit title, author, and description
       - Manage all 4 Comic Genres: Protagonist, Antagonist, Supporting, Narrative
       - Genre assignment using Genre Catalog categories (Personality, Verb, Plot)
       - Real-time genre updates from GenreManager
       - Save changes to individual comic metadata
   -- EditComic Form (Bulk Mode)
       - Apply same changes to multiple selected comics simultaneously
       - Edit author, description, and all Comic Genres
       - Title editing disabled in bulk mode (prevents folder renaming issues)
       - Batch save to multiple comics at once
   -- Additional Features
       - Search and filter comics within the view
        - **Genre Filter Modes**: Same "Match Any" vs "Match All" toggle as ComicsLibrary
        - **Consistent Experience**: Unified filtering behavior across all views
       - Directory scanning and refresh
       - Theme switching with settings persistence
       - Genre management integration
       - Bulk Edit button (only available here, not in ComicsLibrary)

3. **ComicReader**: Full-screen reading experience
   -- Reading Modes
       - Classic mode: Page-by-page navigation with arrow keys
       - Webtoon mode: Vertical scrolling for long-form comics
       - Reading mode preference saved in settings.json
   -- Navigation Controls
       - Arrow key navigation (Up/Down for pages, Left/Right for classic mode)
       - Page number input and display
       - Go to specific page functionality
       - Auto-fullscreen option (saved in settings)
   -- EditComic Form Integration
       - Edit comic metadata while reading
       - Same Comic Genres management as ComicCard
       - Real-time genre updates
   -- Display Options
       - Fit modes: width, height, screen, original
       - Image rotation (0°, 90°, 180°, 270°)
       - Fullscreen toggle
       - Progress tracking and resume functionality

4. **DirectorySettings**: Library directory management
   -- Directory Configuration
       - Set main comics source directory path
       - Directory validation with error checking
       - Auto-scan on directory change
       - Path accessibility verification
   -- Scanning Features
       - Recursive directory scanning (up to 10 levels deep)
       - Comic folder detection based on image content
       - Scan result display with comic count
       - Error handling for inaccessible paths
   -- Directory Structure Display
       - Visual representation of scanning pattern
       - Shows how app finds comics in nested folders
       - Example structure with author/comic organization

5. **GenreManager**: Genre Catalog creation and management
   -- Genre Catalog Categories
       - Personality: Character traits (shy, brave, timid, etc.)
       - Verb: Action-based genres (fighting, killing, abusing, etc.)
       - Plot: Story themes (comedy, fantasy, horror, etc.)
   -- Genre Operations
       - Add new genres to any category
       - Edit existing genre names
       - Delete genres with safety checks
       - Usage analysis before deletion
   -- Safety Features
       - Check if genres are in use by comics
       - Show affected comics before deletion
       - Prevent deletion of actively used genres
       - Link to comic editing for genre removal
   -- Real-time Updates
       - Immediate notification to parent components
       - Automatic genre list refresh in other forms
       - No need to navigate back and forth for updates


## 🔧 Development Environment

### **Requirements**
- **Node.js**: Version 18+ (nvm use 18 recommended)
- **Package Manager**: npm or bun
- **OS**: macOS (primary), Windows/Linux (testing needed)

### **Setup Commands**
```bash
# Install dependencies
npm install

# Development mode
nvm use 18
npm run dev

# Electron development
npm run electron:dev

# Build for production
npm run build
npm run electron:build
```


### **Available Documentation**
- **PROJECT_RULES.md**: Development rules and guidelines
- **README.md**: Basic setup and usage instructions
- **PROJECT_INFO.md**: This comprehensive project overview

---

**Last Updated**: December 2024  
**Project Status**: Active Development  
**Version**: 0.0.0 (Pre-release)  
**Target Release**: Q1 2025
