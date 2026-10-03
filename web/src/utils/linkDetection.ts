// Link detection and URL parsing utilities

export interface DetectedLink {
  url: string;
  text: string;
  startIndex: number;
  endIndex: number;
  platform?: 'youtube' | 'twitter' | 'instagram' | 'tiktok' | 'github' | 'reddit' | 'general';
}

export interface LinkMetadata {
  title: string;
  description: string;
  image: string;
  domain: string;
  url: string;
}

// URL regex pattern that matches most common URL formats
const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

// Platform-specific URL patterns
const PLATFORM_PATTERNS = {
  youtube: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/i,
  twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com\/|x\.com\/)([a-zA-Z0-9_]+)\/status\/([0-9]+)/i,
  instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/i,
  tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([a-zA-Z0-9_.]+)\/video\/([0-9]+)/i,
  github: /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i,
  reddit: /(?:https?:\/\/)?(?:www\.)?reddit\.com\/r\/([a-zA-Z0-9_]+)\/comments\/([a-zA-Z0-9_]+)/i,
};

/**
 * Detects all URLs in a given text and returns them with metadata
 */
export function detectLinks(text: string): DetectedLink[] {
  const links: DetectedLink[] = [];
  let match;

  // Reset regex lastIndex to ensure we start from the beginning
  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(text)) !== null) {
    const url = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + url.length;
    
    // Determine platform
    let platform: DetectedLink['platform'] = 'general';
    
    for (const [platformName, pattern] of Object.entries(PLATFORM_PATTERNS)) {
      if (pattern.test(url)) {
        platform = platformName as DetectedLink['platform'];
        break;
      }
    }

    links.push({
      url,
      text: url,
      startIndex,
      endIndex,
      platform,
    });
  }

  return links;
}

/**
 * Checks if a URL is from a supported platform for rich previews
 */
export function isSupportedPlatform(url: string): boolean {
  return Object.values(PLATFORM_PATTERNS).some(pattern => pattern.test(url));
}

/**
 * Extracts platform-specific ID from URL
 */
export function extractPlatformId(url: string, platform: string): string | null {
  const pattern = PLATFORM_PATTERNS[platform as keyof typeof PLATFORM_PATTERNS];
  if (!pattern) return null;
  
  const match = url.match(pattern);
  return match ? match[1] : null;
}

/**
 * Generates a preview URL for supported platforms
 */
export function getPreviewUrl(url: string, platform: string): string {
  switch (platform) {
    case 'youtube':
      const videoId = extractPlatformId(url, 'youtube');
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    case 'twitter':
      return url; // Twitter embeds are handled differently
    case 'instagram':
      return url; // Instagram embeds are handled differently
    default:
      return url;
  }
}

/**
 * Validates if a URL is accessible and returns basic metadata
 */
export async function fetchUrlMetadata(url: string): Promise<LinkMetadata | null> {
  try {
    // For security, we'll use a proxy service or implement server-side fetching
    // This is a simplified version - in production, you'd want to use a service like LinkPreview API
    const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch metadata');
    }
    
    const data = await response.json();
    
    return {
      title: data.title || 'Link Preview',
      description: data.description || '',
      image: data.image || '',
      domain: new URL(url).hostname,
      url,
    };
  } catch (error) {
    console.error('Error fetching URL metadata:', error);
    return null;
  }
}
