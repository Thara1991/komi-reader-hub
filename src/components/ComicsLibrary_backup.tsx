import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Folder, Edit, RefreshCw, Save } from "lucide-react";
import ComicList from "./ComicList";
import DirectorySettings from "./DirectorySettings";
import { Comic, Genre } from "@/types/comic";
import { ComicFolder, DirectoryScanResult, scanDirectoryForComics } from "@/lib/directoryScanner";
import { loadComicsMetadata, loadComicMetadata, saveComicMetadata } from "@/lib/storage";
import { fileStorage } from "@/utils/fileStorage";
import { useTheme } from 'next-themes';
import { Moon, Sun, Laptop } from 'lucide-react';
import SearchFilter from "./SearchFilter";

// Remove sample comic imports
// import dragonQuestCover from "@/assets/dragon-quest-cover.jpg";
// import mysticAcademyCover from "@/assets/mystic-academy-cover.jpg";
// import spaceWarriorsCover from "@/assets/space-warriors-cover.jpg";
// Remove SAMPLE_COMICS definition
// const SAMPLE_COMICS: Comic[] = [...];

interface ComicsLibraryProps {
  onComicSelect: (comic: Comic) => void;
  onOpenComicManagement?: (comics: Comic[]) => void;
  selectedComicId?: string; // Add this prop to know which comic should be selected
}

// Utility to merge reading progress into comics
function mergeReadingProgress(comics: Comic[], readingProgress: { [key: string]: { lastRead: Date; currentPage: number } }) {
  return comics.map(comic => {
    const progress = readingProgress[comic.id];
    if (progress) {
      return {
        ...comic,
        lastRead: progress.lastRead,
        lastReadDate: progress.lastRead ? progress.lastRead.toISOString() : comic.lastReadDate,
        currentPage: progress.currentPage ?? comic.currentPage,
      } as Comic;
    }
    return comic;
  });
}

