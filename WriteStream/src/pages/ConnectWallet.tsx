import React from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Wallet, BookOpen, PenTool } from 'lucide-react';

export default function ConnectWallet() {
  const { isConnected, connectWallet } = useWallet();

  if (isConnected) {
    return <Navigate to="/articles" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-primary">
              <BookOpen className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">WriteStream</h1>
          <p className="text-muted-foreground mt-2">
            Decentralized publishing platform on the blockchain
          </p>
        </div>

        {/* Features */}
        <div className="grid gap-4">
          <div className="flex items-center space-x-3 text-sm">
            <PenTool className="h-5 w-5 text-primary" />
            <span>Publish articles with IPFS storage</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <Wallet className="h-5 w-5 text-primary" />
            <span>Monetize your content with ETH</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <BookOpen className="h-5 w-5 text-primary" />
            <span>Tip your favorite writers</span>
          </div>
        </div>

        {/* Connect Card */}
        <Card>
          <CardHeader>
            <CardTitle>Connect Your Wallet</CardTitle>
            <CardDescription>
              Connect your MetaMask wallet to start publishing and reading articles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={connectWallet} 
              className="w-full" 
              size="lg"
            >
              <Wallet className="mr-2 h-5 w-5" />
              Connect MetaMask
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Make sure you have MetaMask installed and connected to the correct network
        </p>
      </div>
    </div>
  );
}