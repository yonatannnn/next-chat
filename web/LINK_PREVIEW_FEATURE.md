# Link Detection and Preview Feature

This feature automatically detects URLs in chat messages and displays rich previews similar to Telegram's link preview functionality.

## Features

### 🔗 Automatic Link Detection
- Detects URLs in message text automatically
- Makes detected links clickable
- Supports various URL formats (http, https)

### 🎥 Platform-Specific Previews
- **YouTube**: Embedded video player with thumbnail
- **Twitter/X**: Tweet preview with user info
- **Instagram**: Post preview
- **TikTok**: Video preview
- **GitHub**: Repository preview
- **Reddit**: Post preview
- **General URLs**: Title, description, and image preview

### 🎨 Rich Previews
- Fetches metadata (title, description, image) from URLs
- Displays up to 2 previews per message to avoid clutter
- Smooth animations and hover effects
- Mobile-responsive design

## How It Works

### 1. Link Detection (`src/utils/linkDetection.ts`)
- Uses regex patterns to identify URLs in text
- Categorizes links by platform (YouTube, Twitter, etc.)
- Extracts platform-specific IDs for rich previews

### 2. Link Preview Component (`src/components/ui/LinkPreview.tsx`)
- Renders platform-specific previews
- Handles loading states and errors gracefully
- Supports click-to-open functionality

### 3. Linkified Text Component (`src/components/ui/LinkifiedText.tsx`)
- Replaces plain text with clickable links
- Integrates preview components
- Maintains text formatting

### 4. API Endpoint (`src/pages/api/link-preview.ts`)
- Server-side metadata fetching
- Handles CORS and security concerns
- Extracts title, description, and images from HTML

## Usage

The feature is automatically enabled in all chat messages. When a user sends a message containing URLs, the system will:

1. **Detect URLs** in the message text
2. **Make them clickable** with proper styling
3. **Fetch metadata** for supported platforms
4. **Display rich previews** below the message

## Supported Platforms

| Platform | Preview Type | Features |
|----------|-------------|----------|
| YouTube | Embedded Player | Video thumbnail, title, channel info |
| Twitter/X | Tweet Card | User avatar, tweet text, engagement |
| Instagram | Post Preview | Image, caption preview |
| TikTok | Video Preview | Video thumbnail, creator info |
| GitHub | Repository Card | Repo name, description, language |
| Reddit | Post Preview | Title, subreddit, upvotes |
| General | Link Card | Title, description, favicon |

## Configuration

### Disabling Previews
To disable link previews for a specific message, you can modify the `LinkifiedText` component:

```tsx
<LinkifiedText 
  text={message.text}
  showPreviews={false} // Disable previews
  className="text-sm md:text-base"
/>
```

### Custom Styling
The components use Tailwind CSS classes and can be customized by modifying the className props.

## Security Considerations

- All external requests go through the API endpoint
- URLs are validated before fetching
- Timeout protection prevents hanging requests
- User-Agent headers are set for proper metadata extraction

## Performance

- Previews are loaded asynchronously
- Only up to 2 previews per message
- Images are optimized with Next.js Image component
- Caching can be implemented for frequently accessed URLs

## Future Enhancements

- [ ] Caching for frequently accessed URLs
- [ ] Custom preview templates for specific domains
- [ ] Preview size limits and lazy loading
- [ ] Integration with more social platforms
- [ ] Preview customization settings
