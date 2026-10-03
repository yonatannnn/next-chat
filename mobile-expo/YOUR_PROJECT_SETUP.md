# Your Mobile Chat App Setup Guide

## 🎯 Project Configuration

**Firebase Project**: `next-chat-636d1`  
**Supabase Project**: `dqucrvcvulwzzcbjoyai`  
**Bundle ID**: `com.mobilechat.app`

## 📋 Step-by-Step Setup

### Step 1: Create Environment File

Create a `.env` file in the `mobile-chat` folder:

```bash
cd mobile-chat
nano .env
```

Add this content:
```env
# Supabase Configuration (same as web app)
EXPO_PUBLIC_SUPABASE_URL=https://dqucrvcvulwzzcbjoyai.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxdWNydmN2dWx3enpjYmpveWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTk5NDgsImV4cCI6MjA3NjAzNTk0OH0.bARZq5dW8z8dD-CuDUNeEoRoHkhhgyaufZo84ZLLDio

# Firebase Configuration (for React Native Firebase)
# These will be configured in google-services.json and GoogleService-Info.plist
# Use the SAME Firebase project as your web app for shared database
# Project ID: next-chat-636d1
# No environment variables needed for React Native Firebase
```

### Step 2: Download Firebase Configuration Files

#### For Android (google-services.json):

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **next-chat-636d1**
3. Click ⚙️ → **Project settings**
4. Scroll to **Your apps** section
5. If no Android app exists:
   - Click **Add app** → **Android**
   - Package name: `com.mobilechat.app`
   - App nickname: `Mobile Chat Android`
   - Click **Register app**
6. Download `google-services.json`
7. Place it in: `/home/yonatan/Desktop/next-chat/mobile-chat/google-services.json`

#### For iOS (GoogleService-Info.plist):

1. In the same Firebase project settings
2. If no iOS app exists:
   - Click **Add app** → **iOS**
   - Bundle ID: `com.mobilechat.app`
   - App nickname: `Mobile Chat iOS`
   - Click **Register app**
3. Download `GoogleService-Info.plist`
4. Place it in: `/home/yonatan/Desktop/next-chat/mobile-chat/GoogleService-Info.plist`

### Step 3: Install Dependencies

```bash
cd mobile-chat
npm install
```

### Step 4: Run Setup Check

```bash
./quick-setup.sh
```

### Step 5: Start Development

```bash
npm start
```

## 🔍 Verification Steps

### Test Database Connection:

1. **Start the mobile app**: `npm start`
2. **Open Expo Go** on your phone and scan the QR code
3. **Create a test account** on the mobile app
4. **Check your web app** - the user should appear in the dashboard
5. **Send a message** from mobile
6. **Check your web app** - the message should appear in real-time

### Expected Behavior:

✅ **User Authentication**: Same login works on both web and mobile  
✅ **Real-time Messages**: Messages sync instantly between platforms  
✅ **User Profiles**: User data is shared across both apps  
✅ **Push Notifications**: Notifications work from both platforms  

## 🚨 Troubleshooting

### If Firebase connection fails:
- Verify `google-services.json` and `GoogleService-Info.plist` are in the root directory
- Check that the package name matches: `com.mobilechat.app`
- Ensure Firebase services are enabled in the console

### If Supabase connection fails:
- Verify your `.env` file has the correct Supabase URL and key
- Check that your Supabase project is active
- Ensure the database tables exist (run the SQL from `supabase-setup.sql`)

### If messages don't sync:
- Verify both apps are using the same Firebase project (`next-chat-636d1`)
- Check that Firestore security rules allow read/write access
- Ensure authentication is working on both platforms

## 📱 Testing on Different Platforms

### Android:
```bash
npm run android
```

### iOS:
```bash
npm run ios
```

### Web:
```bash
npm run web
```

## 🎉 Success Indicators

You'll know everything is working when:

1. ✅ You can sign in on mobile with the same credentials as web
2. ✅ Messages sent from mobile appear on web in real-time
3. ✅ Messages sent from web appear on mobile in real-time
4. ✅ User profiles are shared between platforms
5. ✅ Push notifications work from both platforms

## 📞 Support

If you encounter issues:

1. Check the console logs for error messages
2. Verify all configuration files are in place
3. Ensure environment variables are correct
4. Test with a simple message first
5. Check Firebase and Supabase console for any errors

The key is ensuring both apps use the **exact same** Firebase project (`next-chat-636d1`) and Supabase instance for seamless data synchronization.
