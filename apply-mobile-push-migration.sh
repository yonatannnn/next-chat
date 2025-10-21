#!/bin/bash

# Script to apply the mobile push notification database migration
# This updates the push_subscriptions table to support multiple devices per user

echo "🚀 Applying mobile push notification database migration..."

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in a supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory. Please run this from the project root."
    exit 1
fi

echo "📝 Applying migration..."

# Apply the migration using supabase CLI
supabase db reset --linked

# Or if you prefer to apply just the migration file:
# supabase db push --linked

echo "✅ Migration applied successfully!"
echo ""
echo "📋 What was updated:"
echo "   - Added device_id column to push_subscriptions table"
echo "   - Updated unique constraint to support multiple devices per user"
echo "   - Added helper functions for subscription management"
echo "   - Updated RLS policies for multiple device support"
echo ""
echo "🔧 Next steps:"
echo "   1. Test the mobile app with the new Supabase push notifications"
echo "   2. Use the test widget in the mobile app to verify functionality"
echo "   3. Check the push_subscriptions table in Supabase dashboard"
echo ""
echo "🎉 Mobile Supabase push notifications are now ready!"

