import React, { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { BookOpen, Heart, ShoppingCart, ExternalLink, PenTool, LogOut, Wallet, Eye, EyeOff } from 'lucide-react';
import { ethers } from 'ethers';
import 'react-quill/dist/quill.snow.css';

interface Article {
  id: bigint;
  author: string;
  title: string;
  ipfsHash: string;
  price: bigint;
}

export default function Articles() {
  const { account, contract, disconnectWallet } = useWallet();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [articleDescriptions, setArticleDescriptions] = useState<{ [id: string]: string }>({});
  const [accessMap, setAccessMap] = useState<{ [id: string]: boolean }>({});
  const [expandedArticles, setExpandedArticles] = useState<{ [id: string]: boolean }>({});
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

  const tipWriter = async (articleId: bigint) => {
    if (!contract) return;
    
    try {
      const tx = await contract.tipWriter(articleId, { 
        value: ethers.parseEther("0.01") 
      });
      
      toast({
        title: "Tip sent!",
        description: "Your tip of 0.01 ETH has been sent to the author.",
      });
      
      await tx.wait();
    } catch (error: any) {
      toast({
        title: "Tip failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const purchaseArticle = async (articleId: bigint, price: bigint) => {
    if (!contract) return;
    try {
      const tx = await contract.purchaseArticle(articleId, { value: price });
      toast({
        title: "Article purchased!",
        description: "You now have access to the full article content.",
      });
      await tx.wait();

      // Update access map
      setAccessMap(prev => ({
        ...prev,
        [articleId.toString()]: true
      }));

      // Fetch and show description after purchase
      const article = articles.find(a => a.id === articleId);
      if (article) {
        const desc = await fetchDescription(article.ipfsHash);
        setArticleDescriptions((prev) => ({
          ...prev,
          [articleId.toString()]: desc,
        }));
        setExpandedArticles(prev => ({
          ...prev,
          [articleId.toString()]: true
        }));
      }
    } catch (error: any) {
      toast({
        title: "Purchase failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  async function fetchDescription(ipfsHash: string) {
    try {
      const res = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
      const html = await res.text();
      return html;
    } catch (error) {
      console.error('Failed to fetch description:', error);
      return 'Failed to load article content.';
    }
  }

  const viewDescription = async (article: Article) => {
    const articleId = article.id.toString();
    
    if (articleDescriptions[articleId]) {
      // Toggle expanded state if already loaded
      setExpandedArticles(prev => ({
        ...prev,
        [articleId]: !prev[articleId]
      }));
    } else {
      // Fetch and display
      const desc = await fetchDescription(article.ipfsHash);
      setArticleDescriptions((prev) => ({
        ...prev,
        [articleId]: desc,
      }));
      setExpandedArticles(prev => ({
        ...prev,
        [articleId]: true
      }));
    }
  };

  const toggleArticleExpansion = (articleId: string) => {
    setExpandedArticles(prev => ({
      ...prev,
      [articleId]: !prev[articleId]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p>Loading articles...</p>
        </div>
      </div>
    );
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
              const isExpanded = expandedArticles[articleId];
              const hasContent = articleDescriptions[articleId];
              
              return (
                <Card key={articleId} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline" className="text-sm font-semibold">
                        {ethers.formatEther(article.price)} ETH
                      </Badge>
                      {hasAccess && (
                        <Badge variant="secondary" className="text-xs">
                          Purchased
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl leading-tight">{article.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      by {article.author.slice(0, 6)}...{article.author.slice(-4)}
                    </p>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => tipWriter(article.id)}
                      >
                        <Heart className="mr-2 h-4 w-4" />
                        Tip 0.01Ξ
                      </Button>
                      
                      {!hasAccess && (
                        <Button
                          size="sm"
                          onClick={() => purchaseArticle(article.id, article.price)}
                        >
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Buy Article
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a
                          href={`https://ipfs.io/ipfs/${article.ipfsHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View on IPFS
                        </a>
                      </Button>
                      
                      {hasAccess && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewDescription(article)}
                        >
                          {hasContent ? (
                            isExpanded ? (
                              <>
                                <EyeOff className="mr-2 h-4 w-4" />
                                Hide Content
                              </>
                            ) : (
                              <>
                                <Eye className="mr-2 h-4 w-4" />
                                Show Content
                              </>
                            )
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              Load Content
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Article Content with Proper Formatting */}
                    {hasContent && isExpanded && (
                      <div className="mt-6 border-t pt-6">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <style>{`
                            .article-content {
                              line-height: 1.7;
                            }
                            .article-content h1 {
                              font-size: 2rem;
                              font-weight: 700;
                              margin-bottom: 1rem;
                              margin-top: 2rem;
                              line-height: 1.2;
                            }
                            .article-content h2 {
                              font-size: 1.5rem;
                              font-weight: 600;
                              margin-bottom: 0.75rem;
                              margin-top: 1.5rem;
                              line-height: 1.3;
                            }
                            .article-content h3 {
                              font-size: 1.25rem;
                              font-weight: 600;
                              margin-bottom: 0.5rem;
                              margin-top: 1.25rem;
                              line-height: 1.4;
                            }
                            .article-content p {
                              margin-bottom: 1rem;
                              line-height: 1.7;
                            }
                            .article-content strong {
                              font-weight: 600;
                            }
                            .article-content em {
                              font-style: italic;
                            }
                            .article-content ul, .article-content ol {
                              margin-bottom: 1rem;
                              padding-left: 1.5rem;
                            }
                            .article-content li {
                              margin-bottom: 0.5rem;
                            }
                            .article-content blockquote {
                              border-left: 4px solid #e5e7eb;
                              padding-left: 1rem;
                              margin: 1.5rem 0;
                              font-style: italic;
                            }
                            .dark .article-content blockquote {
                              border-left-color: #374151;
                            }
                            .article-content code {
                              background-color: #f3f4f6;
                              padding: 0.125rem 0.25rem;
                              border-radius: 0.25rem;
                              font-size: 0.875em;
                            }
                            .dark .article-content code {
                              background-color: #374151;
                            }
                            .article-content pre {
                              background-color: #f3f4f6;
                              padding: 1rem;
                              border-radius: 0.5rem;
                              overflow-x: auto;
                              margin: 1rem 0;
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
                          `}</style>
                          <div 
                            className="article-content"
                            dangerouslySetInnerHTML={{ 
                              __html: articleDescriptions[articleId] 
                            }}
                          />
                        </div>
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