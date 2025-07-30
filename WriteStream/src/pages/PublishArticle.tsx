import React, { useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, PenTool, LogOut, Wallet, ArrowLeft } from 'lucide-react';
import { ethers } from 'ethers';

export default function PublishArticle() {
  const { account, contract, disconnectWallet } = useWallet();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const publishArticle = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contract) {
      toast({
        title: "Contract not available",
        description: "Please ensure your wallet is connected.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim() || !description.trim() || !price.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields to publish your article.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsPublishing(true);
      const priceInWei = ethers.parseEther(price);

      // 1. Upload description to IPFS via FastAPI
      const formData = new FormData();
      const descriptionBlob = new Blob([description], { type: "text/plain" });
      formData.append("file", descriptionBlob, "description.txt");

      const res = await fetch("http://localhost:8000/upload/", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      const ipfsHash = data.IpfsHash || data.Ipfs_Cid || data.Hash || data.IpfsCid;

      if (!ipfsHash) {
        throw new Error("Failed to upload description to IPFS.");
      }

      // 2. Call the contract with title, ipfsHash, and price
      const tx = await contract.publishArticle(
        title.trim(),
        ipfsHash,
        priceInWei
      );

      toast({
        title: "Publishing article...",
        description: "Your transaction is being processed on the blockchain.",
      });

      await tx.wait();

      toast({
        title: "Article published!",
        description: "Your article has been successfully published on WriteStream.",
      });

      // Reset form
      setTitle('');
      setDescription('');
      setPrice('');

      // Navigate back to articles page
      navigate('/articles');

    } catch (error: any) {
      toast({
        title: "Publishing failed",
        description: error.message || "Failed to publish article. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/articles" className="flex items-center space-x-2 hover:opacity-70 transition-opacity">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <BookOpen className="h-8 w-8" />
            <h1 className="text-2xl font-bold">WriteStream</h1>
          </div>
          
          <div className="flex items-center space-x-4">
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

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Publish Article</h2>
          <p className="text-muted-foreground">
            Share your knowledge with the world and earn ETH from your content
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PenTool className="mr-2 h-5 w-5" />
              Article Details
            </CardTitle>
            <CardDescription>
              Fill in the details below to publish your article on the blockchain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={publishArticle} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Article Title</Label>
                <Input
                  id="title"
                  placeholder="Enter your article title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Write your full article here"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={8}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (ETH)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Set the price readers will pay to access your full article
                </p>
              </div>

              <div className="flex space-x-4">
                <Link to="/articles" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={isPublishing}
                >
                  {isPublishing ? (
                    <>Publishing...</>
                  ) : (
                    <>
                      <PenTool className="mr-2 h-4 w-4" />
                      Publish Article
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Publishing Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <strong>1. IPFS Upload:</strong> Use services like Pinata, Web3.Storage, or run your own IPFS node to upload your article content.
            </div>
            <div>
              <strong>2. Pricing:</strong> Consider your target audience and content value when setting the price.
            </div>
            <div>
              <strong>3. Gas Fees:</strong> Publishing requires a blockchain transaction, so ensure you have enough ETH for gas fees.
            </div>
            <div>
              <strong>4. Immutability:</strong> Once published, your article details cannot be changed, so review carefully.
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}