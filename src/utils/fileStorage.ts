// Enhanced file storage utility for Electron with individual comic files
interface StorageData {
  library?: any[];
  genres?: Record<string, string[]>;
  settings?: Record<string, any>;
  readingProgress?: Record<string, any>;
}

interface ComicData {
  id: string;
  title: string;
  author?: string;
  groupAuthor?: string;
  description?: string;
  genre?: string;
  comicGenres?: any;
  coverImage?: string;
  totalPages: number;
  currentPage: number;
  folderPath: string;
  lastRead?: Date;
  lastReadDate?: string;
  pages?: string[];
}

interface LibraryIndex {
  comics: {
    [id: string]: {
      title: string;
      folderPath: string;
      lastModified: string;
    };
  };
  lastScan: string;
  totalComics: number;
}

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI && (window as any).electronAPI.isElectron;

class EnhancedFileStorage {
  private dataPath: string = '';
  private comicsPath: string = '';
  private data: StorageData = {};
  private libraryIndex: LibraryIndex = { comics: {}, lastScan: '', totalComics: 0 };

  constructor() {
    this.initializeStorage();
  }

  private async initializeStorage() {
    if (isElectron) {
      // In Electron, get the app data path
      this.dataPath = await (window as any).electronAPI.getAppDataPath();
      // Create json folder for data files
      this.dataPath = `${this.dataPath}/json`;
      this.comicsPath = `${this.dataPath}/comics`;
      await this.ensureDataDirectory();
      await this.loadData();
    }
  }

  private async ensureDataDirectory() {
    if (!isElectron) return;
    
    try {
      // Create json folder and comics subfolder if they don't exist
      await (window as any).electronAPI.ensureDirectory(this.dataPath);
      await (window as any).electronAPI.ensureDirectory(this.comicsPath);
    } catch (error) {
      console.error('Error creating data directories:', error);
    }
  }

  private async loadData() {
    if (!isElectron) return;

    try {
      console.log('🔵 Enhanced fileStorage: loadData started');
      
      // Wait for electronAPI to be available
      let retries = 0;
      while (!(window as any).electronAPI || !(window as any).electronAPI.fileExists) {
        if (retries >= 50) {
          console.error('🔵 Enhanced fileStorage: electronAPI not available after 5 seconds');
          return;
        }
        console.log('🔵 Enhanced fileStorage: Waiting for electronAPI... retry', retries + 1);
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }
      
      console.log('🔵 Enhanced fileStorage: electronAPI is now available');
      
      const libraryIndexPath = `${this.dataPath}/library_index.json`;
      const genresPath = `${this.dataPath}/genres.json`;
      const settingsPath = `${this.dataPath}/settings.json`;
      const progressPath = `${this.dataPath}/reading-progress.json`;

      // Ensure all data files exist with default values
      await this.ensureDataFiles();

      // Load library index
      this.libraryIndex = await this.readFile(libraryIndexPath) || { comics: {}, lastScan: '', totalComics: 0 };
      
      // Load other data
      this.data.genres = await this.readFile(genresPath) || {};
      this.data.settings = await this.readFile(settingsPath) || {};
      this.data.readingProgress = await this.readFile(progressPath) || {};
      
      console.log('🔵 Enhanced fileStorage: Data loaded:', {
        libraryIndex: Object.keys(this.libraryIndex.comics).length,
        genres: Object.keys(this.data.genres).length,
        settings: this.data.settings,
        readingProgress: Object.keys(this.data.readingProgress).length
      });
    } catch (error) {
      console.error('🔵 Enhanced fileStorage: Error loading data files:', error);
      this.data = { library: [], genres: {}, settings: {}, readingProgress: {} };
      this.libraryIndex = { comics: {}, lastScan: '', totalComics: 0 };
    }
  }

  private async ensureDataFiles() {
    if (!isElectron) return;

    try {
      // Create all data files with default values if they don't exist
      const files = [
        { path: `${this.dataPath}/library_index.json`, defaultData: { comics: {}, lastScan: '', totalComics: 0 } },
        { path: `${this.dataPath}/genres.json`, defaultData: {} },
        { path: `${this.dataPath}/settings.json`, defaultData: {} },
        { path: `${this.dataPath}/reading-progress.json`, defaultData: {} }
      ];

      for (const file of files) {
        const exists = await (window as any).electronAPI.fileExists(file.path);
        if (!exists) {
          await this.writeFile(file.path, file.defaultData);
          console.log(`Created ${file.path} with default data`);
        }
      }
    } catch (error) {
      console.error('Error ensuring data files:', error);
    }
  }

