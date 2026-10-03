# Mobile Chat App

A React Native chat application built with Expo, Firebase, and Supabase.

## Features

- Real-time messaging with Firebase Firestore and Supabase
- User authentication with Firebase Auth and Supabase Auth
- Push notifications with Firebase Cloud Messaging
- Cross-platform support (iOS, Android, Web)
- Offline support with AsyncStorage
- State management with Zustand

## Prerequisites

- Node.js (v16 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- Firebase project with Firestore and Authentication enabled
- Supabase project with database tables set up

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Configuration

#### For Android:
1. Download `google-services.json` from your Firebase project
2. Place it in the root of the mobile-chat folder

#### For iOS:
1. Download `GoogleService-Info.plist` from your Firebase project
2. Place it in the root of the mobile-chat folder

### 3. Environment Configuration

1. Copy `env.example` to `.env`:
```bash
cp env.example .env
```

2. Update the `.env` file with your Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup

#### Supabase Tables
Create the following tables in your Supabase database:

```sql
-- Messages table
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

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Users can insert messages" ON messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can manage own tokens" ON user_tokens FOR ALL USING (auth.uid() = user_id);
```

### 5. Firebase Configuration

1. Enable Authentication in Firebase Console
2. Enable Firestore Database
3. Enable Cloud Messaging for push notifications
4. Configure your app in Firebase Console with the bundle ID: `com.mobilechat.app`

## Running the App

### Development

```bash
# Start the development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on Web
npm run web
```

### Building for Production

```bash
# Build for Android
expo build:android

# Build for iOS
expo build:ios
```

## Project Structure

```
src/
├── config/
│   ├── firebase.js      # Firebase configuration
│   └── supabase.js      # Supabase configuration
├── screens/
│   ├── LoginScreen.js   # Authentication screen
│   └── ChatScreen.js    # Main chat interface
├── services/
│   ├── authService.js   # Authentication service
│   ├── chatService.js   # Chat functionality
│   └── notificationService.js # Push notifications
└── store/
    ├── useAuthStore.js  # Authentication state
    └── useChatStore.js  # Chat state
```

## Configuration Files

- `app.json` - Expo configuration with Firebase plugins
- `package.json` - Dependencies and scripts
- `env.example` - Environment variables template

## Troubleshooting

### Common Issues

1. **Firebase not initializing**: Make sure `google-services.json` and `GoogleService-Info.plist` are in the root directory
2. **Supabase connection issues**: Check your environment variables in `.env`
3. **Push notifications not working**: Ensure Firebase Cloud Messaging is properly configured
4. **Build errors**: Make sure all dependencies are installed with `npm install`

### Debug Mode

To enable debug logging, set the following in your environment:
```
EXPO_PUBLIC_DEBUG=true
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the 0BSD License.
