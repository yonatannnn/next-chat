# Workbox Watch Mode Fix

## Problem
The warning `GenerateSW has been called multiple times, perhaps due to running webpack in --watch mode` occurs because Workbox's service worker generation gets triggered multiple times during development hot reloading.

## Solutions Implemented

### 1. Disable PWA in Development
- Modified `next.config.js` to disable PWA in development mode
- Added `dev:no-pwa` script to package.json
- Created `start-dev-no-pwa.sh` script for easy development without PWA

### 2. Configuration Changes
- Set `disable: process.env.NODE_ENV === 'development'` in PWA config
- Added `reloadOnOnline: false` to prevent unnecessary reloads
- Added `publicExcludes` to optimize file processing

### 3. Development Scripts
```bash
# Run development without PWA (recommended for development)
npm run dev:no-pwa

# Or use the shell script
./start-dev-no-pwa.sh

# For production builds, PWA will be enabled automatically
npm run build
```

## Why This Works
1. **Development Mode**: PWA is disabled during development, eliminating workbox generation issues
2. **Production Mode**: PWA works normally for production builds
3. **Clean Development**: No service worker conflicts during hot reloading
4. **Performance**: Faster development builds without PWA overhead

## Usage
- Use `npm run dev:no-pwa` for development
- Use `npm run build` and `npm start` for production (PWA enabled)
- The warnings will disappear in development mode
- PWA features will work normally in production

## Alternative Solutions (if needed)
If you need PWA in development, you can:
1. Set `DISABLE_PWA=false` in your environment
2. Use `npm run dev` instead of `npm run dev:no-pwa`
3. Accept the warnings as they don't affect functionality
