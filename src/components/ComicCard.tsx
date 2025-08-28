import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Folder, RefreshCw, Edit, Save, X, Check, Moon, Sun, Laptop } from "lucide-react";
import { Comic, ComicGenreType } from "@/types/comic";
import { getComicGenreTypes, getComicGenreKeys, createEmptyComicGenres } from "@/lib/genreUtils";
import { fileStorage } from "@/utils/fileStorage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTheme } from 'next-themes';
import GenreManager from "./GenreManager";
import SearchFilter from "./SearchFilter";
import { useAutoRefreshMetadata } from '@/hooks/useAutoRefreshMetadata';

interface ComicCardProps {
  comic: Comic;
  comics?: Comic[];
  onUpdate: (comicId: string, updates: Partial<Comic>) => Promise<void>;
  onBack: () => void;
}

const ComicCard = ({ comic, comics, onUpdate, onBack }: ComicCardProps) => {
  const [mainDirectory, setMainDirectory] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [comicList, setComicList] = useState<Comic[]>(comics || [comic]);
  
  // Update local comicList when comics prop changes
  useEffect(() => {
    if (comics && comics.length > 0) {
      setComicList(comics);
      console.log('📚 ComicCard: Updated comicList from props:', comics.length, 'comics');
    }
  }, [comics]);
  const [editingComicId, setEditingComicId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Comic>>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showGenreManager, setShowGenreManager] = useState(false);
  const [showGenreAssignment, setShowGenreAssignment] = useState(false);
  const [selectedComicType, setSelectedComicType] = useState<ComicGenreType>('protagonist');
  const [availableGenres, setAvailableGenres] = useState<{ personality: string[]; verb: string[]; plot: string[] }>({
    personality: [],
    verb: [],
    plot: []
  });
  const [selectedComics, setSelectedComics] = useState<Set<string>>(new Set());
  const [isBulkEditing, setIsBulkEditing] = useState(false);

  // Search and filter state
  const [searchText, setSearchText] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [excludedGenres, setExcludedGenres] = useState<string[]>([]); // New state for excluded genres
  const [genreFilterMode, setGenreFilterMode] = useState<'any' | 'all'>('any'); // New state for genre filtering mode
  const [genreFilter, setGenreFilter] = useState<{ category: string; genre: string; shouldFilter?: boolean } | null>(null);

  const [settings, setSettings] = useState<any>({});
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Computed values for search and filtering
  const filteredComics = comicList.filter(comic => {
    // Text search
    const textMatch = !searchText || 
      comic.title?.toLowerCase().includes(searchText.toLowerCase()) ||
      comic.author?.toLowerCase().includes(searchText.toLowerCase()) ||
      comic.description?.toLowerCase().includes(searchText.toLowerCase());
    
    // Genre filters - find comics with selected genres based on filter mode
    let genreMatch = true;
    if (selectedGenres.length > 0) {
      if (genreFilterMode === 'all') {
        // Match ALL: Comic must have ALL selected genres
        genreMatch = selectedGenres.every(selectedGenre => {
          return Object.values(comic.comicGenres || {}).some(genreList => 
            Array.isArray(genreList) && genreList.includes(selectedGenre)
          );
        });
      } else {
        // Match ANY: Comic must have AT LEAST ONE of the selected genres (current behavior)
        genreMatch = selectedGenres.some(selectedGenre => {
          return Object.values(comic.comicGenres || {}).some(genreList => 
            Array.isArray(genreList) && genreList.includes(selectedGenre)
          );
        });
      }
    }
    
    // Exclude comics with excluded genres
    if (excludedGenres.length > 0) {
      const hasExcludedGenre = excludedGenres.some(excludedGenre => {
        return Object.values(comic.comicGenres || {}).some(genreList => 
          Array.isArray(genreList) && genreList.includes(excludedGenre)
        );
      });
      if (hasExcludedGenre) {
        genreMatch = false;
      }
    }
    
    return textMatch && genreMatch;
  });

  const hasActiveFilters = searchText || selectedGenres.length > 0;

  // Clear all search filters
  const clearAllFilters = () => {
    setSearchText('');
    setSelectedGenres([]);
    setExcludedGenres([]);
  };

  // Toggle genre selection
  const toggleGenreSelection = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  // Remove specific genre selection
  const removeGenreSelection = (genre: string) => {
    setSelectedGenres(prev => prev.filter(g => g !== genre));
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    // Save to settings
    (async () => {
      try {
        const current = await fileStorage.getSettings();
        await fileStorage.setSettings({
          ...(current || {}),
          darkMode: next === 'dark'
        });
        console.log('🔵 ComicCard: Dark mode saved to settings.json:', next === 'dark');
      } catch (err) {
        console.error('🔵 ComicCard: Failed to save dark mode:', err);
      }
    })();
  };



  // Handle opening Library Manager with genre filter
  const handleOpenLibraryManagerWithFilter = (filter: { category: string; genre: string; shouldFilter?: boolean }) => {
    if (filter.shouldFilter) {
      // Automatically set up the search filter for this genre
      setSearchText(''); // Clear any existing text search
      setSelectedGenres([filter.genre]); // Set the genre as the only filter
    }
    setGenreFilter(filter);
  };

  // Load saved settings on component mount
  useEffect(() => {
    const loadSettingsData = async () => {
      const settingsData = await fileStorage.getSettings();
      setSettings(settingsData);
      if (settingsData.mainDirectory) {
        setMainDirectory(settingsData.mainDirectory);
      }
    };
    loadSettingsData();
  }, []);

  // Load available genres from GenreManager
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

  // Handle genre updates from GenreManager
  const handleGenresChange = (newGenres: { personality: string[]; verb: string[]; plot: string[] }) => {
    setAvailableGenres(newGenres);
    console.log('🔄 ComicCard: Genres updated from GenreManager:', newGenres);
  };


  // Reset filters when comic list changes
  useEffect(() => {
    if (comics && comics.length > 0) {
      // Only reset if we have new comics (not just the same list)
      if (comics.length !== comicList.length) {
        clearAllFilters();
      }
    }
  }, [comics]);

  // Clear selections when filters change (so selected comics are always visible)
  useEffect(() => {
    if (selectedComics.size > 0) {
      const visibleComicIds = new Set(filteredComics.map(comic => comic.id));
      const hasInvisibleSelected = Array.from(selectedComics).some(id => !visibleComicIds.has(id));
      
      if (hasInvisibleSelected) {
        // Clear selections if any selected comics are no longer visible
        setSelectedComics(new Set());
      }
    }
  }, [filteredComics, selectedComics]);

  // Auto-apply genre filter when component loads with shouldFilter flag
  useEffect(() => {
    if (genreFilter?.shouldFilter && genreFilter.genre) {
      setSearchText('');
      setSelectedGenres([genreFilter.genre]);
      // Clear the shouldFilter flag after applying
      setGenreFilter(prev => prev ? { ...prev, shouldFilter: false } : null);
    }
  }, [genreFilter]);

  const handleScanDirectory = async () => {
    if (!mainDirectory) return;
    setIsScanning(true);
    try {
      const result = await window.electronAPI.readDirectory(mainDirectory);
      
      // Convert folder scan results to comics with saved metadata
      const convertedComicsPromises = result.comics.map(async (comicFolder) => {
        // Load saved metadata for this comic from JSON files
        let metadata = null;
        try {
          metadata = await fileStorage.getComic(comicFolder.id);
          console.log(`📖 Loaded metadata for ${comicFolder.title}:`, metadata);
        } catch (error) {
          console.log(`📖 No saved metadata found for ${comicFolder.title}, using defaults`);
        }
        
        return {
          id: comicFolder.id,
          title: metadata?.title || comicFolder.title,
          author: metadata?.author || "Unknown",
          genre: metadata?.genre,
          comicGenres: metadata?.comicGenres,
          description: metadata?.description,
          coverImage: comicFolder.coverImage || '/placeholder.svg',
          totalPages: comicFolder.totalPages,
          currentPage: 1,
          lastRead: comicFolder.lastModified,
          folderPath: comicFolder.folderPath,
          pages: comicFolder.pages
        };
      });
      
      const convertedComics = await Promise.all(convertedComicsPromises);
      
      // Merge with existing comicList to preserve any unsaved changes
      const mergedComics = convertedComics.map(convertedComic => {
        const existingComic = comicList.find(c => c.id === convertedComic.id);
        if (existingComic) {
          // Preserve any local changes that haven't been saved yet
          return {
            ...convertedComic,
            // Keep any local state that might be different
            currentPage: existingComic.currentPage || convertedComic.currentPage,
            lastRead: existingComic.lastRead || convertedComic.lastRead
          };
        }
        return convertedComic;
      });
      
      setComicList(mergedComics);
      console.log('✅ Refreshed comic list with saved metadata and preserved local state');
    } catch (error) {
      console.error("Failed to scan directory:", error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleEdit = (comic: Comic) => {
    setEditingComicId(comic.id);
    setIsBulkEditing(false); // Ensure single edit mode
    setEditData({
      title: comic.title,
      author: comic.author,
      description: comic.description,
      comicGenres: comic.comicGenres || {
        protagonist: [],
        antagonist: [],
        supporting: [],
        narrative: []
      }
    });
    setIsEditModalOpen(true);
  };

  const toggleGenre = (genre: string) => {
    // Initialize comicGenres if it doesn't exist
    const currentGenres = editData.comicGenres || {
      protagonist: [],
      antagonist: [],
      supporting: [],
      narrative: []
    };
    
    const current = currentGenres[selectedComicType] || [];
    const newValue = current.includes(genre)
      ? current.filter(g => g !== genre)
      : [...current, genre];
    
    const updatedEditData = {
      ...editData,
      comicGenres: {
        ...currentGenres,
        [selectedComicType]: newValue
      }
    };
    
    console.log(`🔄 Toggling genre "${genre}" for ${selectedComicType}:`, {
      current: current,
      newValue: newValue,
      updatedEditData: updatedEditData,
      isBulkEditing: isBulkEditing,
      currentGenres: currentGenres
    });
    
    setEditData(updatedEditData);
  };

  const handleSave = async (comicId: string) => {
    setIsSaving(true);
    try {
      if (isBulkEditing) {
        // Bulk edit mode - apply changes to all selected comics
        const selectedComicIds = Array.from(selectedComics);
        
        console.log('🔄 Bulk editing comics:', {
          selectedComicIds: selectedComicIds,
          editData: editData,
          selectedComics: Array.from(selectedComics).map(id => 
            comicList.find(c => c.id === id)?.title
          )
        });
        
        for (const id of selectedComicIds) {
          const currentComic = comicList.find(c => c.id === id);
          if (currentComic) {
            // Create updated comic data (without title changes) with proper genre migration
            const updatedComic = {
              ...currentComic,
              ...editData,
              // Remove the old genre field and ensure comicGenres is properly structured
              genre: undefined, // Remove old genre field
              comicGenres: {
                protagonist: editData.comicGenres?.protagonist || [],
                antagonist: editData.comicGenres?.antagonist || [],
                supporting: editData.comicGenres?.supporting || [],
                narrative: editData.comicGenres?.narrative || []
              }
              // Note: title is not included in bulk edits to avoid folder renaming issues
            };

            // Save the individual comic to JSON file first
            console.log(`💾 Saving comic ${id} to file system:`, updatedComic);
            const saveSuccess = await fileStorage.saveComic(updatedComic);
            if (!saveSuccess) {
              throw new Error(`Failed to save comic ${id}`);
            }
            console.log(`✅ Successfully saved comic ${id} to file system`);
            
            // Verify the save by reading back the comic
            const savedComic = await fileStorage.getComic(id);
            if (!savedComic) {
              throw new Error(`Failed to verify saved comic ${id}`);
            }
            console.log(`✅ Verified save for comic ${id}:`, savedComic);
            
            // Update local state
            setComicList(prevList =>
              prevList.map(comic =>
                comic.id === id ? updatedComic : comic
              )
            );
            
            // Call the parent update function with the full updated comic data for UI sync
            await onUpdate(id, updatedComic);
          }
        }
        
        console.log(`✅ Bulk edited ${selectedComicIds.length} comics successfully`);
        console.log('📝 Changes applied:', editData);
        console.log('💾 Final comic list state:', comicList);
        
        // Close the modal and reset states
        setIsBulkEditing(false);
        setEditData({});
        setIsEditModalOpen(false);
        setSelectedComics(new Set()); // Clear selection after bulk edit
        
      } else {
        // Single comic edit mode
        const currentComic = comicList.find(c => c.id === comicId);
        if (!currentComic) {
          throw new Error('Comic not found');
        }

        // Check if title has changed (for folder renaming)
        const titleChanged = currentComic.title !== editData.title;
        let newFolderPath = currentComic.folderPath;

        // If title changed, rename the folder first
        if (titleChanged && editData.title) {
          console.log(`🔄 Title changed from "${currentComic.title}" to "${editData.title}"`);
          
          // Rename the folder
          newFolderPath = await fileStorage.renameComicFolder(
            currentComic.title,
            editData.title,
            currentComic.folderPath
          );
          
          if (newFolderPath) {
            console.log(`✅ Folder renamed successfully to: ${newFolderPath}`);
          } else {
            console.warn('⚠️ Folder rename failed, but continuing with save');
          }
        }

        // Create updated comic data with proper genre migration
        const updatedComic = {
          ...currentComic,
          ...editData,
          folderPath: newFolderPath || currentComic.folderPath,
          // Remove the old genre field and ensure comicGenres is properly structured
          genre: undefined, // Remove old genre field
          comicGenres: {
            protagonist: editData.comicGenres?.protagonist || [],
            antagonist: editData.comicGenres?.antagonist || [],
            supporting: editData.comicGenres?.supporting || [],
            narrative: editData.comicGenres?.narrative || []
          }
        };

        console.log('💾 Saving comic with data:', {
          currentComic: currentComic,
          editData: editData,
          updatedComic: updatedComic
        });

        // Save the individual comic using the new storage system
        const saveSuccess = await fileStorage.saveComic(updatedComic);
        
        if (saveSuccess) {
          // Update the local state with the complete updated comic data
          await onUpdate(comicId, updatedComic);
          
          // Update local comicList state to reflect changes immediately
          setComicList(prevList =>
            prevList.map(comic =>
              comic.id === comicId ? updatedComic : comic
            )
          );
          
          // Close the modal
          setEditingComicId(null);
          setEditData({});
          setIsEditModalOpen(false);
          
          console.log('✅ Comic saved successfully with new storage system');
        } else {
          throw new Error('Failed to save comic');
        }
      }
    } catch (error) {
      console.error('Failed to save comic:', error);
      // You could add a toast notification here if you want to show errors to the user
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingComicId(null);
    setEditData({});
    setIsEditModalOpen(false);
    setIsBulkEditing(false);
  };

  const handleClearComicGenres = () => {
    if (confirm('⚠️ Clear all genres for this comic?\n\nThis will remove all assigned genres from the selected comic type and cannot be undone.\n\nAre you sure you want to continue?')) {
      // Clear genres for the currently selected comic type
      setEditData(prev => ({
        ...prev,
        comicGenres: {
          ...prev.comicGenres,
          [selectedComicType]: []
        }
      }));
      console.log(`🧹 Cleared genres for ${selectedComicType} type`);
    }
  };

  const formatGenres = (genres: any) => {
    if (!genres) return {};
    
    return {
      protagonist: genres.protagonist || [],
      antagonist: genres.antagonist || [],
      supporting: genres.supporting || [],
      narrative: genres.narrative || []
    };
  };

  // Auto-refresh metadata when form becomes visible
  useAutoRefreshMetadata({
    mainDirectory: comic.folderPath,
    onMetadataRefreshed: (updatedComics) => {
      // Find the updated comic data
      const updatedComic = updatedComics.find(c => c.id === comic.id);
      if (updatedComic) {
        // Update the comic data with latest metadata
        setEditData(prev => ({
          ...prev,
          ...updatedComic,
          comicGenres: updatedComic.comicGenres || prev.comicGenres
        }));
        
        // Also update available genres
        if (updatedComic.comicGenres) {
          setAvailableGenres(prev => ({
            ...prev,
            ...updatedComic.comicGenres
          }));
        }
      }
    },
    enabled: true
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-40 px-6 py-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowGenreManager(true)}
              className="gap-2"
            >
              <Edit className="w-4 h-4" />
              Manage Genres
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedComics.size === filteredComics.length) {
                  // If all filtered comics are selected, deselect all
                  setSelectedComics(new Set());
                } else {
                  // If not all filtered comics are selected, select all filtered comics
                  setSelectedComics(new Set(filteredComics.map(comic => comic.id)));
                }
              }}
              className="gap-2"
            >
              {selectedComics.size === filteredComics.length ? (
                <>
                  <X className="w-4 h-4" />
                  Deselect All ({selectedComics.size})
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Select All ({filteredComics.length})
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                if (selectedComics.size > 0) {
                  setIsBulkEditing(true);
                  // Initialize with empty comicGenres structure for bulk edit
                  setEditData({
                    comicGenres: {
                      protagonist: [],
                      antagonist: [],
                      supporting: [],
                      narrative: []
                    }
                  });
                  setIsEditModalOpen(true);
                }
              }}
              className="gap-2"
              disabled={selectedComics.size === 0}
            >
              <Edit className="w-4 h-4" />
              Bulk Edit ({selectedComics.size})
            </Button>

            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={toggleDarkMode}
              className="ml-2"
            >
              {resolvedTheme === 'dark' ? <Moon className="w-5 h-5" /> : resolvedTheme === 'light' ? <Sun className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">
            Comic List
            {hasActiveFilters && (
              <span className="text-lg font-normal text-gray-600 ml-3">
                (Filtered Results)
              </span>
            )}
          </h1>
          

        </div>
        
        {/* Advanced Search Section */}
        <SearchFilter
          searchText={searchText}
          onSearchTextChange={setSearchText}
          selectedGenres={selectedGenres}
          onSelectedGenresChange={setSelectedGenres}
          excludedGenres={excludedGenres}
          onExcludedGenresChange={setExcludedGenres}
          availableGenres={availableGenres}
          onClearFilters={clearAllFilters}
          filteredCount={filteredComics.length}
          totalCount={comicList.length}
          className="mb-6 shadow-lg"
          genreFilterMode={genreFilterMode}
          onGenreFilterModeChange={setGenreFilterMode}
        />
            
            {/* Active Filter Tags */}
            {hasActiveFilters && (
              <div className="flex gap-2">
                {searchText && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                    Text: "{searchText}"
                    <button
                      onClick={() => setSearchText('')}
                      className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      ×
                    </button>
                  </span>
                )}

              </div>
            )}
        
        {/* Directory Status */}
        {mainDirectory && (
          <div className="bg-manga-surface p-3 rounded-lg border border-border mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Directory: <span className="font-mono text-foreground">{mainDirectory}</span>
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleScanDirectory}
                disabled={isScanning}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                {isScanning ? 'Scanning...' : 'Refresh'}
              </Button>
            </div>
          </div>
        )}

        {/* Comics List */}
        <div className="space-y-3">
        {filteredComics.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {comicList.length === 0 
                ? 'No comics found. Set your main directory to get started.'
                : 'No comics match your current search criteria. Try adjusting your filters.'
              }
            </p>
          </div>
        ) : (
          filteredComics.map(comic => {
            const genres = formatGenres(comic.comicGenres);
            
            return (
              <div 
                key={comic.id} 
                className={`border border-border rounded-lg overflow-hidden relative cursor-pointer transition-all duration-200 ${
                  selectedComics.has(comic.id) ? 'bg-yellow-200' : 'bg-card'
                }`}
                onClick={() => {
                  const newSelected = new Set(selectedComics);
                  if (selectedComics.has(comic.id)) {
                    newSelected.delete(comic.id);
                  } else {
                    newSelected.add(comic.id);
                  }
                  setSelectedComics(newSelected);
                }}
              >
                <div className="flex min-h-48">
                  {/* Left Section - Thumbnail */}
                  <div className={`w-48 h-48 flex items-center justify-center flex-shrink-0 ${
                    selectedComics.has(comic.id) ? 'bg-yellow-200' : 'bg-muted'
                  }`}>
                    {comic.coverImage ? (
                      <img 
                        src={comic.coverImage} 
                        alt={comic.title}
                        className="w-full h-full object-contain rounded-sm"
                        style={{ maxWidth: '100%', maxHeight: '100%' }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.svg';
                        }}
                      />
                    ) : (
                      <div className="text-muted-foreground text-center p-4">
                        <div className="text-4xl mb-2">📚</div>
                        <div className="text-sm">No Cover</div>
                      </div>
                    )}
                  </div>

                  {/* Right Section - Details */}
                  <div className="flex-1 flex">
                    <div className="flex-1 p-4 flex flex-col gap-2">
                      {/* Top Row - Title */}
                      <div className={`border rounded p-2 ${
                        resolvedTheme === 'dark' 
                          ? 'bg-slate-800 border-slate-700' 
                          : 'bg-blue-50 border-blue-200'
                      }`}>
                        <Label className={`text-xs font-medium ${
                          resolvedTheme === 'dark' ? 'text-slate-300' : 'text-blue-800'
                        }`}>Title</Label>
                        <div className={`font-medium text-sm leading-tight ${
                          resolvedTheme === 'dark' ? 'text-slate-100' : 'text-blue-900'
                        }`}>{comic.title}</div>
                      </div>

                      {/* Middle Row - Author and Description */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Author */}
                        <div className={`border rounded p-2 ${
                          resolvedTheme === 'dark' 
                            ? 'bg-slate-800 border-slate-700' 
                            : 'bg-yellow-50 border-yellow-200'
                        }`}>
                          <Label className={`text-xs font-medium ${
                            resolvedTheme === 'dark' ? 'text-slate-300' : 'text-yellow-800'
                          }`}>Author</Label>
                          <div className={`text-xs leading-tight ${
                            resolvedTheme === 'dark' ? 'text-slate-100' : 'text-yellow-900'
                          }`}>{comic.author || 'Unknown'}</div>
                        </div>

                        {/* Description */}
                        <div className={`border rounded p-2 ${
                          resolvedTheme === 'dark' 
                            ? 'bg-slate-800 border-slate-700' 
                            : 'bg-orange-50 border-orange-200'
                        }`}>
                          <Label className={`text-xs font-medium ${
                            resolvedTheme === 'dark' ? 'text-slate-300' : 'text-orange-800'
                          }`}>Description</Label>
                          <div className={`text-xs leading-tight line-clamp-1 ${
                            resolvedTheme === 'dark' ? 'text-slate-100' : 'text-orange-900'
                          }`}>{comic.description || 'No description available'}</div>
                        </div>
                      </div>

                      {/* Bottom Row - Genres */}
                      <div className={`border rounded p-2 ${
                        resolvedTheme === 'dark' 
                          ? 'bg-slate-800 border-slate-700' 
                          : 'bg-green-50 border-green-200'
                      }`}>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {/* First Column */}
                          <div>
                            <span className={`font-medium ${
                              resolvedTheme === 'dark' ? 'text-slate-300' : 'text-green-700'
                            }`}>Protagonist:</span>
                            <span className={`ml-1 ${
                              resolvedTheme === 'dark' ? 'text-slate-100' : 'text-green-900'
                            }`}>
                              {genres.protagonist?.length > 0 ? genres.protagonist.join(', ') : 'None'}
                            </span>
                          </div>
                          <div>
                            <span className={`font-medium ${
                              resolvedTheme === 'dark' ? 'text-slate-300' : 'text-green-900'
                            }`}>Antagonist:</span>
                            <span className={`ml-1 ${
                              resolvedTheme === 'dark' ? 'text-slate-100' : 'text-green-900'
                            }`}>
                              {genres.antagonist?.length > 0 ? genres.antagonist.join(', ') : 'None'}
                            </span>
                          </div>
                          
                          {/* Second Column */}
                          <div>
                            <span className={`font-medium ${
                              resolvedTheme === 'dark' ? 'text-slate-300' : 'text-green-900'
                            }`}>Supporting:</span>
                            <span className={`ml-1 ${
                              resolvedTheme === 'dark' ? 'text-slate-100' : 'text-green-900'
                            }`}>
                              {genres.supporting?.length > 0 ? genres.supporting.join(', ') : 'None'}
                            </span>
                          </div>
                          <div>
                            <span className={`font-medium ${
                              resolvedTheme === 'dark' ? 'text-slate-300' : 'text-green-900'
                            }`}>Narrative:</span>
                            <span className={`ml-1 ${
                              resolvedTheme === 'dark' ? 'text-slate-100' : 'text-green-900'
                            }`}>
                              {genres.narrative?.length > 0 ? genres.narrative.join(', ') : 'None'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Edit Button */}
                    <div className="w-16 bg-muted border-l border-border flex items-center justify-center flex-shrink-0">
                      <Button
                        variant="ghost"
                        onClick={() => handleEdit(comic)}
                        className="w-10 h-8"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isBulkEditing 
                ? `Bulk Edit ${selectedComics.size} Comics` 
                : `Edit Comic: ${editData.title || 'Untitled'}`
              }
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Title - Hidden during bulk edit */}
            {!isBulkEditing && (
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={editData.title || ''}
                  onChange={(e) => setEditData({...editData, title: e.target.value})}
                  placeholder="Enter comic title"
                />
              </div>
            )}

            {/* Author */}
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={editData.author || ''}
                onChange={(e) => setEditData({...editData, author: e.target.value})}
                placeholder="Enter author name"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editData.description || ''}
                onChange={(e) => setEditData({...editData, description: e.target.value})}
                placeholder="Enter comic description"
                rows={3}
              />
            </div>

            {/* Genre Selection Area */}
            <div className="space-y-4">
              <div className="space-y-3">
                {/* Genre Management Header */}
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Genres</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGenreAssignment(!showGenreAssignment)}
                    className="text-xs"
    
                  >
                    {showGenreAssignment ? 'Hide Genres' : 'Manage Genres'}
                  </Button>
                </div>

                {/* Genre Selection Interface */}
                {showGenreAssignment && (
                  <div className="border rounded-lg p-4 bg-card border-border">
                    {/* Comic Type Dropdown */}
                    <div className="mb-4">
                      <Label className="text-sm font-medium mb-2 block">Select Comic Type:</Label>
                      <select
                        value={selectedComicType}
                        onChange={(e) => setSelectedComicType(e.target.value as any)}
                        className="w-full p-2 border rounded-md bg-background border-border focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                      >
                        <option value="protagonist" className="bg-background">Protagonist Genres</option>
                        <option value="antagonist" className="bg-background">Antagonist Genres</option>
                        <option value="supporting" className="bg-background">Supporting Genres</option>
                        <option value="narrative" className="bg-background">Narrative Genres</option>
                      </select>
                    </div>

                    {/* Available Genres - All in One Group */}
                    <div className="mb-4">
                      <Label className="text-sm font-medium mb-2 block">Available Genres:</Label>
                      <div className="flex flex-wrap gap-2">
                        {/* Personality Genres - Light Blue */}
                        {availableGenres.personality.map(genre => (
                          <Button
                            key={genre}
                            type="button"
                            size="sm"
                            variant={editData.comicGenres?.[selectedComicType]?.includes(genre) ? "default" : "outline"}
                            onClick={() => toggleGenre(genre)}
                            className={`text-xs px-2 py-1 h-6 ${
                              editData.comicGenres?.[selectedComicType]?.includes(genre) 
                                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                : 'bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                            }`}
                          >
                            {genre}
                          </Button>
                        ))}

                        {/* Verb Genres - Green */}
                        {availableGenres.verb.map(genre => (
                          <Button
                            key={genre}
                            type="button"
                            size="sm"
                            variant={editData.comicGenres?.[selectedComicType]?.includes(genre) ? "default" : "outline"}
                            onClick={() => toggleGenre(genre)}
                            className={`text-xs px-2 py-1 h-6 ${
                              editData.comicGenres?.[selectedComicType]?.includes(genre) 
                                ? 'bg-green-600 hover:bg-green-700 text-white' 
                                : 'bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/40 text-green-800 dark:text-blue-200 border-green-300 dark:border-green-700'
                            }`}
                          >
                            {genre}
                          </Button>
                        ))}

                        {/* Plot Genres - Dark Yellow */}
                        {availableGenres.plot.map(genre => (
                          <Button
                            key={genre}
                            type="button"
                            size="sm"
                            variant={editData.comicGenres?.[selectedComicType]?.includes(genre) ? "default" : "outline"}
                            onClick={() => toggleGenre(genre)}
                            className={`text-xs px-2 py-1 h-6 ${
                              editData.comicGenres?.[selectedComicType]?.includes(genre) 
                                ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                                : 'bg-yellow-100 dark:bg-yellow-900/20 hover:bg-yellow-200 dark:hover:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700'
                            }`}
                          >
                            {genre}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Selected Genres for Current Type */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        Selected for {selectedComicType === 'protagonist' ? 'Protagonist' : 
                                   selectedComicType === 'antagonist' ? 'Antagonist' : 
                                   selectedComicType === 'supporting' ? 'Supporting' : 'Narrative'}:
                      </Label>
                      <div className="p-2 bg-muted rounded border border-border min-h-[2.5rem] flex items-center">
                        {editData.comicGenres?.[selectedComicType] && editData.comicGenres[selectedComicType].length > 0 ? (
                          <span className="text-sm">{editData.comicGenres[selectedComicType].join(', ')}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">No genres selected</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Genre Display - Always Visible */}
                <div className="space-y-2">
                  {/* Protagonist Genres */}
                  <div className="space-y-1">
                    <Label className="text-sm text-blue-600 dark:text-blue-400">Protagonist Genres</Label>
                    <div className="p-2 bg-muted rounded border border-border min-h-[2.5rem] flex items-center">
                      {editData.comicGenres?.protagonist && editData.comicGenres.protagonist.length > 0 ? (
                        <span className="text-sm">{editData.comicGenres.protagonist.join(', ')}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">No genres assigned</span>
                        )}
                    </div>
                  </div>

                  {/* Antagonist Genres */}
                  <div className="space-y-1">
                    <Label className="text-sm text-pink-600 dark:text-pink-400">Antagonist Genres</Label>
                    <div className="p-2 bg-muted rounded border border-border min-h-[2.5rem] flex items-center">
                      {editData.comicGenres?.antagonist && editData.comicGenres.antagonist.length > 0 ? (
                        <span className="text-sm">{editData.comicGenres.antagonist.join(', ')}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">No genres assigned</span>
                      )}
                    </div>
                  </div>

                  {/* Supporting Genres */}
                  <div className="space-y-1">
                    <Label className="text-sm text-purple-600 dark:text-purple-400">Supporting Genres</Label>
                    <div className="p-2 bg-muted rounded border border-border min-h-[2.5rem] flex items-center">
                      {editData.comicGenres?.supporting && editData.comicGenres.supporting.length > 0 ? (
                        <span className="text-sm">{editData.comicGenres.supporting.join(', ')}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">No genres assigned</span>
                      )}
                    </div>
                  </div>

                  {/* Narrative Genres */}
                  <div className="space-y-1">
                    <Label className="text-sm text-green-600 dark:text-green-400">Narrative Genres</Label>
                    <div className="p-2 bg-muted rounded border border-border min-h-[2.5rem] flex items-center">
                      {editData.comicGenres?.narrative && editData.comicGenres.narrative.length > 0 ? (
                        <span className="text-sm">{editData.comicGenres.narrative.join(', ')}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">No genres assigned</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleClearComicGenres}
                className="mr-auto"
              >
                Clear Comic Genres
              </Button>
              <Button onClick={() => handleSave(editingComicId!)} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving 
                ? 'Saving...' 
                : isBulkEditing 
                  ? `Save to ${selectedComics.size} Comics` 
                  : 'Save Changes'
              }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Genre Manager Modal */}
      {showGenreManager && (
        <GenreManager 
          onClose={() => setShowGenreManager(false)}
          onOpenLibraryManager={handleOpenLibraryManagerWithFilter}
          onGenresChange={handleGenresChange}
        />
      )}




    </div>
  );
};

export default ComicCard; 