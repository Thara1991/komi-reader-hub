import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SearchFilterProps {
  searchText: string;
  onSearchTextChange: (text: string) => void;
  selectedGenres: string[];
  onSelectedGenresChange: (genres: string[]) => void;
  availableGenres: {
    personality: string[];
    plot: string[];
    verb: string[];
  };
  onClearFilters: () => void;
  filteredCount: number;
  totalCount: number;
  showAdvancedToggle?: boolean;
  className?: string;
  genreFilterMode?: 'any' | 'all';
  onGenreFilterModeChange?: (mode: 'any' | 'all') => void;
  excludedGenres?: string[];
  onExcludedGenresChange?: (genres: string[]) => void;
}

const SearchFilter: React.FC<SearchFilterProps> = ({
  searchText,
  onSearchTextChange,
  selectedGenres,
  onSelectedGenresChange,
  availableGenres,
  onClearFilters,
  filteredCount,
  totalCount,
  showAdvancedToggle = true,
  className = '',
  genreFilterMode = 'any',
  onGenreFilterModeChange,
  excludedGenres,
  onExcludedGenresChange
}) => {
  const [isSearchExpanded, setIsSearchExpanded] = useState(true); // Changed to true to show genres by default

  // Debug logging
  console.log('🔍 SearchFilter: Props received:', {
    availableGenres,
    selectedGenres,
    excludedGenres,
    onExcludedGenresChange: !!onExcludedGenresChange,
    isSearchExpanded
  });

  const toggleGenreSelection = (genre: string) => {
    if (!onExcludedGenresChange) return;
    
    const isIncluded = selectedGenres.includes(genre);
    const isExcluded = excludedGenres?.includes(genre) || false;
    
    if (!isIncluded && !isExcluded) {
      // First click: Include genre
      onSelectedGenresChange([...selectedGenres, genre]);
    } else if (isIncluded && !isExcluded) {
      // Second click: Exclude genre (remove from include, add to exclude)
      onSelectedGenresChange(selectedGenres.filter(g => g !== genre));
      onExcludedGenresChange([...(excludedGenres || []), genre]);
    } else if (isExcluded) {
      // Third click: Neutral (remove from exclude)
      onExcludedGenresChange(excludedGenres.filter(g => g !== genre));
    }
  };

  const removeGenreSelection = (genre: string) => {
    onSelectedGenresChange(selectedGenres.filter(g => g !== genre));
  };

  return (
    <div className={`bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Search</h3>
        {showAdvancedToggle && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20"
          >
            {isSearchExpanded ? 'Collapse' : 'Advanced Search'}
          </Button>
        )}
      </div>
      
      {/* Normal Mode - Simple Search */}
      <div className="mb-4">
        <Input
          placeholder="Search by title, author, or description..."
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          className="w-full focus:border-blue-400 bg-white dark:bg-slate-700 border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>
      
      {/* Expand Mode - Genre Selection */}
      {isSearchExpanded && (
        <div className="space-y-4">
          {/* All Available Genres as Buttons */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Select Genres (Multi-select)</Label>
              {/* Genre Filter Mode Toggle */}
              {onGenreFilterModeChange && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Filter mode:</span>
                  <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                    <button
                      onClick={() => onGenreFilterModeChange('any')}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        genreFilterMode === 'any'
                          ? 'bg-blue-500 text-white'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                      }`}
                    >
                      Match Any
                    </button>
                    <button
                      onClick={() => onGenreFilterModeChange('all')}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        genreFilterMode === 'all'
                          ? 'bg-blue-500 text-white'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                      }`}
                    >
                      Match All
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Compact Genre Layout - All genres in one section without category labels */}
            {(() => {
              console.log('🔍 SearchFilter: Rendering genres:', {
                personality: availableGenres.personality,
                plot: availableGenres.plot,
                verb: availableGenres.verb
              });
              return null;
            })()}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {/* Personality Genres - Blue */}
                {availableGenres.personality.map(genre => {
                  const isIncluded = selectedGenres.includes(genre);
                  const isExcluded = excludedGenres?.includes(genre) || false;
                  
                  let buttonClass = '';
                  if (isIncluded) {
                    buttonClass = 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600';
                  } else if (isExcluded) {
                    buttonClass = 'bg-red-600 hover:bg-red-700 text-white border-red-600';
                  } else {
                    buttonClass = 'bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700';
                  }
                  
                  return (
                    <Button
                      key={genre}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => toggleGenreSelection(genre)}
                      className={`text-xs px-2 py-1 h-6 ${buttonClass}`}
                    >
                      {genre}
                    </Button>
                  );
                })}
                
                {/* Plot Genres - Green */}
                {availableGenres.plot.map(genre => {
                  const isIncluded = selectedGenres.includes(genre);
                  const isExcluded = excludedGenres?.includes(genre) || false;
                  
                  let buttonClass = '';
                  if (isIncluded) {
                    buttonClass = 'bg-green-600 hover:bg-green-700 text-white border-green-600';
                  } else if (isExcluded) {
                    buttonClass = 'bg-red-600 hover:bg-red-700 text-white border-red-600';
                  } else {
                    buttonClass = 'bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/40 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700';
                  }
                  
                  return (
                    <Button
                      key={genre}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => toggleGenreSelection(genre)}
                      className={`text-xs px-2 py-1 h-6 ${buttonClass}`}
                    >
                      {genre}
                    </Button>
                  );
                })}
                
                {/* Verb Genres - Purple */}
                {availableGenres.verb.map(genre => {
                  const isIncluded = selectedGenres.includes(genre);
                  const isExcluded = excludedGenres?.includes(genre) || false;
                  
                  let buttonClass = '';
                  if (isIncluded) {
                    buttonClass = 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600';
                  } else if (isExcluded) {
                    buttonClass = 'bg-red-600 hover:bg-red-700 text-white border-red-600';
                  } else {
                    buttonClass = 'bg-purple-100 dark:bg-purple-900/20 hover:bg-purple-200 dark:hover:bg-purple-900/40 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700';
                  }
                  
                  return (
                    <Button
                      key={genre}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => toggleGenreSelection(genre)}
                      className={`text-xs px-2 py-1 h-6 ${buttonClass}`}
                    >
                      {genre}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
          

        </div>
      )}
      
      {/* Filter Status and Controls */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={onClearFilters}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Clear All Filters
            </Button>
            
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {filteredCount} comics
            </span>
          </div>
          
          {/* Active Genre Filters Display - Right Side */}
          {(selectedGenres.length > 0 || (excludedGenres && excludedGenres.length > 0)) && (
            <div className="flex items-center gap-2">
              {/* Included Genres */}
              {selectedGenres.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Include:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedGenres.map(genre => (
                      <span key={genre} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200">
                        {genre}
                        <button
                          onClick={() => removeGenreSelection(genre)}
                          className="ml-1.5 font-bold text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Excluded Genres */}
              {excludedGenres && excludedGenres.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Exclude:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {excludedGenres.map(genre => (
                      <span key={genre} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200">
                        {genre}
                        <button
                          onClick={() => onExcludedGenresChange?.(excludedGenres.filter(g => g !== genre))}
                          className="ml-1.5 font-bold text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchFilter;
