import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Comic } from "@/types/comic";

interface ComicCardProps {
  comic: Comic;
  onSelect: (comic: Comic) => void;
}

const ComicList = ({ comic, onSelect }: ComicCardProps) => {
  const progressPercentage = (comic.currentPage / comic.totalPages) * 100;
  const isCompleted = comic.currentPage === comic.totalPages;

  const formatLastRead = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return "Yesterday";
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card 
      className="group cursor-pointer bg-card border-border hover:bg-manga-hover transition-all duration-200 hover:scale-105"
      onClick={() => onSelect(comic)}
    >
      {/* Cover Image */}
      <div className="aspect-[3/4] relative overflow-hidden rounded-t-lg">
        <img
          src={comic.coverImage}
          alt={comic.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          onError={(e) => {
            console.error('ComicList: Failed to load image:', comic.coverImage);
            console.error('Image error:', e);
          }}
          onLoad={() => {
            console.log('ComicList: Image loaded successfully:', comic.coverImage);
          }}
        />
        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm">
          <div className="p-2">
            <div className="w-full bg-black/30 rounded-full h-1.5">
              <div
                className="bg-manga-gradient h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-white/80">
                {comic.currentPage}/{comic.totalPages}
              </span>
              {isCompleted && (
                <Badge variant="secondary" className="text-xs bg-primary text-primary-foreground">
                  Complete
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Comic Info */}
      <div className="p-3 space-y-2">
        <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
          {comic.title}
        </h3>
        {comic.author && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            by {comic.author}
          </p>
        )}
        {/* Genres */}
        <div className="flex flex-wrap gap-1">
          {comic.genres.slice(0, 2).map(genre => (
            <Badge key={genre} variant="outline" className="text-xs">
              {genre}
            </Badge>
          ))}
          {comic.genres.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{comic.genres.length - 2}
            </Badge>
          )}
        </div>
        {/* Last Read */}
        <p className="text-xs text-muted-foreground">
          Last read: {formatLastRead(comic.lastRead)}
        </p>
      </div>
    </Card>
  );
};

export default ComicList;