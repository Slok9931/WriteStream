import React, { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { BookOpen, Heart, ShoppingCart, ExternalLink, PenTool, LogOut, Wallet } from 'lucide-react';
import { ethers } from 'ethers';

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

      // Fetch and show description after purchase
      const article = articles.find(a => a.id === articleId);
      if (article) {
        const desc = await fetchDescription(article.ipfsHash);
        setArticleDescriptions((prev) => ({
          ...prev,
          [articleId.toString()]: desc,
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
    const res = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
    const description = await res.text();
    return description;
  }

  // Optionally, add a "View Description" button for users who already purchased
  const viewDescription = async (article: Article) => {
    // You may want to check access on-chain here
    const desc = await fetchDescription(article.ipfsHash);
    setArticleDescriptions((prev) => ({
      ...prev,
      [article.id.toString()]: desc,
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
      <header className="border-b border-border">
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => {
              const hasAccess = accessMap[article.id.toString()];
              return (
                <Card key={article.id.toString()} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <Badge variant="outline" className="mb-2">
                        {ethers.formatEther(article.price)} ETH
                      </Badge>
                    </div>
                    <CardTitle className="line-clamp-2">{article.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between">
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">
                        by {article.author.slice(0, 6)}...{article.author.slice(-4)}
                      </p>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => tipWriter(article.id)}
                          className="flex-1"
                        >
                          <Heart className="mr-2 h-4 w-4" />
                          Tip 0.01Ξ
                        </Button>
                        {!hasAccess && (
                          <Button
                            size="sm"
                            onClick={() => purchaseArticle(article.id, article.price)}
                            className="flex-1"
                          >
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Buy
                          </Button>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a
                          href={`https://ipfs.io/ipfs/${article.ipfsHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full"
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
                          Show Description
                        </Button>
                      )}
                    </div>
                  </CardContent>
                  {articleDescriptions[article.id.toString()] && (
                    <div className="mt-4 p-2 border rounded bg-muted">
                      <strong>Description:</strong>
                      <p className="whitespace-pre-wrap">
                        {articleDescriptions[article.id.toString()]}
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}