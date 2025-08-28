import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { X, Plus, Save, Edit, Trash2 } from 'lucide-react';
import { fileStorage } from '@/utils/fileStorage';

interface GenreManagerProps {
  onClose: () => void;
  onOpenLibraryManager?: (filter: { category: string; genre: string; shouldFilter?: boolean }) => void;
  onGenresChange?: (genres: GenreCatalog) => void; // Add callback to notify when genres change
}

// Import the scalable genre system
import { GenreCatalog, GenreCatalogType } from '@/types/comic';
import { getGenreCatalogTypes, getGenreCatalogKeys, createEmptyGenreCatalog } from '@/lib/genreUtils';

const GenreManager: React.FC<GenreManagerProps> = ({ onClose, onOpenLibraryManager, onGenresChange }) => {
  const [genres, setGenres] = useState<GenreCatalog>(createEmptyGenreCatalog());

  const [editingGenre, setEditingGenre] = useState<{ category: GenreCatalogType; index: number; value: string } | null>(null);
  const [newGenre, setNewGenre] = useState<{ category: GenreCatalogType; value: string }>({ category: 'personality', value: '' });
  const [selectedGenre, setSelectedGenre] = useState<{ category: GenreCatalogType; index: number; value: string } | null>(null);
  
  // New state for delete safety check
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [genreToDelete, setGenreToDelete] = useState<{ category: GenreCatalogType; index: number; value: string } | null>(null);
  const [affectedComics, setAffectedComics] = useState<Array<{ id: string; title: string }>>([]);
  const [isCheckingGenres, setIsCheckingGenres] = useState(false);

  const categoryLabels: Record<GenreCatalogType, string> = {
    personality: 'Personality',
    verb: 'Verb', 
    plot: 'Plot'
  };

  const categoryColors: Record<GenreCatalogType, string> = {
    personality: 'bg-blue-100 text-blue-800',
    verb: 'bg-green-100 text-green-800',
    plot: 'bg-yellow-100 text-yellow-800'
  };

  const categoryHoverColors: Record<GenreCatalogType, string> = {
    personality: 'hover:bg-blue-200',
    verb: 'hover:bg-green-200',
    plot: 'hover:bg-yellow-200'
  };

  const categorySelectedColors: Record<GenreCatalogType, string> = {
    personality: 'bg-blue-300 text-blue-900',
    verb: 'bg-green-300 text-green-900',
    plot: 'bg-yellow-300 text-yellow-900'
  };

  // Load genres from storage
  useEffect(() => {
    const loadGenres = async () => {
      try {
        const savedGenres = await fileStorage.getGenres();
        if (savedGenres) {
          // Handle migration from old system or load new system
          if (savedGenres.personality && savedGenres.verb && savedGenres.plot) {
            // New system - ensure all required properties exist
            setGenres({
              personality: savedGenres.personality || [],
              verb: savedGenres.verb || [],
              plot: savedGenres.plot || []
            });
          } else {
            // Old system - initialize with empty new system
            setGenres({ personality: [], verb: [], plot: [] });
          }
        }
      } catch (error) {
        console.error('Failed to load genres:', error);
      }
    };
    loadGenres();
  }, []);

  // Save genres to storage
  const saveGenres = async (newGenres: GenreCatalog) => {
    try {
      // Convert to the format expected by the old fileStorage system
      const oldFormat = {
        personality: newGenres.personality,
        verb: newGenres.verb,
        plot: newGenres.plot
      };
      await fileStorage.setGenres(oldFormat);
      setGenres(newGenres);
      
      // Notify parent components that genres have changed
      if (onGenresChange) {
        onGenresChange(newGenres);
      }
      
      console.log('✅ Genres saved successfully');
    } catch (error) {
      console.error('❌ Failed to save genres:', error);
    }
  };

  // Add new genre
  const addGenre = () => {
    if (!newGenre.value.trim()) return;

    const newGenres = {
      ...genres,
      [newGenre.category]: [...genres[newGenre.category], newGenre.value.trim()]
    };

    saveGenres(newGenres);
    setNewGenre({ category: newGenre.category, value: '' });
  };

  // Handle genre selection
  const handleGenreSelect = (category: GenreCatalogType, index: number, value: string) => {
    if (selectedGenre?.category === category && selectedGenre?.index === index) {
      // If clicking the same genre, deselect it
      setSelectedGenre(null);
    } else {
      // Select the new genre
      setSelectedGenre({ category, index, value });
    }
  };

  // Edit genre
  const startEdit = () => {
    if (!selectedGenre) return;
    setEditingGenre(selectedGenre);
  };

  // Save edited genre
  const saveEdit = () => {
    if (!editingGenre || !editingGenre.value.trim()) return;

    const newGenres = {
      ...genres,
      [editingGenre.category]: genres[editingGenre.category].map((genre, index) =>
        index === editingGenre.index ? editingGenre.value.trim() : genre
      )
    };

    saveGenres(newGenres);
    setEditingGenre(null);
    setSelectedGenre(null);
  };

  // Check if genre is in use before deleting
  const checkGenreUsage = async (category: GenreCatalogType, index: number, value: string) => {
    console.log('🔍 Checking genre usage for:', value);
    setIsCheckingGenres(true);
    try {
      // Get all comics from storage
      const allComics = await fileStorage.getLibrary();
      console.log('📚 Found comics:', allComics?.length || 0);
      
      // Use a Map to track unique comics by folder path and title to avoid duplicates
      const uniqueAffectedComics = new Map<string, { id: string; title: string; folderPath?: string }>();

      if (allComics && allComics.length > 0) {
        allComics.forEach(comic => {
          // Check if comic has this genre in any category
          if (comic.comicGenres) {
            const hasGenre = Object.values(comic.comicGenres).some(genreList => 
              Array.isArray(genreList) && genreList.includes(value)
            );
            if (hasGenre) {
              console.log('🎯 Comic affected:', comic.title, 'ID:', comic.id, 'Path:', comic.folderPath);
              
              // Create a unique key based on folder path (if available) or title
              const uniqueKey = comic.folderPath || comic.title;
              
              // Only add if we haven't seen this comic before (by path or title)
              if (!uniqueAffectedComics.has(uniqueKey)) {
                uniqueAffectedComics.set(uniqueKey, { 
                  id: comic.id, 
                  title: comic.title, 
                  folderPath: comic.folderPath 
                });
              } else {
                console.log('⚠️ Duplicate comic detected:', comic.title, 'Skipping...');
              }
            }
          }
        });
      }

      // Convert Map values to array
      const affected = Array.from(uniqueAffectedComics.values());
      console.log('⚠️ Total unique affected comics:', affected.length);
      console.log('🔍 Affected comics:', affected.map(c => `${c.title} (${c.folderPath || 'no path'})`));
      
      setAffectedComics(affected);
      
      // If no comics are using this genre, delete it immediately
      if (affected.length === 0) {
        console.log('✅ No comics using this genre, deleting immediately');
        const newGenres = {
          ...genres,
          [category]: genres[category].filter((_, i) => i !== index)
        };
        saveGenres(newGenres);
        setSelectedGenre(null);
        return;
      }
      
      // If comics are using this genre, show the delete alert
      setGenreToDelete({ category, index, value });
      setShowDeleteAlert(true);
    } catch (error) {
      console.error('❌ Failed to check genre usage:', error);
    } finally {
      setIsCheckingGenres(false);
    }
  };

  // Delete genre (now with safety check)
  const deleteGenre = () => {
    if (!selectedGenre) return;
    
    // Check usage before deleting
    checkGenreUsage(selectedGenre.category, selectedGenre.index, selectedGenre.value);
  };

  // Actually delete the genre after user confirms
  const confirmDeleteGenre = () => {
    if (!genreToDelete) return;
    
    const newGenres = {
      ...genres,
      [genreToDelete.category]: genres[genreToDelete.category].filter((_, i) => i !== genreToDelete.index)
    };

    saveGenres(newGenres);
    setSelectedGenre(null);
    setShowDeleteAlert(false);
    setGenreToDelete(null);
    setAffectedComics([]);
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingGenre(null);
  };

  // Handle opening Library Manager with filtered comics
  const handleShowAffectedComics = () => {
    if (onOpenLibraryManager && genreToDelete) {
      onOpenLibraryManager({ 
        category: genreToDelete.category, 
        genre: genreToDelete.value,
        shouldFilter: true // New flag to indicate automatic filtering
      });
      onClose(); // Close the Genre Manager
    }
  };



  return (
                      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-lg p-6 max-w-[98vw] w-[98vw] max-h-[98vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Genre Manager</h2>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Add New Genre */}
                  <div className="mb-6 p-4 bg-muted rounded-lg border border-border">
                      <h3 className="text-lg font-semibold mb-3">Add New Genre</h3>
          <div className="flex gap-3">
            <select
              value={newGenre.category}
              onChange={(e) => setNewGenre({ ...newGenre, category: e.target.value as GenreCatalogType })}
                              className="px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="personality">Personality</option>
              <option value="verb">Verb</option>
              <option value="plot">Plot</option>
            </select>
            <Input
              value={newGenre.value}
              onChange={(e) => setNewGenre({ ...newGenre, value: e.target.value })}
              placeholder="new genre input"
                              className="flex-1 bg-background border border-border placeholder-muted-foreground"
            />
            <Button onClick={addGenre} disabled={!newGenre.value.trim()} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {/* Genre Categories - Each takes a whole row */}
        <div className="space-y-4">
          {(Object.keys(genres) as Array<GenreCatalogType>).map((category) => (
            <div key={category} className="w-full">
              {/* Category Header - Dark grey bar with edit/delete icons when genre is selected */}
              <div className="bg-muted border-b border-border px-4 py-2 rounded-t flex items-center justify-between">
                <h3 className="text-lg font-semibold">{categoryLabels[category]}</h3>
                {selectedGenre?.category === category && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={startEdit}
                      className="h-8 w-8 p-0 hover:bg-accent"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={deleteGenre}
                      className="h-8 w-8 p-0 hover:bg-accent text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Category Content - Colored background with selectable genre badges */}
              <div className={`p-4 ${categoryColors[category]} rounded-b`}>
                {genres[category].length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {genres[category].map((genre, index) => (
                      <div key={index} className="flex items-center gap-1">
                        {editingGenre?.category === category && editingGenre?.index === index ? (
                          <>
                            <Input
                              value={editingGenre.value}
                              onChange={(e) => setEditingGenre({ ...editingGenre, value: e.target.value })}
                              className="w-24 h-8 text-sm"
                            />
                            <Button size="sm" onClick={saveEdit} className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700">
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit} className="h-8 w-8 p-0">
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleGenreSelect(category, index, genre)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              selectedGenre?.category === category && selectedGenre?.index === index
                                ? categorySelectedColors[category]
                                : `${categoryColors[category]} ${categoryHoverColors[category]}`
                            }`}
                          >
                            {genre}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm italic">No genres added yet</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Alert Dialog */}
      {showDeleteAlert && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-60">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-red-600 text-xl">⚠️</span>
              </div>
              <h3 className="text-lg font-semibold">Cannot Delete Genre</h3>
            </div>
            
            <div className="mb-4 text-muted-foreground">
                              <p className="mb-3">
                  This genre is still in use by <span className="font-semibold">{affectedComics.length} comics</span>:
                </p>
              
              <div className="space-y-1 mb-3">
                {affectedComics.slice(0, 5).map((comic, index) => (
                  <div key={comic.id} className="text-sm">
                    • {comic.title}
                  </div>
                ))}
                {affectedComics.length > 5 && (
                  <div className="text-sm text-muted-foreground italic">
                    ... and more.
                  </div>
                )}
              </div>
              
              <p className="text-sm">
                Please remove <span className="font-semibold">"{genreToDelete?.value}"</span> from these comics first, then try deleting the genre again.
              </p>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={() => setShowDeleteAlert(false)} 
                variant="outline"
                className="flex-1"
              >
                Stay Here
              </Button>
              <Button 
                onClick={handleShowAffectedComics}
                className="flex-1"
              >
                Go Edit Comics
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenreManager; 