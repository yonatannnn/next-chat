# 🔍 Notification Debugging Guide

## 🚨 **Issue: Still receiving notifications after logout**

### **Debug Steps:**

1. **Open Browser Developer Tools** (F12)
2. **Go to Console tab**
3. **Look for these debug messages:**

#### **During Logout:**
- `🔴 LOGOUT DEBUG: Starting logout process...`
- `🔴 LOGOUT DEBUG: Device ID: [device-id]`
- `🔴 LOGOUT DEBUG: User ID: [user-id]`
- `🔴 LOGOUT DEBUG: Found service workers: [count]`
- `🔴 LOGOUT DEBUG: Unregistering service worker: [scope]`
- `🔴 LOGOUT DEBUG: Closing active notifications: [count]`
- `🔴 PUSH DEBUG: Removing push subscription for device: [device-id] user: [user-id]`
- `🔴 PUSH DEBUG: Push subscription removed for device: [device-id] of user: [user-id]`
- `🔴 LOGOUT DEBUG: Auth service logout completed`
- `🔴 LOGOUT DEBUG: Local logout completed`

#### **When receiving notifications after logout:**
- `🔔 NOTIFICATION DEBUG: useGlobalNotifications hook running`
- `🔔 NOTIFICATION DEBUG: userData: [user-id]` (should be null after logout)
- `🔔 NOTIFICATION DEBUG: Setting up message listener for user: [user-id]`
- `🔔 NOTIFICATION DEBUG: Received messages: [count]`
- `🔔 NOTIFICATION DEBUG: About to show notification`
- `🔔 NOTIFICATION DEBUG: userData exists: [true/false]`
- `🔔 PUSH DEBUG: sendChatNotification called`
- `🔔 PUSH DEBUG: receiverId: [user-id]`

### **Possible Issues:**

#### **1. Local Notification System Still Active**
- **Symptom**: See `🔔 NOTIFICATION DEBUG: userData exists: true` after logout
- **Cause**: `useGlobalNotifications` hook still has userData
- **Fix**: The hook should stop when userData becomes null

#### **2. Service Worker Not Unregistered**
- **Symptom**: See `🔴 LOGOUT DEBUG: Found service workers: 0` (should be > 0)
- **Cause**: Service workers not being found or unregistered
- **Fix**: Service worker cleanup not working

#### **3. Push Subscription Not Removed**
- **Symptom**: No `🔴 PUSH DEBUG: Push subscription removed` message
- **Cause**: Database cleanup failing
- **Fix**: Check database connection and permissions

#### **4. Real-time Listener Still Active**
- **Symptom**: See `🔔 NOTIFICATION DEBUG: Received messages: [count]` after logout
- **Cause**: Firebase real-time listener not unsubscribed
- **Fix**: Need to unsubscribe from real-time listeners

### **Quick Test:**

1. **Login to your app**
2. **Open Console (F12)**
3. **Send a message from another device/account**
4. **Check if you see notification debug messages**
5. **Logout**
6. **Send another message from another device/account**
7. **Check if you still see notification debug messages**

### **Expected Behavior After Logout:**
- ❌ No `🔔 NOTIFICATION DEBUG: userData exists: true`
- ❌ No `🔔 NOTIFICATION DEBUG: Received messages: [count]`
- ❌ No `🔔 NOTIFICATION DEBUG: About to show notification`
- ❌ No `🔔 PUSH DEBUG: sendChatNotification called`

### **If Still Getting Notifications:**

The issue is likely one of these:

1. **Local notification system** (`useGlobalNotifications`) still running
2. **Service worker** not properly unregistered
3. **Real-time listener** not unsubscribed
4. **Push subscription** not removed from database

**Next Steps:**
- Share the console output with me
- I'll identify which system is still active
- I'll provide the specific fix
