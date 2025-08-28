import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { ComicGenreType } from '@/types/comic';
import { getComicGenreTypes, getComicGenreKeys, createEmptyComicGenres } from '@/lib/genreUtils';
import { useAutoRefreshMetadata } from '@/hooks/useAutoRefreshMetadata';

interface EditData {
  title: string;
  author: string;
  description: string;
  comicGenres: {
    [K in ComicGenreType]: string;
  };
}

const LibraryManager = ({ comics, onUpdateComic, onBack }) => {
  const [editComics, setEditComics] = useState(comics);
  const [editingComic, setEditingComic] = useState(null);
  const [editData, setEditData] = useState<EditData>({
    title: '',
    author: '',
    description: '',
    comicGenres: {
      protagonist: '',
      antagonist: '',
      supporting: '',
      narrative: '',
    },
  });

  // Auto-refresh metadata when form becomes visible
  useAutoRefreshMetadata({
    mainDirectory: comics[0]?.folderPath || null,
    onMetadataRefreshed: (updatedComics) => {
      // Update the comics list with latest metadata
      setEditComics(updatedComics);
      console.log('🔄 LibraryManager: Metadata auto-refreshed, updated comics list');
    },
    enabled: true
  });

  const handleEdit = (comic) => {
    setEditingComic(comic);
    setEditData({
      title: comic.title || '',
      author: comic.author || '',
      description: comic.description || '',
      comicGenres: {
        protagonist: comic.comicGenres?.protagonist?.join(', ') || '',
        antagonist: comic.comicGenres?.antagonist?.join(', ') || '',
        supporting: comic.comicGenres?.supporting?.join(', ') || '',
        narrative: comic.comicGenres?.narrative?.join(', ') || '',
      },
    });
  };

  const handleFieldChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenreChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      comicGenres: { ...prev.comicGenres, [field]: value },
    }));
  };

  const handleSave = () => {
    const updatedComic = {
      ...editingComic,
      title: editData.title,
      author: editData.author,
      description: editData.description,
      comicGenres: {
        protagonist: editData.comicGenres.protagonist.split(',').map(s => s.trim()).filter(Boolean),
        antagonist: editData.comicGenres.antagonist.split(',').map(s => s.trim()).filter(Boolean),
        supporting: editData.comicGenres.supporting.split(',').map(s => s.trim()).filter(Boolean),
        narrative: editData.comicGenres.narrative.split(',').map(s => s.trim()).filter(Boolean),
      },
    };

    // Update the comic in the list
    setEditComics(prev => prev.map(comic => 
      comic.id === editingComic.id ? updatedComic : comic
    ));

    // Call the parent's update function
    onUpdateComic(editingComic.id, updatedComic);

    // Close the editor
    setEditingComic(null);
    setEditData({
      title: '',
      author: '',
      description: '',
      comicGenres: {
        protagonist: '',
        antagonist: '',
        supporting: '',
        narrative: '',
      },
    });
  };

  const handleCancel = () => {
    setEditingComic(null);
    setEditData({
      title: '',
      author: '',
      description: '',
      comicGenres: {
        protagonist: '',
        antagonist: '',
        supporting: '',
        narrative: '',
      },
    });
  };

  // Editor Page
  if (editingComic) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-4">
          <Button variant="outline" onClick={handleCancel} className="mr-4">Cancel</Button>
          <h2 className="text-2xl font-bold">Edit Comic: {editingComic.title}</h2>
        </div>
        
        <div className="max-w-2xl space-y-6">
          {/* Thumbnail */}
          <div className="flex items-center gap-4">
            <div className="w-32 h-40 flex items-center justify-center overflow-hidden rounded bg-gray-100 border">
              <img src={editingComic.coverImage} alt={editingComic.title} className="object-cover w-28 h-36 rounded" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <Input 
                  value={editData.title} 
                  onChange={e => handleFieldChange('title', e.target.value)} 
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Author</label>
                <Input 
                  value={editData.author} 
                  onChange={e => handleFieldChange('author', e.target.value)} 
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Input 
              value={editData.description} 
              onChange={e => handleFieldChange('description', e.target.value)} 
              className="w-full"
            />
          </div>

          {/* Genre Fields */}
          <div>
            <label className="block text-sm font-medium mb-2">Genre</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Protagonist</label>
                <Input 
                  value={editData.comicGenres.protagonist} 
                  onChange={e => handleGenreChange('protagonist', e.target.value)} 
                  placeholder="Comma separated"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Antagonist</label>
                <Input 
                  value={editData.comicGenres.antagonist} 
                  onChange={e => handleGenreChange('antagonist', e.target.value)} 
                  placeholder="Comma separated"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Supporting</label>
                <Input 
                  value={editData.comicGenres.supporting} 
                  onChange={e => handleGenreChange('supporting', e.target.value)} 
                  placeholder="Comma separated"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Narrative</label>
                <Input 
                  value={editData.comicGenres.narrative} 
                  onChange={e => handleGenreChange('narrative', e.target.value)} 
                  placeholder="Comma separated"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave}>Save</Button>
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          </div>
        </div>
      </div>
    );
  }

  // Main Library Manager View
  return (
    <div className="p-6">
      <div className="flex items-center mb-4">
        <Button variant="outline" onClick={onBack} className="mr-4">Back to Library</Button>
        <h2 className="text-2xl font-bold">Manage Library</h2>
      </div>
      <div className="space-y-4">
        {editComics.map(comic => (
          <div key={comic.id} className="flex items-stretch gap-4 border rounded-lg p-2 bg-background">
            {/* Thumbnail */}
            <div className="flex-shrink-0 w-28 h-32 flex items-center justify-center overflow-hidden rounded bg-gray-100 border-r border-border">
              <img 
                src={comic.coverImage} 
                alt={comic.title} 
                className="object-cover w-24 h-28 rounded"
                onError={(e) => {
                  console.error('LibraryManager: Failed to load image:', comic.coverImage);
                  console.error('Image error:', e);
                }}
                onLoad={() => {
                  console.log('LibraryManager: Image loaded successfully:', comic.coverImage);
                }}
              />
            </div>
            {/* Info Table */}
            <div className="flex-1 w-full p-2">
              <table className="w-full text-sm border-separate border-spacing-y-1 border border-white" style={{tableLayout: 'fixed'}}>
                <tbody>
                  <tr>
                    <td colSpan={2} className="align-top">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground font-medium">Title</span>
                        <span className="text-base font-bold">{comic.title || ''}</span>
                      </div>
                    </td>
                    <td rowSpan={3} className="w-20 align-top text-center border border-white">
                      <Button size="sm" className="w-16 mt-2" onClick={() => handleEdit(comic)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="align-top">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground font-medium">Author</span>
                        <span className="text-base">{comic.author || ''}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="align-top">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground font-medium">Description</span>
                        <span className="text-base">{comic.description || ''}</span>
                      </div>
                    </td>
                  </tr>
                  {/* Genre 2x2 grid, label and value in one cell */}
                  <tr>
                    <td colSpan={2} className="text-xs text-muted-foreground font-medium border border-white">Genre</td>
                  </tr>
                  <tr>
                    <td className="border border-white align-top">
                      <span className="text-base"><span className="font-medium">Protagonist:</span> {(comic.comicGenres?.protagonist || []).join(', ')}</span>
                    </td>
                    <td className="border border-white align-top">
                      <span className="text-base"><span className="font-medium">Antagonist:</span> {(comic.comicGenres?.antagonist || []).join(', ')}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-white align-top">
                      <span className="text-base"><span className="font-medium">Supporting:</span> {(comic.comicGenres?.supporting || []).join(', ')}</span>
                    </td>
                    <td className="border border-white align-top">
                      <span className="text-base"><span className="font-medium">Narrative:</span> {(comic.comicGenres?.narrative || []).join(', ')}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LibraryManager; 