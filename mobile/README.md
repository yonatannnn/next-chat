# Next Chat Mobile App

A Flutter mobile application that mirrors the Next.js chat website with all features and data synchronization.

## Features

✅ **Authentication**: Register/Login with Firebase Auth  
✅ **Real-time Chat**: Firestore-based messaging with seen status  
✅ **File Upload**: Images via Supabase Storage, Voice via Firebase Storage  
✅ **Message Options**: Edit, Delete, Forward, Reply functionality  
✅ **User Management**: Profile creation with avatar uploads  
✅ **Search**: Username-based user search  
✅ **BLoC State Management**: Clean architecture with reactive updates  

## Setup Instructions

### 1. Prerequisites

- Flutter SDK (3.8.1+)
- Android Studio / VS Code
- Firebase project
- Supabase project

### 2. Firebase Configuration

1. Run Firebase configuration:
   ```bash
   flutterfire configure --project=your-firebase-project-id --platforms=android,ios
   ```

2. Ensure Firebase Storage is enabled in your Firebase console

### 3. Supabase Configuration

1. Create a Supabase project at [supabase.com](https://supabase.com)

2. Create storage buckets:
   - `chat-files` (for images)
   - `avatars` (for profile pictures)

3. Update Supabase configuration in `lib/src/config/supabase_config.dart`:
   ```dart
   static const String supabaseUrl = 'https://your-project-id.supabase.co';
   static const String supabaseAnonKey = 'your-anon-key-here';
   ```

4. Set up Row Level Security (RLS) policies:
   - Allow authenticated users to upload to `chat-files` and `avatars` buckets
   - Allow public read access to both buckets

### 4. Environment Configuration

Create a `.env` file in the project root with:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
FIREBASE_PROJECT_ID=your-firebase-project-id
```

### 5. Install Dependencies

```bash
flutter pub get
```

### 6. Run the App

```bash
flutter run
```

## Architecture

### Services
- **AuthService**: Firebase Authentication
- **ChatRepository**: Firestore message management
- **UsersRepository**: User profile management
- **FileUploadService**: File upload handling (Supabase + Firebase Storage)

### State Management
- **BLoC Pattern**: ConversationsBloc for reactive UI updates
- **Repository Pattern**: Clean separation of data access

### File Storage
- **Images**: Supabase Storage (`chat-files` bucket)
- **Voice Messages**: Firebase Storage (`voice-messages` folder)
- **Avatars**: Supabase Storage (`avatars` bucket)

## Key Features Implementation

### File Upload Flow
1. **Image Upload**: User selects image → Upload to Supabase → Send message with URL
2. **Voice Upload**: Record audio → Upload to Firebase Storage → Send message with URL
3. **Avatar Upload**: During registration → Upload to Supabase → Update Firebase Auth profile

### Message Options
- **Edit**: Long-press → Edit → Update in Firestore
- **Delete**: Long-press → Delete → Mark as deleted in Firestore
- **Reply**: Long-press → Reply → Send with reply context
- **Forward**: Long-press → Forward → Send to multiple recipients

### Real-time Updates
- **Messages**: Firestore streams for instant updates
- **Seen Status**: Automatic marking with visual indicators
- **Typing Indicators**: Real-time user activity

## Development Notes

- Uses `SafeArea` with `top: false` for immersive UI
- Implements proper error handling and loading states
- Follows Flutter best practices for state management
- Mirrors web app functionality exactly

## Troubleshooting

1. **Firebase not configured**: Run `flutterfire configure`
2. **Supabase connection issues**: Check URL and API keys
3. **File upload failures**: Verify storage bucket permissions
4. **Build errors**: Run `flutter clean && flutter pub get`

## Next Steps

- [ ] Push notification integration (FCM)
- [ ] Link preview API integration
- [ ] Offline message caching
- [ ] Message encryption