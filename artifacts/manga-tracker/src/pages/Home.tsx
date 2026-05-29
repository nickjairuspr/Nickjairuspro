import { useState, useMemo, useCallback } from 'react';
import {
  useListManga,
  useGetMangaStatus,
  useSearchManga,
  useTriggerScrape,
  getListMangaQueryKey,
  getGetMangaStatusQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Search, RefreshCw, AlertCircle, BookOpen, Clock, Zap, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';
import { MangaCard, MangaCardSkeleton } from '@/components/MangaCard';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: status } = useGetMangaStatus({
    query: {
      queryKey: getGetMangaStatusQueryKey(),
      refetchInterval: (query) => (query.state.data?.isRunning ? 2000 : 15000),
    },
  });

  const triggerScrape = useTriggerScrape();
  const isSearching = debouncedSearch.length > 0;

  const { data: listData, isLoading: listLoading, error: listError } = useListManga(
    { limit: 200, page: 1 },
    { query: { enabled: !isSearching, queryKey: getListMangaQueryKey({ limit: 200, page: 1 }) } }
  );

  const { data: searchData, isLoading: searchLoading, error: searchError } = useSearchManga(
    { q: debouncedSearch },
    { query: { enabled: isSearching, queryKey: ['searchManga', debouncedSearch] } }
  );

  const isLoading = isSearching ? searchLoading : listLoading;
  const error = isSearching ? searchError : listError;
  const mangas = isSearching ? searchData?.mangas : listData?.mangas;
  const isRunning = status?.isRunning || triggerScrape.isPending;

  const handleScrape = useCallback(() => {
    triggerScrape.mutate(undefined, {
      onSuccess: (result) => {
        toast({ title: 'Scrape complete', description: result.message });
        queryClient.invalidateQueries({ queryKey: getGetMangaStatusQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListMangaQueryKey() });
      },
      onError: (err) => {
        toast({ variant: 'destructive', title: 'Scrape failed', description: err.message });
      },
    });
  }, [triggerScrape, toast, queryClient]);

  const lastScrapedStr = useMemo(() => {
    if (!status?.lastScraped) return null;
    try { return formatDistanceToNow(new Date(status.lastScraped), { addSuffix: true }); }
    catch { return null; }
  }, [status?.lastScraped]);

  const nextScheduledStr = useMemo(() => {
    if (!status?.nextScheduled) return null;
    try { return formatDistanceToNow(new Date(status.nextScheduled), { addSuffix: true }); }
    catch { return null; }
  }, [status?.nextScheduled]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border glass">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center glow-primary">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">
              Nick<span className="text-primary">Pro</span>
            </span>
          </div>

          <div className="flex-1 relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search manga titles..."
              className="w-full pl-9 pr-9 bg-secondary/50 border-secondary focus-visible:ring-primary/60 h-9 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-clear-search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="hidden lg:flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-amber-400 animate-pulse' : status?.lastScraped ? 'bg-emerald-400' : 'bg-muted-foreground/40'}`} />
                <span>{isRunning ? 'Scraping...' : lastScrapedStr ? `Scraped ${lastScrapedStr}` : 'Never scraped'}</span>
              </div>
              {nextScheduledStr && !isRunning && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <span>Next {nextScheduledStr}</span>
                </div>
              )}
              {(status?.total ?? 0) > 0 && (
                <div className="font-semibold text-foreground">
                  {status?.total.toLocaleString()} titles
                </div>
              )}
            </div>

            <Button
              onClick={handleScrape}
              disabled={isRunning}
              size="sm"
              data-testid="button-scrape"
              className="gap-2 bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/20 transition-all duration-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRunning ? 'Scraping...' : 'Scrape Now'}</span>
            </Button>
          </div>
        </div>
      </header>

      {isSearching && (
        <div className="border-b border-border bg-secondary/30 px-4 sm:px-6 py-2.5 text-sm text-muted-foreground max-w-screen-2xl mx-auto w-full">
          {searchLoading
            ? 'Searching...'
            : `${searchData?.mangas?.length ?? 0} result${(searchData?.mangas?.length ?? 0) !== 1 ? 's' : ''} for "${searchQuery}"`}
        </div>
      )}

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-8">
        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">Failed to load manga</p>
              <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3 lg:gap-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <MangaCardSkeleton key={i} />
            ))}
          </div>
        ) : mangas && mangas.length > 0 ? (
          <>
            {!isSearching && (
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{mangas.length}</span> titles
                </p>
              </div>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3 lg:gap-4 animate-in fade-in duration-500">
              {mangas.map((manga, idx) => (
                <div
                  key={manga.id}
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                  style={{ animationDelay: `${Math.min(idx * 20, 400)}ms`, animationFillMode: 'both' }}
                  data-testid={`item-manga-${manga.id}`}
                >
                  <MangaCard manga={manga} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
              <Zap className="w-9 h-9 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">
              {isSearching ? 'No results found' : 'No manga yet'}
            </h2>
            <p className="text-muted-foreground max-w-sm mb-8 text-sm leading-relaxed">
              {isSearching
                ? `No titles matched "${searchQuery}". Try a different search.`
                : 'Your collection is empty. Hit Scrape Now to pull the latest manga from MangaBuddy.'}
            </p>
            {!isSearching && (
              <Button
                onClick={handleScrape}
                disabled={isRunning}
                size="lg"
                data-testid="button-trigger-scrape"
                className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/20 gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
                {isRunning ? 'Scraping in progress...' : 'Trigger first scrape'}
              </Button>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-border py-4 px-6 text-center">
        <p className="text-xs text-muted-foreground/50">
          NickPro &mdash; manga scraped from MangaBuddy &mdash; auto-refreshes every 6 hours
        </p>
      </footer>
    </div>
  );
}
