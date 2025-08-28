import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Folder, Loader2, AlertCircle, CheckCircle, Trash2 } from "lucide-react";
import { validateDirectory, scanDirectoryForComics, DirectoryScanResult } from "@/lib/directoryScanner";
import { fileStorage } from "@/utils/fileStorage";

interface DirectorySettingsProps {
  currentDirectory: string;
  onDirectoryChange: (directory: string, scanResult?: DirectoryScanResult) => void;
  onClose: () => void;
  onRefresh?: (directory?: string) => void;
}

const DirectorySettings = ({ 
  currentDirectory, 
  onDirectoryChange, 
  onClose,
  onRefresh
}: DirectorySettingsProps) => {
  const [directory, setDirectory] = useState(currentDirectory);
  const [isValidating, setIsValidating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string } | null>(null);
  const [scanResult, setScanResult] = useState<DirectoryScanResult | null>(null);

  const handleValidateDirectory = async () => {
    if (!directory.trim()) return;
    
    setIsValidating(true);
    setValidationResult(null);
    
    try {
      // Try to use File System Access API first
      const { isFileSystemAccessSupported, requestDirectoryAccess, scanDirectoryHandleForComics } = await import('@/lib/directoryScanner');
      
      if (isFileSystemAccessSupported()) {
        const directoryHandle = await requestDirectoryAccess();
        if (directoryHandle) {
          setValidationResult({ valid: true });
          // Auto-scan the directory
          await handleScanDirectory();
          return;
        }
      }
      
      // Fallback to manual validation
      const result = await validateDirectory(directory);
      setValidationResult(result);
      
      if (result.valid) {
        // Auto-scan the directory if it's valid
        await handleScanDirectory();
      }
    } catch (error) {
      setValidationResult({ valid: false, error: "Validation failed" });
    } finally {
      setIsValidating(false);
    }
  };

  const handleScanDirectory = async () => {
    if (!directory.trim()) return;
    setIsScanning(true);
    setScanResult(null);
    try {
      let result;
      if (window.electronAPI && window.electronAPI.isElectron && window.electronAPI.readDirectory) {
        result = await window.electronAPI.readDirectory(directory);
      } else {
        // Fallback to browser scan
        const { scanDirectoryForComics } = await import('@/lib/directoryScanner');
        result = await scanDirectoryForComics(directory);
      }
      setScanResult(result);
      // Immediately update the main library with the new scan result
      onDirectoryChange(directory, result);
    } catch (error) {
      console.error("Failed to scan directory:", error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = async () => {
    console.log('🔵 DirectorySettings: Save button clicked');
    console.log('🔵 DirectorySettings: Directory path:', directory);
    console.log('🔵 DirectorySettings: onRefresh function exists:', !!onRefresh);
    
    // Save directory path to settings.json
    try {
      console.log('🔵 DirectorySettings: About to save directory:', directory);
      const currentSettings = await fileStorage.getSettings();
      console.log('🔵 DirectorySettings: Current settings:', currentSettings);
      
      const newSettings = {
        ...(currentSettings || {}),
        mainDirectory: directory
      };
      console.log('🔵 DirectorySettings: New settings to save:', newSettings);
      
      await fileStorage.setSettings(newSettings);
      console.log('🔵 DirectorySettings: Directory path saved to settings.json successfully');
      
      // Verify it was saved
      const verifySettings = await fileStorage.getSettings();
      console.log('🔵 DirectorySettings: Verified settings after save:', verifySettings);
    } catch (error) {
      console.error('🔵 DirectorySettings: Failed to save directory to settings.json:', error);
    }
    
    onDirectoryChange(directory, scanResult || undefined);
    
    // Trigger a refresh after saving
    if (onRefresh) {
      console.log('🔵 DirectorySettings: Triggering refresh after save...');
      // Small delay to ensure the directory change is processed first
      setTimeout(() => {
        console.log('🔵 DirectorySettings: Executing refresh now with directory:', directory);
        onRefresh(directory);
      }, 100);
    } else {
      console.log('🔵 DirectorySettings: No onRefresh function provided');
    }
    
    onClose();
  };

  const handleBrowse = async () => {
    try {
      if (window.electronAPI && window.electronAPI.isElectron && window.electronAPI.selectDirectory) {
        const fullPath = await window.electronAPI.selectDirectory();
        if (fullPath) {
          setDirectory(fullPath);
          await handleValidateDirectory();
        }
        return;
      }
      // Fallback for browser or if not in Electron
      if (window.showDirectoryPicker) {
        const dirHandle = await window.showDirectoryPicker();
        if (dirHandle && dirHandle.name) {
          // For browser environment, we can only get the folder name
          // The full path is not available due to security restrictions
          setDirectory(dirHandle.name);
        }
        await handleValidateDirectory();
        return;
      }
      const { requestDirectoryAccess } = await import('@/lib/directoryScanner');
      const directoryHandle = await requestDirectoryAccess();
      if (directoryHandle) {
        // For browser environment, we can only get the folder name
        setDirectory(directoryHandle.name);
        await handleValidateDirectory();
      }
    } catch (error) {
      console.error('Failed to browse directory:', error);
      setDirectory("");
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="w-5 h-5" />
            Set Main Directory
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="directory">
              Main Directory Path
            </Label>
            <div className="flex gap-2">
              <Input
                id="directory"
                value={directory}
                onChange={(e) => setDirectory(e.target.value)}
                className="bg-manga-surface border-border"
              />
              <Button
                variant="outline"
                onClick={handleBrowse}
                className="shrink-0"
              >
                Browse
              </Button>
            </div>
          </div>

          {/* Validation and Scan Controls */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleValidateDirectory}
              disabled={!directory.trim() || isValidating}
              className="flex-1"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                "Validate Directory"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleScanDirectory}
              disabled={!directory.trim() || isScanning || (validationResult && !validationResult.valid)}
              className="flex-1"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                "Scan for Comics"
              )}
            </Button>
          </div>

          {/* Validation Result */}
          {validationResult && (
            <div className={`p-3 rounded-lg border ${
              validationResult.valid 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {validationResult.valid ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  validationResult.valid ? 'text-green-800' : 'text-red-800'
                }`}>
                  {validationResult.valid ? 'Directory is valid!' : validationResult.error}
                </span>
              </div>
            </div>
          )}

          {/* Scan Result */}
          {scanResult && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Scan Complete!
                </span>
              </div>
              <div className="text-sm text-blue-700">
                Found {scanResult.totalComics} comics in the directory
                {scanResult.errors.length > 0 && (
                  <div className="mt-1 text-red-600">
                    {scanResult.errors.length} errors encountered
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="bg-manga-surface p-3 rounded-lg border border-border">
            <h4 className="font-medium text-sm mb-2">Directory Structure:</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>📁 Main Directory</div>
              <div className="ml-4">📁 Author A</div>
              <div className="ml-8">📁 Comic Title 1</div>
              <div className="ml-12">🖼️ 001.jpg</div>
              <div className="ml-12">🖼️ 002.png</div>
              <div className="ml-12">🖼️ ...</div>
              <div className="ml-8">📁 Comic Title 2</div>
              <div className="ml-12">🖼️ page_01.jpg</div>
              <div className="ml-12">🖼️ page_02.jpg</div>
              <div className="ml-4">📁 Author B</div>
              <div className="ml-8">📁 Comic Title 3</div>
              <div className="ml-12">🖼️ cover.jpg</div>
              <div className="ml-12">🖼️ page1.png</div>
              <div className="ml-4">📁 Direct Comic</div>
              <div className="ml-8">🖼️ 001.jpg</div>
              <div className="ml-8">🖼️ 002.jpg</div>
              <div className="text-xs text-blue-600 mt-2">
                💡 The app scans recursively up to 10 levels deep, finding any folder containing images
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={async () => {
              await fileStorage.clearAllData();
              setDirectory("");
              setValidationResult(null);
              setScanResult(null);
            }}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Data
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!directory.trim()}>
              Save Directory
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DirectorySettings;