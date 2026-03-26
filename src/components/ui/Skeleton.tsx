import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const SkeletonLine: React.FC<SkeletonProps> = ({ className = '', style }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} style={style} />
);

export const SkeletonCircle: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full ${className}`} />
);

export const ConversationSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 rounded-lg">
        <SkeletonCircle className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between">
            <SkeletonLine className="h-3.5 w-24 md:w-32" />
            <SkeletonLine className="h-3 w-8" />
          </div>
          <SkeletonLine className="h-3 w-40 md:w-48" />
        </div>
      </div>
    ))}
  </>
);

export const MessageSkeleton: React.FC<{ count?: number }> = ({ count = 7 }) => {
  const pattern = [false, true, true, false, true, false, false, true, false, true];
  return (
    <div className="space-y-3 md:space-y-4 p-3 md:p-4">
      {Array.from({ length: count }).map((_, i) => {
        const isOwn = pattern[i % pattern.length];
        return (
          <div key={i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-end space-x-2 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
              {!isOwn && <SkeletonCircle className="w-7 h-7 flex-shrink-0" />}
              <div className="space-y-1">
                <SkeletonLine
                  className={`h-10 rounded-2xl ${
                    isOwn ? 'rounded-br-md' : 'rounded-bl-md'
                  }`}
                  style={{ width: `${120 + (i * 37) % 140}px` }}
                />
                <SkeletonLine className={`h-3 w-12 ${isOwn ? 'ml-auto' : ''}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
