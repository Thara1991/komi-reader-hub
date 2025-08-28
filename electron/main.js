const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

console.log('🚀 Electron main.js is starting...');
console.log('📁 Current working directory:', process.cwd());
console.log('📁 __dirname:', __dirname);
console.log('📁 process.resourcesPath:', process.resourcesPath);

try {
  // Keep a global reference of the window object
  let mainWindow;

  function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 1000,
      webPreferences: {
        nodeIntegration: false, // Disable Node.js integration in renderer
        contextIsolation: true, // Enable context isolation for security
        enableRemoteModule: false, // Disable remote module for security
        preload: path.join(__dirname, 'preload.js'), // Attach preload script
        webSecurity: false // Allow loading local file:// images
      },
      icon: path.join(__dirname, '../public/icon.png'), // Optional: add an icon
      title: 'Komi Reader Hub'
    });

    console.log('🎯 Window created:', mainWindow.id);

    // Load the app
    if (process.env.NODE_ENV === 'development') {
      // In development, load from Vite dev server
      console.log('🔧 Development mode: Loading from Vite dev server');
      mainWindow.loadURL('http://localhost:8090');
      // Open DevTools automatically in development
      mainWindow.webContents.openDevTools();
    } else {
      // In production, load the built files
      console.log('🚀 Production mode: Loading built files');
      console.log('📍 __dirname:', __dirname);
      console.log('📍 process.resourcesPath:', process.resourcesPath);
      console.log('📍 app.getAppPath():', app.getAppPath());
      
      // Try multiple possible paths where electron-builder might place the dist files
      const possiblePaths = [
        path.join(__dirname, '../dist/index.html'),        // One level up from electron/ (correct for asar)
        path.join(__dirname, 'dist/index.html'),          // Same directory as main.js
        path.join(__dirname, '../../dist/index.html'),    // Two levels up
        path.join(__dirname, '../app.asar.unpacked/dist/index.html'), // Unpacked asar
        path.join(__dirname, '../app.asar/dist/index.html'),          // Packed asar
        path.join(__dirname, 'app.asar.unpacked/dist/index.html'),    // Alternative unpacked
        path.join(__dirname, 'app.asar/dist/index.html'),             // Alternative packed
        path.join(process.resourcesPath, 'app.asar/dist/index.html'), // From resources path
        path.join(app.getAppPath(), 'dist/index.html')                // From app path
      ];
      
      let foundPath = null;
      for (const distPath of possiblePaths) {
        console.log('🔍 Checking path:', distPath);
        try {
          if (fs.existsSync(distPath)) {
            console.log('✅ Found dist files at:', distPath);
            foundPath = distPath;
            break;
          } else {
            console.log('❌ Path does not exist:', distPath);
          }
        } catch (error) {
          console.log('⚠️ Error checking path:', distPath, error.message);
        }
      }
      
      if (foundPath) {
        console.log('🎯 Loading HTML from:', foundPath);
        mainWindow.loadFile(foundPath);
      } else {
        console.error('❌ Could not find dist files in any expected location');
        console.error('📁 Available files in __dirname:', fs.readdirSync(__dirname));
        console.error('📁 Available files in process.resourcesPath:', fs.readdirSync(process.resourcesPath));
        
        // Last resort: try to find any HTML file
        const searchForHtml = (dir) => {
          try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
              if (file.endsWith('.html')) {
                return path.join(dir, file);
              }
            }
          } catch (e) {
            console.log('⚠️ Error searching directory:', dir, e.message);
          }
          return null;
        };
        
        const htmlFile = searchForHtml(__dirname) || searchForHtml(process.resourcesPath);
        if (htmlFile) {
          console.log('🆘 Loading fallback HTML file:', htmlFile);
          mainWindow.loadFile(htmlFile);
        } else {
          console.error('❌ No HTML files found anywhere');
          app.quit();
          return;
        }
      }
    }

    // Check for fit screen setting on startup
    try {
      const userDataPath = app.getPath('userData');
      const settingsPath = path.join(userDataPath, 'json', 'settings.json');
      
      if (fs.existsSync(settingsPath)) {
        const settingsData = fs.readFileSync(settingsPath, 'utf8');
        const settings = JSON.parse(settingsData);
        
        if (settings.fitScreen === true) {
          // Apply fit screen setting on startup
          const { screen } = require('electron');
          const primaryDisplay = screen.getPrimaryDisplay();
          const { width, height } = primaryDisplay.workAreaSize;
          
          mainWindow.setSize(width, height);
          mainWindow.setPosition(0, 0);
          console.log(`🖥️ Fit screen applied on startup: ${width}x${height}`);
        }
      }
    } catch (error) {
      console.log('⚠️ Could not load fit screen setting on startup:', error.message);
    }

    // Handle window closed
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  // This method will be called when Electron has finished initialization
  app.whenReady().then(createWindow);

  // Quit when all windows are closed
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // IPC handlers for file system operations
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    if (!result.canceled) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('read-file', async (event, filePath) => {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading file:', error);
      return null;
    }
  });

  ipcMain.handle('write-file', async (event, filePath, data) => {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('Error writing file:', error);
      return false;
    }
  });

  ipcMain.handle('file-exists', async (event, filePath) => {
    return fs.existsSync(filePath);
  });

  ipcMain.handle('delete-file', async (event, filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted file: ${filePath}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  });

  ipcMain.handle('get-app-data-path', () => {
    return app.getPath('userData');
  });

  ipcMain.handle('ensure-directory', async (event, directoryPath) => {
    try {
      if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
        console.log(`Created directory: ${directoryPath}`);
      }
      return true;
    } catch (error) {
      console.error('Error creating directory:', error);
      return false;
    }
  });

  ipcMain.handle('rename-folder', async (event, oldPath, newPath) => {
    try {
      console.log(`Renaming folder: ${oldPath} → ${newPath}`);
      
      // Check if old path exists
      if (!fs.existsSync(oldPath)) {
        console.error(`Old path does not exist: ${oldPath}`);
        return false;
      }
      
      // Check if new path already exists
      if (fs.existsSync(newPath)) {
        console.error(`New path already exists: ${newPath}`);
        return false;
      }
      
      // Rename the folder
      fs.renameSync(oldPath, newPath);
      console.log(`✅ Folder renamed successfully: ${oldPath} → ${newPath}`);
      return true;
    } catch (error) {
      console.error('Error renaming folder:', error);
      return false;
    }
  });

  ipcMain.handle('open-external', async (event, filePath) => {
    const { shell } = require('electron');
    await shell.openPath(filePath);
  });

  // Open parent directory (simplified)
  ipcMain.handle('open-parent-directory', async (event, parentPath) => {
    const { shell } = require('electron');
    try {
      // Open the parent directory
      await shell.openPath(parentPath);
      return true;
    } catch (error) {
      console.error('Error opening parent directory:', error);
      return false;
    }
  });

  // Quit app IPC handler
  ipcMain.handle('quit-app', async () => {
    console.log('🔵 Main: Quit app requested via IPC');
    app.quit();
    return true;
  });

  ipcMain.handle('read-directory', async (event, directoryPath) => {
    try {
      console.log('Reading directory:', directoryPath);
      
      // Function to recursively scan for comic folders
      function scanForComics(dirPath, depth = 0) {
        const comics = [];
        const maxDepth = 10; // Prevent infinite recursion
        
        if (depth > maxDepth) {
          console.log(`Max depth reached at: ${dirPath}`);
          return comics;
        }
        
        try {
          const files = fs.readdirSync(dirPath, { withFileTypes: true });
          
          for (const dirent of files) {
            if (dirent.isDirectory() && !dirent.name.startsWith('.') && dirent.name !== '__MACOSX') {
              const fullPath = path.join(dirPath, dirent.name);
              
              // Check if this directory contains image files (is a comic folder)
              try {
                const dirContents = fs.readdirSync(fullPath, { withFileTypes: true });
                const imageFiles = dirContents
                  .filter(item => item.isFile() && /\.(jpg|jpeg|png|webp|gif)$/i.test(item.name))
                  .map(item => item.name)
                  .sort();
                
                console.log(`Checking directory: ${fullPath}`);
                console.log(`- Image files found: ${imageFiles.length}`);
                console.log(`- Subdirectories: ${dirContents.filter(item => item.isDirectory()).length}`);
                
                if (imageFiles.length > 0) {
                  // This is a comic folder - has image files
                  const coverImage = 'file://' + path.join(fullPath, imageFiles[0]);
                  const pages = imageFiles.map(f => 'file://' + path.join(fullPath, f));
                  
                  // Create a display title that shows the hierarchy
                  const relativePath = path.relative(directoryPath, fullPath);
                  const displayTitle = relativePath.replace(/\\/g, ' / '); // Windows path separator
                  
                  console.log(`✅ Comic folder found: ${displayTitle}, Path: ${fullPath}, Pages: ${imageFiles.length}`);
                  
                  comics.push({
                    id: dirent.name.toLowerCase().replace(/\s+/g, '-') + '-' + depth + '-' + Buffer.from(fullPath).toString('base64').substring(0, 8),
                    title: dirent.name, // Original folder name
                    displayTitle: displayTitle, // Full path for display
                    folderPath: fullPath,
                    coverImage: coverImage,
                    totalPages: imageFiles.length,
                    pages: pages,
                    lastModified: fs.statSync(fullPath).mtime,
                    author: path.basename(path.dirname(fullPath)), // Get author from parent folder
                    depth: depth
                  });
                } else {
                  // This is a subdirectory without images, scan it recursively
                  console.log(`📁 Scanning subdirectory: ${fullPath}`);
                  const subComics = scanForComics(fullPath, depth + 1);
                  comics.push(...subComics);
                }
              } catch (folderError) {
                console.error(`Error processing folder ${dirent.name}:`, folderError);
              }
            }
          }
        } catch (e) {
          console.error(`Error reading directory ${dirPath}:`, e);
        }
        
        return comics;
      }
      
      // Start recursive scanning
      const comics = scanForComics(directoryPath);
      
      console.log(`Total comics found: ${comics.length}`);
      return {
        comics,
        totalComics: comics.length,
        errors: []
      };
    } catch (error) {
      console.error('Error reading directory:', error);
      return {
        comics: [],
        totalComics: 0,
        errors: [error.message || 'Unknown error']
      };
    }
  });

  ipcMain.handle('set-fit-screen', async (event, fitScreen) => {
    try {
      if (mainWindow) {
        if (fitScreen) {
          // Get the primary display size and set window to fit it
          const { screen } = require('electron');
          const primaryDisplay = screen.getPrimaryDisplay();
          const { width, height } = primaryDisplay.workAreaSize;
          
          mainWindow.setSize(width, height);
          mainWindow.setPosition(0, 0);
          console.log(`Window resized to fit screen: ${width}x${height}`);
        } else {
          // Reset to default size (1200x1000)
          mainWindow.setSize(1200, 1000);
          mainWindow.center();
          console.log('Window reset to default size: 1200x1000');
        }
      }
      return { success: true };
    } catch (error) {
      console.error('Error setting fit screen:', error);
      return { success: false, error: error.message };
    }
  });
} catch (error) {
  console.error('An error occurred during main.js execution:', error);
  process.exit(1);
} 