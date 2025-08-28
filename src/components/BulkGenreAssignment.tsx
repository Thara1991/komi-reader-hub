import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { X, Save, Check } from 'lucide-react';
import { fileStorage } from '@/utils/fileStorage';
import { Comic, ComicGenreType } from '@/types/comic';
import { getComicGenreTypes, getComicGenreKeys, createEmptyComicGenres } from '@/lib/genreUtils';
import { useAutoRefreshMetadata } from '@/hooks/useAutoRefreshMetadata';

interface BulkGenreAssignmentProps {
  selectedComicIds: string[];
  comics: Comic[];
  onClose: () => void;
  onUpdate: (comicId: string, updates: Partial<Comic>) => Promise<void>;
}

interface GenreCategories {
  [K in ComicGenreType]: string[];
}

interface AvailableGenres {
  personality: string[];
  verb: string[];
  plot: string[];
}

const BulkGenreAssignment: React.FC<BulkGenreAssignmentProps> = ({ 
  selectedComicIds, 
  comics, 
  onClose, 
  onUpdate 
}) => {
  const [availableGenres, setAvailableGenres] = useState<AvailableGenres>({
    personality: [],
    verb: [],
    plot: []
  });

  const [selectedGenres, setSelectedGenres] = useState<GenreCategories>(createEmptyComicGenres());

  const [isApplying, setIsApplying] = useState(false);

  // Load available genres
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

  // Toggle genre selection
  const toggleGenre = (category: keyof GenreCategories, genre: string) => {
    setSelectedGenres(prev => {
      const current = prev[category];
      const newValue = current.includes(genre)
        ? current.filter(g => g !== genre)
        : [...current, genre];
      
      return {
        ...prev,
        [category]: newValue
      };
    });
  };

  // Apply genres to selected comics
  const applyGenres = async () => {
    setIsApplying(true);
    
    try {
      for (const comicId of selectedComicIds) {
        const comic = comics.find(c => c.id === comicId);
        if (comic) {
          // Merge with existing genres
          const existingGenres = comic.comicGenres || {};
          const updatedGenres = createEmptyComicGenres();
          getComicGenreKeys().forEach(key => {
            updatedGenres[key] = [
              ...(existingGenres[key] || []), 
              ...(selectedGenres[key] || [])
            ];
          });

          // Remove duplicates
          getComicGenreKeys().forEach(key => {
            updatedGenres[key] = [...new Set(updatedGenres[key])];
          });

          await onUpdate(comicId, { comicGenres: updatedGenres });
        }
      }

      console.log(`✅ Applied genres to ${selectedComicIds.length} comics`);
      onClose();
    } catch (error) {
      console.error('❌ Failed to apply genres:', error);
    } finally {
      setIsApplying(false);
    }
  };



  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Bulk Genre Assignment</h2>
            <p className="text-gray-300">
              Assign genres to {selectedComicIds.length} selected comics
            </p>
          </div>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Selected Comics Preview */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <div className="flex flex-wrap gap-2">
            {selectedComicIds.map(id => {
              const comic = comics.find(c => c.id === id);
              return (
                <Badge key={id} variant="secondary" className="bg-gray-700 text-white border-gray-600">
                  {comic?.title || id}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Genre Selection */}
        <div className="space-y-6">
          {Object.entries(availableGenres).map(([category, genres]) => {
            if (genres.length === 0) return null;
            
            // Map category to comic genre type (this can be made configurable in the future)
            const comicGenreMap: Record<string, ComicGenreType> = {
              personality: 'protagonist',
              verb: 'antagonist', 
              plot: 'narrative'
            };
            
            const comicGenreType = comicGenreMap[category];
            const categoryColors = {
              personality: 'text-blue-400',
              verb: 'text-green-400',
              plot: 'text-yellow-400'
            };
            
            return (
              <div key={category} className="border border-gray-600 rounded-lg p-4 bg-gray-800">
                <h4 className={`text-lg font-semibold mb-3 ${categoryColors[category as keyof typeof categoryColors]}`}>
                  {category.charAt(0).toUpperCase() + category.slice(1)} Genres
                </h4>
                <div className="flex flex-wrap gap-2">
                  {genres.map((genre) => (
                    <Button
                      key={genre}
                      type="button"
                      variant={getComicGenreKeys().some(key => selectedGenres[key].includes(genre)) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleGenre(comicGenreType, genre)}
                      className="gap-2"
                    >
                      {getComicGenreKeys().some(key => selectedGenres[key].includes(genre)) && <Check className="w-3 h-3" />}
                      {genre}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={applyGenres} 
            disabled={isApplying || Object.values(selectedGenres).every(cat => cat.length === 0)}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {isApplying ? 'Applying...' : `Apply to ${selectedComicIds.length} Comics`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkGenreAssignment;
