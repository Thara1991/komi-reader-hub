export interface UserSettings {
  mainDirectory: string;
  lastScanResult?: {
    comics: Array<{
      id: string;
      title: string;
      folderPath: string;
      totalPages: number;
      lastRead: Date;
      currentPage: number;
      pages: string[];
      coverImage?: string;
      lastModified: Date;
    }>;
    totalComics: number;
  };
}

export interface ReadingProgress {
  [comicId: string]: {
    currentPage: number;
    lastRead: Date;
  };
}

const STORAGE_KEYS = {
  COMIC_METADATA_PREFIX: 'comic-metadata-'
} as const;

// Save user settings to localStorage
// Moved to fileStorage.ts

// Load user settings from localStorage
// Moved to fileStorage.ts

// Save reading progress for a specific comic
// Moved to fileStorage.ts

// Moved to fileStorage.ts

// Moved to fileStorage.ts

// Comic metadata storage functions
export interface ComicMetadata {
  id: string;
  title: string;
  author?: string;
  groupAuthor?: string;
  genre?: string; // Legacy single genre
  comicGenres?: {
    protagonist?: string[];
    antagonist?: string[];
    supporting?: string[];
    narrative?: string[];
  };
  description?: string;
  lastModified: Date;
}

// Save metadata for a specific comic
export function saveComicMetadata(comicId: string, metadata: Partial<ComicMetadata>): void {
  try {
    const key = `${STORAGE_KEYS.COMIC_METADATA_PREFIX}${comicId}`;
    const existing = localStorage.getItem(key);
    const existingMetadata = existing ? JSON.parse(existing) : {};
    
    const updatedMetadata = {
      ...existingMetadata,
      ...metadata,
      id: comicId,
      lastModified: new Date()
    };
    
    localStorage.setItem(key, JSON.stringify(updatedMetadata));
  } catch (error) {
    console.error(`Failed to save metadata for comic ${comicId}:`, error);
  }
}

// Load metadata for a specific comic
export function loadComicMetadata(comicId: string): ComicMetadata | null {
  try {
    const key = `${STORAGE_KEYS.COMIC_METADATA_PREFIX}${comicId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const metadata = JSON.parse(stored);
      return {
        ...metadata,
        lastModified: new Date(metadata.lastModified)
      };
    }
  } catch (error) {
    console.error(`Failed to load metadata for comic ${comicId}:`, error);
  }
  return null;
}

// Load metadata for multiple comics
export function loadComicsMetadata(comicIds: string[]): Record<string, ComicMetadata> {
  const metadata: Record<string, ComicMetadata> = {};
  
  comicIds.forEach(comicId => {
    const comicMetadata = loadComicMetadata(comicId);
    if (comicMetadata) {
      metadata[comicId] = comicMetadata;
    }
  });
  
  return metadata;
}

// Delete metadata for a specific comic
export function deleteComicMetadata(comicId: string): void {
  try {
    const key = `${STORAGE_KEYS.COMIC_METADATA_PREFIX}${comicId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to delete metadata for comic ${comicId}:`, error);
  }
}

// Get all comic metadata keys (for cleanup)
export function getAllComicMetadataKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_KEYS.COMIC_METADATA_PREFIX)) {
      keys.push(key);
    }
  }
  return keys;
}

// Clear all stored data - moved to fileStorage.ts 