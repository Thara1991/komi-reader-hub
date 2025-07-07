import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Comic, ComicPage } from "@/types/comic";

interface ComicReaderProps {
  comic: Comic;
  onClose: () => void;
  onPageChange: (pageNumber: number) => void;
}

const ComicReader = ({ comic, onClose, onPageChange }: ComicReaderProps) => {
  const [currentPage, setCurrentPage] = useState(comic.currentPage);
  const [pages, setPages] = useState<ComicPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock page loading - in real app would load from file system
  useEffect(() => {
    const mockPages: ComicPage[] = Array.from({ length: comic.totalPages }, (_, i) => ({
      pageNumber: i + 1,
      imagePath: "/placeholder.svg", // Would be actual page image paths
      isLoaded: true
    }));
    setPages(mockPages);
    setIsLoading(false);
  }, [comic]);

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

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (event.key === "ArrowRight" || event.key === " ") {
      event.preventDefault();
      goToNextPage();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToPreviousPage();
    } else if (event.key === "Escape") {
      onClose();
    }
  }, [goToNextPage, goToPreviousPage, onClose]);

  useEffect(() => {
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
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-manga-surface border-b border-border">
        <Button variant="outline" onClick={onClose} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Library
        </Button>
        
        <div className="text-center">
          <h2 className="font-semibold">{comic.title}</h2>
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {comic.totalPages}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage === comic.totalPages}
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Page Content */}
      <div className="flex-1 flex items-center justify-center p-4 bg-black/20">
        <div className="relative max-w-full max-h-full">
          <img
            src={currentPageData.imagePath}
            alt={`Page ${currentPage}`}
            className="max-w-full max-h-full object-contain cursor-pointer"
            onClick={handleImageClick}
            draggable={false}
          />
          
          {/* Navigation Hints */}
          <div className="absolute inset-0 flex">
            <div className="w-1/2 flex items-center justify-start pl-8 opacity-0 hover:opacity-100 transition-opacity">
              <div className="bg-black/50 text-white px-3 py-1 rounded text-sm">
                ← Previous
              </div>
            </div>
            <div className="w-1/2 flex items-center justify-end pr-8 opacity-0 hover:opacity-100 transition-opacity">
              <div className="bg-black/50 text-white px-3 py-1 rounded text-sm">
                Next →
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-manga-surface border-t border-border">
        <div className="flex justify-center">
          <div className="bg-black/20 rounded-full px-4 py-2">
            <div className="w-64 bg-black/30 rounded-full h-2">
              <div
                className="bg-manga-gradient h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentPage / comic.totalPages) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComicReader;