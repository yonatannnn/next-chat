import { NextApiRequest, NextApiResponse } from 'next';

interface LinkMetadata {
  title: string;
  description: string;
  image: string;
  domain: string;
  url: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    // Validate URL
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return res.status(400).json({ error: 'Invalid URL protocol' });
    }

    // Fetch the URL content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreview/1.0)',
      },
      // Set a timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000), // 10 seconds
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Extract metadata from HTML
    const metadata = extractMetadata(html, url);
    
    res.status(200).json(metadata);
  } catch (error) {
    console.error('Error fetching link preview:', error);
    res.status(500).json({ 
      error: 'Failed to fetch link preview',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function extractMetadata(html: string, url: string): LinkMetadata {
  const domain = new URL(url).hostname;
  
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : domain;

  // Extract description from meta tags
  const descriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i) ||
                          html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const description = descriptionMatch ? descriptionMatch[1].trim() : '';

  // Extract image from meta tags
  const imageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                     html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/i) ||
                     html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  
  let image = '';
  if (imageMatch) {
    const imageUrl = imageMatch[1].trim();
    // Convert relative URLs to absolute
    image = imageUrl.startsWith('http') ? imageUrl : new URL(imageUrl, url).href;
  }

  return {
    title: title.length > 100 ? title.substring(0, 100) + '...' : title,
    description: description.length > 200 ? description.substring(0, 200) + '...' : description,
    image,
    domain,
    url,
  };
}
