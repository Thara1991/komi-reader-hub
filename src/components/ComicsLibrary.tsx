import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Folder, Edit } from "lucide-react";
import ComicCard from "./ComicCard";
import DirectorySettings from "./DirectorySettings";
import { Comic, Genre } from "@/types/comic";
import dragonQuestCover from "@/assets/dragon-quest-cover.jpg";
import mysticAcademyCover from "@/assets/mystic-academy-cover.jpg";
import spaceWarriorsCover from "@/assets/space-warriors-cover.jpg";

const SAMPLE_COMICS: Comic[] = [
  {
    id: "1",
    title: "Dragon's Quest",
    author: "Akira Toriyama",
    genres: ["Action", "Fantasy"],
    coverImage: dragonQuestCover,
    totalPages: 45,
    currentPage: 12,
    lastRead: new Date("2024-01-15"),
    folderPath: "/comics/dragons-quest"
  },
  {
    id: "2", 
    title: "Mystic Academy",
    author: "Naoko Takeuchi",
    genres: ["Fantasy", "School"],
    coverImage: mysticAcademyCover,
    totalPages: 32,
    currentPage: 1,
    lastRead: new Date("2024-01-10"),
    folderPath: "/comics/mystic-academy"
  },
  {
    id: "3",
    title: "Space Warriors",
    author: "Eiichiro Oda", 
    genres: ["Sci-Fi", "Action"],
    coverImage: spaceWarriorsCover,
    totalPages: 28,
    currentPage: 28,
    lastRead: new Date("2024-01-20"),
    folderPath: "/comics/space-warriors"
  }
];

const AVAILABLE_GENRES: Genre[] = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", 
  "Horror", "Romance", "Sci-Fi", "Slice of Life", "School"
];

interface ComicsLibraryProps {
  onComicSelect: (comic: Comic) => void;
}

const ComicsLibrary = ({ onComicSelect }: ComicsLibraryProps) => {
  const [comics, setComics] = useState<Comic[]>(SAMPLE_COMICS);
  const [filteredComics, setFilteredComics] = useState<Comic[]>(SAMPLE_COMICS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>([]);
  const [showDirectorySettings, setShowDirectorySettings] = useState(false);
  const [mainDirectory, setMainDirectory] = useState("");

  // Filter comics based on search and genre filters
  useEffect(() => {
    let filtered = comics;

    if (searchQuery) {
      filtered = filtered.filter(comic =>
        comic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comic.author.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedGenres.length > 0) {
      filtered = filtered.filter(comic =>
        comic.genres.some(genre => selectedGenres.includes(genre))
      );
    }

    setFilteredComics(filtered);
  }, [comics, searchQuery, selectedGenres]);

  const handleGenreToggle = (genre: Genre) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handleDirectoryChange = (directory: string) => {
    setMainDirectory(directory);
    // Here you would scan the directory for comic folders
    console.log("Scanning directory:", directory);
  };

  return (
    <div className="min-h-screen bg-background">
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
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Edit className="w-4 h-4" />
              Manage Library
            </Button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="container mx-auto px-6 py-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search comics by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-manga-surface border-border"
            />
          </div>

          {/* Genre Filters */}
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
        </div>
      </div>

      {/* Comics Grid */}
      <div className="container mx-auto px-6 pb-8">
        {filteredComics.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery || selectedGenres.length > 0
                ? "No comics found matching your search criteria."
                : "No comics found. Set your main directory to get started."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {filteredComics.map(comic => (
              <ComicCard
                key={comic.id}
                comic={comic}
                onSelect={onComicSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* Directory Settings Modal */}
      {showDirectorySettings && (
        <DirectorySettings
          currentDirectory={mainDirectory}
          onDirectoryChange={handleDirectoryChange}
          onClose={() => setShowDirectorySettings(false)}
        />
      )}
    </div>
  );
};

export default ComicsLibrary;