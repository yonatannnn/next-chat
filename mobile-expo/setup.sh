#!/bin/bash

echo "🚀 Setting up Mobile Chat App..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if Expo CLI is installed
if ! command -v expo &> /dev/null; then
    echo "📦 Installing Expo CLI..."
    npm install -g @expo/cli
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp env.example .env
    echo "✅ Created .env file. Please update it with your Supabase credentials."
else
    echo "✅ .env file already exists."
fi

# Check for Firebase configuration files
echo "🔍 Checking Firebase configuration..."

if [ ! -f "google-services.json" ]; then
    echo "⚠️  google-services.json not found. Please download it from Firebase Console and place it in the root directory."
fi

if [ ! -f "GoogleService-Info.plist" ]; then
    echo "⚠️  GoogleService-Info.plist not found. Please download it from Firebase Console and place it in the root directory."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your Supabase credentials"
echo "2. Add Firebase configuration files (google-services.json and GoogleService-Info.plist)"
echo "3. Set up your Supabase database tables (see README.md)"
echo "4. Run 'npm start' to start the development server"
echo ""
echo "For detailed instructions, see README.md"
