import React from 'react';
import { detectLinks, DetectedLink } from '@/utils/linkDetection';
import { LinkPreview } from './LinkPreview';

interface LinkifiedTextProps {
  text: string;
  showPreviews?: boolean;
  className?: string;
  isOwn?: boolean;
  searchQuery?: string;
}

export const LinkifiedText: React.FC<LinkifiedTextProps> = ({ 
  text, 
  showPreviews = true, 
  className = '',
  isOwn = false,
  searchQuery
}) => {
  const links = detectLinks(text);
  
  // Search highlighting function
  const highlightSearchTerm = (text: string, query: string) => {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <mark key={index} className="bg-yellow-200 px-1 rounded">
            {part}
          </mark>
        );
      }
      return part;
    });
  };
  
  if (links.length === 0) {
    return (
      <span className={`${className} break-words overflow-wrap-anywhere`}>
        {searchQuery ? highlightSearchTerm(text, searchQuery) : text}
      </span>
    );
  }

  // Split text into parts and render with links
  const renderTextWithLinks = () => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    links.forEach((link, index) => {
      // Add text before the link
      if (link.startIndex > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {text.substring(lastIndex, link.startIndex)}
          </span>
        );
      }

      // Add the link
      parts.push(
        <a
          key={`link-${index}`}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline break-all font-medium overflow-wrap-anywhere ${
            isOwn 
              ? 'text-white hover:text-blue-200' 
              : 'text-blue-600 hover:text-blue-800'
          }`}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {link.text}
        </a>
      );

      lastIndex = link.endIndex;
    });

    // Add remaining text after the last link
    if (lastIndex < text.length) {
      parts.push(
        <span key="text-end">
          {text.substring(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  return (
    <div className={className}>
      <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere">
        {renderTextWithLinks()}
      </div>
      
      {/* Show link previews for supported platforms */}
      {showPreviews && links.length > 0 && (
        <div className="mt-2 space-y-2">
          {links
            .filter(link => link.platform && link.platform !== 'general')
            .slice(0, 2) // Limit to 2 previews to avoid clutter
            .map((link, index) => (
              <LinkPreview
                key={`preview-${index}`}
                url={link.url}
                platform={link.platform}
                className="max-w-sm"
              />
            ))}
        </div>
      )}
    </div>
  );
};
