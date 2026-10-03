# Mobile Chat App - Configuration Guide

This guide will walk you through setting up Firebase and Supabase for your React Native chat application.

## Prerequisites

- Node.js (v16 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- Firebase project
- Supabase project

## 1. Firebase Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: "Mobile Chat"
4. Enable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Authentication

1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" provider
5. Click "Save"

### Step 3: Enable Firestore Database

1. Go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location for your database
5. Click "Done"

### Step 4: Enable Cloud Messaging

1. Go to "Cloud Messaging"
2. No additional setup required for basic functionality

### Step 5: Add Android App

1. In Firebase Console, click "Add app" → Android
2. Enter package name: `com.mobilechat.app`
3. Enter app nickname: "Mobile Chat Android"
4. Click "Register app"
5. Download `google-services.json`
6. Place it in the root of your mobile-chat folder

### Step 6: Add iOS App

1. In Firebase Console, click "Add app" → iOS
2. Enter bundle ID: `com.mobilechat.app`
3. Enter app nickname: "Mobile Chat iOS"
4. Click "Register app"
5. Download `GoogleService-Info.plist`
6. Place it in the root of your mobile-chat folder

## 2. Supabase Setup

### Step 1: Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New project"
3. Enter project name: "Mobile Chat"
4. Enter database password
5. Select region
6. Click "Create new project"

### Step 2: Get Project Credentials

1. Go to "Settings" → "API"
2. Copy the following values:
   - Project URL
   - Anon public key

### Step 3: Set Up Database

1. Go to "SQL Editor"
2. Copy and paste the contents of `supabase-setup.sql`
3. Click "Run" to execute the script

### Step 4: Configure Authentication

1. Go to "Authentication" → "Settings"
2. Under "Site URL", add your development URLs:
   - `http://localhost:19006` (for web)
   - `exp://192.168.1.100:8081` (for mobile, replace with your IP)

## 3. Environment Configuration

### Step 1: Create Environment File

1. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```

2. Update `.env` with your credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

## 4. Testing the Setup

### Step 1: Install Dependencies

```bash
cd mobile-chat
npm install
```

### Step 2: Run Setup Script

```bash
./setup.sh
```

### Step 3: Start Development Server

```bash
npm start
```

### Step 4: Test on Device/Simulator

1. Scan QR code with Expo Go app (mobile)
2. Or press 'w' for web version
3. Or press 'a' for Android emulator
4. Or press 'i' for iOS simulator

## 5. Troubleshooting

### Common Issues

#### Firebase Not Initializing
- Ensure `google-services.json` and `GoogleService-Info.plist` are in the root directory
- Check that the bundle ID matches your Firebase app configuration

#### Supabase Connection Issues
- Verify your environment variables in `.env`
- Check that your Supabase project is active
- Ensure the database tables were created successfully

#### Build Errors
- Run `npm install` to ensure all dependencies are installed
- Clear Expo cache: `expo start -c`
- Check that all required files are present

#### Push Notifications Not Working
- Ensure Firebase Cloud Messaging is enabled
- Check that the app is properly registered with Firebase
- Verify notification permissions are granted

### Debug Mode

To enable debug logging, add to your `.env`:
```env
EXPO_PUBLIC_DEBUG=true
```

## 6. Production Deployment

### Android

1. Build APK:
   ```bash
   expo build:android
   ```

2. Or build AAB for Play Store:
   ```bash
   expo build:android -t app-bundle
   ```

### iOS

1. Build for iOS:
   ```bash
   expo build:ios
   ```

2. Or submit to App Store:
   ```bash
   expo build:ios --type archive
   ```

## 7. Security Considerations

### Firebase Security Rules

Update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /messages/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Supabase Security

The provided SQL script includes Row Level Security (RLS) policies. Review and adjust as needed for your use case.

## 8. Next Steps

1. Customize the UI to match your brand
2. Add more features like file sharing, emoji reactions
3. Implement user profiles and avatars
4. Add group chat functionality
5. Set up analytics and monitoring

## Support

If you encounter issues:

1. Check the [Expo Documentation](https://docs.expo.dev/)
2. Review [Firebase Documentation](https://firebase.google.com/docs)
3. Check [Supabase Documentation](https://supabase.com/docs)
4. Review the project's README.md for additional information
