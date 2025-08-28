const fs = require('fs');
const path = require('path');

function isImageFile(fileName) {
  return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);
}

function scanDirectoryForComics(directoryPath) {
  const comics = [];
  const errors = [];

  try {
    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
    const folders = entries.filter(entry => entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== '__MACOSX');
    folders.forEach(folder => {
      const folderPath = path.join(directoryPath, folder.name);
      try {
        const files = fs.readdirSync(folderPath);
        const imageFiles = files.filter(isImageFile).sort();
        const pages = imageFiles.map(img => 'file://' + path.join(folderPath, img));
        const coverImage = pages[0] || undefined;
        comics.push({
          id: folder.name.toLowerCase().replace(/\s+/g, '-'),
          title: folder.name,
          folderPath,
          coverImage,
          totalPages: pages.length,
          pages,
          lastModified: fs.statSync(folderPath).mtime
        });
      } catch (e) {
        errors.push(`Failed to process folder "${folder.name}": ${e}`);
      }
    });
  } catch (e) {
    errors.push(`Failed to scan directory: ${e}`);
  }

  return {
    comics,
    totalComics: comics.length,
    errors
  };
}

module.exports = { scanDirectoryForComics }; 