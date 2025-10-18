# 🔧 Multiple Device Support Solution

## 🚨 **Current Problem:**
Your app only supports ONE push subscription per user, which causes notifications to go to the wrong device when you're logged in on multiple devices.

## ✅ **Solution: Support Multiple Devices Per User**

### **1. Database Changes Required:**

Run this SQL in your Supabase dashboard:

```sql
-- Drop the existing table
DROP TABLE IF EXISTS push_subscriptions CASCADE;

-- Create the table with support for multiple devices per user
CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL, -- Unique identifier for each device
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  platform TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, device_id) -- Allow multiple devices per user
);

-- Create indexes for faster lookups
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_device_id ON push_subscriptions(device_id);
```

### **2. Code Changes Required:**

#### **A. Update PushSubscriptionData Interface:**
```typescript
export interface PushSubscriptionData {
  userId: string;
  deviceId: string; // Add this
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  platform?: string;
}
```

#### **B. Update API Endpoints:**
- `/api/push-subscriptions` - Support multiple devices per user
- `/api/push-notification` - Send to all devices for a user

#### **C. Update PushNotificationService:**
- `getAllPushSubscriptions(userId)` - Get all devices for a user
- `removePushSubscription(userId, deviceId)` - Remove specific device
- `sendPushNotificationToAllDevices(userId, payload)` - Send to all devices

### **3. How It Works After Fix:**

1. **Device A Login**: Stores subscription with `deviceId: "device-a"`
2. **Device B Login**: Stores subscription with `deviceId: "device-b"` 
3. **New Message**: Sends notification to BOTH devices
4. **Device A Logout**: Removes only Device A's subscription
5. **Result**: Notifications only go to Device B (logged-in device)

### **4. Device ID Generation:**
Use browser fingerprinting or generate unique ID:
```typescript
const deviceId = `${navigator.userAgent}-${Date.now()}-${Math.random()}`;
```

## 🎯 **Expected Behavior After Fix:**

- ✅ **Multiple devices**: Each device gets its own subscription
- ✅ **Logout works**: Only removes current device's subscription  
- ✅ **Notifications**: Go to all logged-in devices
- ✅ **No cross-device notifications**: Logged-out devices won't receive notifications

## 🚀 **Implementation Priority:**

1. **High Priority**: Update database schema
2. **High Priority**: Update push notification service
3. **Medium Priority**: Update API endpoints
4. **Low Priority**: Add device management UI

This will completely solve your notification issue across multiple devices!
