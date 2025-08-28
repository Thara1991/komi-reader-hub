export type Genre = 
  | "Action" 
  | "Adventure" 
  | "Comedy" 
  | "Drama" 
  | "Fantasy"
  | "Horror" 
  | "Romance" 
  | "Sci-Fi" 
  | "Slice of Life" 
  | "School"
  | "Mystery"
  | "Thriller"
  | "Psychological"
  | "Supernatural"
  | "Historical"
  | "Sports"
  | "Music"
  | "Cooking"
  | "Medical"
  | "Military"
  | "Martial Arts"
  | "Isekai"
  | "Harem"
  | "Yaoi"
  | "Yuri"
  | "Ecchi"
  | "Mature"
  | "Gore"
  | "Tragedy"
  | "Parody";

// Scalable Comic Genre Configuration
export const COMIC_GENRE_TYPES = {
  protagonist: {
    key: 'protagonist',
    label: 'Protagonist',
    description: 'Main character genres',
    color: 'blue',
    order: 1
  },
  antagonist: {
    key: 'antagonist', 
    label: 'Antagonist',
    description: 'Villain/opposition genres',
    color: 'pink',
    order: 2
  },
  supporting: {
    key: 'supporting',
    label: 'Supporting', 
    description: 'Side character genres',
    color: 'purple',
    order: 3
  },
  narrative: {
    key: 'narrative',
    label: 'Narrative',
    description: 'Story/genre themes',
    color: 'green', 
    order: 4
  }
} as const;

// Type for Comic Genre keys
export type ComicGenreType = keyof typeof COMIC_GENRE_TYPES;

// Type for Comic Genre values
export type ComicGenreValue = typeof COMIC_GENRE_TYPES[ComicGenreType];

// Comic Genres interface using the configuration
export type ComicGenres = {
  [K in ComicGenreType]?: string[];
}

// Genre Catalog Configuration  
export const GENRE_CATALOG_TYPES = {
  personality: {
    key: 'personality',
    label: 'Personality',
    description: 'Character traits (shy, brave, timid, etc.)',
    color: 'blue',
    order: 1
  },
  verb: {
    key: 'verb',
    label: 'Verb', 
    description: 'Action-based genres (fighting, killing, abusing, etc.)',
    color: 'green',
    order: 2
  },
  plot: {
    key: 'plot',
    label: 'Plot',
    description: 'Story themes (comedy, fantasy, horror, etc.)',
    color: 'yellow',
    order: 3
  }
} as const;

// Type for Genre Catalog keys
export type GenreCatalogType = keyof typeof GENRE_CATALOG_TYPES;

// Genre Catalog interface using the configuration
export type GenreCatalog = {
  [K in GenreCatalogType]?: string[];
}

export interface Comic {
  id: string;
  title: string;
  displayTitle?: string; // Full path for display (e.g., "Author A / Spider-Man")
  author?: string; // Auto-detected from parent folder
  groupAuthor?: string;
  genres: Genre[];
  comicGenres?: ComicGenres; // New detailed genre system
  genre?: string; // Single genre for display (legacy)
  tags?: string[];
  description?: string;
  releaseDate?: Date;
  lastRead: Date;
  lastReadPage?: number;
  lastReadDate?: string;
  coverImage: string;
  totalPages: number;
  currentPage: number;
  folderPath: string;
  pages?: string[]; // Array of image URLs for each page
  depth?: number; // Folder depth in the directory structure
}

export interface ComicPage {
  pageNumber: number;
  imagePath: string;
  isLoaded: boolean;
}