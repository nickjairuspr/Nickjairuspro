import { useState } from 'react';
import { MangaItem } from '@workspace/api-client-react';
import { BookOpen, ExternalLink } from 'lucide-react';

interface MangaCardProps {
  manga: MangaItem;
}

export function MangaCard({ manga }: MangaCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <a
      href={manga.url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={`card-manga-${manga.id}`}
      className="group relative flex flex-col rounded-xl overflow-hidden bg-card border border-card-border hover:border-primary/60 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)] hover:shadow-primary/15 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="aspect-[2/3] w-full overflow-hidden bg-secondary relative">
        {manga.image && !imgError ? (
          <img
            src={manga.image}
            alt={manga.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-secondary">
            <BookOpen className="w-10 h-10 mb-2 opacity-30" />
            <span className="text-xs font-medium uppercase tracking-widest opacity-40">No Cover</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-0 group-hover:translate-y-0 transition-transform duration-300">
          <p className="text-white text-sm font-semibold line-clamp-2 leading-snug drop-shadow-lg">
            {manga.title}
          </p>
        </div>

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-7 h-7 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
            <ExternalLink className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </div>
    </a>
  );
}

export function MangaCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-card border border-card-border animate-pulse">
      <div className="aspect-[2/3] w-full bg-secondary/60" />
    </div>
  );
}
