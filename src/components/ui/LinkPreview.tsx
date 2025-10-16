import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ExternalLink, Play, Calendar, User } from 'lucide-react';
import { LinkMetadata, fetchUrlMetadata } from '@/utils/linkDetection';

interface LinkPreviewProps {
  url: string;
  platform?: string;
  className?: string;
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({ 
  url, 
  platform, 
  className = '' 
}) => {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchUrlMetadata(url);
        setMetadata(data);
      } catch (err) {
        setError('Failed to load preview');
        console.error('Error loading link preview:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMetadata();
  }, [url]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className={`bg-gray-100 rounded-lg p-3 animate-pulse ${className}`}>
        <div className="flex space-x-3">
          <div className="w-16 h-16 bg-gray-300 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            <div className="h-3 bg-gray-300 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <div className={`bg-gray-100 rounded-lg p-3 border border-gray-200 ${className}`}>
        <div className="flex items-center space-x-2">
          <ExternalLink size={16} className="text-gray-500" />
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm truncate"
            onClick={handleClick}
          >
            {url}
          </a>
        </div>
      </div>
    );
  }

  // Platform-specific rendering
  if (platform === 'youtube') {
    return (
      <div className={`bg-gray-900 rounded-lg overflow-hidden link-preview-enter ${className}`}>
        <div className="relative aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${extractYouTubeId(url)}`}
            title="YouTube video"
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="p-3 bg-white">
          <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
            {metadata.title}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            YouTube • {metadata.domain}
          </p>
        </div>
      </div>
    );
  }

  if (platform === 'twitter') {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-3 link-preview-enter ${className}`}>
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <User size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-medium text-gray-900 text-sm">Twitter</span>
              <span className="text-xs text-gray-500">@{extractTwitterHandle(url)}</span>
            </div>
            <p className="text-sm text-gray-600 line-clamp-3">
              {metadata.description || 'View this tweet on Twitter'}
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-xs text-gray-500">Twitter</span>
              <span className="text-xs text-gray-400">•</span>
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800"
                onClick={handleClick}
              >
                View Tweet
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default link preview
  return (
    <div 
      className={`bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer link-preview-enter ${className}`}
      onClick={handleClick}
    >
      {metadata.image && (
        <div className="relative h-32 w-full">
          <Image
            src={metadata.image}
            alt={metadata.title}
            fill
            className="object-cover"
            onError={(e) => {
              // Hide image if it fails to load
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="p-3">
        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
          {metadata.title}
        </h3>
        {metadata.description && (
          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
            {metadata.description}
          </p>
        )}
        <div className="flex items-center space-x-2">
          <ExternalLink size={12} className="text-gray-400" />
          <span className="text-xs text-gray-500 truncate">
            {metadata.domain}
          </span>
        </div>
      </div>
    </div>
  );
};

// Helper functions for platform-specific data extraction
function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : '';
}

function extractTwitterHandle(url: string): string {
  const match = url.match(/(?:twitter\.com\/|x\.com\/)([a-zA-Z0-9_]+)/);
  return match ? match[1] : 'user';
}
