import { useState } from "react";
import ComicsLibrary from "@/components/ComicsLibrary";
import ComicReader from "@/components/ComicReader";
import { Comic } from "@/types/comic";

const Index = () => {
  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);
  const [isReading, setIsReading] = useState(false);

  const handleComicSelect = (comic: Comic) => {
    setSelectedComic(comic);
    setIsReading(true);
  };

  const handleCloseReader = () => {
    setIsReading(false);
    setSelectedComic(null);
  };

  const handlePageChange = (pageNumber: number) => {
    if (selectedComic) {
      // Update the comic's current page
      // In a real app, this would persist to local storage or database
      console.log(`Updated ${selectedComic.title} to page ${pageNumber}`);
    }
  };

  if (isReading && selectedComic) {
    return (
      <ComicReader
        comic={selectedComic}
        onClose={handleCloseReader}
        onPageChange={handlePageChange}
      />
    );
  }

  return (
    <ComicsLibrary onComicSelect={handleComicSelect} />
  );
};

export default Index;
