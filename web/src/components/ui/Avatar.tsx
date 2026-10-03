import React from 'react';
import Image from 'next/image';

interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-20 h-20',
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`relative ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full bg-gray-300 flex items-center justify-center overflow-hidden`}>
        {src ? (
          <Image
            src={src}
            alt={alt}
            width={size === 'sm' ? 32 : size === 'md' ? 40 : size === 'lg' ? 48 : 80}
            height={size === 'sm' ? 32 : size === 'md' ? 40 : size === 'lg' ? 48 : 80}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-gray-600 font-medium text-sm">
            {getInitials(alt)}
          </span>
        )}
      </div>
    </div>
  );
};
