# Supabase Storage Setup for Avatar Uploads

This guide will help you set up Supabase storage for avatar uploads in your Next.js chat application.

## Prerequisites

1. A Supabase project created at [supabase.com](https://supabase.com)
2. Your Supabase project URL and API keys

## Setup Steps

### 1. Environment Variables

Add the following environment variables to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 2. Create Storage Bucket

You can create the storage bucket in two ways:

#### Option A: Using the Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to Storage in the left sidebar
3. Click "Create a new bucket"
4. Name it `avatars`
5. Make it public
6. Set file size limit to 5MB
7. Add allowed MIME types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`

#### Option B: Using the Setup Script
1. Install the required dependency:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Run the setup script:
   ```bash
   node setup-supabase-storage.js
   ```

### 3. Configure Row Level Security (RLS)

In your Supabase dashboard:

1. Go to Authentication > Policies
2. Create a new policy for the `storage.objects` table:

**Policy for INSERT (Upload):**
- Policy name: `Allow authenticated users to upload avatars`
- Target roles: `authenticated`
- USING expression: `bucket_id = 'avatars'`
- WITH CHECK expression: `bucket_id = 'avatars'`

**Policy for SELECT (Read):**
- Policy name: `Allow public read access to avatars`
- Target roles: `public`
- USING expression: `bucket_id = 'avatars'`

### 4. Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/profile` in your application
3. Try uploading an avatar image
4. Verify the image appears in your Supabase storage dashboard

## Features Implemented

✅ **Avatar Upload**: Users can upload profile pictures to Supabase storage
✅ **Username Validation**: Real-time checking for username availability
✅ **Email Protection**: Email field is read-only and cannot be changed
✅ **Beautiful UI**: Modern, responsive design with gradient header
✅ **Profile Information**: Shows user ID, creation date, and account status
✅ **Real-time Updates**: Changes are reflected immediately in the UI

## File Structure

```
src/
├── app/
│   └── profile/
│       └── page.tsx          # Main profile page component
├── features/
│   └── auth/
│       └── services/
│           └── authService.ts # Updated with profile methods
└── components/
    ├── ui/
    │   ├── Avatar.tsx        # Updated with xl size
    │   └── Button.tsx         # Updated with ghost variant
    └── layout/
        └── Sidebar.tsx       # Added profile link
```

## API Methods Added

- `checkUsernameAvailability(username, currentUserId?)`: Validates username uniqueness
- `updateProfile(userId, updates)`: Updates user profile data
- `uploadAvatar(file, userId)`: Uploads avatar to Supabase storage

## Troubleshooting

### Common Issues

1. **"Bucket not found" error**: Make sure the `avatars` bucket exists in your Supabase storage
2. **"Permission denied" error**: Check your RLS policies are correctly configured
3. **"File too large" error**: Ensure the file is under 5MB
4. **"Invalid file type" error**: Make sure you're uploading an image file

### Debug Steps

1. Check your environment variables are correctly set
2. Verify the Supabase bucket exists and is public
3. Check the browser console for any error messages
4. Verify RLS policies are properly configured

## Security Notes

- The avatars bucket is public for read access (needed for displaying images)
- Only authenticated users can upload avatars
- File size is limited to 5MB
- Only image file types are allowed
- Username validation prevents duplicates
