import { useState, useEffect } from 'react';

export interface Wish {
  _id: string;
  name: string;
  message: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WishResponse {
  success: boolean;
  data?: Wish | Wish[];
  message?: string;
  error?: string;
  count?: number;
}

export const useWishes = () => {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all wishes
  const fetchWishes = async () => {
    console.log('fetchWishes called');
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching wishes from /api/wishes');
      const response = await fetch('/api/wishes');
      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Wishes result:', result);
      
      if (result.success) {
        setWishes(result.data);
        console.log('Wishes set:', result.data);
      } else {
        setError(result.error || 'Failed to fetch wishes');
        console.log('Error setting wishes:', result.error);
      }
    } catch (err) {
      console.error('Error fetching wishes:', err);
      setError('Network error while fetching wishes');
    } finally {
      setLoading(false);
    }
  };

  // Submit a new wish
  const submitWish = async (name: string, message: string): Promise<WishResponse> => {
    try {
      const response = await fetch('/api/wishes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, message }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh wishes list
        await fetchWishes();
      }
      
      return result;
    } catch (err) {
      return {
        success: false,
        error: 'Network error while submitting wish'
      };
    }
  };

  // Delete a wish (admin only)
  const deleteWish = async (id: string): Promise<WishResponse> => {
    try {
      const response = await fetch(`/api/wishes/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh wishes list
        await fetchWishes();
      }
      
      return result;
    } catch (err) {
      return {
        success: false,
        error: 'Network error while deleting wish'
      };
    }
  };

  // Update a wish (admin only)
  const updateWish = async (id: string, updates: Partial<Wish>): Promise<WishResponse> => {
    try {
      const response = await fetch(`/api/wishes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh wishes list
        await fetchWishes();
      }
      
      return result;
    } catch (err) {
      return {
        success: false,
        error: 'Network error while updating wish'
      };
    }
  };

  return {
    wishes,
    loading,
    error,
    fetchWishes,
    submitWish,
    deleteWish,
    updateWish,
  };
};
