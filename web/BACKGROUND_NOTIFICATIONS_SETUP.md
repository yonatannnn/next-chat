# Background Notifications Setup Guide

## 🎯 **Problem Solved**

When you close the mobile app (interrupt `flutter run`), the app should still receive push notifications for new messages. This guide explains how to set up proper background notifications.

## 🔧 **What I've Implemented**

### 1. **Background Notification Service** (`mobile/lib/src/services/background_notification_service.dart`)
- Handles FCM (Firebase Cloud Messaging) notifications when app is closed
- Registers mobile devices with Supabase for background notifications
- Shows local notifications when app receives FCM messages

### 2. **FCM API Endpoint** (`src/pages/api/fcm-notification.ts`)
- Server-side API to send FCM notifications to mobile devices
- Uses Firebase Admin SDK to send notifications
- Handles both Android and iOS notifications

### 3. **Enhanced Web Push Service** (`src/services/pushNotificationService.ts`)
- Now sends both web push notifications AND FCM notifications
- Automatically detects mobile devices and sends appropriate notifications
- Maintains backward compatibility with existing web notifications

## 🚀 **Setup Instructions**

### 1. **Firebase Configuration**

You need to set up Firebase Admin SDK credentials:

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: `next-chat-636d1`
3. **Go to Project Settings** → **Service Accounts**
4. **Generate new private key** (download JSON file)
5. **Add to your `.env` file**:

```env
# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=next-chat-636d1
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@next-chat-636d1.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

### 2. **Database Migration**

Apply the mobile push schema migration:

```bash
# Run the migration script
./apply-mobile-push-migration.sh
```

### 3. **Test the Implementation**

1. **Start the mobile app**:
   ```bash
   cd /home/yonatan/Desktop/next-chat/mobile
   flutter run
   ```

2. **Register for notifications**:
   - Login to the mobile app
   - The app will automatically register for both foreground and background notifications

3. **Test background notifications**:
   - Close the mobile app (interrupt `flutter run`)
   - Send a message from the web app or another device
   - You should receive a push notification on the mobile device

## 📱 **How It Works**

### **When App is Running (Foreground)**:
1. **SupabaseChatNotificationManager** listens to Firestore for new messages
2. **SupabasePushService** shows local notifications
3. **BackgroundNotificationService** is also registered for FCM

### **When App is Closed (Background)**:
1. **Web app** detects new message
2. **Web push service** sends both web push AND FCM notifications
3. **FCM API** sends notification to mobile device using Firebase Admin SDK
4. **Mobile device** receives FCM notification and shows it
5. **Tapping notification** opens the app to the specific chat

## 🔍 **Testing Steps**

### 1. **Test Foreground Notifications**
```bash
# Run mobile app
flutter run

# Send message from web app
# Should see notification in mobile app
```

### 2. **Test Background Notifications**
```bash
# Run mobile app
flutter run

# Close the app (Ctrl+C)
# Send message from web app
# Should receive push notification on device
```

### 3. **Debug Logs to Watch**

**Mobile App Logs**:
```
🔔 BACKGROUND NOTIFICATION SERVICE: Initializing...
🔔 BACKGROUND NOTIFICATION SERVICE: FCM Token: [token]
🔔 BACKGROUND NOTIFICATION SERVICE: Created new subscription for background notifications
```

**Web App Logs**:
```
🔔 FCM DEBUG: Sending FCM notification to mobile devices for user: [userId]
🔔 FCM DEBUG: Found X mobile devices for user: [userId]
🔔 FCM DEBUG: FCM notification sent to device [deviceId]
```

**FCM API Logs**:
```
🔔 FCM API: Sending FCM notification
✅ FCM API: Successfully sent FCM notification: [messageId]
```

## 🛠️ **Troubleshooting**

### **No Background Notifications**

1. **Check Firebase Configuration**:
   - Verify environment variables are set correctly
   - Check Firebase project ID matches
   - Ensure private key is properly formatted

2. **Check Device Registration**:
   - Look for "Created new subscription for background notifications" in logs
   - Verify device appears in Supabase `push_subscriptions` table

3. **Check FCM Token**:
   - Ensure FCM token is generated and stored
   - Verify token is not null or empty

### **Notifications Not Showing**

1. **Check Notification Permissions**:
   - Ensure notifications are enabled in device settings
   - Check if app has notification permissions

2. **Check FCM API**:
   - Verify `/api/fcm-notification` endpoint is working
   - Check server logs for FCM errors

3. **Check Network Connectivity**:
   - Ensure device has internet connection
   - Check if Firebase services are accessible

## 📋 **Files Modified**

### **Mobile App**:
- `background_notification_service.dart`: New service for background notifications
- `main.dart`: Initialize background notification service
- `supabase_push_service.dart`: Enhanced with FCM support

### **Web App**:
- `pushNotificationService.ts`: Added FCM notification support
- `fcm-notification.ts`: New API endpoint for FCM notifications
- `env.example`: Added Firebase configuration variables

## 🎉 **Expected Results**

After setup, you should have:

1. **Foreground Notifications**: Work when app is running
2. **Background Notifications**: Work when app is closed
3. **Cross-Platform**: Web and mobile notifications work together
4. **Multiple Devices**: Each device receives notifications independently
5. **Unified Database**: All devices stored in same Supabase table

The mobile app will now receive push notifications even when closed, just like native messaging apps!

