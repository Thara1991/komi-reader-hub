import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Maximize2, Minimize2, RotateCcw, ScrollText, RefreshCw, Edit } from "lucide-react";
import { Comic, ComicPage, ComicGenreType } from "@/types/comic";
import { getComicGenreTypes, getComicGenreKeys, createEmptyComicGenres } from "@/lib/genreUtils";
import { fileStorage } from "@/utils/fileStorage";

interface ComicReaderProps {
  comic: Comic;
  onClose: () => void;
  onPageChange: (pageNumber: number) => void;
}

const READING_MODE_KEY = 'komi-reader-reading-mode';

const ComicReader = ({ comic, onClose, onPageChange }: ComicReaderProps) => {
  const [currentPage, setCurrentPage] = useState(comic.currentPage);
  const [pages, setPages] = useState<ComicPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fitMode] = useState<'fit-width' | 'fit-height' | 'fit-screen' | 'original'>('fit-screen');
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoFullscreen, setAutoFullscreen] = useState(false);
  const [escPressCount, setEscPressCount] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const [readingMode, setReadingMode] = useState<'classic' | 'webtoon'>('classic');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showGoUp, setShowGoUp] = useState(false);
  const [showGoDown, setShowGoDown] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Edit Comic State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<Comic>>({});
  const [availableGenres, setAvailableGenres] = useState<{ personality: string[]; verb: string[]; plot: string[] }>({
    personality: [],
    verb: [],
    plot: []
  });
  const [selectedComicType, setSelectedComicType] = useState<ComicGenreType>('protagonist');
  const [showGenreAssignment, setShowGenreAssignment] = useState(false);

  // Update current page when comic changes
  useEffect(() => {
    setCurrentPage(comic.currentPage);
  }, [comic.currentPage]);

  // Load real pages from comic data
  useEffect(() => {
    const loadPages = async () => {
      if (comic.folderPath && comic.totalPages > 0) {
        // Check if we have real page data
        if (comic.pages && comic.pages.length > 0) {
          // Create pages from the comic's page data (already has file:// protocol)
          const realPages: ComicPage[] = Array.from({ length: comic.totalPages }, (_, i) => ({
            pageNumber: i + 1,
            imagePath: comic.pages[i] || `/placeholder.svg`,
            isLoaded: true
          }));
          realPages.forEach(page => console.log('Reader image src:', page.imagePath));
          setPages(realPages);
          setIsLoading(false);
        } else {
          // Fallback to mock pages if no real data
          const mockPages: ComicPage[] = Array.from({ length: comic.totalPages }, (_, i) => ({
            pageNumber: i + 1,
            imagePath: "/placeholder.svg",
            isLoaded: true
          }));
          setPages(mockPages);
          setIsLoading(false);
        }
      } else {
        // Fallback to mock pages if no real data
        const mockPages: ComicPage[] = Array.from({ length: comic.totalPages }, (_, i) => ({
          pageNumber: i + 1,
          imagePath: "/placeholder.svg",
          isLoaded: true
        }));
        setPages(mockPages);
        setIsLoading(false);
      }
    };

    loadPages();
  }, [comic]);

  // On mount, load reader mode and auto fullscreen from settings.json
  useEffect(() => {
    (async () => {
      try {
        const settings = await fileStorage.getSettings();
        const mode = settings?.readerMode;
        if (mode === 'webtoon') setReadingMode('webtoon');
        else if (mode === 'classic' || mode === 'page' || mode === 'page-to-page') setReadingMode('classic');
        
        // Load auto fullscreen setting
        const autoFs = settings?.autoFullscreen;
        if (autoFs === true) {
          setAutoFullscreen(true);
        }
      } catch (err) {
        // ignore
      }
    })();
  }, []);

  // Load available genres for edit form
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

  // Persist reader mode to settings.json whenever it changes
  useEffect(() => {
    (async () => {
      try {
        const current = await fileStorage.getSettings();
        await fileStorage.setSettings({
          ...(current || {}),
          readerMode: readingMode
        });
        console.log('🔵 ComicReader: Reader mode saved to settings.json:', readingMode);
      } catch (err) {
        console.error('🔵 ComicReader: Failed to save reader mode:', err);
      }
    })();
  }, [readingMode]);

  // Auto-enter fullscreen if setting is enabled (only on initial mount)
  useEffect(() => {
    if (autoFullscreen && !isFullscreen) {
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        enterFullscreen();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFullscreen]); // Removed isFullscreen dependency

  // Reset ESC count when state changes
  useEffect(() => {
    setEscPressCount(0);
  }, [isFullscreen, readingMode]);



  const toggleAutoFullscreen = useCallback(async () => {
    const newValue = !autoFullscreen;
    setAutoFullscreen(newValue);
    
    // Save to settings.json
    try {
      const current = await fileStorage.getSettings();
      await fileStorage.setSettings({
        ...(current || {}),
        autoFullscreen: newValue
      });
      console.log('🔵 ComicReader: Auto fullscreen setting saved to settings.json:', newValue);
    } catch (err) {
      console.error('🔵 ComicReader: Failed to save auto fullscreen setting:', err);
    }
  }, [autoFullscreen]);

  // Edit Comic Functions
  const openEditModal = useCallback(() => {
    // Initialize comicGenres if they don't exist
    const initialComicGenres = comic.comicGenres || {
      protagonist: [],
      antagonist: [],
      supporting: [],
      narrative: []
    };
    
    setEditData({
      title: comic.title,
      author: comic.author,
      description: comic.description,
      genres: comic.genres,
      comicGenres: initialComicGenres
    });
    setIsEditModalOpen(true);
  }, [comic]);

  const handleSaveEdit = useCallback(async () => {
    try {
      console.log('🔵 ComicReader: Starting save process...');
      console.log('🔵 ComicReader: Original comic data:', comic);
      console.log('🔵 ComicReader: Edit data:', editData);
      console.log('🔵 ComicReader: window.electronAPI available:', !!(window as any).electronAPI);
      console.log('🔵 ComicReader: window.electronAPI.isElectron:', (window as any).electronAPI?.isElectron);
      console.log('🔵 ComicReader: fileStorage instance:', fileStorage);
      console.log('🔵 ComicReader: fileStorage.isElectron():', fileStorage.isElectron());
      
      // Wait a bit for fileStorage to be fully initialized
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Ensure we have the required fields for ComicData
      const updatedComic = {
        id: comic.id,
        title: editData.title || comic.title,
        author: editData.author || comic.author,
        description: editData.description || comic.description,
        genre: undefined, // Remove old genre field
        comicGenres: editData.comicGenres || comic.comicGenres || {
          protagonist: [],
          antagonist: [],
          supporting: [],
          narrative: []
        },
        coverImage: comic.coverImage,
        totalPages: comic.totalPages,
        currentPage: comic.currentPage,
        folderPath: comic.folderPath,
        lastRead: comic.lastRead,
        pages: comic.pages
      };
      
      console.log('🔵 ComicReader: Updated comic data to save:', updatedComic);
      
      const saveSuccess = await fileStorage.saveComic(updatedComic);
      console.log('🔵 ComicReader: Save result:', saveSuccess);
      
      if (saveSuccess) {
        console.log('🔵 ComicReader: Comic metadata saved successfully');
        setIsEditModalOpen(false);
        // Optionally refresh the comic data or notify parent
      } else {
        throw new Error('Failed to save comic');
      }
    } catch (error) {
      console.error('🔵 ComicReader: Failed to save comic metadata:', error);
    }
  }, [comic, editData]);

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
      updatedEditData: updatedEditData
    });
    
    setEditData(updatedEditData);
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

  const rotateImage = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const goToNextPage = useCallback(() => {
    if (currentPage < comic.totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      onPageChange(newPage);
    }
  }, [currentPage, comic.totalPages, onPageChange]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      onPageChange(newPage);
    }
  }, [currentPage, onPageChange]);

  const goToFirstPage = useCallback(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
      onPageChange(1);
    }
  }, [currentPage, onPageChange]);

  const goToLastPage = useCallback(() => {
    if (currentPage !== comic.totalPages) {
      setCurrentPage(comic.totalPages);
      onPageChange(comic.totalPages);
    }
  }, [currentPage, comic.totalPages, onPageChange]);

  // Fullscreen API handlers
  const enterFullscreen = useCallback(() => {
    if (containerRef.current && !isFullscreen) {
      setIsFullscreen(true);
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      }
    }
  }, [isFullscreen]);

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
    // Force exit fullscreen from all possible states
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      (document as any).mozCancelFullScreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
  }, []);

  // Listen for fullscreen change
  useEffect(() => {
    const handleFsChange = () => {
      // Check all possible fullscreen states
      const isFullscreenNow = !!(document.fullscreenElement || 
        (document as any).webkitFullscreenElement || 
        (document as any).mozFullScreenElement || 
        (document as any).msFullscreenElement);
      
      setIsFullscreen(isFullscreenNow);
      console.log('🔵 ComicReader: Fullscreen state changed to:', isFullscreenNow);
    };
    
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  // Webtoon scroll handler
  useEffect(() => {
    if (readingMode !== 'webtoon') return;
    const handleScroll = () => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      setShowGoUp(scrollTop > clientHeight * 0.5);
      setShowGoDown(scrollTop < scrollHeight - clientHeight * 1.5);
    };
    const el = scrollContainerRef.current;
    if (el) el.addEventListener('scroll', handleScroll);
    return () => { if (el) el.removeEventListener('scroll', handleScroll); };
  }, [readingMode]);

  // Hotkey: W to toggle reading mode
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (event.key === "ArrowRight" || event.key === " ") {
      event.preventDefault();
      goToNextPage();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToPreviousPage();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      goToFirstPage();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      goToLastPage();
    } else if (event.key === "Escape") {
      if (isFullscreen) {
        exitFullscreen();
      } else {
        onClose();
      }
    } else if (event.key === "f" || event.key === "F") {
      event.preventDefault();
      if (isFullscreen) {
        console.log('🔵 ComicReader: F key pressed, exiting fullscreen');
        exitFullscreen();
      } else {
        console.log('🔵 ComicReader: F key pressed, entering fullscreen');
        enterFullscreen();
      }
    } else if (event.key === "r" || event.key === "R") {
      event.preventDefault();
      rotateImage();
    } else if (event.key === 'w' || event.key === 'W') {
      event.preventDefault();
      setReadingMode((m) => (m === 'classic' ? 'webtoon' : 'classic'));
    } else if (event.key === "Enter") {
      event.preventDefault();
      console.log('🔵 ComicReader: Enter key pressed, calling onClose()');
      onClose();
    }

    
  }, [goToNextPage, goToPreviousPage, goToFirstPage, goToLastPage, onClose, isFullscreen, enterFullscreen, exitFullscreen, rotateImage]);

  useEffect(() => {
    // ComicReader is always active when mounted, so always listen for keys
    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  const handleImageClick = (event: React.MouseEvent<HTMLImageElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const imageWidth = rect.width;
    
    // Click on left half goes to previous page, right half goes to next page
    if (clickX < imageWidth / 2) {
      goToPreviousPage();
    } else {
      goToNextPage();
    }
  };

  const getImageClassName = () => {
    const baseClasses = "cursor-pointer transition-all duration-300";
    
    switch (fitMode) {
      case 'fit-width':
        return `${baseClasses} w-full h-auto max-h-full object-contain`;
      case 'fit-height':
        return `${baseClasses} h-full w-auto max-w-full object-contain`;
      case 'fit-screen':
        return `${baseClasses} max-w-full max-h-full object-contain`;
      case 'original':
        return `${baseClasses} object-none`;
      default:
        return `${baseClasses} max-w-full max-h-full object-contain`;
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Use Electron API to re-scan the comic's directory
      if (comic.folderPath) {
        const result = await window.electronAPI.readDirectory(comic.folderPath);
        if (result.comics && result.comics.length > 0) {
          // Find the matching comic (by folder name)
          const updated = result.comics.find(c => c.title === comic.title || c.folderPath === comic.folderPath);
          if (updated) {
            // Update pages and metadata (already has file:// protocol)
            const realPages = Array.from({ length: updated.totalPages }, (_, i) => ({
              pageNumber: i + 1,
              imagePath: updated.pages[i] || `/placeholder.svg`,
              isLoaded: true
            }));
            setPages(realPages);
            setIsLoading(false);
          }
        }
      }
    } catch (error) {
      console.error('Failed to refresh comic folder:', error);
    }
    setIsRefreshing(false);
  }, [comic]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading comic...</p>
        </div>
      </div>
    );
  }

  const currentPageData = pages[currentPage - 1];

  return (
    <div ref={containerRef} className={`fixed inset-0 bg-background z-50 flex flex-col${isFullscreen ? ' fullscreen' : ''}`}>
      {/* Top right page number in fullscreen (classic mode only) */}
      {isFullscreen && readingMode === 'classic' && (
        <div className="absolute top-4 right-4 z-[100] select-none pointer-events-none">
          <div className="bg-black/70 text-white px-3 py-1 rounded shadow text-lg font-bold">
            Page {currentPage} / {comic.totalPages}
          </div>
        </div>
      )}
      {/* Header (hidden in fullscreen classic mode) */}
      {(!isFullscreen || readingMode === 'webtoon') && (
        <div className="flex items-center justify-between px-4 py-2 bg-black/80 backdrop-blur-sm border-b border-white/10">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose} 
            className="h-8 px-3 text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/20 mb-1">
              <span className="text-white/90 font-medium text-sm">
                {currentPage} / {comic.totalPages}
              </span>
            </div>
            <div className="text-xs text-white/70">
              ↑ First • ← Previous • → Next • ↓ Last • F: Fullscreen • W: Webtoon • R: Rotate • Esc: Close
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Full Screen Mode Toggle */}
            <Button
              variant={autoFullscreen ? "default" : "ghost"}
              size="sm"
              onClick={toggleAutoFullscreen}
              title={`Auto Fullscreen: ${autoFullscreen ? 'ON' : 'OFF'}`}
              className={`h-8 px-3 text-white/90 hover:text-white transition-all duration-200 ${
                autoFullscreen 
                  ? 'bg-white/20 hover:bg-white/30 text-white' 
                  : 'hover:bg-white/10'
              }`}
            >
              <Maximize2 className="w-4 h-4 mr-1" />
              {autoFullscreen ? 'ON' : 'OFF'}
            </Button>
            
            {/* Reading Mode Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReadingMode((m) => (m === 'classic' ? 'webtoon' : 'classic'))}
              title="Toggle Mode (W)"
              className="h-8 w-8 p-0 text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              <ScrollText className="w-4 h-4" />
            </Button>
            
            {/* Edit Comic Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={openEditModal}
              title="Edit Comic Info"
              className="h-8 px-3 text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
            
            {/* Navigation Controls */}
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              title="Previous (←)"
              className="h-8 w-8 p-0 text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200 disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === comic.totalPages}
              title="Next (→)"
              className="h-8 w-8 p-0 text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200 disabled:opacity-50"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
            

            
            {/* Fullscreen Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={isFullscreen ? exitFullscreen : enterFullscreen}
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
              className="h-8 w-8 p-0 text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
      {/* Page Content */}
      {readingMode === 'classic' ? (
        <div className="flex-1 flex items-center justify-center p-4 bg-black/20 overflow-hidden">
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={currentPageData.imagePath}
              alt={`Page ${currentPage}`}
              className={getImageClassName()}
              onClick={handleImageClick}
              draggable={false}
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 0.3s ease-in-out'
              }}
            />
          </div>
        </div>
      ) : (
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-black/20 p-4 relative">
          <div className="max-w-3xl mx-auto flex flex-col gap-0">
            {pages.map((page, idx) => (
              <img
                key={page.pageNumber}
                src={page.imagePath}
                alt={`Page ${page.pageNumber}`}
                className="w-full h-auto object-contain rounded shadow"
                draggable={false}
                style={{ background: '#222' }}
              />
            ))}
          </div>
          {/* Go Up/Down buttons */}
          {showGoUp && (
            <Button
              className="fixed bottom-24 right-8 z-[100] animate-fade-in"
              variant="default"
              size="icon"
              onClick={() => { scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }}
              title="Go to Top"
            >
              <ArrowUp className="w-6 h-6" />
            </Button>
          )}
          {showGoDown && (
            <Button
              className="fixed top-24 right-8 z-[100] animate-fade-in"
              variant="default"
              size="icon"
              onClick={() => {
                const el = scrollContainerRef.current;
                if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
              }}
              title="Go to Bottom"
            >
              <ArrowDown className="w-6 h-6" />
            </Button>
          )}
        </div>
      )}

      {/* Edit Comic Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Comic: {editData.title || 'Untitled'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editData.title || ''}
                onChange={(e) => setEditData({...editData, title: e.target.value})}
                placeholder="Enter comic title"
              />
            </div>

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
                                : 'bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/40 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700'
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
                                : 'bg-yellow-100 dark:bg-blue-900/20 hover:bg-yellow-200 dark:hover:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700'
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
              </div>
            </div>

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

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleClearComicGenres}
                className="mr-auto"
              >
                Clear Comic Genres
              </Button>
              <Button
                onClick={handleSaveEdit}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default ComicReader;