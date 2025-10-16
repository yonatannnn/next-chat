import { useEffect, useState } from 'react';
import { recommendationService, ProfileRecommendation } from '../services/recommendationService';

export const useRecommendations = (userId: string) => {
  const [recommendations, setRecommendations] = useState<ProfileRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    const unsubscribe = recommendationService.subscribeToRecommendations(
      userId,
      (newRecommendations) => {
        setRecommendations(newRecommendations);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userId]);

  const sendRecommendation = async (
    receiverId: string, 
    imageUrl: string, 
    message?: string
  ) => {
    try {
      setError(null);
      await recommendationService.sendRecommendation(userId, receiverId, imageUrl, message);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send recommendation';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const acceptRecommendation = async (recommendationId: string) => {
    try {
      setError(null);
      await recommendationService.acceptRecommendation(recommendationId, userId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept recommendation';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const rejectRecommendation = async (recommendationId: string) => {
    try {
      setError(null);
      await recommendationService.rejectRecommendation(recommendationId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject recommendation';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteRecommendation = async (recommendationId: string) => {
    try {
      setError(null);
      await recommendationService.deleteRecommendation(recommendationId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete recommendation';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return {
    recommendations,
    loading,
    error,
    sendRecommendation,
    acceptRecommendation,
    rejectRecommendation,
    deleteRecommendation,
  };
};
