import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { BookOpen, Heart, ShoppingCart, PenTool, LogOut, ThumbsUp, ThumbsDown, ArrowLeft, Gift, Lock, Eye } from 'lucide-react';
import { ethers } from 'ethers';
import FullPageLoader from '@/components/FullPageLoader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserProfile } from '@/contexts/UserProfileContext';

interface Article {
  id: bigint;
  author: string;
  title: string;
  ipfsHash: string;
  price: bigint;
  upvotes: bigint;
  downvotes: bigint;
}

interface ArticleAnalytics {
  total_likes: number;
  total_dislikes: number;
  total_views: number;
}

interface UserReaction {
  has_reacted: boolean;
  reaction_type: 'like' | 'dislike' | null;
}

export default function ArticleContent() {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
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
    isArticleFavorited
  } = useUserProfile();
  const [article, setArticle] = useState<Article | null>(null);
  const [articleContent, setArticleContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [analytics, setAnalytics] = useState<ArticleAnalytics>({
    total_likes: 0,
    total_dislikes: 0,
    total_views: 0
  });
  const [userReaction, setUserReaction] = useState<UserReaction>({
    has_reacted: false,
    reaction_type: null
  });
  const [isFavorited, setIsFavorited] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (articleId && contract && account) {
      loadArticle();
    }
  }, [articleId, contract, account]);

  const loadArticle = async () => {
    if (!contract || !account || !articleId) return;
    
    try {
      setLoading(true);
      const articleData = await contract.articles(articleId);
      const access = await contract.checkAccess(articleId, account);
      const isAuthor = articleData.author.toLowerCase() === account.toLowerCase();
      const isFree = articleData.price === 0n;
      
      setArticle({
        id: articleData.id,
        author: articleData.author,
        title: articleData.title,
        ipfsHash: articleData.ipfsHash,
        price: articleData.price,
        upvotes: articleData.upvotes,
        downvotes: articleData.downvotes,
      });
      
      // Free articles are accessible to everyone, paid articles require purchase
      setHasAccess(access || isAuthor || isFree);
      
      // Load analytics, user reaction, and favorite status
      const [analyticsData, reactionData, favoritedStatus] = await Promise.all([
        getArticleAnalytics(Number(articleId)),
        getUserReaction(Number(articleId)),
        isArticleFavorited(Number(articleId))
      ]);
      
      setAnalytics(analyticsData);
      setUserReaction(reactionData);
      setIsFavorited(favoritedStatus);
      
      // Record view
      await recordView(Number(articleId));
      
      if (access || isAuthor || isFree) {
        await loadArticleContent(articleData.ipfsHash);
      }
    } catch (error: any) {
      toast({
        title: "Error loading article",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadArticleContent = async (ipfsHash: string) => {
    try {
      const res = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
      const html = await res.text();
      setArticleContent(html);
    } catch (error) {
      console.error('Failed to fetch article content:', error);
      setArticleContent('Failed to load article content.');
    }
  };

  const purchaseArticle = async () => {
    if (!contract || !article) return;
    setIsPurchasing(true);
    try {
      const tx = await contract.purchaseArticle(article.id, { value: article.price });
      toast({
        title: "Processing payment...",
        description: "Waiting for transaction confirmation.",
      });
      await tx.wait();

      toast({
        title: "Article purchased!",
        description: "You now have access to the full article content.",
      });

      setHasAccess(true);
      await loadArticleContent(article.ipfsHash);
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

  const handleLike = async () => {
    if (!articleId) return;
    setIsReacting(true);
    
    try {
      let result;
      if (userReaction.has_reacted && userReaction.reaction_type === 'like') {
        result = await removeReaction(Number(articleId));
        setUserReaction({ has_reacted: false, reaction_type: null });
        toast({
          title: "Like removed",
          description: "Your reaction has been updated.",
        });
      } else {
        result = await likeArticle(Number(articleId));
        setUserReaction({ has_reacted: true, reaction_type: 'like' });
        toast({
          title: "Article liked",
          description: "Your reaction has been updated.",
        });
      }

      setAnalytics({
        ...analytics,
        total_likes: result.likes,
        total_dislikes: result.dislikes
      });
    } catch (error) {
      toast({
        title: "Failed to update reaction",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsReacting(false);
    }
  };

  const handleDislike = async () => {
    if (!articleId) return;
    setIsReacting(true);
    
    try {
      let result;
      if (userReaction.has_reacted && userReaction.reaction_type === 'dislike') {
        result = await removeReaction(Number(articleId));
        setUserReaction({ has_reacted: false, reaction_type: null });
        toast({
          title: "Dislike removed",
          description: "Your reaction has been updated.",
        });
      } else {
        result = await dislikeArticle(Number(articleId));
        setUserReaction({ has_reacted: true, reaction_type: 'dislike' });
        toast({
          title: "Article disliked",
          description: "Your reaction has been updated.",
        });
      }

      setAnalytics({
        ...analytics,
        total_likes: result.likes,
        total_dislikes: result.dislikes
      });
    } catch (error) {
      toast({
        title: "Failed to update reaction",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsReacting(false);
    }
  };

  const handleFavorite = async () => {
    if (!articleId || !article) return;
    setIsFavoriting(true);
    
    try {
      if (isFavorited) {
        await removeFromFavorites(Number(articleId));
        setIsFavorited(false);
        toast({
          title: "Removed from favorites",
          description: "Article removed from your favorites.",
        });
      } else {
        await addToFavorites(Number(articleId), article.title);
        setIsFavorited(true);
        toast({
          title: "Added to favorites",
          description: "Article added to your favorites.",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to update favorites",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFavoriting(false);
    }
  };

  if (loading) {
    return <FullPageLoader text="Loading article..." />;
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Article not found</h2>
          <Button onClick={() => navigate('/articles')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Articles
          </Button>
        </div>
      </div>
    );
  }

  const isAuthor = article.author.toLowerCase() === account?.toLowerCase();
  const isFree = article.price === 0n;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <BookOpen className="h-8 w-8" />
            <Link to="/articles" className="text-2xl font-bold hover:underline">
              WriteStream
            </Link>
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
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/articles')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Articles
          </Button>
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {isFree ? (
                    <Badge variant="secondary" className="text-sm font-semibold flex items-center">
                      <Gift className="mr-1 h-3 w-3" />
                      Free
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-sm font-semibold flex items-center">
                      <Lock className="mr-1 h-3 w-3" />
                      {ethers.formatEther(article.price)} ETH
                    </Badge>
                  )}
                  
                  {hasAccess && !isFree && (
                    <Badge variant="secondary" className="text-xs">
                      Purchased
                    </Badge>
                  )}
                  
                  {isAuthor && (
                    <Badge variant="outline" className="text-xs">
                      Your Article
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-3xl leading-tight mb-2">{article.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  by {article.author.slice(0, 6)}...{article.author.slice(-4)}
                </p>
              </div>
              
              {/* Favorite Button - Only for non-authors */}
              {!isAuthor && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFavorite}
                  disabled={isFavoriting}
                  className="ml-4"
                >
                  <Heart 
                    className={`h-5 w-5 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} 
                  />
                </Button>
              )}
            </div>

            {/* Analytics Section - Show for everyone who has access */}
            {(hasAccess || isAuthor) && (
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {!isAuthor ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleLike}
                          disabled={isReacting}
                          className={`flex items-center gap-2 ${
                            userReaction.reaction_type === 'like' 
                              ? 'text-blue-600 bg-blue-50 dark:bg-blue-950' 
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <ThumbsUp className="h-4 w-4" />
                          <span>{analytics.total_likes}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDislike}
                          disabled={isReacting}
                          className={`flex items-center gap-2 ${
                            userReaction.reaction_type === 'dislike' 
                              ? 'text-red-600 bg-red-50 dark:bg-red-950' 
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <ThumbsDown className="h-4 w-4" />
                          <span>{analytics.total_dislikes}</span>
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <ThumbsUp className="h-4 w-4" />
                          <span>{analytics.total_likes}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <ThumbsDown className="h-4 w-4" />
                          <span>{analytics.total_dislikes}</span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span>{analytics.total_views}</span>
                  </div>
                </div>
                
                {userReaction.has_reacted && !isAuthor && (
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      You {userReaction.reaction_type === 'like' ? 'liked' : 'disliked'} this article
                    </Badge>
                  </div>
                )}
              </div>
            )}
            
            <div className='w-full mx-auto bg-muted-foreground/30 h-[2px]'></div>
          </CardHeader>
          
          <CardContent>
            {hasAccess || isAuthor ? (
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <style>{`
                  .article-content {
                    line-height: 1.8;
                    font-size: 1.1rem;
                  }
                  .article-content h1 {
                    font-size: 2.5rem;
                    font-weight: 700;
                    margin-bottom: 1.5rem;
                    margin-top: 2.5rem;
                    line-height: 1.2;
                  }
                  .article-content h2 {
                    font-size: 2rem;
                    font-weight: 600;
                    margin-bottom: 1rem;
                    margin-top: 2rem;
                    line-height: 1.3;
                  }
                  .article-content h3 {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-bottom: 0.75rem;
                    margin-top: 1.5rem;
                    line-height: 1.4;
                  }
                  .article-content p {
                    margin-bottom: 1.5rem;
                    line-height: 1.8;
                  }
                  .article-content strong {
                    font-weight: 600;
                  }
                  .article-content em {
                    font-style: italic;
                  }
                  .article-content ul {
                    margin-bottom: 1.5rem;
                    padding-left: 2rem;
                    list-style-type: disc;
                  }
                  .article-content ol {
                    margin-bottom: 1.5rem;
                    padding-left: 2rem;
                    list-style-type: decimal;
                  }
                  .article-content ul ul {
                    list-style-type: circle;
                    margin-top: 0.5rem;
                  }
                  .article-content ul ul ul {
                    list-style-type: square;
                  }
                  .article-content ol ol {
                    list-style-type: lower-alpha;
                    margin-top: 0.5rem;
                  }
                  .article-content ol ol ol {
                    list-style-type: lower-roman;
                  }
                  .article-content li {
                    margin-bottom: 0.75rem;
                    line-height: 1.6;
                  }
                  .article-content blockquote {
                    border-left: 4px solid #e5e7eb;
                    padding-left: 1.5rem;
                    margin: 2rem 0;
                    font-style: italic;
                    font-size: 1.1rem;
                  }
                  .dark .article-content blockquote {
                    border-left-color: #374151;
                  }
                  .article-content code {
                    background-color: #f3f4f6;
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.375rem;
                    font-size: 0.9em;
                  }
                  .dark .article-content code {
                    background-color: #374151;
                  }
                  .article-content pre {
                    background-color: #f3f4f6;
                    padding: 1.5rem;
                    border-radius: 0.75rem;
                    overflow-x: auto;
                    margin: 1.5rem 0;
                  }
                  .dark .article-content pre {
                    background-color: #1f2937;
                  }
                  .article-content a {
                    color: #2563eb;
                    text-decoration: underline;
                  }
                  .dark .article-content a {
                    color: #60a5fa;
                  }
                  .article-content img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 0.5rem;
                    margin: 1.5rem 0;
                  }
                `}</style>
                <div 
                  className="article-content"
                  dangerouslySetInnerHTML={{ 
                    __html: articleContent 
                  }}
                />
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Purchase to read</h3>
                <p className="text-muted-foreground mb-6">
                  Purchase this article to read the full content and interact with it.
                </p>
                <Button
                  size="lg"
                  onClick={purchaseArticle}
                  disabled={isPurchasing}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Buy Article for {ethers.formatEther(article.price)} ETH
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}