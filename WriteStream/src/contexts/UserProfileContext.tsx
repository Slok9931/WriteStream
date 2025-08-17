import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWallet } from './WalletContext';

interface UserProfile {
  wallet_address: string;
  username?: string;
  email?: string;
  bio?: string;
  avatar_url?: string;
}

interface ArticleAnalytics {
  article_id: number;
  total_views: number;
  total_likes: number;
  total_dislikes: number;
}

interface UserReaction {
  has_reacted: boolean;
  reaction_type: 'like' | 'dislike' | null;
}

interface UserProfileContextType {
  profile: UserProfile | null;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  addToFavorites: (articleId: number, articleTitle: string) => Promise<void>;
  removeFromFavorites: (articleId: number) => Promise<void>;
  getUserFavorites: () => Promise<any[]>;
  isArticleFavorited: (articleId: number) => Promise<boolean>;
  likeArticle: (articleId: number) => Promise<{ likes: number; dislikes: number }>;
  dislikeArticle: (articleId: number) => Promise<{ likes: number; dislikes: number }>;
  removeReaction: (articleId: number) => Promise<{ likes: number; dislikes: number }>;
  getUserReaction: (articleId: number) => Promise<UserReaction>;
  recordView: (articleId: number) => Promise<void>;
  getArticleAnalytics: (articleId: number) => Promise<ArticleAnalytics>;
  getUserArticles: () => Promise<any[]>;
  searchArticles: (query: string) => Promise<any[]>;
  loading: boolean;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

// const API_BASE_URL = 'http://localhost:8000/api';
const API_BASE_URL = 'https://writestreamserver.onrender.com/api';

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { account, isConnected } = useWallet();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isConnected && account) {
      loadUserProfile();
    }
  }, [isConnected, account]);

  const loadUserProfile = async () => {
    if (!account) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/profile/${account}`);
      const data = await response.json();
      setProfile(data);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData: Partial<UserProfile>) => {
    if (!account) return;

    try {
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: account,
          ...profileData,
        }),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  };

  const addToFavorites = async (articleId: number, articleTitle: string) => {
    if (!account) return;

    try {
      await fetch(`${API_BASE_URL}/users/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_wallet: account,
          article_id: articleId,
          article_title: articleTitle,
        }),
      });
    } catch (error) {
      console.error('Failed to add to favorites:', error);
      throw error;
    }
  };

  const removeFromFavorites = async (articleId: number) => {
    if (!account) return;

    try {
      await fetch(`${API_BASE_URL}/users/favorites/${account}/${articleId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to remove from favorites:', error);
      throw error;
    }
  };

  const isArticleFavorited = async (articleId: number): Promise<boolean> => {
    if (!account) return false;

    try {
      const favorites = await getUserFavorites();
      return favorites.some(fav => fav.article_id === articleId);
    } catch (error) {
      console.error('Failed to check if favorited:', error);
      return false;
    }
  };

  const likeArticle = async (articleId: number) => {
    if (!account) throw new Error('No account connected');

    try {
      const response = await fetch(`${API_BASE_URL}/articles/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          article_id: articleId,
          user_wallet: account,
          reaction_type: 'like',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail);
      
      return { likes: data.likes, dislikes: data.dislikes };
    } catch (error) {
      console.error('Failed to like article:', error);
      throw error;
    }
  };

  const dislikeArticle = async (articleId: number) => {
    if (!account) throw new Error('No account connected');

    try {
      const response = await fetch(`${API_BASE_URL}/articles/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          article_id: articleId,
          user_wallet: account,
          reaction_type: 'dislike',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail);
      
      return { likes: data.likes, dislikes: data.dislikes };
    } catch (error) {
      console.error('Failed to dislike article:', error);
      throw error;
    }
  };

  const removeReaction = async (articleId: number) => {
    if (!account) throw new Error('No account connected');

    try {
      const response = await fetch(`${API_BASE_URL}/articles/${articleId}/react/${account}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail);
      
      return { likes: data.likes, dislikes: data.dislikes };
    } catch (error) {
      console.error('Failed to remove reaction:', error);
      throw error;
    }
  };

  const getUserReaction = async (articleId: number): Promise<UserReaction> => {
    if (!account) return { has_reacted: false, reaction_type: null };

    try {
      const response = await fetch(`${API_BASE_URL}/articles/${articleId}/user-reaction/${account}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get user reaction:', error);
      return { has_reacted: false, reaction_type: null };
    }
  };

  const recordView = async (articleId: number) => {
    if (!account) return;

    try {
      await fetch(`${API_BASE_URL}/articles/${articleId}/view?user_wallet=${account}`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to record view:', error);
    }
  };

  const getArticleAnalytics = async (articleId: number): Promise<ArticleAnalytics> => {
    try {
      const response = await fetch(`${API_BASE_URL}/articles/${articleId}/analytics`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get article analytics:', error);
      return {
        article_id: articleId,
        total_views: 0,
        total_likes: 0,
        total_dislikes: 0,
      };
    }
  };

  const getUserFavorites = async () => {
    if (!account) return [];

    try {
      const response = await fetch(`${API_BASE_URL}/users/${account}/favorites`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get user favorites:', error);
      return [];
    }
  };

  const getUserArticles = async () => {
    if (!account) return [];

    try {
      const response = await fetch(`${API_BASE_URL}/users/${account}/articles`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get user articles:', error);
      return [];
    }
  };

  const searchArticles = async (query: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/articles/search?query=${encodeURIComponent(query)}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to search articles:', error);
      return [];
    }
  };

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        updateProfile,
        addToFavorites,
        removeFromFavorites,
        getUserFavorites,
        isArticleFavorited,
        likeArticle,
        dislikeArticle,
        removeReaction,
        getUserReaction,
        recordView,
        getArticleAnalytics,
        getUserArticles,
        searchArticles,
        loading,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}