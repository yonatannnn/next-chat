import React from 'react';
import { Check, X, User } from 'lucide-react';
import { Button } from './Button';
import { ProfileRecommendation } from '@/features/profile/services/recommendationService';

interface ProfileRecommendationBubbleProps {
  recommendation: ProfileRecommendation;
  isOwn: boolean;
  onAccept: (recommendationId: string) => void;
  onReject: (recommendationId: string) => void;
  onDelete: (recommendationId: string) => void;
  isProcessing?: boolean;
}

export const ProfileRecommendationBubble: React.FC<ProfileRecommendationBubbleProps> = ({
  recommendation,
  isOwn,
  onAccept,
  onReject,
  onDelete,
  isProcessing = false,
}) => {
  const getStatusColor = () => {
    switch (recommendation.status) {
      case 'accepted':
        return 'border-green-200 bg-green-50';
      case 'rejected':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getStatusText = () => {
    switch (recommendation.status) {
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Pending';
    }
  };

  const getStatusIcon = () => {
    switch (recommendation.status) {
      case 'accepted':
        return <Check size={16} className="text-green-600" />;
      case 'rejected':
        return <X size={16} className="text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className={`max-w-xs md:max-w-sm rounded-lg border-2 p-3 ${getStatusColor()}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <User size={16} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            Profile Recommendation
          </span>
        </div>
        <div className="flex items-center space-x-1">
          {getStatusIcon()}
          <span className={`text-xs font-medium ${
            recommendation.status === 'accepted' ? 'text-green-600' :
            recommendation.status === 'rejected' ? 'text-red-600' :
            'text-blue-600'
          }`}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Image */}
      <div className="mb-3">
        <img
          src={recommendation.imageUrl}
          alt="Recommended profile picture"
          className="w-full h-32 object-cover rounded-md border border-gray-200"
        />
      </div>

      {/* Message */}
      {recommendation.message && (
        <div className="mb-3">
          <p className="text-sm text-gray-700 bg-white/50 rounded-md p-2">
            "{recommendation.message}"
          </p>
        </div>
      )}

      {/* Actions - Only show for pending recommendations */}
      {recommendation.status === 'pending' && (
        <div className="flex items-center justify-between">
          {isOwn ? (
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDelete(recommendation.id)}
                disabled={isProcessing}
                className="text-gray-600 hover:text-red-600"
              >
                <X size={14} />
                <span className="ml-1">Delete</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                onClick={() => onAccept(recommendation.id)}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Check size={14} />
                <span className="ml-1">Accept</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(recommendation.id)}
                disabled={isProcessing}
                className="text-gray-600 hover:text-red-600"
              >
                <X size={14} />
                <span className="ml-1">Reject</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Status message for accepted/rejected */}
      {(recommendation.status === 'accepted' || recommendation.status === 'rejected') && (
        <div className="text-center py-2">
          <p className={`text-sm font-medium ${
            recommendation.status === 'accepted' ? 'text-green-600' : 'text-red-600'
          }`}>
            {recommendation.status === 'accepted' ? '✅ Accepted' : '❌ Rejected'}
          </p>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Processing...</span>
        </div>
      )}
    </div>
  );
};
