import React, { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Heart, ShoppingCart, PenTool, LogOut, Wallet, ThumbsUp, ThumbsDown, Gift, Lock, Eye } from 'lucide-react';
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
  const [descriptionsMap, setDescriptionsMap] = useState<{ [id: string]: string }>({});
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isTipping, setIsTipping] = useState(false);
  const [isLoadingDescription, setIsLoadingDescription] = useState(false);
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
          
          // Extract first 200 characters as preview, preserving some formatting
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

      // Update access map and reload descriptions
      const newAccessMap = {
        ...accessMap,
        [articleId.toString()]: true
      };
      setAccessMap(newAccessMap);
      
      // Load description for newly purchased article
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

  if (loading) {
    return <FullPageLoader text="Loading articles..." />;
  }
  if (isPurchasing) {
    return <FullPageLoader text="Processing payment..." />;
  }
  if (isTipping) {
    return <FullPageLoader text="Sending tip..." />;
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => {
              const hasAccess = accessMap[article.id.toString()];
              const articleId = article.id.toString();
              const isAuthor = article.author.toLowerCase() === account?.toLowerCase();
              const isFree = article.price === 0n;
              const description = descriptionsMap[articleId] || '';
              
              return (
                <Card 
                  key={articleId} 
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] flex flex-col h-full"
                  onClick={() => navigate(`/article/${articleId}`)}
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

                    {/* Stats */}
                    <div className="flex items-center justify-between mb-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          <span>{article.upvotes.toString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ThumbsDown className="h-3 w-3" />
                          <span>{article.downvotes.toString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>View</span>
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
                              navigate(`/article/${articleId}`);
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
                              navigate(`/article/${articleId}`);
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