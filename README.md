# Next Chat - Real-time Chat Application

A modern, desktop-only real-time chat web application built with Next.js 15, Firebase, Supabase, Zustand, and TailwindCSS.

## 🚀 Features

- **Real-time Messaging**: Instant message delivery using Firestore
- **User Authentication**: Secure login/register with Firebase Auth
- **File Uploads**: Image and file sharing via Supabase Storage
- **Online Presence**: See who's online/offline in real-time
- **Modern UI**: Clean, responsive design optimized for desktop
- **State Management**: Efficient state management with Zustand

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router) + React 18 + TailwindCSS
- **Authentication**: Firebase Authentication
- **Database**: Firestore (for messages and user data)
- **File Storage**: Supabase Storage
- **State Management**: Zustand
- **Form Handling**: React Hook Form
- **Icons**: Lucide React

## 📋 Prerequisites

- Node.js 18+ 
- Firebase project with Authentication and Firestore enabled
- Supabase project with Storage enabled

## 🚀 Getting Started

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd next-chat
npm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env.local
```

### 3. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Enable Authentication (Email/Password)
4. Enable Firestore Database
5. Get your Firebase config from Project Settings > General
6. Update `.env.local` with your Firebase credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Supabase Configuration

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Go to Settings > API to get your credentials
4. Create a storage bucket named `chat-files`
5. Update `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Firestore Security Rules

Update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read all user documents (for chat list)
    match /users/{userId} {
      allow read: if request.auth != null;
    }
    
    // Messages can be read/written by sender or receiver
    match /messages/{messageId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == resource.data.senderId || 
         request.auth.uid == resource.data.receiverId);
    }
  }
}
```

### 6. Supabase Storage Policy

Create a storage policy for the `chat-files` bucket:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to view files
CREATE POLICY "Allow authenticated downloads" ON storage.objects
FOR SELECT USING (auth.role() = 'authenticated');
```

### 7. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── chat/page.tsx
│   └── layout.tsx
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Avatar.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       ├── ChatWindow.tsx
│       ├── MessageBubble.tsx
│       └── MessageInput.tsx
├── features/
│   ├── auth/
│   │   ├── hooks/useAuth.ts
│   │   ├── services/authService.ts
│   │   └── store/authStore.ts
│   ├── chat/
│   │   ├── hooks/useChat.ts
│   │   ├── services/chatService.ts
│   │   └── store/chatStore.ts
│   └── users/
│       ├── hooks/useUsers.ts
│       ├── services/userService.ts
│       └── store/usersStore.ts
├── lib/
│   ├── firebase.ts
│   └── supabase.ts
└── utils/
    └── formatTimestamp.ts
```

## 🔧 Usage

1. **Register/Login**: Create an account or sign in with existing credentials
2. **Start Chatting**: Select a user from the sidebar to start a conversation
3. **Send Messages**: Type messages and press Enter or click Send
4. **Upload Files**: Click the paperclip icon to upload images/files
5. **Real-time Updates**: Messages appear instantly for all users

## 🎨 Design Features

- **Desktop-Only**: Optimized for desktop/laptop use
- **Resizable Sidebar**: Adjustable width for user list
- **Modern UI**: Clean, minimal design with TailwindCSS
- **Responsive Messages**: Proper alignment for sent/received messages
- **Online Indicators**: Green dots show who's online
- **File Previews**: Image files display as previews in chat

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📞 Support

If you have any questions or need help setting up the project, please open an issue on GitHub.