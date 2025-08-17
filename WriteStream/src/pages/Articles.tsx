import React, { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Heart, 
  ShoppingCart, 
  PenTool, 
  LogOut, 
  ThumbsUp, 
  ThumbsDown, 
  Gift, 
  Lock, 
  Eye,
  User,
  X,
  Search
} from 'lucide-react';
import { ethers } from 'ethers';
import FullPageLoader from '@/components/FullPageLoader';

interface Article {
  id: bigint;
  author: string;
  title: string;
  ipfsHash: string;
  price: bigint;
  upvotes: bigint;
  downvotes: bigint;
}

interface ArticleWithAnalytics extends Article {
  analytics: {
    total_likes: number;
    total_dislikes: number;
    total_views: number;
  };
  userReaction: {
    has_reacted: boolean;
    reaction_type: 'like' | 'dislike' | null;
  };
  isFavorited: boolean;
}

type FilterType = 'all' | 'my-articles' | 'favorites';

export default function Articles() {
  const { account, contract, disconnectWallet } = useWallet();
  const { 
    profile,
    recordView, 
    likeArticle, 
    dislikeArticle, 
    removeReaction, 
    getUserReaction, 
    getArticleAnalytics,
    addToFavorites,
    removeFromFavorites,
    isArticleFavorited,
    getUserFavorites,
    getUserArticles
  } = useUserProfile();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<ArticleWithAnalytics[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<ArticleWithAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessMap, setAccessMap] = useState<{ [id: string]: boolean }>({});
  const [descriptionsMap, setDescriptionsMap] = useState<{ [id: string]: string }>({});
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isLoadingDescription, setIsLoadingDescription] = useState(false);
  const [reactingArticles, setReactingArticles] = useState<Set<string>>(new Set());
  const [favoriteArticles, setFavoriteArticles] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [userFavorites, setUserFavorites] = useState<number[]>([]);
  const [userArticleIds, setUserArticleIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadArticles();
    loadUserData();
  }, [contract, account]);

  useEffect(() => {
    filterArticles();
  }, [articles, activeFilter, userFavorites, userArticleIds, searchQuery]);

  const loadUserData = async () => {
    try {
      const [favorites, userArticles] = await Promise.all([
        getUserFavorites(),
        getUserArticles()
      ]);
      
      setUserFavorites(favorites.map((fav: any) => fav.article_id));
      setUserArticleIds(userArticles.map((article: any) => article.article_id));
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const filterArticles = () => {
    let filtered = [...articles];
    
    // Apply filter
    switch (activeFilter) {
      case 'my-articles':
        filtered = filtered.filter(article => 
          article.author.toLowerCase() === account?.toLowerCase()
        );
        break;
      case 'favorites':
        filtered = filtered.filter(article => 
          userFavorites.includes(Number(article.id))
        );
        break;
      case 'all':
      default:
        // Show all articles
        break;
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(article => {
        const title = article.title.toLowerCase();
        const author = article.author.toLowerCase();
        const description = descriptionsMap[article.id.toString()]?.toLowerCase() || '';
        
        return title.includes(query) || 
               author.includes(query) || 
               description.includes(query);
      });
    }
    
    setFilteredArticles(filtered);
  };

  const loadArticles = async () => {
    if (!contract || !account) return;
    try {
      setLoading(true);
      const count = await contract.articleCount();
      const fetchedArticles: Article[] = [];
      const access: { [id: string]: boolean } = {};

      for (let i = 1; i <= count; i++) {
        try {
          const article = await contract.articles(i);
          fetchedArticles.push({
            id: article.id,
            author: article.author,
            title: article.title,
            ipfsHash: article.ipfsHash,
            price: article.price,
            upvotes: article.upvotes,
            downvotes: article.downvotes,
          });
          access[article.id.toString()] = await contract.checkAccess(article.id, account);
        } catch (err) {
          console.error(`Error loading article ${i}:`, err);
        }
      }

      setAccessMap(access);
      
      // Load analytics, user reactions, and favorites for each article
      const articlesWithAnalytics = await Promise.all(
        fetchedArticles.map(async (article) => {
          const [analytics, userReaction, isFavorited] = await Promise.all([
            getArticleAnalytics(Number(article.id)),
            getUserReaction(Number(article.id)),
            isArticleFavorited(Number(article.id))
          ]);
          
          return {
            ...article,
            analytics,
            userReaction,
            isFavorited
          };
        })
      );

      setArticles(articlesWithAnalytics.reverse());
      
      // Load descriptions for accessible articles
      await loadDescriptions(fetchedArticles, access);
    } catch (error: any) {
      toast({
        title: "Error loading articles",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDescriptions = async (articles: Article[], access: { [id: string]: boolean }) => {
    const descriptions: { [id: string]: string } = {};
    
    for (const article of articles) {
      const articleId = article.id.toString();
      const isAuthor = article.author.toLowerCase() === account?.toLowerCase();
      const isFree = article.price === 0n;
      const hasAccess = access[articleId] || isAuthor || isFree;
      
      if (hasAccess) {
        try {
          const response = await fetch(`https://gateway.pinata.cloud/ipfs/${article.ipfsHash}`);
          const htmlContent = await response.text();
          
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlContent;
          const textContent = tempDiv.textContent || tempDiv.innerText || '';
          descriptions[articleId] = textContent.substring(0, 200) + (textContent.length > 200 ? '...' : '');
        } catch (error) {
          console.error(`Failed to load description for article ${articleId}:`, error);
          descriptions[articleId] = 'Failed to load preview.';
        }
      } else {
        descriptions[articleId] = 'Purchase this article to read the full content and see the preview.';
      }
    }
    
    setDescriptionsMap(descriptions);
  };

  const handleFavorite = async (articleId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const articleIdNum = Number(articleId);
    setFavoriteArticles(prev => new Set([...prev, articleId]));
    
    try {
      const article = articles.find(a => a.id.toString() === articleId);
      if (!article) return;

      if (article.isFavorited) {
        await removeFromFavorites(articleIdNum);
        setUserFavorites(prev => prev.filter(id => id !== articleIdNum));
        toast({
          title: "Removed from favorites",
          description: "Article removed from your favorites.",
        });
      } else {
        await addToFavorites(articleIdNum, article.title);
        setUserFavorites(prev => [...prev, articleIdNum]);
        toast({
          title: "Added to favorites",
          description: "Article added to your favorites.",
        });
      }

      // Update the article state
      setArticles(prev => prev.map(a => {
        if (a.id.toString() === articleId) {
          return { ...a, isFavorited: !a.isFavorited };
        }
        return a;
      }));

    } catch (error) {
      toast({
        title: "Failed to update favorites",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setFavoriteArticles(prev => {
        const newSet = new Set(prev);
        newSet.delete(articleId);
        return newSet;
      });
    }
  };

  const handleLike = async (articleId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const articleIdNum = Number(articleId);
    setReactingArticles(prev => new Set([...prev, articleId]));
    
    try {
      const article = articles.find(a => a.id.toString() === articleId);
      if (!article) return;

      let result;
      if (article.userReaction.has_reacted && article.userReaction.reaction_type === 'like') {
        result = await removeReaction(articleIdNum);
      } else {
        result = await likeArticle(articleIdNum);
      }

      setArticles(prev => prev.map(a => {
        if (a.id.toString() === articleId) {
          const wasLiked = a.userReaction.has_reacted && a.userReaction.reaction_type === 'like';
          return {
            ...a,
            analytics: {
              ...a.analytics,
              total_likes: result.likes,
              total_dislikes: result.dislikes
            },
            userReaction: wasLiked ? 
              { has_reacted: false, reaction_type: null } :
              { has_reacted: true, reaction_type: 'like' as const }
          };
        }
        return a;
      }));

      toast({
        title: article.userReaction.has_reacted && article.userReaction.reaction_type === 'like' ? 
          "Like removed" : "Article liked",
        description: "Your reaction has been updated.",
      });
    } catch (error) {
      toast({
        title: "Failed to update reaction",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setReactingArticles(prev => {
        const newSet = new Set(prev);
        newSet.delete(articleId);
        return newSet;
      });
    }
  };

  const handleDislike = async (articleId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const articleIdNum = Number(articleId);
    setReactingArticles(prev => new Set([...prev, articleId]));
    
    try {
      const article = articles.find(a => a.id.toString() === articleId);
      if (!article) return;

      let result;
      if (article.userReaction.has_reacted && article.userReaction.reaction_type === 'dislike') {
        result = await removeReaction(articleIdNum);
      } else {
        result = await dislikeArticle(articleIdNum);
      }

      setArticles(prev => prev.map(a => {
        if (a.id.toString() === articleId) {
          const wasDisliked = a.userReaction.has_reacted && a.userReaction.reaction_type === 'dislike';
          return {
            ...a,
            analytics: {
              ...a.analytics,
              total_likes: result.likes,
              total_dislikes: result.dislikes
            },
            userReaction: wasDisliked ? 
              { has_reacted: false, reaction_type: null } :
              { has_reacted: true, reaction_type: 'dislike' as const }
          };
        }
        return a;
      }));

      toast({
        title: article.userReaction.has_reacted && article.userReaction.reaction_type === 'dislike' ? 
          "Dislike removed" : "Article disliked",
        description: "Your reaction has been updated.",
      });
    } catch (error) {
      toast({
        title: "Failed to update reaction",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setReactingArticles(prev => {
        const newSet = new Set(prev);
        newSet.delete(articleId);
        return newSet;
      });
    }
  };

  const purchaseArticle = async (articleId: bigint, price: bigint, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!contract) return;
    setIsPurchasing(true);
    try {
      toast({
        title: "Processing payment...",
        description: "Please wait while your transaction is being processed.",
      });

      const tx = await contract.purchaseArticle(articleId, { value: price });
      await tx.wait();

      toast({
        title: "Article purchased!",
        description: "You now have access to the full article content.",
      });

      const newAccessMap = {
        ...accessMap,
        [articleId.toString()]: true
      };
      setAccessMap(newAccessMap);
      
      const article = articles.find(a => a.id === articleId);
      if (article) {
        try {
          const response = await fetch(`https://gateway.pinata.cloud/ipfs/${article.ipfsHash}`);
          const htmlContent = await response.text();
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlContent;
          const textContent = tempDiv.textContent || tempDiv.innerText || '';
          setDescriptionsMap(prev => ({
            ...prev,
            [articleId.toString()]: textContent.substring(0, 200) + (textContent.length > 200 ? '...' : '')
          }));
        } catch (error) {
          console.error('Failed to load description:', error);
        }
      }
    } catch (error: any) {
      toast({
        title: "Purchase failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleArticleClick = async (articleId: string) => {
    await recordView(parseInt(articleId));
    navigate(`/article/${articleId}`);
  };

  const getFilteredCount = (filterType: FilterType) => {
    switch (filterType) {
      case 'my-articles':
        return articles.filter(article => 
          article.author.toLowerCase() === account?.toLowerCase()
        ).length;
      case 'favorites':
        return userFavorites.length;
      default:
        return articles.length;
    }
  };

  if (loading) {
    return <FullPageLoader text="Loading articles..." />;
  }
  if (isPurchasing) {
    return <FullPageLoader text="Processing payment..." />;
  }
  if (isLoadingDescription) {
    return <FullPageLoader text="Loading article content..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <BookOpen className="h-8 w-8" />
            <h1 className="text-2xl font-bold">WriteStream</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link to="/publish">
              <Button variant="outline">
                <PenTool className="mr-2 h-4 w-4" />
                Publish
              </Button>
            </Link>

            <Link to="/profile">
              <Button variant="ghost" size="sm" className="p-1">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm">
                    {profile?.username?.charAt(0).toUpperCase() || account?.slice(2, 4).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </Link>
            
            <Button variant="outline" size="sm" onClick={disconnectWallet}>
              <LogOut className="h-4 w-4" />
            </Button>
            
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Published Articles</h2>
          <p className="text-muted-foreground">
            Discover and support amazing content from writers around the world
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search articles, authors, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All Articles', icon: BookOpen },
              { id: 'my-articles', label: 'My Articles', icon: User },
              { id: 'favorites', label: 'Favorites', icon: Heart },
            ].map((filter) => (
              <Button
                key={filter.id}
                variant={activeFilter === filter.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(filter.id as FilterType)}
                className="flex items-center gap-2"
              >
                <filter.icon className="h-4 w-4" />
                {filter.label}
                <Badge variant="secondary" className="ml-1">
                  {getFilteredCount(filter.id as FilterType)}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Search Results Info */}
        {searchQuery && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              {filteredArticles.length} result{filteredArticles.length !== 1 ? 's' : ''} found for "{searchQuery}"
            </p>
          </div>
        )}

        {filteredArticles.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery ? 'No articles found' :
                 activeFilter === 'all' ? 'No articles yet' : 
                 activeFilter === 'my-articles' ? 'No articles published yet' :
                 'No favorite articles yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? `Try searching with different keywords or clear your search.` :
                 activeFilter === 'all' ? 'Be the first to publish an article on WriteStream!' :
                 activeFilter === 'my-articles' ? 'Start by publishing your first article.' :
                 'Add articles to your favorites by clicking the heart icon.'}
              </p>
              {searchQuery ? (
                <Button onClick={() => setSearchQuery('')}>
                  <X className="mr-2 h-4 w-4" />
                  Clear Search
                </Button>
              ) : (
                <>
                  {(activeFilter === 'all' || activeFilter === 'my-articles') && (
                    <Link to="/publish">
                      <Button>
                        <PenTool className="mr-2 h-4 w-4" />
                        Publish Article
                      </Button>
                    </Link>
                  )}
                  {activeFilter === 'favorites' && (
                    <Button onClick={() => setActiveFilter('all')}>
                      <BookOpen className="mr-2 h-4 w-4" />
                      Browse All Articles
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((article) => {
              const hasAccess = accessMap[article.id.toString()];
              const articleId = article.id.toString();
              const isAuthor = article.author.toLowerCase() === account?.toLowerCase();
              const isFree = article.price === 0n;
              const description = descriptionsMap[articleId] || '';
              const isReacting = reactingArticles.has(articleId);
              const isFavoriting = favoriteArticles.has(articleId);
              
              return (
                <Card 
                  key={articleId} 
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] flex flex-col h-full"
                  onClick={() => handleArticleClick(articleId)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                      {isFree ? (
                        <Badge variant="secondary" className="text-xs flex items-center">
                          <Gift className="mr-1 h-3 w-3" />
                          Free
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs flex items-center">
                          <Lock className="mr-1 h-3 w-3" />
                          {ethers.formatEther(article.price)} ETH
                        </Badge>
                      )}
                      
                      <div className="flex items-center gap-1">
                        {hasAccess && !isFree && (
                          <Badge variant="secondary" className="text-xs">
                            Purchased
                          </Badge>
                        )}
                        {isAuthor && (
                          <Badge variant="outline" className="text-xs">
                            Yours
                          </Badge>
                        )}
                        {/* Favorite Button */}
                        {!isAuthor && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleFavorite(articleId, e)}
                            disabled={isFavoriting}
                            className="p-1 h-6 w-6"
                          >
                            <Heart 
                              className={`h-3 w-3 ${article.isFavorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} 
                            />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <CardTitle className="text-lg leading-tight line-clamp-2 mb-2">
                      {article.title}
                    </CardTitle>
                    
                    <p className="text-xs text-muted-foreground">
                      by {article.author.slice(0, 6)}...{article.author.slice(-4)}
                    </p>
                  </CardHeader>
                  
                  <CardContent className="pt-0 flex-1 flex flex-col">
                    {/* Description Preview */}
                    <div className="mb-4 flex-1">
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                        {description}
                      </p>
                    </div>

                    {/* Stats - All in one line with consistent styling */}
                    <div className="flex items-center justify-between mb-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        {!isAuthor ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleLike(articleId, e)}
                              disabled={isReacting}
                              className={`p-1 h-6 flex items-center gap-1 ${
                                article.userReaction.reaction_type === 'like' 
                                  ? 'text-blue-600 bg-blue-50 dark:bg-blue-950' 
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              <ThumbsUp className="h-3 w-3" />
                              <span className="text-xs">{article.analytics.total_likes}</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDislike(articleId, e)}
                              disabled={isReacting}
                              className={`p-1 h-6 flex items-center gap-1 ${
                                article.userReaction.reaction_type === 'dislike' 
                                  ? 'text-red-600 bg-red-50 dark:bg-red-950' 
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              <ThumbsDown className="h-3 w-3" />
                              <span className="text-xs">{article.analytics.total_dislikes}</span>
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" />
                              <span>{article.analytics.total_likes}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <ThumbsDown className="h-3 w-3" />
                              <span>{article.analytics.total_dislikes}</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>{article.analytics.total_views}</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    {!isAuthor && (
                      <div className="mt-auto">
                        {isFree ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleArticleClick(articleId);
                            }}
                          >
                            <Gift className="mr-2 h-3 w-3" />
                            Read Free
                          </Button>
                        ) : !hasAccess ? (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={(e) => purchaseArticle(article.id, article.price, e)}
                          >
                            <ShoppingCart className="mr-2 h-3 w-3" />
                            Buy for {ethers.formatEther(article.price)} ETH
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleArticleClick(articleId);
                            }}
                          >
                            <Eye className="mr-2 h-3 w-3" />
                            Read Article
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}