  private async readFile(filePath: string): Promise<any> {
    if (!isElectron) return null;
    
    const exists = await (window as any).electronAPI.fileExists(filePath);
    if (!exists) return null;
    
    return await (window as any).electronAPI.readFile(filePath);
  }

  private async writeFile(filePath: string, data: any): Promise<boolean> {
    if (!isElectron) return false;
    console.log('🔵 Enhanced fileStorage: writeFile called with:', filePath, data);
    const result = await (window as any).electronAPI.writeFile(filePath, data);
    console.log('🔵 Enhanced fileStorage: writeFile result:', result);
    return result;
  }

  // Sanitize title for folder names
  private sanitizeTitle(title: string): string {
    return title
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters
      .replace(/\s+/g, ' ')          // Normalize spaces
      .trim();
  }

  // Individual comic file methods
  async saveComic(comic: ComicData): Promise<boolean> {
    if (!isElectron) return false;

    try {
      // Create filename from comic ID
      const filename = `comic_${comic.id}.json`;
      const filePath = `${this.comicsPath}/${filename}`;
      
      // Save individual comic file
      const success = await this.writeFile(filePath, comic);
      
      if (success) {
        // Update library index
        this.libraryIndex.comics[comic.id] = {
          title: comic.title,
          folderPath: comic.folderPath,
          lastModified: new Date().toISOString()
        };
        
        // Save updated index
        await this.writeFile(`${this.dataPath}/library_index.json`, this.libraryIndex);
        
        console.log(`✅ Comic ${comic.title} saved successfully`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to save comic:', error);
      return false;
    }
  }

  async getComic(comicId: string): Promise<ComicData | null> {
    if (!isElectron) return null;

    try {
      const filename = `comic_${comicId}.json`;
      const filePath = `${this.comicsPath}/${filename}`;
      
      console.log(`🔍 fileStorage.getComic: Looking for ${filename} at ${filePath}`);
      
      const comic = await this.readFile(filePath);
      if (comic) {
        console.log(`✅ fileStorage.getComic: Found comic data for ${comicId}:`, comic);
        if (comic.author) {
          console.log(`✅ fileStorage.getComic: Comic has author: "${comic.author}"`);
        }
      } else {
        console.log(`⚠️ fileStorage.getComic: No data found for ${comicId}`);
      }
      return comic;
    } catch (error) {
      console.error(`❌ Failed to get comic ${comicId}:`, error);
      return null;
    }
  }

  async deleteComic(comicId: string): Promise<boolean> {
    if (!isElectron) return false;

    try {
      // Remove from library index
      delete this.libraryIndex.comics[comicId];
      
      // Save updated index
      await this.writeFile(`${this.dataPath}/library_index.json`, this.libraryIndex);
      
      console.log(`✅ Comic ${comicId} removed from index`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete comic ${comicId}:`, error);
      return false;
    }
  }

  // Folder renaming functionality
  async renameComicFolder(oldTitle: string, newTitle: string, oldPath: string): Promise<string | null> {
    if (!isElectron) return null;

    try {
      const oldFolderName = this.sanitizeTitle(oldTitle);
      const newFolderName = this.sanitizeTitle(newTitle);
      
      if (oldFolderName === newFolderName) {
        console.log('No folder rename needed - titles are the same');
        return oldPath;
      }

      // Extract directory path and old folder name
      const lastSlashIndex = oldPath.lastIndexOf('/');
      const directoryPath = oldPath.substring(0, lastSlashIndex);
      const newPath = `${directoryPath}/${newFolderName}`;

      console.log(`🔄 Renaming folder: ${oldPath} → ${newPath}`);

      // Use Electron API to rename folder
      const success = await (window as any).electronAPI.renameFolder(oldPath, newPath);
      
      if (success) {
        console.log(`✅ Folder renamed successfully: ${oldPath} → ${newPath}`);
        return newPath;
      } else {
        console.error(`❌ Failed to rename folder: ${oldPath} → ${newPath}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Error renaming folder:', error);
      return null;
    }
  }

  // Bulk operations
  async saveComics(comics: ComicData[]): Promise<boolean> {
    if (!isElectron) return false;

    try {
      // Save each comic individually
      for (const comic of comics) {
        await this.saveComic(comic);
      }
      
      // Update library index
      this.libraryIndex.totalComics = comics.length;
      this.libraryIndex.lastScan = new Date().toISOString();
      
      await this.writeFile(`${this.dataPath}/library_index.json`, this.libraryIndex);
      
      console.log(`✅ Saved ${comics.length} comics successfully`);
      return true;
    } catch (error) {
      console.error('❌ Failed to save comics:', error);
      return false;
    }
  }

  async getAllComics(): Promise<ComicData[]> {
    if (!isElectron) return [];

    try {
      const comics: ComicData[] = [];
      
      // Load all comic files
      for (const comicId in this.libraryIndex.comics) {
        const comic = await this.getComic(comicId);
        if (comic) {
          comics.push(comic);
        }
      }
      
      return comics;
    } catch (error) {
      console.error('❌ Failed to get all comics:', error);
      return [];
    }
  }

  // Legacy compatibility methods
  async getLibrary(): Promise<any[]> {
    return await this.getAllComics();
  }

  async setLibrary(library: any[]): Promise<void> {
    await this.saveComics(library);
  }

  // Genres data methods
  async getGenres(): Promise<Record<string, string[]>> {
    if (isElectron) {
      return this.data.genres || {};
    } else {
      const stored = localStorage.getItem('komi-genres');
      return stored ? JSON.parse(stored) : {};
    }
  }

  async setGenres(genres: Record<string, string[]>): Promise<void> {
    if (isElectron) {
      this.data.genres = genres;
      await this.writeFile(`${this.dataPath}/genres.json`, genres);
    } else {
      localStorage.setItem('komi-genres', JSON.stringify(genres));
    }
  }

  // Settings data methods
  async getSettings(): Promise<Record<string, any>> {
    if (isElectron) {
      console.log('🔵 Enhanced fileStorage: getSettings called in Electron mode');
      
      // If data hasn't been loaded yet, load it first
      if (!this.data.settings && Object.keys(this.data).length === 0) {
        console.log('🔵 Enhanced fileStorage: Data not loaded yet, loading now...');
        await this.loadData();
      }
      
      console.log('🔵 Enhanced fileStorage: this.data.settings:', this.data.settings);
      const result = this.data.settings || {};
      console.log('🔵 Enhanced fileStorage: Returning settings:', result);
      return result;
    } else {
      const stored = localStorage.getItem('komi-settings');
      return stored ? JSON.parse(stored) : {};
    }
  }

  async setSettings(settings: Record<string, any>): Promise<void> {
    if (isElectron) {
      console.log('🔵 Enhanced fileStorage: Setting settings in Electron mode:', settings);
      this.data.settings = settings;
      const filePath = `${this.dataPath}/settings.json`;
      console.log('🔵 Enhanced fileStorage: Writing to file:', filePath);
      await this.writeFile(filePath, settings);
      console.log('🔵 Enhanced fileStorage: Settings written successfully');
    } else {
      localStorage.setItem('komi-settings', JSON.stringify(settings));
    }
  }

  // Reading progress methods
  async getReadingProgress(): Promise<Record<string, any>> {
    if (isElectron) {
      return this.data.readingProgress || {};
    } else {
      const stored = localStorage.getItem('komi-reading-progress');
      return stored ? JSON.parse(stored) : {};
    }
  }

  async setReadingProgress(progress: Record<string, any>): Promise<void> {
    if (isElectron) {
      this.data.readingProgress = progress;
      await this.writeFile(`${this.dataPath}/reading-progress.json`, progress);
    } else {
      localStorage.setItem('komi-reading-progress', JSON.stringify(progress));
    }
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    if (isElectron) {
      this.data = { library: [], genres: {}, settings: {}, readingProgress: {} };
      this.libraryIndex = { comics: {}, lastScan: '', totalComics: 0 };
      await Promise.all([
        this.writeFile(`${this.dataPath}/library_index.json`, { comics: {}, lastScan: '', totalComics: 0 }),
        this.writeFile(`${this.dataPath}/genres.json`, {}),
        this.writeFile(`${this.dataPath}/settings.json`, {}),
        this.writeFile(`${this.dataPath}/reading-progress.json`, {})
      ]);
    } else {
      localStorage.removeItem('komi-library');
      localStorage.removeItem('komi-genres');
      localStorage.removeItem('komi-settings');
      localStorage.removeItem('komi-reading-progress');
    }
  }

  // Export data
  async exportData(): Promise<StorageData> {
    return {
      library: await this.getAllComics(),
      genres: await this.getGenres(),
      settings: await this.getSettings(),
      readingProgress: await this.getReadingProgress()
    };
  }

  // Clear genre data specifically (for migration to new system)
  async clearGenreData(): Promise<void> {
    if (isElectron) {
      // Clear the genres.json file
      this.data.genres = {};
      await this.writeFile(`${this.dataPath}/genres.json`, {});
      
      // Clear all comic metadata files to remove old genre data
      try {
        const allComics = await this.getAllComics();
        for (const comic of allComics) {
          if (comic.id) {
            const comicFilePath = `${this.comicsPath}/${comic.id}.json`;
            // Remove the comic metadata file to force regeneration
            try {
              await (window as any).electronAPI.deleteFile(comicFilePath);
            } catch (error) {
              console.log(`Could not delete comic file ${comicFilePath}:`, error);
            }
          }
        }
        console.log('✅ Cleared all genre data and comic metadata');
      } catch (error) {
        console.error('❌ Error clearing comic metadata:', error);
      }
    } else {
      localStorage.removeItem('komi-genres');
      // For browser mode, we can't easily clear individual comic files
      console.log('⚠️ Genre data cleared, but comic metadata may need manual clearing in browser mode');
    }
  }

  // Import data
  async importData(data: StorageData): Promise<void> {
    if (data.library) await this.saveComics(data.library);
    if (data.genres) await this.setGenres(data.genres);
    if (data.settings) await this.setSettings(data.settings);
    if (data.readingProgress) await this.setReadingProgress(data.readingProgress);
  }

  // Check if running in Electron
  isElectron(): boolean {
    return isElectron;
  }

  // Get storage info
  async getStorageInfo(): Promise<{ totalComics: number; lastScan: string; storagePath: string }> {
    return {
      totalComics: this.libraryIndex.totalComics,
      lastScan: this.libraryIndex.lastScan,
      storagePath: this.dataPath
    };
  }

  // Migration from old system to new system
  async migrateFromOldSystem(): Promise<boolean> {
    if (!isElectron) return false;

    // MIGRATION DISABLED - It was overwriting individual comic data with old library.json data
    console.log('🔒 Migration disabled to prevent data corruption');
    console.log('🔒 Individual comic files take precedence over old library.json');
    return true;
  }

  // Genre assignment methods for the new genre system
  async getGenreAssignments(): Promise<Record<string, { personality: string[]; verb: string[]; plot: string[] }> | null> {
    if (isElectron) {
      try {
        const filePath = `${this.dataPath}/genre_assignments.json`;
        const assignments = await this.readFile(filePath);
        return assignments || {
          protagonist: { personality: [], verb: [], plot: [] },
          antagonist: { personality: [], verb: [], plot: [] },
          supporting: { personality: [], verb: [], plot: [] },
          narrative: { personality: [], verb: [], plot: [] }
        };
      } catch (error) {
        console.log('🔵 Enhanced fileStorage: No genre assignments found, using defaults');
        return {
          protagonist: { personality: [], verb: [], plot: [] },
          antagonist: { personality: [], verb: [], plot: [] },
          supporting: { personality: [], verb: [], plot: [] },
          narrative: { personality: [], verb: [], plot: [] }
        };
      }
    } else {
      const stored = localStorage.getItem('komi-genre-assignments');
      return stored ? JSON.parse(stored) : {
        protagonist: { personality: [], verb: [], plot: [] },
        antagonist: { personality: [], verb: [], plot: [] },
        supporting: { personality: [], verb: [], plot: [] },
        narrative: { personality: [], verb: [], plot: [] }
      };
    }
  }

  async setGenreAssignments(assignments: Record<string, { personality: string[]; verb: string[]; plot: string[] }>): Promise<void> {
    if (isElectron) {
      const filePath = `${this.dataPath}/genre_assignments.json`;
      await this.writeFile(filePath, assignments);
      console.log('🔵 Enhanced fileStorage: Genre assignments saved successfully');
    } else {
      localStorage.setItem('komi-genre-assignments', JSON.stringify(assignments));
    }
  }
}

// Create and export a singleton instance
export const fileStorage = new EnhancedFileStorage(); 