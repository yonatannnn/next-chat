# Supabase Setup Guide for Push Notifications

## 🚀 **Complete Supabase Setup for Push Notifications**

This guide will walk you through setting up Supabase for your chat application with push notifications.

## 📋 **Step 1: Create Supabase Project**

### **1.1 Go to Supabase Dashboard**
1. Visit [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"New Project"**
3. Sign up/Login with GitHub, Google, or email

### **1.2 Create New Project**
1. Click **"New Project"**
2. **Organization**: Select your organization (or create one)
3. **Project Name**: `next-chat` (or your preferred name)
4. **Database Password**: Generate a strong password (save it!)
5. **Region**: Choose closest to your users
6. Click **"Create new project"**

### **1.3 Wait for Setup**
- Project creation takes 2-3 minutes
- You'll see a progress indicator
- Don't close the browser during setup

## 🔑 **Step 2: Get Supabase Keys**

### **2.1 Access Project Settings**
1. Once project is ready, go to **Settings** (gear icon)
2. Click **"API"** in the left sidebar
3. You'll see your project keys

### **2.2 Copy Required Keys**
```bash
# Copy these values to your .env.local file
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### **2.3 Create .env.local File**
```bash
# Create the file in your project root
touch .env.local
```

### **2.4 Add Environment Variables**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# VAPID Keys for Push Notifications
VAPID_PRIVATE_KEY=your-vapid-private-key-here
```

## 🗄️ **Step 3: Set Up Database Tables**

### **3.1 Access SQL Editor**
1. Go to **SQL Editor** in Supabase dashboard
2. Click **"New Query"**

### **3.2 Run Database Migration**
Copy and paste this SQL code:

```sql
-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  platform TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own subscriptions
CREATE POLICY "Users can manage their own push subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Create policy for service role to access all subscriptions (for sending notifications)
CREATE POLICY "Service role can access all push subscriptions" ON push_subscriptions
  FOR ALL USING (auth.role() = 'service_role');
```

### **3.3 Execute the Migration**
1. Click **"Run"** button
2. Wait for execution to complete
3. You should see "Success" message

## 🔐 **Step 4: Configure Authentication**

### **4.1 Enable Authentication**
1. Go to **Authentication** → **Settings**
2. **Site URL**: Add your domain (e.g., `http://localhost:3000` for development)
3. **Redirect URLs**: Add your domain + `/auth/callback`

### **4.2 Configure Auth Providers**
1. **Email**: Enable email authentication
2. **Google**: Optional - enable if you want Google login
3. **GitHub**: Optional - enable if you want GitHub login

### **4.3 Auth Settings**
```bash
# Site URL (for development)
http://localhost:3000

# Redirect URLs
http://localhost:3000/auth/callback
https://your-domain.com/auth/callback
```

## 🔑 **Step 5: Generate VAPID Keys**

### **5.1 Install web-push globally**
```bash
npm install -g web-push
```

### **5.2 Generate VAPID Keys**
```bash
web-push generate-vapid-keys
```

### **5.3 Copy Generated Keys**
You'll get output like:
```
=======================================

Public Key:
BPyk4E4ejKjRE1aYPFz7NwfYse_xhdOoBgZHjiwOz3AjTho8EtPxNvRnDFDCGBh3XKRzm5p55BdLhajnPpV4KRI

Private Key:
IzG9CRovS6FAg7Ig_vZkZ0afpMoCnuHi37CAGqpPiHM

=======================================
```

### **5.4 Update Your Code**
✅ **Already Updated!** The code has been updated with your generated keys:

1. **`notificationService.ts`** - ✅ Updated with your public key:
```typescript
applicationServerKey: this.urlBase64ToArrayBuffer(
  'BPyk4E4ejKjRE1aYPFz7NwfYse_xhdOoBgZHjiwOz3AjTho8EtPxNvRnDFDCGBh3XKRzm5p55BdLhajnPpV4KRI'
)
```

2. **Create `.env.local`** with your private key:
```env
VAPID_PRIVATE_KEY=IzG9CRovS6FAg7Ig_vZkZ0afpMoCnuHi37CAGqpPiHM
```

## 🧪 **Step 6: Test the Setup**

### **6.1 Test Database Connection**
```bash
# Start your development server
npm run dev
```

### **6.2 Test Push Notification API**
```bash
# Test the push notification endpoint
curl -X POST http://localhost:3000/api/test-push \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-id", "title": "Test", "body": "Test message"}'
```

### **6.3 Test in Browser**
1. Open your app in browser
2. Grant notification permission
3. Check browser console for "Push subscription registered with server"
4. Check Supabase dashboard → Table Editor → push_subscriptions

## 🔍 **Step 7: Verify Database Setup**

### **7.1 Check Tables**
1. Go to **Table Editor** in Supabase
2. You should see `push_subscriptions` table
3. Click on it to view the structure

### **7.2 Test Data Insertion**
1. Go to **Table Editor** → `push_subscriptions`
2. Click **"Insert"** → **"Insert row"**
3. Add test data to verify the table works

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **"Supabase not initialized"**
   - Check your `.env.local` file
   - Verify keys are correct
   - Restart development server

2. **"Permission denied"**
   - Check RLS policies are set correctly
   - Verify user is authenticated
   - Check service role key

3. **"Push notification failed"**
   - Verify VAPID keys are correct
   - Check if user has granted permission
   - Ensure HTTPS in production

4. **"Table doesn't exist"**
   - Run the SQL migration again
   - Check for typos in table name
   - Verify you're in the correct project

### **Debug Steps:**
1. **Check Supabase Dashboard**: Verify project is active
2. **Check Environment Variables**: Ensure all keys are set
3. **Check Browser Console**: Look for error messages
4. **Check Network Tab**: Verify API calls are working
5. **Test Database**: Try inserting data manually

## 📱 **Production Deployment**

### **Production Environment Variables:**
```env
# Production Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Production VAPID
VAPID_PRIVATE_KEY=your-vapid-private-key

# Production URLs
NEXT_PUBLIC_BACKEND_URL=https://your-domain.com
```

### **Production Auth Settings:**
- **Site URL**: `https://your-domain.com`
- **Redirect URLs**: `https://your-domain.com/auth/callback`

## ✅ **Verification Checklist**

- [ ] Supabase project created
- [ ] Environment variables set
- [ ] Database migration executed
- [ ] Authentication configured
- [ ] VAPID keys generated and updated
- [ ] Push subscription table created
- [ ] RLS policies configured
- [ ] Test API endpoint working
- [ ] Push notifications working in browser
- [ ] Database storing subscriptions

## 🎉 **You're Ready!**

Once all steps are completed, your push notification system will work even when the app is completely closed. Users will receive notifications on their devices when new messages arrive, regardless of whether the app is open or closed.

## 📞 **Need Help?**

- **Supabase Docs**: [https://supabase.com/docs](https://supabase.com/docs)
- **Web Push Docs**: [https://web.dev/push-notifications/](https://web.dev/push-notifications/)
- **VAPID Keys**: [https://web.dev/push-notifications/](https://web.dev/push-notifications/)
