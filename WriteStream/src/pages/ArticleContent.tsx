import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { BookOpen, Heart, ShoppingCart, PenTool, LogOut, Wallet, ThumbsUp, ThumbsDown, ArrowLeft, Gift, Lock } from 'lucide-react';
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

export default function ArticleContent() {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const { account, contract, disconnectWallet } = useWallet();
  const [article, setArticle] = useState<Article | null>(null);
  const [articleContent, setArticleContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<boolean | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
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
      const voted = await contract.hasUserVoted(articleId, account);
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
      setHasVoted(voted);
      
      if (voted) {
        const vote = await contract.getUserVote(articleId, account);
        setUserVote(vote);
      }
      
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

  const voteArticle = async (isUpvote: boolean) => {
    if (!contract || !article) return;
    setIsVoting(true);
    try {
      const tx = await contract.voteArticle(article.id, isUpvote);
      toast({
        title: "Submitting vote...",
        description: "Waiting for transaction confirmation.",
      });
      await tx.wait();

      toast({
        title: "Vote submitted!",
        description: `Your ${isUpvote ? 'upvote' : 'downvote'} has been recorded.`,
      });

      setHasVoted(true);
      setUserVote(isUpvote);
      
      // Update vote counts
      if (isUpvote) {
        setArticle(prev => prev ? { ...prev, upvotes: prev.upvotes + 1n } : null);
      } else {
        setArticle(prev => prev ? { ...prev, downvotes: prev.downvotes + 1n } : null);
      }
    } catch (error: any) {
      toast({
        title: "Vote failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
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
            
            <div className="flex items-center space-x-2 text-sm">
              <Wallet className="h-4 w-4" />
              <span>{account?.slice(0, 6)}...{account?.slice(-4)}</span>
            </div>
            
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
            </div>

            {/* Vote Section - For non-authors who have access (free articles or purchased paid articles) */}
            {hasAccess && !isAuthor && (
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant={userVote === true ? "default" : "outline"}
                    size="sm"
                    onClick={() => voteArticle(true)}
                    disabled={hasVoted || isVoting}
                  >
                    <ThumbsUp className="mr-2 h-4 w-4" />
                    {article.upvotes.toString()}
                  </Button>
                  <Button
                    variant={userVote === false ? "default" : "outline"}
                    size="sm"
                    onClick={() => voteArticle(false)}
                    disabled={hasVoted || isVoting}
                  >
                    <ThumbsDown className="mr-2 h-4 w-4" />
                    {article.downvotes.toString()}
                  </Button>
                  {hasVoted && (
                    <Badge variant="outline" className="text-xs">
                      You voted {userVote ? 'up' : 'down'}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!isAuthor && (
              <div className="flex gap-2">
                {isFree ? (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => {
                      if (!hasAccess) {
                        setHasAccess(true);
                        loadArticleContent(article.ipfsHash);
                      }
                    }}
                    className="flex-1"
                  >
                    <Gift className="mr-2 h-4 w-4" />
                    Read Free Article
                  </Button>
                
                ) : !hasAccess ? (
                  <Button
                    size="lg"
                    onClick={purchaseArticle}
                    disabled={isPurchasing}
                    className="flex-1"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Buy Article for {ethers.formatEther(article.price)} ETH
                  </Button>
                ) : null}
              </div>
            )}
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
                  .article-content ul, .article-content ol {
                    margin-bottom: 1.5rem;
                    padding-left: 2rem;
                  }
                  .article-content li {
                    margin-bottom: 0.75rem;
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
                  Purchase this article to read the full content and vote on it.
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