#!/bin/bash

echo "🚀 Supabase Setup Script for Next Chat"
echo "======================================"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local file..."
    touch .env.local
    echo "# Supabase Configuration" >> .env.local
    echo "NEXT_PUBLIC_SUPABASE_URL=your-supabase-url-here" >> .env.local
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here" >> .env.local
    echo "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here" >> .env.local
    echo "" >> .env.local
    echo "# VAPID Keys for Push Notifications" >> .env.local
    echo "VAPID_PRIVATE_KEY=your-vapid-private-key-here" >> .env.local
    echo "" >> .env.local
    echo "# Backend URL" >> .env.local
    echo "NEXT_PUBLIC_BACKEND_URL=https://web-production-ac2a6.up.railway.app" >> .env.local
    echo "✅ .env.local file created!"
else
    echo "✅ .env.local file already exists"
fi

# Check if web-push is installed
if ! command -v web-push &> /dev/null; then
    echo "📦 Installing web-push globally..."
    npm install -g web-push
    echo "✅ web-push installed!"
else
    echo "✅ web-push already installed"
fi

# Generate VAPID keys
echo "🔑 Generating VAPID keys..."
echo "=========================="
web-push generate-vapid-keys
echo "=========================="
echo ""
echo "📋 Next Steps:"
echo "1. Copy the generated keys above"
echo "2. Update your .env.local file with the private key"
echo "3. Update src/utils/notificationService.ts with the public key"
echo "4. Create a Supabase project at https://supabase.com"
echo "5. Run the SQL migration in your Supabase dashboard"
echo "6. Update your .env.local with Supabase keys"
echo ""
echo "📖 For detailed instructions, see SUPABASE_SETUP_GUIDE.md"
echo ""
echo "🎉 Setup script completed!"
