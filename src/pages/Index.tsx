import { useState, useEffect } from "react";
import ComicsLibrary from "@/components/ComicsLibrary";
import ComicReader from "@/components/ComicReader";
import ComicCard from "@/components/ComicCard";
import { Comic } from "@/types/comic";
import { fileStorage } from "@/utils/fileStorage";

const Index = () => {
  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isComicManagement, setIsComicManagement] = useState(false);
  const [comics, setComics] = useState<Comic[]>([]);

  // Test Electron API on component mount
  useEffect(() => {
    if (window.electronAPI) {
      console.log('✅ Electron API available:', Object.keys(window.electronAPI));
      console.log('✅ readDirectory available:', typeof window.electronAPI.readDirectory);
    } else {
      console.error('❌ Electron API not available');
    }
  }, []);

  // TEST BUTTON: Save all LocalStorage data to Electron JSON files
  // handleTestSave removed - now using fileStorage directly

  const handleComicSelect = async (comic: Comic) => {
    // Load saved reading progress for this comic
    const savedProgress = await fileStorage.getReadingProgress();
    const comicProgress = savedProgress[comic.id];
    if (comicProgress) {
      comic.currentPage = comicProgress.currentPage;
      comic.lastRead = comicProgress.lastRead;
    }
    // Update lastReadDate to now when entering reading mode
    comic.lastReadDate = new Date().toISOString();
    comic.lastRead = new Date();
    // Optionally, persist this change if needed (e.g., saveReadingProgress)
    const currentProgress = await fileStorage.getReadingProgress();
    currentProgress[comic.id] = {
      currentPage: comic.currentPage,
      lastRead: new Date()
    };
    await fileStorage.setReadingProgress(currentProgress);
    setSelectedComic(comic);
    setIsReading(true);
  };

  const handleCloseReader = () => {
    console.log('🔵 Index: handleCloseReader called, setting isReading to false');
    setIsReading(false);
    // Don't clear selectedComic - keep it for selection preservation
  };

  const handleOpenComicManagement = (comicsList: Comic[]) => {
    setComics(comicsList);
    setIsComicManagement(true);
  };

  const handleCloseComicManagement = () => {
    setIsComicManagement(false);
  };

  const handleComicUpdate = async (comicId: string, updates: Partial<Comic>) => {
    setComics(prevComics => 
      prevComics.map(comic => 
        comic.id === comicId ? { ...comic, ...updates } : comic
      )
    );
    
    // The ComicCard component now handles saving using the new storage system
    // This function just updates the local state for immediate UI feedback
    console.log('✅ Comic updated in local state');
  };

  const handlePageChange = async (pageNumber: number) => {
    if (selectedComic) {
      // Update the comic's current page
      selectedComic.currentPage = pageNumber;
      // Save reading progress to localStorage
      const currentProgress = await fileStorage.getReadingProgress();
      currentProgress[selectedComic.id] = {
        currentPage: pageNumber,
        lastRead: new Date()
      };
      await fileStorage.setReadingProgress(currentProgress);
      console.log(`Updated ${selectedComic.title} to page ${pageNumber}`);
    }
  };

  return (
    <>
      {/* Always render ComicsLibrary but hide it when reading or managing */}
      <div style={{ display: isReading || isComicManagement ? 'none' : 'block' }}>
        <ComicsLibrary 
          onComicSelect={handleComicSelect}
          onOpenComicManagement={handleOpenComicManagement}
          selectedComicId={selectedComic?.id}
          isVisible={!isReading && !isComicManagement}
        />
      </div>

      {/* Render ComicReader when reading */}
      {isReading && selectedComic && (
        <ComicReader
          comic={selectedComic}
          onClose={handleCloseReader}
          onPageChange={handlePageChange}
        />
      )}

      {/* Render ComicCard when managing */}
      {isComicManagement && (
        <ComicCard
          comic={comics[0]}
          comics={comics}
          onUpdate={handleComicUpdate}
          onBack={handleCloseComicManagement}
        />
      )}
    </>
  );
};

export default Index;
