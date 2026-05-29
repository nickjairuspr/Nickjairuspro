import React, { useState, useMemo } from 'react';
import { 
  useListManga, 
  useGetMangaStatus, 
  useSearchManga, 
  useTriggerScrape,
  getListMangaQueryKey,
  getGetMangaStatusQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Search, RefreshCw, AlertCircle, Database, CalendarClock } from 'lucide-react';
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

  const { data: status, isLoading: statusLoading } = useGetMangaStatus({
    query: {
      queryKey: getGetMangaStatusQueryKey(),
      refetchInterval: (query) => (query.state.data?.isRunning ? 2000 : 30000)
    }
  });

  const triggerScrape = useTriggerScrape();

  const isSearching = debouncedSearch.length > 0;

  const { 
    data: listData, 
    isLoading: listLoading,
    error: listError 
  } = useListManga(
    { limit: 50, page: 1 }, 
    { 
      query: { 
        enabled: !isSearching,
        queryKey: getListMangaQueryKey({ limit: 50, page: 1 })
      } 
    }
  );

  const { 
    data: searchData, 
    isLoading: searchLoading,
    error: searchError
  } = useSearchManga(
    { q: debouncedSearch },
    {
      query: {
        enabled: isSearching,
        queryKey: ['searchManga', debouncedSearch]
      }
    }
  );

  const isLoading = isSearching ? searchLoading : listLoading;
  const error = isSearching ? searchError : listError;
  const mangas = isSearching ? searchData?.mangas : listData?.mangas;
  const isRunning = status?.isRunning || triggerScrape.isPending;

  const handleScrape = () => {
    triggerScrape.mutate(undefined, {
      onSuccess: (result) => {
        toast({
          title: "Scrape Started",
          description: result.message || "Checking for new manga...",
        });
        queryClient.invalidateQueries({ queryKey: getGetMangaStatusQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListMangaQueryKey() });
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Scrape Failed",
          description: err.message || "An error occurred while starting the scrape.",
        });
      }
    });
  };

  const lastScrapedStr = useMemo(() => {
    if (!status?.lastScraped) return 'Never';
    try {
      return formatDistanceToNow(new Date(status.lastScraped), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  }, [status?.lastScraped]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Database className="w-4 h-4 text-primary" />
            </div>
            <h1 className="font-bold text-lg tracking-tight hidden sm:block">
              Manga<span className="text-primary">Buddy</span>
            </h1>
          </div>

          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              type="text"
              placeholder="Search titles..."
              className="w-full pl-9 bg-secondary/50 border-secondary focus-visible:ring-primary h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end text-xs">
              <div className="text-muted-foreground flex items-center gap-1.5">
                <CalendarClock className="w-3 h-3" />
                <span>Last scrape: {lastScrapedStr}</span>
              </div>
              {status?.nextScheduled && (
                <div className="text-muted-foreground/80 flex items-center gap-1.5 mt-0.5">
                  <CalendarClock className="w-3 h-3 opacity-50" />
                  <span>Next: {formatDistanceToNow(new Date(status.nextScheduled), { addSuffix: true })}</span>
                </div>
              )}
              <div className="font-medium text-foreground mt-1">
                {status?.total || 0} titles tracked
              </div>
            </div>
            
            <Button 
              onClick={handleScrape} 
              disabled={isRunning}
              size="sm"
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20"
            >
              <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRunning ? 'Scraping...' : 'Scrape Now'}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {error ? (
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 flex items-center gap-4 text-destructive">
            <AlertCircle className="w-8 h-8 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-lg">Error loading manga</h3>
              <p className="text-sm opacity-90">{error.message}</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <MangaCardSkeleton key={i} />
            ))}
          </div>
        ) : mangas && mangas.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-6 animate-in fade-in duration-500">
            {mangas.map((manga) => (
              <MangaCard key={manga.id} manga={manga} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mb-6">
              <Database className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No manga found</h2>
            <p className="text-muted-foreground max-w-sm mb-8">
              {isSearching 
                ? `We couldn't find any titles matching "${searchQuery}".`
                : "Your database is empty. Trigger a scrape to start discovering manga."}
            </p>
            {!isSearching && (
              <Button onClick={handleScrape} disabled={isRunning} size="lg" className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20">
                <RefreshCw className={`w-4 h-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
                {isRunning ? 'Scraping in progress...' : 'Trigger initial scrape'}
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
