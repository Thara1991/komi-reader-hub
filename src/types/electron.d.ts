declare global {
  interface Window {
    electronAPI: {
      selectDirectory: () => Promise<string>;
      pickDirectory: () => Promise<string>;
      readDirectory: (dirPath: string) => Promise<any>;
      readFile: (filePath: string) => Promise<string>;
      writeFile: (filePath: string, data: string) => Promise<void>;
      fileExists: (filePath: string) => Promise<boolean>;
      getAppDataPath: () => Promise<string>;
      openExternal: (path: string) => Promise<void>;
      ensureDirectory: (directoryPath: string) => Promise<boolean>;
      renameFolder: (oldPath: string, newPath: string) => Promise<boolean>;
      openParentDirectory: (parentPath: string) => Promise<void>;
      setFitScreen: (fitScreen: boolean) => Promise<{ success: boolean; error?: string }>;
      deleteFile: (filePath: string) => Promise<boolean>;
      quitApp: () => Promise<void>;
      isElectron: boolean;
    };
  }
}

export {}; 