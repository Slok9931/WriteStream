import React, { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Heart, ShoppingCart, PenTool, LogOut, Wallet, ThumbsUp, ThumbsDown, Gift, Lock } from 'lucide-react';
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

export default function Articles() {
  const { account, contract, disconnectWallet } = useWallet();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessMap, setAccessMap] = useState<{ [id: string]: boolean }>({});
  const [isPurchasing, setIsPurchasing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadArticles();
  }, [contract, account]);

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
          // Check access for this article
          access[article.id.toString()] = await contract.checkAccess(article.id, account);
        } catch (err) {
          console.error(`Error loading article ${i}:`, err);
        }
      }

      setArticles(fetchedArticles.reverse());
      setAccessMap(access);
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

  const purchaseArticle = async (articleId: bigint, price: bigint, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!contract) return;
    setIsPurchasing(true);
    try {
      const tx = await contract.purchaseArticle(articleId, { value: price });
      toast({
        title: "Processing payment...",
        description: "Waiting for transaction confirmation.",
      });
      await tx.wait();

      toast({
        title: "Article purchased!",
        description: "You now have access to the full article content.",
      });

      // Update access map
      setAccessMap(prev => ({
        ...prev,
        [articleId.toString()]: true
      }));
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

  if (loading) {
    return <FullPageLoader text="Loading articles..." />;
  }
  if (isPurchasing) {
    return <FullPageLoader text="Processing payment..." />;
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
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Published Articles</h2>
          <p className="text-muted-foreground">
            Discover and support amazing content from writers around the world
          </p>
        </div>

        {articles.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No articles yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to publish an article on WriteStream!
              </p>
              <Link to="/publish">
                <Button>
                  <PenTool className="mr-2 h-4 w-4" />
                  Publish Article
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {articles.map((article) => {
              const hasAccess = accessMap[article.id.toString()];
              const articleId = article.id.toString();
              const isAuthor = article.author.toLowerCase() === account?.toLowerCase();
              const isFree = article.price === 0n;
              
              return (
                <Card 
                  key={articleId} 
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200"
                  onClick={() => navigate(`/article/${articleId}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
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
                      <div className="flex items-center gap-2">
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
                    </div>
                    <CardTitle className="text-xl leading-tight">{article.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      by {article.author.slice(0, 6)}...{article.author.slice(-4)}
                    </p>
                  </CardHeader>
                  
                  <CardContent>
                    {/* Vote Display */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ThumbsUp className="h-4 w-4" />
                        <span>{article.upvotes.toString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ThumbsDown className="h-4 w-4" />
                        <span>{article.downvotes.toString()}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {!isAuthor && (
                      <div className="flex gap-2">
                        {isFree ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(`/article/${articleId}`);
                            }}
                          >
                            <Gift className="mr-2 h-4 w-4" />
                            Read Free
                          </Button>
                        ) : !hasAccess ? (
                          <Button
                            size="sm"
                            onClick={(e) => purchaseArticle(article.id, article.price, e)}
                            className="flex-1"
                          >
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Buy Article
                          </Button>
                        ) : null}
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