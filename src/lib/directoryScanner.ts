// Type definitions for File System Access API
declare global {
  interface Window {
    showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>;
  }
}

interface FileSystemDirectoryHandle {
  name: string;
  kind: 'directory';
  values(): AsyncIterableIterator<FileSystemHandle>;
  getFile(): Promise<File>;
}

interface FileSystemHandle {
  name: string;
  kind: 'file' | 'directory';
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';
  getFile(): Promise<File>;
}

export interface ComicFolder {
  id: string;
  title: string;
  folderPath: string;
  coverImage?: string;
  totalPages: number;
  pages: string[];
  lastModified: Date;
}

export interface DirectoryScanResult {
  comics: ComicFolder[];
  totalComics: number;
  errors: string[];
}

// Function to extract comic info from a folder
export function extractComicInfoFromFolder(folderName: string, folderPath: string): Partial<ComicFolder> {
  return {
    id: folderName.toLowerCase().replace(/\s+/g, '-'),
    title: folderName,
    folderPath: folderPath,
    lastModified: new Date()
  };
}

// Check if File System Access API is supported
export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

// Request directory access using File System Access API
export async function requestDirectoryAccess(): Promise<FileSystemDirectoryHandle | null> {
  try {
    if (!isFileSystemAccessSupported()) {
      return null;
    }
    return await window.showDirectoryPicker({ mode: 'read' });
  } catch (error) {
    console.error('Failed to request directory access:', error);
    return null;
  }
}

// Validate a directory path
export async function validateDirectory(directoryPath: string): Promise<{ valid: boolean; error?: string }> {
  try {
    if (!directoryPath.trim()) {
      return { valid: false, error: 'Directory path is required' };
    }

    // In Electron environment, we'll let the main process handle validation
    if (window.electronAPI && window.electronAPI.isElectron) {
      return { valid: true };
    }

    // For browser environment, we can't validate file system paths
    // So we'll return true and let the scan process handle errors
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid directory path' };
  }
}

// Scan directory for comics
export async function scanDirectoryForComics(directoryPath: string): Promise<DirectoryScanResult> {
  const result: DirectoryScanResult = {
    comics: [],
    totalComics: 0,
    errors: []
  };

  try {
    if (!directoryPath.trim()) {
      result.errors.push('Directory path is required');
      return result;
    }

    // In Electron environment, use the main process
    if (window.electronAPI && window.electronAPI.isElectron && window.electronAPI.readDirectory) {
      const electronResult = await window.electronAPI.readDirectory(directoryPath);
      return electronResult;
    }

    // For browser environment, we can't scan local directories
    result.errors.push('Directory scanning is only available in Electron environment');
    return result;
  } catch (error) {
    result.errors.push(`Failed to scan directory: ${error}`);
    return result;
  }
}

// Scan directory handle for comics (File System Access API)
export async function scanDirectoryHandleForComics(directoryHandle: FileSystemDirectoryHandle): Promise<DirectoryScanResult> {
  const result: DirectoryScanResult = {
    comics: [],
    totalComics: 0,
    errors: []
  };

  try {
    const comics: ComicFolder[] = [];
    
    for await (const entry of directoryHandle.values()) {
      if (entry.kind === 'directory') {
        const comicFolder = await processComicDirectory(entry as FileSystemDirectoryHandle);
        if (comicFolder) {
          comics.push(comicFolder);
        }
      }
    }

    result.comics = comics;
    result.totalComics = comics.length;
    return result;
  } catch (error) {
    result.errors.push(`Failed to scan directory: ${error}`);
    return result;
  }
}

// Process a single comic directory
async function processComicDirectory(directoryHandle: FileSystemDirectoryHandle): Promise<ComicFolder | null> {
  try {
    const pages: string[] = [];
    let coverImage: string | undefined;

    for await (const entry of directoryHandle.values()) {
      if (entry.kind === 'file') {
        const fileName = entry.name.toLowerCase();
        if (/\.(jpg|jpeg|png|webp|gif)$/i.test(fileName)) {
          const fileUrl = URL.createObjectURL(await (entry as FileSystemFileHandle).getFile());
          pages.push(fileUrl);
          
          // Use the first image as cover
          if (!coverImage) {
            coverImage = fileUrl;
          }
        }
      }
    }

    if (pages.length === 0) {
      return null;
    }

    return {
      id: directoryHandle.name.toLowerCase().replace(/\s+/g, '-'),
      title: directoryHandle.name,
      folderPath: directoryHandle.name,
      coverImage,
      totalPages: pages.length,
      pages: pages.sort(),
      lastModified: new Date()
    };
  } catch (error) {
    console.error(`Failed to process directory ${directoryHandle.name}:`, error);
    return null;
  }
} 