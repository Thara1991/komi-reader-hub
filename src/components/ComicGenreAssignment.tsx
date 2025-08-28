import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { X, Save } from 'lucide-react';
import { fileStorage } from '@/utils/fileStorage';
import { Comic } from '@/types/comic';
import { useAutoRefreshMetadata } from '@/hooks/useAutoRefreshMetadata';

interface ComicGenreAssignmentProps {
  comic: Comic;
  onClose: () => void;
  onUpdate: (comicId: string, updates: Partial<Comic>) => Promise<void>;
}

const ComicGenreAssignment: React.FC<ComicGenreAssignmentProps> = ({ 
  comic, 
  onClose, 
  onUpdate 
}) => {
  const [availableGenres, setAvailableGenres] = useState<{ personality: string[]; verb: string[]; plot: string[] }>({
    personality: [],
    verb: [],
    plot: []
  });

  const [selectedGenres, setSelectedGenres] = useState({
    protagonist: comic.comicGenres?.protagonist || [],
    antagonist: comic.comicGenres?.antagonist || [],
    supporting: comic.comicGenres?.supporting || [],
    narrative: comic.comicGenres?.narrative || []
  });

  const [isSaving, setIsSaving] = useState(false);

  // Load available genres from GenreManager
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

  // Auto-refresh metadata when form becomes visible
  useAutoRefreshMetadata({
    mainDirectory: comic.folderPath,
    onMetadataRefreshed: (updatedComics) => {
      // Find the updated comic data
      const updatedComic = updatedComics.find(c => c.id === comic.id);
      if (updatedComic) {
        // Update the comic data with latest metadata
        setSelectedGenres(prev => ({
          ...prev,
          ...updatedComic.comicGenres
        }));
        
        // Also update available genres
        if (updatedComic.comicGenres) {
          setAvailableGenres(prev => ({
            ...prev,
            ...updatedComic.comicGenres
          }));
        }
      }
      console.log('🔄 ComicGenreAssignment: Metadata auto-refreshed');
    },
    enabled: true
  });

  // Toggle genre selection for a comic type
  const toggleGenre = (comicType: keyof typeof selectedGenres, genre: string) => {
    setSelectedGenres(prev => {
      const current = prev[comicType];
      const newValue = current.includes(genre)
        ? current.filter(g => g !== genre)
        : [...current, genre];
      
      return {
        ...prev,
        [comicType]: newValue
      };
    });
  };

  // Save genre assignments
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(comic.id, { comicGenres: selectedGenres });
      console.log('✅ Genres saved successfully');
      onClose();
    } catch (error) {
      console.error('❌ Failed to save genres:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const comicTypeLabels = {
    protagonist: 'Protagonist Genres',
    antagonist: 'Antagonist Genres',
    supporting: 'Supporting Genres',
    narrative: 'Narrative Genres'
  };

  const comicTypeColors = {
    protagonist: 'bg-blue-100 border-blue-300',
    antagonist: 'bg-orange-100 border-orange-300',
    supporting: 'bg-purple-100 border-purple-300',
    narrative: 'bg-green-100 border-green-300'
  };

  const categoryLabels = {
    personality: 'Personality',
    verb: 'Verb',
    plot: 'Plot'
  };

  const categoryColors = {
    personality: 'bg-blue-200 text-blue-900',
    verb: 'bg-green-200 text-green-900',
    plot: 'bg-yellow-200 text-yellow-900'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Assign Genres to Comic</h2>
            <p className="text-gray-600">{comic.title}</p>
          </div>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Description Row */}
        <div className="mb-4 p-2 bg-gray-100 rounded text-sm text-gray-600">
          <span className="font-medium">Description:</span> Personality (Light blue), Verb (Green), Plot (Dark Yellow)
        </div>

        {/* Genre Assignment Sections - Each Type Takes Full Row */}
        <div className="space-y-4">
          {(Object.keys(selectedGenres) as Array<keyof typeof selectedGenres>).map((comicType) => (
            <div key={comicType} className={`border rounded-lg p-3 ${comicTypeColors[comicType]}`}>
              <h3 className="text-base font-semibold mb-2 text-gray-800">
                {comicTypeLabels[comicType]}
              </h3>
              
              {/* Genre Options - Compact Display */}
              <div className="mb-2">
                {(Object.keys(availableGenres) as Array<keyof typeof availableGenres>).map((genreCategory) => (
                  <div key={genreCategory} className="mb-2">
                    <div className="flex flex-wrap gap-1">
                      {availableGenres[genreCategory].map((genre) => {
                        const isSelected = selectedGenres[comicType].includes(genre);
                        return (
                          <Button
                            key={genre}
                            size="sm"
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => toggleGenre(comicType, genre)}
                            className={`text-xs px-2 py-1 h-6 ${isSelected ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-gray-100'}`}
                          >
                            {genre}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Selected Genres - Compact */}
              <div className="p-2 bg-white rounded border text-xs">
                <span className="text-gray-500">Selected: </span>
                {selectedGenres[comicType].length > 0 ? (
                  <span className="text-gray-700">{selectedGenres[comicType].join(', ')}</span>
                ) : (
                  <span className="text-gray-400 italic">None</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Genres'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ComicGenreAssignment;
