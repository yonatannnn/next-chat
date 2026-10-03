# Mobile Notification Testing Guide

## Issues Fixed

### 1. PWA Configuration
- **Problem**: PWA was disabled in development mode
- **Solution**: Updated `next.config.js` to enable PWA in development (can be disabled with `DISABLE_PWA=true` env var)
- **Files changed**: `next.config.js`, removed `pwa.config.js`

### 2. Service Worker Registration
- **Problem**: Service worker wasn't properly registered
- **Solution**: Added `ServiceWorkerRegistration` component to ensure proper registration
- **Files changed**: `src/components/ui/ServiceWorkerRegistration.tsx`, `src/app/layout.tsx`

### 3. Mobile-Specific Notification Handling
- **Problem**: Notifications weren't optimized for mobile devices
- **Solution**: Enhanced notification service with mobile detection and proper fallbacks
- **Files changed**: `src/utils/notificationService.ts`, `src/hooks/useGlobalNotifications.ts`

### 4. Service Worker Mobile Support
- **Problem**: Service worker didn't handle mobile notifications properly
- **Solution**: Updated service worker with mobile-specific notification options
- **Files changed**: `public/sw-custom.js`

## Testing Instructions

### For Development
1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open the app in a mobile browser (Chrome, Firefox, Safari)
3. Navigate to the chat page where notifications are tested
4. Use the Mobile Notification Test component to debug issues

### For Production
1. Build and deploy the app:
   ```bash
   npm run build
   npm start
   ```

2. Access the app on a mobile device
3. Install as PWA (Add to Home Screen)
4. Test notifications in PWA mode

## Mobile-Specific Requirements

### iOS (Safari)
- Must be added to home screen (PWA mode)
- Requires user interaction to request permission
- Notifications only work in PWA mode, not in regular Safari

### Android (Chrome)
- Works in both regular browser and PWA mode
- Requires notification permission
- Better support for service worker notifications

### Testing Checklist

#### Basic Functionality
- [ ] Service worker registers successfully
- [ ] Notification permission can be requested
- [ ] Test notifications work
- [ ] Notifications show with proper icons and vibration

#### Mobile-Specific
- [ ] iOS: Works in PWA mode (added to home screen)
- [ ] Android: Works in both browser and PWA mode
- [ ] Vibration works on mobile devices
- [ ] Notification actions work (Open Chat, Dismiss)

#### Edge Cases
- [ ] Notifications work when app is in background
- [ ] Notifications work when app is closed
- [ ] Multiple notifications are handled properly
- [ ] Notification clicks open the app correctly

## Debugging Tools

### Mobile Notification Test Component
The `MobileNotificationTest` component provides:
- Device detection (iOS, Android, Mobile)
- Service worker status
- Permission status
- Test notification functionality
- Mobile-specific tips and troubleshooting

### Console Logs
Look for these log messages:
- `🔔` - Notification-related logs
- `🔧` - Service worker logs
- `🧪` - Test component logs

### Common Issues and Solutions

#### "Permission denied"
- **iOS**: Ensure app is added to home screen and opened from there
- **Android**: Check browser notification settings
- **Both**: Try refreshing the page and granting permission again

#### "Service worker not registered"
- Check if PWA is properly configured
- Ensure the app is served over HTTPS (required for service workers)
- Check browser console for service worker errors

#### "Notifications not showing"
- Verify permission is granted
- Check if page is visible and focused when requesting permission
- Ensure service worker is active
- Test with the Mobile Notification Test component

## Environment Variables

To disable PWA in development:
```bash
DISABLE_PWA=true npm run dev
```

## Files Modified

1. `next.config.js` - PWA configuration
2. `src/utils/notificationService.ts` - Enhanced mobile support
3. `src/hooks/useGlobalNotifications.ts` - Mobile-specific permission handling
4. `src/components/ui/ServiceWorkerRegistration.tsx` - Service worker registration
5. `src/app/layout.tsx` - Added service worker registration
6. `public/sw-custom.js` - Mobile-optimized service worker
7. `src/components/ui/MobileNotificationTest.tsx` - Enhanced testing component

## Next Steps

1. Test on actual mobile devices
2. Verify PWA installation works
3. Test notifications in various scenarios (background, closed app)
4. Monitor console logs for any remaining issues
5. Consider adding push notification support for better reliability
