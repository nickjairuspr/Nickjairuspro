import React, { useState } from 'react';
import { MangaItem } from '@workspace/api-client-react';
import { BookOpen, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface MangaCardProps {
  manga: MangaItem;
}

export function MangaCard({ manga }: MangaCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <Card className="group relative overflow-hidden flex flex-col bg-card border-card-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:shadow-primary/20">
      <div className="aspect-[3/4] w-full overflow-hidden bg-muted relative">
        {manga.image && !imgError ? (
          <img
            src={manga.image}
            alt={manga.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-secondary/50">
            <BookOpen className="w-12 h-12 mb-2 opacity-50" />
            <span className="text-xs font-medium uppercase tracking-wider">No Cover</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
      </div>
      
      <div className="p-4 flex flex-col flex-1 z-10 -mt-10 relative">
        <h3 className="font-semibold text-foreground line-clamp-2 leading-tight drop-shadow-md mb-2">
          {manga.title}
        </h3>
        <div className="mt-auto pt-4 flex items-center justify-between">
          {manga.url ? (
            <a
              href={manga.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <span>View details</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">No URL</span>
          )}
        </div>
      </div>
    </Card>
  );
}

export function MangaCardSkeleton() {
  return (
    <Card className="overflow-hidden flex flex-col bg-card border-card-border animate-pulse">
      <div className="aspect-[3/4] w-full bg-secondary/50"></div>
      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="h-5 bg-secondary/50 rounded w-3/4"></div>
        <div className="h-5 bg-secondary/50 rounded w-1/2"></div>
        <div className="mt-auto pt-4">
          <div className="h-4 bg-secondary/50 rounded w-1/3"></div>
        </div>
      </div>
    </Card>
  );
}
