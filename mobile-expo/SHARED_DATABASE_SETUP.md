# Shared Database Setup Guide

This guide explains how to configure both your web app and React Native mobile app to use the same Firebase Firestore database and Supabase instance.

## 🎯 Overview

Both applications will share:
- **Firebase Firestore** - for real-time messaging, user profiles, and chat data
- **Firebase Authentication** - for user authentication
- **Supabase** - for additional features and data synchronization
- **Firebase Cloud Messaging** - for push notifications

## 📋 Prerequisites

- Existing web app with Firebase and Supabase configured
- Firebase project with Firestore and Authentication enabled
- Supabase project with database tables set up

## 🔧 Configuration Steps

### 1. Firebase Configuration

#### For the Mobile App:

1. **Use the SAME Firebase project** as your web app
2. Download the configuration files from your existing Firebase project:
   - `google-services.json` (for Android)
   - `GoogleService-Info.plist` (for iOS)

3. Place these files in the root of your `mobile-chat` folder:
   ```
   mobile-chat/
   ├── google-services.json
   ├── GoogleService-Info.plist
   └── ...
   ```

#### Firebase Collections Structure

Your Firebase Firestore will have these collections (same as web app):

```
📁 Firestore Collections:
├── messages/          # Chat messages
│   ├── senderId: string
│   ├── receiverId: string
│   ├── text: string
│   ├── timestamp: Timestamp
│   ├── fileUrl: string (optional)
│   ├── seen: boolean
│   └── ...
├── users/            # User profiles
│   ├── id: string
│   ├── username: string
│   ├── email: string
│   ├── name: string
│   └── ...
└── conversationSettings/  # Chat settings
    ├── userId: string
    ├── otherUserId: string
    └── expirationMinutes: number
```

### 2. Supabase Configuration

#### Environment Variables

Create a `.env` file in your `mobile-chat` folder with the **SAME** credentials as your web app:

```env
# Use the SAME Supabase project as your web app
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### Database Tables

Your Supabase database should have these tables (same as web app):

```sql
-- Messages table (if using Supabase for additional features)
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User tokens for push notifications
CREATE TABLE user_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Mobile App Configuration

#### Package Dependencies

The mobile app is configured with these key dependencies:

```json
{
  "@react-native-firebase/app": "^20.5.0",
  "@react-native-firebase/auth": "^20.5.0",
  "@react-native-firebase/firestore": "^20.5.0",
  "@react-native-firebase/messaging": "^20.5.0",
  "@supabase/supabase-js": "^2.75.0",
  "zustand": "^5.0.8"
}
```

#### App Configuration

The `app.json` is configured with:
- Same bundle ID as your web app's Firebase project
- Firebase plugins for React Native
- Proper Android and iOS configurations

### 4. Data Synchronization

#### Real-time Messaging

Both apps use the same Firebase Firestore collections:
- **Web app**: Uses Firebase Web SDK
- **Mobile app**: Uses React Native Firebase

Messages sent from either app will appear in real-time on both platforms.

#### User Authentication

Both apps use the same Firebase Authentication:
- Users can sign in on web and continue on mobile
- User profiles are shared across platforms
- Authentication state is synchronized

#### Push Notifications

Both apps use the same Firebase Cloud Messaging:
- Notifications sent from web app can reach mobile users
- Mobile notifications work with the same FCM project

## 🚀 Testing the Setup

### 1. Install Dependencies

```bash
cd mobile-chat
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp env.example .env

# Edit .env with your Supabase credentials
nano .env
```

### 3. Add Firebase Configuration Files

Place your Firebase configuration files in the mobile-chat root:
- `google-services.json` (from your web app's Firebase project)
- `GoogleService-Info.plist` (from your web app's Firebase project)

### 4. Run the Mobile App

```bash
# Start development server
npm start

# Run on device/simulator
npm run android  # or npm run ios
```

### 5. Test Data Synchronization

1. **Create a user** on the web app
2. **Sign in** with the same credentials on mobile
3. **Send a message** from mobile
4. **Verify** the message appears on web app
5. **Send a message** from web app
6. **Verify** the message appears on mobile

## 🔍 Troubleshooting

### Common Issues

#### Firebase Not Connecting
- Ensure `google-services.json` and `GoogleService-Info.plist` are in the root directory
- Verify the bundle ID matches your Firebase project
- Check that Firebase services are enabled in the console

#### Supabase Connection Issues
- Verify your environment variables in `.env`
- Ensure your Supabase project is active
- Check that the database tables exist

#### Data Not Syncing
- Verify both apps are using the same Firebase project
- Check that Firestore security rules allow read/write access
- Ensure authentication is working on both platforms

#### Push Notifications Not Working
- Verify Firebase Cloud Messaging is enabled
- Check that the app is properly registered with FCM
- Ensure notification permissions are granted

### Debug Mode

Enable debug logging by setting:
```env
EXPO_PUBLIC_DEBUG=true
```

## 📱 Platform-Specific Notes

### Android
- Ensure `google-services.json` is in the root directory
- Verify the package name matches your Firebase project
- Check that Firebase services are properly configured

### iOS
- Ensure `GoogleService-Info.plist` is in the root directory
- Verify the bundle identifier matches your Firebase project
- Check that Firebase services are properly configured

### Web (Expo Web)
- Firebase Web SDK is used for web builds
- Same configuration as your existing web app
- Real-time updates work across all platforms

## 🎉 Success Indicators

You'll know the setup is working when:

1. ✅ Users can sign in on both web and mobile with the same credentials
2. ✅ Messages sent from web appear on mobile in real-time
3. ✅ Messages sent from mobile appear on web in real-time
4. ✅ User profiles are shared between platforms
5. ✅ Push notifications work from both platforms
6. ✅ Data persists across app restarts

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [React Native Firebase Documentation](https://rnfirebase.io/)
- [Supabase Documentation](https://supabase.com/docs)
- [Expo Documentation](https://docs.expo.dev/)

## 🆘 Support

If you encounter issues:

1. Check the console logs for error messages
2. Verify all configuration files are in place
3. Ensure environment variables are correct
4. Test with a simple message first
5. Check Firebase and Supabase console for any errors

The key is ensuring both apps use the **exact same** Firebase project and Supabase instance for seamless data synchronization.
