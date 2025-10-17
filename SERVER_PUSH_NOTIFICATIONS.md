# Server-Side Push Notifications Implementation

## 🚀 **Background Notifications for Closed Apps**

This implementation adds server-side push notifications that work even when the app is completely closed. The system stores user push subscriptions on the server and sends notifications when new messages arrive.

## 🔧 **How It Works**

### **1. User Registration Flow:**
1. **User grants notification permission** → Service worker registers
2. **Push subscription created** → Stored in database
3. **User closes app completely** → Service worker still active
4. **New message arrives** → Server sends push notification
5. **Service worker receives push** → Shows notification even when app is closed

### **2. Server-Side Components:**

#### **Push Notification API** (`/api/push-notification`)
- **Purpose**: Sends push notifications using web-push library
- **Input**: Push subscription + notification payload
- **Output**: Sends notification to device via browser push service

#### **Push Notification Service** (`pushNotificationService.ts`)
- **Store subscriptions**: Saves user push subscriptions to database
- **Send notifications**: Triggers push notifications from server
- **Chat notifications**: Specialized for chat message notifications

#### **Database Integration**
- **Table**: `push_subscriptions`
- **Stores**: User ID, endpoint, encryption keys, device info
- **Security**: RLS policies for user data protection

## 📱 **Mobile vs Desktop Behavior**

### **Desktop:**
- **App open**: Direct notifications work
- **App backgrounded**: Direct notifications work
- **App closed**: Server push notifications work

### **Mobile:**
- **App open**: Direct notifications work
- **App backgrounded**: Service worker notifications work
- **App closed**: Server push notifications work (requires PWA mode on iOS)

## 🛠 **Setup Instructions**

### **1. Database Setup:**
```sql
-- Run the SQL migration in your Supabase database
-- File: supabase-migrations.sql
```

### **2. Environment Variables:**
```bash
# Add to your .env.local
VAPID_PRIVATE_KEY=your-private-vapid-key-here
```

### **3. Generate VAPID Keys:**
```bash
# Generate your own VAPID keys
npx web-push generate-vapid-keys
```

### **4. Update VAPID Keys:**
- Replace the demo keys in `notificationService.ts`
- Update the public key in the service worker
- Set the private key in environment variables

## 🔍 **Testing the System**

### **1. Test Push Notification API:**
```bash
# Test the push notification endpoint
curl -X POST http://localhost:3000/api/test-push \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-id", "title": "Test", "body": "Test message"}'
```

### **2. Test Chat Notifications:**
1. **Send a message** from one user to another
2. **Close the receiver's app completely**
3. **Check if notification appears** on the device
4. **Click notification** to open the app

### **3. Debug Steps:**
1. **Check database**: Verify push subscription is stored
2. **Check server logs**: Look for push notification errors
3. **Check browser console**: Look for service worker errors
4. **Test on mobile**: Ensure PWA mode is working

## 📊 **Database Schema**

### **push_subscriptions Table:**
```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  platform TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## 🔐 **Security Features**

### **Row Level Security (RLS):**
- **Users**: Can only manage their own subscriptions
- **Service Role**: Can access all subscriptions for sending notifications
- **Data Protection**: Encryption keys are stored securely

### **VAPID Security:**
- **Public Key**: Used by client to subscribe
- **Private Key**: Used by server to send notifications
- **Authentication**: Ensures only your server can send notifications

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **"No push subscription found"**
   - **Cause**: User hasn't granted permission or subscription not stored
   - **Solution**: Check permission flow and database storage

2. **"Push notification failed"**
   - **Cause**: Invalid subscription or expired endpoint
   - **Solution**: Re-register subscription, check VAPID keys

3. **"Service worker not active"**
   - **Cause**: App not installed as PWA or service worker not registered
   - **Solution**: Install as PWA, check service worker registration

4. **"Notifications not working on iOS"**
   - **Cause**: iOS requires PWA mode for background notifications
   - **Solution**: Add to home screen, use PWA mode

### **Debug Checklist:**
- ✅ **Permission granted**: Check notification permission
- ✅ **Subscription stored**: Check database for user subscription
- ✅ **Service worker active**: Check browser dev tools
- ✅ **VAPID keys correct**: Verify keys match between client/server
- ✅ **PWA mode (iOS)**: Ensure app is added to home screen
- ✅ **HTTPS required**: Push notifications require secure context

## 📱 **Mobile-Specific Requirements**

### **iOS (Safari):**
- **PWA Mode Required**: Must be added to home screen
- **Background App Refresh**: Must be enabled
- **Notification Permission**: Must be granted in PWA mode

### **Android (Chrome):**
- **Browser Support**: Works in Chrome and Firefox
- **Background Restrictions**: May be limited by battery optimization
- **Notification Settings**: Must be enabled in browser settings

## 🎯 **Production Deployment**

### **1. Environment Setup:**
- Set `VAPID_PRIVATE_KEY` in production environment
- Ensure HTTPS is enabled
- Configure database RLS policies

### **2. Monitoring:**
- Monitor push notification delivery rates
- Track subscription expiration and renewal
- Log failed notification attempts

### **3. Performance:**
- Push notifications are sent asynchronously
- Database queries are optimized with indexes
- Error handling prevents message sending failures

## 🔄 **Message Flow**

### **When User Sends Message:**
1. **Message saved** to Firebase
2. **Push notification triggered** to receiver
3. **Server looks up** receiver's push subscription
4. **Notification sent** via web-push
5. **Service worker receives** and shows notification
6. **User sees notification** even with app closed

### **When User Receives Message:**
1. **Service worker receives** push event
2. **Notification displayed** with message content
3. **User clicks notification** → App opens
4. **Message appears** in chat interface

The server-side push notification system is now fully implemented and ready for production! 🚀
