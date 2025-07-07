import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Folder } from "lucide-react";

interface DirectorySettingsProps {
  currentDirectory: string;
  onDirectoryChange: (directory: string) => void;
  onClose: () => void;
}

const DirectorySettings = ({ 
  currentDirectory, 
  onDirectoryChange, 
  onClose 
}: DirectorySettingsProps) => {
  const [directory, setDirectory] = useState(currentDirectory);

  const handleSave = () => {
    onDirectoryChange(directory);
    onClose();
  };

  const handleBrowse = () => {
    // In a real application, this would open a file dialog
    // For now, we'll simulate it
    const mockDirectory = "/path/to/manga/collection";
    setDirectory(mockDirectory);
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
                placeholder="/path/to/your/manga/collection"
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
          
          <div className="bg-manga-surface p-3 rounded-lg border border-border">
            <h4 className="font-medium text-sm mb-2">Directory Structure:</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>📁 Main Directory</div>
              <div className="ml-4">📁 Comic Title 1</div>
              <div className="ml-8">🖼️ 001.jpg</div>
              <div className="ml-8">🖼️ 002.png</div>
              <div className="ml-8">🖼️ ...</div>
              <div className="ml-4">📁 Comic Title 2</div>
              <div className="ml-8">🖼️ page_01.jpg</div>
              <div className="ml-8">🖼️ page_02.jpg</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!directory.trim()}>
            Save Directory
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DirectorySettings;