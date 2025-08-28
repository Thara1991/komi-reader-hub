import { useEffect, useRef } from 'react';
import { fileStorage } from '@/utils/fileStorage';

interface UseAutoRefreshMetadataProps {
  mainDirectory: string | null;
  onMetadataRefreshed?: (comics: any[]) => void;
  enabled?: boolean;
}

export const useAutoRefreshMetadata = ({
  mainDirectory,
  onMetadataRefreshed,
  enabled = true
}: UseAutoRefreshMetadataProps) => {
  const lastRefreshTime = useRef<number>(0);
  const refreshCooldown = 5000; // 5 seconds cooldown between auto-refreshes

  const refreshMetadata = async () => {
    if (!mainDirectory || !enabled) return;
    
    const now = Date.now();
    if (now - lastRefreshTime.current < refreshCooldown) {
      return; // Skip if too soon since last refresh
    }
    
    try {
      console.log('🔄 Auto-refreshing metadata for form...');
      
      // Reload comics from fileStorage
      const updatedComics = await fileStorage.getLibrary();
      if (updatedComics && Array.isArray(updatedComics)) {
        // Filter comics by the current directory
        const directoryComics = updatedComics.filter(comic => 
          comic.folderPath === mainDirectory
        );
        
        lastRefreshTime.current = now;
        
        if (onMetadataRefreshed) {
          onMetadataRefreshed(directoryComics);
        }
        
        console.log('🔄 Auto-refresh completed successfully');
      }
    } catch (error) {
      console.error('🔄 Auto-refresh failed:', error);
    }
  };

  // Auto-refresh when component becomes visible
  useEffect(() => {
    if (!enabled || !mainDirectory) return;
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Small delay to ensure form is fully loaded
        setTimeout(refreshMetadata, 100);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also refresh when component mounts
    refreshMetadata();
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mainDirectory, enabled]);

  return { refreshMetadata };
};
