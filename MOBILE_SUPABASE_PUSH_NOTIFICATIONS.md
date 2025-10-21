# Mobile Supabase Push Notifications Implementation

This document explains the implementation of Supabase push notifications for the mobile app, matching the web implementation.

## Overview

The mobile app now supports both Firebase and Supabase push notifications:
- **Firebase**: For FCM (Firebase Cloud Messaging) - existing implementation
- **Supabase**: For web push notifications using the same database as the web app

## Architecture

### Services

1. **SupabasePushService** (`src/services/supabase_push_service.dart`)
   - Handles Supabase push notification registration
   - Manages FCM tokens and stores them in Supabase database
   - Provides local notification display
   - Handles notification taps and navigation

2. **SupabaseChatNotificationManager** (`src/services/supabase_chat_notification_manager.dart`)
   - Listens to Firestore for new messages
   - Manages notification logic (foreground/background detection)
   - Integrates with SupabasePushService for notification display

### Database Schema

The `push_subscriptions` table supports multiple devices per user:

```sql
CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  platform TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);
```

## Implementation Details

### Registration Process

1. **User Login**: When a user logs in, both Firebase and Supabase services are initialized
2. **FCM Token**: The app gets an FCM token from Firebase
3. **Supabase Registration**: The FCM token is stored in Supabase database with device information
4. **Multiple Devices**: Each device gets a unique `device_id` allowing multiple devices per user

### Notification Flow

1. **Message Detection**: Firestore listener detects new messages
2. **Notification Logic**: Checks if user is viewing the chat, app state, etc.
3. **Local Notification**: Shows local notification using Flutter Local Notifications
4. **Navigation**: Handles notification taps for navigation to specific chats

### Key Features

- **Multiple Device Support**: Users can receive notifications on multiple devices
- **Device Management**: Each device is tracked separately
- **Foreground/Background Detection**: Smart notification logic based on app state
- **Chat-Specific Notifications**: Avoids notifications when viewing the same chat
- **Fallback Support**: Firebase notifications as backup

## Usage

### Initialization

The services are automatically initialized in `main.dart`:

```dart
// Initialize Supabase push service
await SupabasePushService().initialize();

// Register user when logged in
SupabasePushService().registerUser(user.uid);
SupabaseChatNotificationManager().initializeForUser(user.uid);
```

### Testing

You can test notifications using the built-in test methods:

```dart
// Test notification
await SupabasePushService().testNotification();

// Force show notification for testing
await SupabaseChatNotificationManager().forceShowNotification(senderId, messageText);
```

## Configuration

### Supabase Configuration

The app uses the same Supabase configuration as the web app:

```dart
// In app_config.dart
static const String supabaseUrl = 'https://dqucrvcvulwzzcbjoyai.supabase.co';
static const String supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### Database Migration

Run the database migration to support multiple devices:

```sql
-- Apply the migration from update-mobile-push-schema.sql
-- This adds device_id support and updates constraints
```

## Benefits

1. **Unified Database**: Same push subscription table as web app
2. **Multiple Device Support**: Users can receive notifications on all their devices
3. **Consistent API**: Same notification logic as web implementation
4. **Fallback Support**: Firebase notifications as backup
5. **Easy Management**: Centralized notification management through Supabase

## Troubleshooting

### Common Issues

1. **Registration Fails**: Check Supabase connection and permissions
2. **No Notifications**: Verify FCM token generation and database storage
3. **Duplicate Notifications**: Check if both Firebase and Supabase services are running

### Debug Logs

The services provide extensive logging:

```
🔔 SUPABASE PUSH SERVICE: Initializing...
🔔 SUPABASE PUSH SERVICE: Registering user: user123
🔔 SUPABASE PUSH SERVICE: FCM Token: fcm_token_here
✅ SUPABASE PUSH SERVICE: User registered successfully
```

### Testing Commands

```dart
// Check if user is registered
final subscriptions = await SupabasePushService().getAllPushSubscriptions(userId);
print('User has ${subscriptions.length} devices registered');

// Test notification
await SupabasePushService().testNotification();
```

## Future Enhancements

1. **Server-Side Notifications**: Use Supabase Edge Functions for server-side push
2. **Notification Preferences**: User settings for notification types
3. **Rich Notifications**: Images, actions, and custom layouts
4. **Analytics**: Track notification delivery and engagement
5. **Cross-Platform**: Extend to iOS with APNs integration

## Migration from Firebase-Only

The implementation maintains backward compatibility:
- Firebase notifications continue to work
- Supabase notifications are added as an additional layer
- No breaking changes to existing functionality
- Gradual migration possible

## Security Considerations

1. **RLS Policies**: Row Level Security ensures users can only manage their own subscriptions
2. **Token Security**: FCM tokens are stored securely in Supabase
3. **Device Validation**: Each device is validated and tracked
4. **Permission Handling**: Proper notification permission requests

This implementation provides a robust, scalable push notification system that works seamlessly with the existing web application while maintaining the flexibility and reliability of the original Firebase implementation.

