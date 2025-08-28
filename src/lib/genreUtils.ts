import { COMIC_GENRE_TYPES, GENRE_CATALOG_TYPES, ComicGenreType, GenreCatalogType } from '@/types/comic';

// Utility functions for Comic Genres
export const getComicGenreTypes = () => Object.values(COMIC_GENRE_TYPES);
export const getComicGenreType = (key: ComicGenreType) => COMIC_GENRE_TYPES[key];
export const getComicGenreKeys = () => Object.keys(COMIC_GENRE_TYPES) as ComicGenreType[];

// Utility functions for Genre Catalog
export const getGenreCatalogTypes = () => Object.values(GENRE_CATALOG_TYPES);
export const getGenreCatalogType = (key: GenreCatalogType) => GENRE_CATALOG_TYPES[key];
export const getGenreCatalogKeys = () => Object.keys(GENRE_CATALOG_TYPES) as GenreCatalogType[];

// Helper to get ordered arrays
export const getOrderedComicGenreTypes = () => 
  getComicGenreTypes().sort((a, b) => a.order - b.order);

export const getOrderedGenreCatalogTypes = () => 
  getGenreCatalogTypes().sort((a, b) => a.order - b.order);

// Helper to create empty genre structures
export const createEmptyComicGenres = () => {
  const empty: Record<ComicGenreType, string[]> = {} as Record<ComicGenreType, string[]>;
  getComicGenreKeys().forEach(key => {
    empty[key] = [];
  });
  return empty;
};

export const createEmptyGenreCatalog = () => {
  const empty: Record<GenreCatalogType, string[]> = {} as Record<GenreCatalogType, string[]>;
  getGenreCatalogKeys().forEach(key => {
    empty[key] = [];
  });
  return empty;
};

// Helper to get genre type by label
export const getComicGenreTypeByLabel = (label: string): ComicGenreType | undefined => {
  return getComicGenreTypes().find(type => type.label === label)?.key;
};

export const getGenreCatalogTypeByLabel = (label: string): GenreCatalogType | undefined => {
  return getGenreCatalogTypes().find(type => type.label === label)?.key;
};

// Helper to get color for styling
export const getComicGenreColor = (key: ComicGenreType) => COMIC_GENRE_TYPES[key].color;
export const getGenreCatalogColor = (key: GenreCatalogType) => GENRE_CATALOG_TYPES[key].color;
