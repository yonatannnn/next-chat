# Firebase Setup Instructions for Mobile App

## 🔥 Download Firebase Configuration Files

You need to download the Firebase configuration files from your Firebase console and place them in the mobile-chat folder.

### Step 1: Download google-services.json (Android)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **next-chat-636d1**
3. Click the gear icon ⚙️ → **Project settings**
4. Scroll down to **Your apps** section
5. If you don't have an Android app yet:
   - Click **Add app** → **Android**
   - Package name: `com.mobilechat.app`
   - App nickname: `Mobile Chat Android`
   - Click **Register app**
6. Download the `google-services.json` file
7. Place it in `/home/yonatan/Desktop/next-chat/mobile-chat/google-services.json`

### Step 2: Download GoogleService-Info.plist (iOS)

1. In the same Firebase project settings
2. If you don't have an iOS app yet:
   - Click **Add app** → **iOS**
   - Bundle ID: `com.mobilechat.app`
   - App nickname: `Mobile Chat iOS`
   - Click **Register app**
3. Download the `GoogleService-Info.plist` file
4. Place it in `/home/yonatan/Desktop/next-chat/mobile-chat/GoogleService-Info.plist`

### Step 3: Create .env file

Create a `.env` file in the mobile-chat folder with this content:

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

## 📁 Final File Structure

Your mobile-chat folder should look like this:

```
mobile-chat/
├── .env                                    # Environment variables
├── google-services.json                    # Firebase Android config
├── GoogleService-Info.plist               # Firebase iOS config
├── package.json
├── App.js
└── src/
    ├── config/
    │   ├── firebase.js
    │   └── supabase.js
    ├── services/
    │   ├── authService.js
    │   ├── chatService.js
    │   └── notificationService.js
    ├── store/
    │   ├── useAuthStore.js
    │   └── useChatStore.js
    └── screens/
        ├── LoginScreen.js
        └── ChatScreen.js
```

## 🚀 Next Steps

1. **Download the Firebase config files** as described above
2. **Create the .env file** with the content provided
3. **Install dependencies**: `npm install`
4. **Run the app**: `npm start`

## ✅ Verification

After setup, you should be able to:
- Sign in with the same credentials as your web app
- See messages from your web app on mobile
- Send messages from mobile that appear on web
- Have real-time synchronization between both platforms

The mobile app will use the exact same Firebase project (`next-chat-636d1`) and Supabase instance as your web app, ensuring complete data synchronization.
