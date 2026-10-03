#!/bin/bash

echo "🚀 Quick Setup for Mobile Chat App"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the mobile-chat directory"
    exit 1
fi

echo "📋 Setup Checklist:"
echo ""

# Check for .env file
if [ -f ".env" ]; then
    echo "✅ .env file exists"
else
    echo "❌ .env file missing"
    echo "   Create .env with your Supabase credentials:"
    echo "   EXPO_PUBLIC_SUPABASE_URL=https://dqucrvcvulwzzcbjoyai.supabase.co"
    echo "   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
fi

# Check for Firebase config files
if [ -f "google-services.json" ]; then
    echo "✅ google-services.json exists"
else
    echo "❌ google-services.json missing"
    echo "   Download from Firebase Console → Project Settings → Your apps → Android"
    echo "   Package name: com.mobilechat.app"
fi

if [ -f "GoogleService-Info.plist" ]; then
    echo "✅ GoogleService-Info.plist exists"
else
    echo "❌ GoogleService-Info.plist missing"
    echo "   Download from Firebase Console → Project Settings → Your apps → iOS"
    echo "   Bundle ID: com.mobilechat.app"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🎯 Next Steps:"
echo "1. Download Firebase config files from Firebase Console"
echo "2. Create .env file with Supabase credentials"
echo "3. Run: npm start"
echo ""
echo "📚 See FIREBASE_SETUP_INSTRUCTIONS.md for detailed steps"
