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
  | "School";

export interface Comic {
  id: string;
  title: string;
  author?: string;
  genres: Genre[];
  tags?: string[];
  releaseDate?: Date;
  lastRead: Date;
  coverImage: string;
  totalPages: number;
  currentPage: number;
  folderPath: string;
}

export interface ComicPage {
  pageNumber: number;
  imagePath: string;
  isLoaded: boolean;
}