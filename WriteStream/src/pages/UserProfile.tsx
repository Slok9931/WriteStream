import React, { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  PenTool, 
  LogOut, 
  ArrowLeft, 
  Edit, 
  Save, 
  X,
  User,
  Heart,
  Eye
} from 'lucide-react';
import FullPageLoader from '@/components/FullPageLoader';

export default function UserProfile() {
  const { account, disconnectWallet } = useWallet();
  const { profile, updateProfile, getUserFavorites, loading } = useUserProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    bio: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        email: profile.email || '',
        bio: profile.bio || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const favs = await getUserFavorites();
      setFavorites(favs);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(formData);
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        email: profile.email || '',
        bio: profile.bio || '',
      });
    }
    setIsEditing(false);
  };

  if (loading) {
    return <FullPageLoader text="Loading profile..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/articles" className="flex items-center space-x-2 hover:opacity-70 transition-opacity">
              <ArrowLeft className="h-5 w-5" />
            </Link>
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
            
            <Button variant="outline" size="sm" onClick={disconnectWallet}>
              <LogOut className="h-4 w-4" />
            </Button>
            
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xl">
                      {profile?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-3xl font-bold">
                      {profile?.username || 'Anonymous User'}
                    </h1>
                    <p className="text-muted-foreground">
                      {account?.slice(0, 6)}...{account?.slice(-4)}
                    </p>
                    {profile?.bio && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {profile.bio}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant={isEditing ? "outline" : "default"}
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? <X className="mr-2 h-4 w-4" /> : <Edit className="mr-2 h-4 w-4" />}
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Edit Profile Form */}
          {isEditing && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      placeholder="Enter your username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    placeholder="Tell us about yourself"
                    rows={3}
                  />
                </div>

                <div className="flex space-x-4">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>Saving...</>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <div className="mb-6">
            <div className="flex space-x-1 bg-muted p-1 rounded-lg">
              {[
                { id: 'profile', label: 'Profile', icon: User },
                { id: 'favorites', label: 'Favorites', icon: Heart },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Username</Label>
                      <p className="mt-1">{profile?.username || 'Not set'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="mt-1">{profile?.email || 'Not set'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Bio</Label>
                      <p className="mt-1">{profile?.bio || 'No bio provided'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Wallet Address</Label>
                      <p className="mt-1 font-mono text-sm">{account}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'favorites' && (
            <Card>
              <CardHeader>
                <CardTitle>Favorite Articles</CardTitle>
              </CardHeader>
              <CardContent>
                {favorites.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No favorite articles yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {favorites.map((fav: any) => (
                      <div key={fav.article_id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{fav.article_title || `Article #${fav.article_id}`}</p>
                          <p className="text-sm text-muted-foreground">
                            Added on {new Date(fav.added_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/article/${fav.article_id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}