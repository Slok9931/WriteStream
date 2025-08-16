import React, { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, PenTool, LogOut, Wallet, ArrowLeft, FileText, DollarSign, Gift, Lock } from 'lucide-react';
import { ethers } from 'ethers';

export default function PublishArticle() {
  const { account, contract, disconnectWallet } = useWallet();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isPaidArticle, setIsPaidArticle] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Set default price when switching to paid article
  useEffect(() => {
    if (isPaidArticle && !price) {
      setPrice('0.01');
    }
  }, [isPaidArticle, price]);

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      [{ 'align': [] }],
      ['clean']
    ],
  };

  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'script', 'indent',
    'blockquote', 'code-block', 'link', 'image', 'align'
  ];

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Ensure price is never 0 or negative
    if (value === '' || parseFloat(value) > 0) {
      setPrice(value);
    }
  };

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

    if (!title.trim() || !description.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in title and content to publish your article.",
        variant: "destructive",
      });
      return;
    }

    if (isPaidArticle && (!price.trim() || parseFloat(price) <= 0)) {
      toast({
        title: "Invalid price",
        description: "Please set a valid price greater than 0 for your paid article.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsPublishing(true);
      const priceInWei = isPaidArticle ? ethers.parseEther(price) : 0n;

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
        description: `Your ${isPaidArticle ? 'paid' : 'free'} article has been successfully published on WriteStream.`,
      });

      setTitle('');
      setDescription('');
      setPrice('');
      setIsPaidArticle(false);

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
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/articles" className="flex items-center space-x-2 hover:opacity-70 transition-opacity">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <BookOpen className="h-7 w-7" />
            <h1 className="text-xl font-bold">WriteStream</h1>
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

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="mb-6">
              <h2 className="text-3xl font-bold mb-2">Write Your Article</h2>
              <p className="text-muted-foreground">
                Create compelling content and share your knowledge with the world
              </p>
            </div>

            <form onSubmit={publishArticle} className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-base font-semibold flex items-center">
                      <FileText className="mr-2 h-4 w-4" />
                      Article Title
                    </Label>
                    <Input
                      id="title"
                      placeholder="Enter a compelling title for your article..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="text-lg py-3"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <PenTool className="mr-2 h-4 w-4" />
                    Article Content
                  </CardTitle>
                  <CardDescription>
                    Write your full article content below. Use the toolbar for formatting.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="border rounded-md overflow-hidden">
                      <ReactQuill 
                        value={description}
                        onChange={setDescription}
                        theme="snow"
                        modules={quillModules}
                        formats={quillFormats}
                        placeholder="Start writing your article here..."
                        style={{ 
                          minHeight: '400px',
                          fontSize: '16px'
                        }}
                        className="bg-background [&_.ql-editor]:min-h-[400px] [&_.ql-editor]:text-base [&_.ql-editor]:leading-relaxed"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Write detailed, high-quality content to attract more readers
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/articles" className="sm:flex-1">
                  <Button type="button" variant="outline" className="w-full py-3">
                    Cancel
                  </Button>
                </Link>
                
                <Button 
                  type="submit" 
                  className="sm:flex-1 py-3"
                  disabled={isPublishing}
                >
                  {isPublishing ? (
                    <>Publishing to Blockchain...</>
                  ) : (
                    <>
                      <PenTool className="mr-2 h-4 w-4" />
                      Publish Article
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  {isPaidArticle ? (
                    <>
                      <Lock className="mr-2 h-6 w-5" />
                      Paid Article
                    </>
                  ) : (
                    <>
                      <Gift className="mr-2 h-5 w-5" />
                      Free Article
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  Choose your article's access model
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Article Type Selection - Dynamic Layout */}
                  <div className={`transition-all duration-300 ease-in-out ${
                    isPaidArticle ? 'grid grid-cols-1' : 'grid grid-cols-2 gap-3'
                  }`}>
                    {/* Free Button - Hidden when paid is selected */}
                    <div className={`transition-all duration-300 ease-in-out ${
                      isPaidArticle ? 'w-0 h-0 opacity-0 overflow-hidden' : 'w-full opacity-100'
                    }`}>
                      <Button
                        type="button"
                        variant={!isPaidArticle ? "default" : "outline"}
                        onClick={() => {
                          setIsPaidArticle(false);
                          setPrice('');
                        }}
                        className="flex items-center justify-center w-full"
                      >
                        <Gift className="mr-2 h-4 w-4" />
                        Free
                      </Button>
                    </div>
                    
                    {/* Paid Button */}
                    <Button
                      type="button"
                      variant={isPaidArticle ? "default" : "outline"}
                      onClick={() => setIsPaidArticle(true)}
                      className="flex items-center justify-center w-full"
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Paid
                    </Button>
                  </div>
                  
                  {/* Price Input Section - Smooth Transition with increased height */}
                  <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
                    isPaidArticle 
                      ? 'max-h-60 opacity-100 transform translate-y-0' 
                      : 'max-h-0 opacity-0 transform -translate-y-2'
                  }`}>
                    <div className="space-y-4 pt-4 border-t">
                      {/* Back to Free Option */}
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setIsPaidArticle(false);
                          setPrice('');
                        }}
                        className="w-full text-sm flex items-center justify-center hover:bg-muted/50"
                      >
                        <Gift className="mr-2 h-4 w-4" />
                        Make it Free Instead
                      </Button>
                      
                      {/* Price Input */}
                      <div className="space-y-3">
                        <Label htmlFor="price" className="flex items-center text-sm font-medium">
                          Price (ETH)
                        </Label>
                        <div className="relative">
                          <Input
                            id="price"
                            type="number"
                            step="0.001"
                            min="0.001"
                            placeholder="0.01"
                            value={price}
                            onChange={handlePriceChange}
                            required={isPaidArticle}
                            className="text-center text-lg font-semibold pr-16 py-3 border border-input rounded-md bg-background focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                            <span className="text-muted-foreground text-sm font-medium">ETH</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground text-center leading-relaxed px-1 mt-2">
                          Readers pay this amount to access your full article
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Writing Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Quality Content</h4>
                  <p className="text-muted-foreground">Write detailed, valuable content that provides real insights to your readers.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Engaging Title</h4>
                  <p className="text-muted-foreground">Create compelling titles that clearly communicate your article's value.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Fair Pricing</h4>
                  <p className="text-muted-foreground">Price your content fairly based on length, depth, and target audience.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Technical Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <strong className="text-foreground">IPFS Storage:</strong> Your article content is stored on IPFS for decentralized access.
                </div>
                <div>
                  <strong className="text-foreground">Blockchain:</strong> Article metadata is stored immutably on Ethereum.
                </div>
                <div>
                  <strong className="text-foreground">Gas Fees:</strong> Publishing requires ETH for transaction fees.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}