const ComicsLibrary = ({ onComicSelect, onOpenComicManagement, selectedComicId }: ComicsLibraryProps) => {
  // Initialize state as empty array
  const [comics, setComics] = useState<Comic[]>([]);
  const [filteredComics, setFilteredComics] = useState<Comic[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [availableGenres, setAvailableGenres] = useState<{ personality: string[]; verb: string[]; plot: string[] }>({
    personality: [],
    verb: [],
    plot: []
  });
  const [showDirectorySettings, setShowDirectorySettings] = useState(false);
  const [showLibraryManager, setShowLibraryManager] = useState(false);
  const [mainDirectory, setMainDirectory] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<DirectoryScanResult | null>(null);
  const [displayMode, setDisplayMode] = useState<'comicbook' | 'comictree'>('comictree');
  const [selectedComics, setSelectedComics] = useState<Set<string>>(new Set());
  const [selectedComicIndex, setSelectedComicIndex] = useState<number>(-1);
  const treeViewRef = useRef<HTMLDivElement>(null);

  const { theme, setTheme, resolvedTheme } = useTheme();

  // Helper function to format genres for display
  const formatGenres = (comicGenres: any): string[] => {
    if (!comicGenres) return [];
    const allGenres: string[] = [];
    Object.values(comicGenres).forEach((genreList: any) => {
      if (Array.isArray(genreList)) {
        allGenres.push(...genreList);
      }
    });
    return allGenres;
  };

  // Update selection when selectedComicId prop changes
  useEffect(() => {
    if (selectedComicId && filteredComics.length > 0) {
      const index = filteredComics.findIndex(comic => comic.id === selectedComicId);
      if (index >= 0) {
        setSelectedComicIndex(index);
        setSelectedComics(new Set([selectedComicId]));
        console.log(`✅ Selection restored: ${selectedComicId} at index ${index}`);
      } else {
        console.log(`⚠️ Selected comic not found in filtered results: ${selectedComicId}`);
      }
    }
  }, [selectedComicId, filteredComics]);

  // Also restore selection when comics are loaded (in case selectedComicId was set before comics loaded)
  useEffect(() => {
    if (selectedComicId && filteredComics.length > 0 && selectedComicIndex === -1) {
      const index = filteredComics.findIndex(comic => comic.id === selectedComicId);
      if (index >= 0) {
        setSelectedComicIndex(index);
        setSelectedComics(new Set([selectedComicId]));
        console.log(`✅ Selection restored after comics loaded: ${selectedComicId} at index ${index}`);
      }
    }
  }, [filteredComics, selectedComicId, selectedComicIndex]);

  // Auto-scroll treeview to keep selected comic visible
  useEffect(() => {
    if (displayMode === 'comictree' && selectedComicIndex >= 0 && treeViewRef.current && filteredComics.length > 0) {
      // Small delay to ensure the DOM is updated
      const scrollToSelected = () => {
        const treeView = treeViewRef.current;
        if (!treeView) return;
        
        const selectedElement = treeView.querySelector(`[data-comic-index="${selectedComicIndex}"]`) as HTMLElement;
        
        if (selectedElement) {
          // Always scroll to make the selected element visible (center it for better UX)
          selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          console.log(`🔵 ComicsLibrary: Auto-scrolled to selected comic at index ${selectedComicIndex}`);
        } else {
          console.log(`🔵 ComicsLibrary: Could not find element for index ${selectedComicIndex}`);
        }
      };
      
      // Use setTimeout to ensure the DOM is fully updated
      setTimeout(scrollToSelected, 100);
    }
  }, [selectedComicIndex, displayMode, filteredComics.length]);

  // Clear all search fields
  const handleClearSearch = () => {
    setSearchText("");
    setSelectedGenres([]);
  };

  // Filtering logic
  useEffect(() => {
    let filtered = comics;
    
    // Text search
    if (searchText) {
      filtered = filtered.filter(comic =>
        comic.title.toLowerCase().includes(searchText.toLowerCase()) ||
        (comic.displayTitle && comic.displayTitle.toLowerCase().includes(searchText.toLowerCase())) ||
        comic.author?.toLowerCase().includes(searchText.toLowerCase()) ||
        comic.description?.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    // Genre filters - find comics with ANY of the selected genres in ANY category
    if (selectedGenres.length > 0) {
      filtered = filtered.filter(comic =>
        selectedGenres.some(selectedGenre => {
          return Object.values(comic.comicGenres || {}).some(genreList => 
            Array.isArray(genreList) && genreList.includes(selectedGenre)
          );
        })
      );
    }
    
    setFilteredComics(filtered);
    }, [comics, searchText, selectedGenres]);

  // Load available genres from fileStorage
  useEffect(() => {
    const loadGenres = async () => {
      try {
        const genres = await fileStorage.getGenres();
        if (genres && (genres.personality || genres.verb || genres.plot)) {
          setAvailableGenres({
            personality: genres.personality || [],
            verb: genres.verb || [],
            plot: genres.plot || []
          });
        }
      } catch (error) {
        console.error('Failed to load genres:', error);
      }
    };
    loadGenres();
  }, []);

  // Keyboard navigation for ComicTree mode
  useEffect(() => {
    if (displayMode !== 'comictree') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (filteredComics.length === 0) return;
      
      // Check if the ComicsLibrary is currently visible
      // If hidden (display: none), don't handle keyboard events
      const comicsLibraryElement = document.querySelector('.min-h-screen.bg-slate-900');
      if (comicsLibraryElement && (comicsLibraryElement as HTMLElement).style.display === 'none') {
        console.log('🔵 ComicsLibrary: Keyboard events disabled - component hidden');
        return;
      }
      console.log('🔵 ComicsLibrary: Keyboard events enabled - component visible');

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          setSelectedComicIndex(prev => {
            const newIndex = prev <= 0 ? filteredComics.length - 1 : prev - 1;
            // Auto-select the comic when navigating
            const comic = filteredComics[newIndex];
            setSelectedComics(new Set([comic.id]));
            return newIndex;
          });
          break;
        case 'ArrowDown':
          event.preventDefault();
          setSelectedComicIndex(prev => {
            const newIndex = prev >= filteredComics.length - 1 ? 0 : prev + 1;
            // Auto-select the comic when navigating
            const comic = filteredComics[newIndex];
            setSelectedComics(new Set([comic.id]));
            return newIndex;
          });
          break;
        case 'Enter':
          event.preventDefault();
          if (selectedComicIndex >= 0 && selectedComicIndex < filteredComics.length) {
            const comic = filteredComics[selectedComicIndex];
            // Create a custom event to trigger handleComicSelect
            const comicSelectEvent = new CustomEvent('comicSelect', { detail: comic });
            document.dispatchEvent(comicSelectEvent);
          }
          break;
      }
    };

    // Reset selection index when filtered comics change
    if (filteredComics.length > 0 && selectedComicIndex >= filteredComics.length) {
      setSelectedComicIndex(0);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [displayMode, filteredComics, selectedComicIndex]);

  // Load initial data on app start, but avoid unnecessary scans
  // Use sessionStorage to persist scan status across component mounts/unmounts
  const [hasLoadedInitially, setHasLoadedInitially] = useState(() => {
    try {
      // Check if we've already scanned in this session
      return sessionStorage.getItem('comicsLibraryScanned') === 'true';
    } catch {
      return false;
    }
  });
  
  useEffect(() => {
    // Only run initial load if we haven't scanned in this session
    if (hasLoadedInitially) {
      console.log('🔵 ComicsLibrary: Skipping initial load - already scanned in this session');
      return;
    }
    
    const loadInitialData = async () => {
      try {
        console.log('🔵 ComicsLibrary: loadInitialData started');
        
        // Initialize fileStorage to create json folder and data files
        await fileStorage.getLibrary(); // This will trigger the initialization
        console.log('🔵 ComicsLibrary: fileStorage initialized');
        
        // Migration disabled to prevent data corruption
        // The migration system was overwriting saved individual comic data
        // with old library.json data, causing author changes to be lost
        console.log('🔒 Migration disabled to preserve individual comic data');
        
        // Load saved settings first
        const settings = await fileStorage.getSettings();
        console.log('🔵 ComicsLibrary: Loaded settings:', settings);
        console.log('🔵 ComicsLibrary: Settings type:', typeof settings);
        console.log('🔵 ComicsLibrary: Settings keys:', Object.keys(settings || {}));
        console.log('🔵 ComicsLibrary: mainDirectory value:', settings?.mainDirectory);
        console.log('🔵 ComicsLibrary: readerMode value:', settings?.readerMode);
        console.log('🔵 ComicsLibrary: darkMode value:', settings?.darkMode);
        
        if (settings.mainDirectory) {
          console.log('🔵 ComicsLibrary: Found mainDirectory in settings:', settings.mainDirectory);
          setMainDirectory(settings.mainDirectory);
          
          // Always scan on initial load (app start), but not on subsequent mounts (returning from reader)
          console.log('🔵 ComicsLibrary: Initial load - calling handleScanDirectory...');
          await handleScanDirectory(settings.mainDirectory);
          console.log('🔵 ComicsLibrary: handleScanDirectory completed');
        } else {
          console.log('🔵 ComicsLibrary: No mainDirectory found in settings');
        }

        // Apply theme from settings if provided
        if (settings?.darkMode === true) {
          setTheme('dark');
          console.log('🔵 ComicsLibrary: Applied dark theme');
        } else if (settings?.darkMode === false) {
          setTheme('light');
          console.log('🔵 ComicsLibrary: Applied light theme');
        }

        // Apply display mode from settings if provided, default to comictree
        if (settings?.displayMode === 'comicbook' || settings?.displayMode === 'comictree') {
          setDisplayMode(settings.displayMode);
          console.log('🔵 ComicsLibrary: Applied display mode from settings:', settings.displayMode);
        } else {
          // Default to comictree mode for better scanning performance
          setDisplayMode('comictree');
          console.log('🔵 ComicsLibrary: No display mode in settings, defaulting to comictree');
        }
        
        // Mark that we've loaded initially and persist to sessionStorage
        setHasLoadedInitially(true);
        try {
          sessionStorage.setItem('comicsLibraryScanned', 'true');
        } catch (error) {
          console.log('🔵 ComicsLibrary: Failed to set sessionStorage item:', error);
        }
        
        // Note: Last selected comic will be restored after comics are loaded
        // This is handled in a separate useEffect below
      } catch (error) {
        console.error('🔵 ComicsLibrary: Failed to load initial data:', error);
      }
    };
    
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoadedInitially]);

  // Restore last selected comic from settings after comics are loaded
  useEffect(() => {
    const restoreLastSelectedComic = async () => {
      // Only restore if we have comics loaded and haven't already restored
      if (comics.length === 0 || selectedComicIndex !== -1) return;
      
      try {
        const settings = await fileStorage.getSettings();
        const lastSelectedComicId = settings?.lastSelectedComic;
        
        if (lastSelectedComicId) {
          console.log('🔵 ComicsLibrary: Attempting to restore last selected comic:', lastSelectedComicId);
          
          // Find the comic in the loaded comics
          const comicIndex = comics.findIndex(comic => comic.id === lastSelectedComicId);
          
          if (comicIndex >= 0) {
            // Comic found - restore selection
            setSelectedComicIndex(comicIndex);
            setSelectedComics(new Set([lastSelectedComicId]));
            console.log(`✅ Last selected comic restored: ${lastSelectedComicId} at index ${comicIndex}`);
          } else {
            // Comic not found - clear the setting
            console.log(`⚠️ Last selected comic not found: ${lastSelectedComicId}, clearing setting`);
            const current = await fileStorage.getSettings();
            await fileStorage.setSettings({
              ...(current || {}),
              lastSelectedComic: undefined
            });
          }
        }
      } catch (error) {
        console.error('🔵 ComicsLibrary: Failed to restore last selected comic:', error);
      }
    };
    
    restoreLastSelectedComic();
  }, [comics, selectedComicIndex]);

  const handleGenreToggle = (genre: Genre) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  // Convert ComicFolder to Comic format
  const convertComicFolderToComic = async (comicFolder: ComicFolder): Promise<Comic> => {
    console.log(`🔄 ComicsLibrary: convertComicFolderToComic called for: ${comicFolder.title} (${comicFolder.id})`);
    
    // In convertComicFolderToComic, use a generic placeholder for coverImage fallback
    const coverImage = comicFolder.coverImage || '/placeholder.svg';
    console.log(`Converting ${comicFolder.title}: using cover ${coverImage ? 'real' : 'fallback'}`);
    console.log(`Cover image path: ${comicFolder.coverImage}`);
    console.log(`Final cover image: ${coverImage}`);
    
    // Load saved metadata for this comic from JSON files
    let metadata = null;
    try {
      console.log(`🔍 ComicsLibrary: Attempting to load metadata for ${comicFolder.title}...`);
      metadata = await fileStorage.getComic(comicFolder.id);
      console.log(`📖 ComicsLibrary: Loaded metadata for ${comicFolder.title}:`, metadata);
      if (metadata && metadata.author) {
        console.log(`✅ ComicsLibrary: Found saved author "${metadata.author}" for ${comicFolder.title}`);
      } else {
        console.log(`⚠️ ComicsLibrary: No author found in metadata for ${comicFolder.title}`);
      }
    } catch (error) {
      console.log(`📖 ComicsLibrary: No saved metadata found for ${comicFolder.title}, using defaults. Error:`, error);
    }
    
    return {
      id: comicFolder.id,
      title: metadata?.title || comicFolder.title,
      author: metadata?.author || "Unknown",
      genre: metadata?.genre,
      comicGenres: metadata?.comicGenres,
      description: metadata?.description,
      genres: [], // Could be detected from folder name or metadata
      coverImage: coverImage,
      totalPages: comicFolder.totalPages,
      currentPage: 1, // Start from first page
      lastRead: comicFolder.lastModified,
      folderPath: comicFolder.folderPath,
      pages: comicFolder.pages // Pass the real page data
    };
  };

  // In handleDirectoryChange and handleScanDirectory, filter out non-directory entries before processing
  const handleDirectoryChange = async (directory: string, newScanResult?: DirectoryScanResult) => {
    console.log('🟡 ComicsLibrary: handleDirectoryChange called');
    console.log('🟡 ComicsLibrary: New directory:', directory);
    console.log('🟡 ComicsLibrary: Has scan result:', !!newScanResult);
    
    setMainDirectory(directory);
    if (newScanResult) {
      console.log('🟡 ComicsLibrary: Processing scan result with', newScanResult.comics.length, 'comics');
      setScanResult(newScanResult);
      // Filter out non-directory entries (should already be handled, but double-check)
      const onlyFolders = newScanResult.comics.filter(comic => !comic.folderPath || !comic.folderPath.endsWith('.zip'));
      console.log('🟡 ComicsLibrary: Converting', onlyFolders.length, 'folders in handleDirectoryChange...');
      const convertedComicsPromises = onlyFolders.map(convertComicFolderToComic);
      const convertedComics = await Promise.all(convertedComicsPromises);
      
      // Log the first few comics to see their data
      convertedComics.slice(0, 3).forEach((comic, index) => {
        console.log(`🟡 ComicsLibrary: Comic ${index + 1}:`, {
          id: comic.id,
          title: comic.title,
          author: comic.author,
          hasMetadata: !!(comic.author && comic.author !== 'Unknown')
        });
      });
      
      // Merge reading progress
      const readingProgress = await fileStorage.getReadingProgress();
      const mergedComics = mergeReadingProgress(convertedComics, readingProgress);
      setComics(mergedComics);
      setFilteredComics(mergedComics);
      // Save only essential settings - don't save lastScanResult
      // Preserve existing settings like darkMode and readerMode
      const currentSettings = await fileStorage.getSettings();
      await fileStorage.setSettings({
        ...currentSettings,
        mainDirectory: directory
      });
      console.log('🟡 ComicsLibrary: Directory change completed with scan result');
    } else {
      console.log('🟡 ComicsLibrary: No scan result provided, scanning directory...');
      // If no scan result provided, scan the directory
      await handleScanDirectory(directory);
    }
  };

  const handleScanDirectory = async (directory?: string) => {
    const targetDirectory = directory || mainDirectory;
    console.log('🔵 ComicsLibrary: handleScanDirectory called with:', targetDirectory);
    
    if (!targetDirectory) {
      console.log('🔵 ComicsLibrary: No target directory, returning');
      return;
    }
    
    setIsScanning(true);
    try {
      console.log('🔵 ComicsLibrary: Starting directory scan...');
      // Always use Electron API
      const result = await window.electronAPI.readDirectory(targetDirectory);
      console.log('🔵 ComicsLibrary: Scan result:', result);
      console.log('🔵 ComicsLibrary: Found comics:', result.comics.length);
      
      setScanResult(result);
      console.log('🔵 ComicsLibrary: Starting conversion of', result.comics.length, 'comics...');
      const convertedComicsPromises = result.comics.map(convertComicFolderToComic);
      console.log('🔵 ComicsLibrary: Created', convertedComicsPromises.length, 'promises');
      
      const convertedComics = await Promise.all(convertedComicsPromises);
      console.log('🔵 ComicsLibrary: Converted comics:', convertedComics.length);
      
      // Log the first few comics to see their data
      convertedComics.slice(0, 3).forEach((comic, index) => {
        console.log(`🔵 ComicsLibrary: Comic ${index + 1}:`, {
          id: comic.id,
          title: comic.title,
          author: comic.author,
          hasMetadata: !!(comic.author && comic.author !== 'Unknown')
        });
      });
      
      setComics(convertedComics);
      setFilteredComics(convertedComics);
      console.log('🔵 ComicsLibrary: Comics state updated');
      
      // Save the library to fileStorage using the new individual comic system
      try {
        await fileStorage.saveComics(convertedComics);
        console.log('✅ Library saved to fileStorage successfully using new system');
      } catch (error) {
        console.error('❌ Failed to save library to fileStorage:', error);
      }
      
      // Save only essential settings - don't save lastScanResult
      // Preserve existing settings like darkMode and readerMode
      const currentSettings = await fileStorage.getSettings();
      await fileStorage.setSettings({
        ...currentSettings,
        mainDirectory: targetDirectory
      });
      console.log('🔵 ComicsLibrary: Settings saved');
    } catch (error) {
      console.error("🔵 ComicsLibrary: Failed to scan directory:", error);
    } finally {
      setIsScanning(false);
      console.log('🔵 ComicsLibrary: Scan completed');
    }
  };

  const handleUpdateComic = async (comicId: string, updates: Partial<Comic>) => {
    const updatedComics = comics.map(comic =>
      comic.id === comicId ? { ...comic, ...updates } : comic
    );
    setComics(updatedComics);
    setFilteredComics(updatedComics);
    
    // Save metadata changes to localStorage
    const metadataToSave: Partial<Comic> = {};
    if (updates.title) metadataToSave.title = updates.title;
    if (updates.author) metadataToSave.author = updates.author;
    if (updates.genre) metadataToSave.genre = updates.genre;
    if (updates.comicGenres) metadataToSave.comicGenres = updates.comicGenres;
    if (updates.description) metadataToSave.description = updates.description;
    
    if (Object.keys(metadataToSave).length > 0) {
      // Save to localStorage (legacy)
      saveComicMetadata(comicId, metadataToSave);
      
      // Save to JSON files using fileStorage
      try {
        const currentLibrary = await fileStorage.getLibrary();
        const updatedLibrary = currentLibrary.map(comic =>
          comic.id === comicId ? { ...comic, ...metadataToSave } : comic
        );
        await fileStorage.setLibrary(updatedLibrary);
        console.log('✅ Comic metadata saved to JSON file successfully');
      } catch (error) {
        console.error('❌ Failed to save comic metadata to JSON file:', error);
      }
    }
  };

  const handleBulkUpdateComics = async (comicIds: string[], updates: Partial<Comic>) => {
    const updatedComics = comics.map(comic =>
      comicIds.includes(comic.id) ? { ...comic, ...updates } : comic
    );
    setComics(updatedComics);
    setFilteredComics(updatedComics);
    
    // Save metadata changes for each comic
    const metadataToSave: Partial<Comic> = {};
    if (updates.title) metadataToSave.title = updates.title;
    if (updates.author) metadataToSave.author = updates.author;
    if (updates.genre) metadataToSave.genre = updates.genre;
    if (updates.comicGenres) metadataToSave.comicGenres = updates.comicGenres;
    if (updates.description) metadataToSave.description = updates.description;
    
    if (Object.keys(metadataToSave).length > 0) {
      // Save to localStorage (legacy)
      comicIds.forEach(comicId => {
        saveComicMetadata(comicId, metadataToSave);
      });
      
      // Save to JSON files using fileStorage
      try {
        const currentLibrary = await fileStorage.getLibrary();
        const updatedLibrary = currentLibrary.map(comic =>
          comicIds.includes(comic.id) ? { ...comic, ...metadataToSave } : comic
        );
        await fileStorage.setLibrary(updatedLibrary);
        console.log('✅ Bulk comic metadata saved to JSON file successfully');
      } catch (error) {
        console.error('❌ Failed to save bulk comic metadata to JSON file:', error);
      }
    }
  };

  // New function to refresh without directory confirmation
  const handleRefresh = async (directory?: string) => {
    const targetDirectory = directory || mainDirectory;
    console.log('🟢 ComicsLibrary: handleRefresh called');
    console.log('🟢 ComicsLibrary: targetDirectory:', targetDirectory);
    console.log('🟢 ComicsLibrary: mainDirectory:', mainDirectory);
    
    if (!targetDirectory) {
      console.log("🟢 ComicsLibrary: No directory set, cannot refresh");
      return;
    }

    console.log('🟢 ComicsLibrary: Starting refresh scan for directory:', targetDirectory);
    setIsScanning(true);
    try {
      // Always use Electron API
      console.log('🟢 ComicsLibrary: Calling window.electronAPI.readDirectory...');
      const result = await window.electronAPI.readDirectory(targetDirectory);
      console.log('🟢 ComicsLibrary: Scan result:', result);
      console.log('🟢 ComicsLibrary: Found comics:', result.comics.length);
      
      setScanResult(result);
      console.log('🟢 ComicsLibrary: Starting refresh conversion of', result.comics.length, 'comics...');
      const convertedComicsPromises = result.comics.map(convertComicFolderToComic);
      const convertedComics = await Promise.all(convertedComicsPromises);
      console.log('🟢 ComicsLibrary: Converted comics:', convertedComics.length);
      
      // Log the first few comics to see their data
      convertedComics.slice(0, 3).forEach((comic, index) => {
        console.log(`🟢 ComicsLibrary: Comic ${index + 1}:`, {
          id: comic.id,
          title: comic.title,
          author: comic.author,
          hasMetadata: !!(comic.author && comic.author !== 'Unknown')
        });
      });
      
      setComics(convertedComics);
      setFilteredComics(convertedComics);
      
      // Save the library to fileStorage using the new individual comic system
      try {
        await fileStorage.saveComics(convertedComics);
        console.log('✅ Library saved to fileStorage successfully using new system');
      } catch (error) {
        console.error('❌ Failed to save library to fileStorage:', error);
      }
      
      // Don't save lastScanResult to settings.json - keep it clean
              // Only save essential settings like mainDirectory, readerMode, darkMode
      console.log('🟢 ComicsLibrary: Refresh completed successfully');
      return;
    } catch (error) {
      console.error("🟢 ComicsLibrary: Failed to refresh directory:", error);
    } finally {
      setIsScanning(false);
      console.log('🟢 ComicsLibrary: Refresh scan finished');
    }
  };

  const handleComicSelect = async (comic: Comic) => {
    // Update lastReadDate and lastRead to now
    const now = new Date();
    const updatedComic = { ...comic, lastReadDate: now.toISOString(), lastRead: now };

    // Update comics state
    setComics(prevComics => {
      const updated = prevComics.map(c => c.id === comic.id ? updatedComic : c);
      // Merge reading progress after update
      return updated; // We'll handle reading progress separately
    });
    setFilteredComics(prevComics => {
      const updated = prevComics.map(c => c.id === comic.id ? updatedComic : c);
      return updated; // We'll handle reading progress separately
    });

    // Persist reading progress using fileStorage
    const currentProgress = await fileStorage.getReadingProgress();
    currentProgress[comic.id] = {
      currentPage: updatedComic.currentPage,
      lastRead: new Date()
    };
    await fileStorage.setReadingProgress(currentProgress);

    // Note: Comic selection is now saved immediately when clicked in treeview
    // No need to save again when entering reading mode
    
    // Pass updated comic to reader
    onComicSelect(updatedComic);
  };

  // Listen for custom comic select events from keyboard navigation
  useEffect(() => {
    const handleComicSelectEvent = (event: CustomEvent) => {
      handleComicSelect(event.detail);
    };

    document.addEventListener('comicSelect', handleComicSelectEvent as EventListener);
    return () => document.removeEventListener('comicSelect', handleComicSelectEvent as EventListener);
  }, []);

  // Save display mode to settings
  const saveDisplayMode = async (mode: 'comicbook' | 'comictree') => {
    try {
      const current = await fileStorage.getSettings();
      await fileStorage.setSettings({
        ...(current || {}),
        displayMode: mode
      });
      console.log('🔵 ComicsLibrary: Display mode saved to settings.json:', mode);
    } catch (err) {
      console.error('🔵 ComicsLibrary: Failed to save display mode:', err);
    }
  };

  // Save last selected comic to settings
  const saveLastSelectedComic = async (comicId: string) => {
    try {
      console.log('🔵 ComicsLibrary: saveLastSelectedComic called with:', comicId);
      const current = await fileStorage.getSettings();
      console.log('🔵 ComicsLibrary: Current settings before save:', current);
      
      const updatedSettings = {
        ...(current || {}),
        lastSelectedComic: comicId
      };
      console.log('🔵 ComicsLibrary: Updated settings to save:', updatedSettings);
      
      await fileStorage.setSettings(updatedSettings);
      console.log('🔵 ComicsLibrary: Last selected comic saved to settings.json:', comicId);
      
      // Verify it was saved
      const verified = await fileStorage.getSettings();
      console.log('🔵 ComicsLibrary: Verified settings after save:', verified);
    } catch (err) {
      console.error('🔵 ComicsLibrary: Failed to save last selected comic:', err);
    }
  };

  // handleSaveToJson removed - now using fileStorage directly

  return (
    <div className="min-h-screen bg-slate-900 dark:bg-slate-950">
      {/* Header */}
      <div className="border-b border-border bg-manga-surface">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-manga-gradient bg-clip-text text-transparent">
                Manga Reader
              </h1>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDirectorySettings(true)}
                className="gap-2"
              >
                <Folder className="w-4 h-4" />
                {mainDirectory ? "Change Directory" : "Set Directory"}
              </Button>
            </div>
            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRefresh()}
                disabled={isScanning || !mainDirectory}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                {isScanning ? 'Scanning...' : 'Refresh'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLibraryManager(true)}
                className="gap-2"
              >
                <Edit className="w-4 h-4" />
                Manage Library
              </Button>
              {onOpenComicManagement && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenComicManagement(comics)}
                  className="gap-2"
                >
                  <Edit className="w-4 h-4" />
                  ComicInfo
                </Button>
              )}

              {/* Display mode toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newMode = displayMode === 'comicbook' ? 'comictree' : 'comicbook';
                  setDisplayMode(newMode);
                  
                  // Save the new display mode to settings
                  saveDisplayMode(newMode);
                  
                  if (newMode === 'comictree' && filteredComics.length > 0) {
                    // Auto-select first comic when switching to tree mode
                    setSelectedComicIndex(0);
                    setSelectedComics(new Set([filteredComics[0].id]));
                  } else {
                    // Reset selection when switching to comicbook mode
                    setSelectedComics(new Set());
                    setSelectedComicIndex(-1);
                  }
                }}
                disabled={isScanning}
                className={`gap-2 ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isScanning ? 'Please wait for scanning to complete before switching modes' : ''}
              >
                {displayMode === 'comicbook' ? '📚 ComicBook' : '🌳 ComicTree'}
                {isScanning && <span className="text-xs text-muted-foreground ml-1">(Wait)</span>}
              </Button>

              {/* Dark mode toggle - moved to last position */}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Toggle theme"
                onClick={() => {
                  // Cycle dark mode and persist to settings.json
                  const next = resolvedTheme === 'dark' ? 'light' : 'dark';
                  setTheme(next);
                  (async () => {
                    try {
                      const current = await fileStorage.getSettings();
                      await fileStorage.setSettings({
                        ...(current || {}),
                        darkMode: next === 'dark'
                      });
                      console.log('🔵 ComicsLibrary: Dark mode saved to settings.json:', next === 'dark');
                    } catch (err) {
                      console.error('🔵 ComicsLibrary: Failed to save dark mode:', err);
                    }
                  })();
                }}
                className="ml-2"
              >
                {resolvedTheme === 'dark' ? <Moon className="w-5 h-5" /> : resolvedTheme === 'light' ? <Sun className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="container mx-auto px-6 py-6 bg-slate-900 dark:bg-slate-950">
        <div className="space-y-4">
          {/* Scanning Status - Prominent Display */}
          {isScanning && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-200">Scanning Directory...</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Please wait while the app scans your external drive. 
                    <span className="font-semibold text-red-600 dark:text-red-400 ml-1">
                      Avoid switching display modes during scanning to prevent conflicts.
                    </span>
                  </p>
                  {scanResult && (
                    <div className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                      <span className="font-medium">Progress:</span> Found {scanResult.comics.length} comics so far...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Directory Status */}
          {mainDirectory && (
            <div className="bg-manga-surface p-3 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Directory: <span className="font-mono text-foreground">{mainDirectory}</span>
                  </span>
                </div>
                {scanResult && (
                  <span className="text-xs text-muted-foreground">
                    {scanResult.totalComics} comics found
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Search Panel */}
          <SearchFilter
            searchText={searchText}
            onSearchTextChange={setSearchText}
            selectedGenres={selectedGenres}
            onSelectedGenresChange={setSelectedGenres}
            availableGenres={availableGenres}
            onClearFilters={handleClearSearch}
            filteredCount={filteredComics.length}
            totalCount={comics.length}
            className="bg-manga-surface border-border"
          />

          {/* Genre Filters (legacy, can remove if not needed) */}
          {/*
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_GENRES.map(genre => (
              <Button
                key={genre}
                variant={selectedGenres.includes(genre) ? "default" : "outline"}
                size="sm"
                onClick={() => handleGenreToggle(genre)}
                className="text-xs"
              >
                {genre}
              </Button>
            ))}
          </div>
          */}
        </div>
      </div>

      {/* Comics Display - Toggle between ComicBook and ComicTree modes */}
      <div className="container mx-auto px-6 pb-8 bg-slate-900 dark:bg-slate-950">
        {/* Bottom padding to extend dark background */}
        <div className="h-8 bg-slate-900 dark:bg-slate-950"></div>
        {filteredComics.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchText || selectedGenres.length > 0
                ? "No comics found matching your search criteria."
                : "No comics found. Set your main directory to get started."}
            </p>
          </div>
        ) : displayMode === 'comicbook' ? (
          /* ComicBook Mode - Current grid layout */
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {filteredComics.map(comic => (
              <ComicList
                key={comic.id}
                comic={comic}
                onSelect={handleComicSelect}
              />
            ))}
          </div>
        ) : (
          /* ComicTree Mode - Three-column layout */
          <div className="grid grid-cols-12 gap-4 h-96">
            {/* Left Column - Treeview */}
            <div className="col-span-4 border border-border rounded-lg bg-card p-4 overflow-y-auto" ref={treeViewRef}>
              <h3 className="text-lg font-semibold mb-4 text-center">Treeview</h3>
              <div className="space-y-1">
                {filteredComics.length === 0 ? (
                  <div className="text-muted-foreground text-center py-8">
                    <div className="text-2xl mb-2">🔍</div>
                    <div className="text-sm">No comics match your search</div>
                  </div>
                ) : (
                  filteredComics.map((comic, index) => (
                    <div
                      key={comic.id}
                      data-comic-index={index}
                      className={`p-2 rounded cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground ${
                        selectedComicIndex === index ? 'bg-accent text-accent-foreground ring-2 ring-ring' : ''
                      }`}
                      onClick={async () => {
                        console.log('🔵 ComicsLibrary: Treeview comic clicked:', comic.id, comic.title);
                        setSelectedComicIndex(index);
                        setSelectedComics(new Set([comic.id]));
                        
                        // Save the selected comic to settings immediately when clicked
                        console.log('🔵 ComicsLibrary: Calling saveLastSelectedComic with:', comic.id);
                        await saveLastSelectedComic(comic.id);
                        console.log('🔵 ComicsLibrary: saveLastSelectedComic completed');
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">📚</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate" title={comic.displayTitle || comic.title}>
                            {comic.displayTitle || comic.title}
                          </div>
                        </div>
                        {selectedComicIndex === index && (
                          <span className="text-xs text-accent-foreground">▶</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Middle Column - Image Thumbnail */}
            <div className="col-span-3 border border-border rounded-lg bg-card p-4 flex items-center justify-center">
              {selectedComics.size > 0 ? (
                (() => {
                  const selectedComic = filteredComics.find(comic => selectedComics.has(comic.id));
                  return selectedComic ? (
                    <div className="w-full h-full flex items-center justify-center">
                      {selectedComic.coverImage ? (
                        <img 
                          src={selectedComic.coverImage} 
                          alt={selectedComic.title}
                          className="max-w-full max-h-full object-contain rounded"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder.svg';
                          }}
                        />
                      ) : (
                        <div className="text-center">
                          <div className="text-4xl mb-2">📚</div>
                          <div className="text-sm text-muted-foreground">No Cover</div>
                        </div>
                      )}
                    </div>
                  ) : null;
                })()
              ) : (
                <div className="text-center">
                  <div className="text-4xl mb-2">🖼️</div>
                  <div className="text-sm text-muted-foreground">Select a comic</div>
                </div>
              )}
            </div>

            {/* Right Column - Comic Info */}
            <div className="col-span-5 border border-border rounded-lg bg-card p-4">
              <h3 className="text-lg font-semibold mb-4 text-center">Comic Info</h3>
              {selectedComics.size > 0 ? (
                (() => {
                  const selectedComic = filteredComics.find(comic => selectedComics.has(comic.id));
                  return selectedComic ? (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Title</Label>
                        <div className="font-medium text-sm">{selectedComic.title}</div>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Author</Label>
                        <div className="text-sm">{selectedComic.author || 'Unknown'}</div>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                        <div className="text-sm">{selectedComic.description || 'No description available'}</div>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Genres</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {formatGenres(selectedComic.comicGenres).length > 0 ? (
                            formatGenres(selectedComic.comicGenres).map((genre, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {genre}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">No genres assigned</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Pages</Label>
                        <div className="text-sm">{selectedComic.currentPage || 1} / {selectedComic.totalPages || 'Unknown'}</div>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Last Read</Label>
                        <div className="text-sm">
                          {selectedComic.lastRead 
                            ? new Date(selectedComic.lastRead).toLocaleDateString()
                            : 'Never read'
                          }
                        </div>
                      </div>
                      <Button 
                        className="w-full mt-4"
                        onClick={() => handleComicSelect(selectedComic)}
                      >
                        Open Comic
                      </Button>
                    </div>
                  ) : null;
                })()
              ) : (
                <div className="text-muted-foreground text-center py-8">
                  <div className="text-2xl mb-2">📖</div>
                  <div className="text-sm">Select a comic from the tree</div>
                </div>
                )}
            </div>
          </div>
        )}
      </div>

      {/* Directory Settings Modal */}
      {showDirectorySettings && (
        <DirectorySettings
          currentDirectory={mainDirectory}
          onDirectoryChange={handleDirectoryChange}
          onClose={() => setShowDirectorySettings(false)}
          onRefresh={handleRefresh}
        />
      )}

      {/* Library Manager Modal */}
      {showLibraryManager && (
        <DirectorySettings
          currentDirectory={mainDirectory}
          onDirectoryChange={handleDirectoryChange}
          onClose={() => setShowLibraryManager(false)}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
};

export default ComicsLibrary;