# Railway Deployment Guide

This guide will help you deploy your Next.js chat application on Railway.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Supabase Project**: Set up your Supabase project with the required configuration
3. **Git Repository**: Push your code to GitHub, GitLab, or Bitbucket

## Step 1: Prepare Your Supabase Project

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and API keys

### 1.2 Set up Storage Bucket
1. In your Supabase dashboard, go to Storage
2. Create a new bucket named `avatars`
3. Make it public
4. Set file size limit to 5MB
5. Add allowed MIME types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`

### 1.3 Configure Row Level Security (RLS)
Create the following policies in your Supabase dashboard:

**Policy for INSERT (Upload):**
- Policy name: `Allow authenticated users to upload avatars`
- Target roles: `authenticated`
- USING expression: `bucket_id = 'avatars'`
- WITH CHECK expression: `bucket_id = 'avatars'`

**Policy for SELECT (Read):**
- Policy name: `Allow public read access to avatars`
- Target roles: `public`
- USING expression: `bucket_id = 'avatars'`

## Step 2: Deploy to Railway

### 2.1 Connect Your Repository
1. Log in to Railway dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo" (or your preferred Git provider)
4. Choose your repository
5. Railway will automatically detect it's a Next.js project

### 2.2 Configure Environment Variables
In your Railway project dashboard, go to Variables tab and add:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=production
```

### 2.3 Deploy
1. Railway will automatically start building your project
2. The build process will:
   - Install dependencies (`npm ci`)
   - Build the Next.js application (`npm run build`)
   - Start the production server (`npm start`)

## Step 3: Configure Custom Domain (Optional)

1. In your Railway project, go to Settings
2. Click on "Domains"
3. Add your custom domain
4. Follow the DNS configuration instructions

## Step 4: Monitor Your Deployment

### 4.1 Check Build Logs
- Go to your Railway project dashboard
- Click on "Deployments" to see build logs
- Check for any errors during the build process

### 4.2 Monitor Application Logs
- In the Railway dashboard, go to "Logs" tab
- Monitor real-time logs for any runtime issues

## Step 5: Test Your Deployment

1. Visit your Railway-provided URL
2. Test the following features:
   - User registration and login
   - Chat functionality
   - Avatar upload
   - Profile management

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check that all dependencies are in `package.json`
   - Ensure Node.js version compatibility
   - Review build logs for specific errors

2. **Environment Variables**
   - Verify all required environment variables are set
   - Check that Supabase credentials are correct
   - Ensure no typos in variable names

3. **Supabase Connection Issues**
   - Verify your Supabase URL and keys
   - Check that your Supabase project is active
   - Ensure RLS policies are correctly configured

4. **Storage Issues**
   - Verify the `avatars` bucket exists in Supabase
   - Check that the bucket is public
   - Ensure RLS policies allow public read access

### Debug Steps

1. **Check Railway Logs**
   ```bash
   # In Railway dashboard, go to Logs tab
   # Look for error messages or warnings
   ```

2. **Verify Environment Variables**
   - Go to Variables tab in Railway dashboard
   - Ensure all required variables are set correctly

3. **Test Supabase Connection**
   - Check your Supabase dashboard
   - Verify project is active and accessible
   - Test API keys in Supabase dashboard

## Performance Optimization

### 1. Enable Caching
Railway automatically handles caching for static assets.

### 2. Database Optimization
- Use Supabase connection pooling
- Optimize your database queries
- Consider using Supabase Edge Functions for heavy operations

### 3. Image Optimization
- Use Next.js Image component for optimized image loading
- Consider using Supabase's image transformation features

## Security Considerations

1. **Environment Variables**
   - Never commit sensitive keys to your repository
   - Use Railway's environment variable system
   - Rotate keys regularly

2. **Supabase Security**
   - Use Row Level Security (RLS) policies
   - Implement proper authentication checks
   - Validate user inputs

3. **HTTPS**
   - Railway automatically provides HTTPS
   - Ensure all external API calls use HTTPS

## Monitoring and Maintenance

### 1. Set up Monitoring
- Use Railway's built-in monitoring
- Consider adding external monitoring services
- Set up alerts for downtime

### 2. Regular Updates
- Keep dependencies updated
- Monitor for security vulnerabilities
- Test updates in staging environment

### 3. Backup Strategy
- Supabase handles database backups automatically
- Consider additional backup strategies for critical data

## Cost Optimization

1. **Railway Pricing**
   - Monitor your usage in Railway dashboard
   - Consider upgrading plans if needed
   - Use Railway's usage analytics

2. **Supabase Pricing**
   - Monitor your Supabase usage
   - Optimize database queries
   - Consider Supabase Pro for production

## Support and Resources

- **Railway Documentation**: [docs.railway.app](https://docs.railway.app)
- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
- **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)

## Next Steps

After successful deployment:

1. Set up a staging environment for testing
2. Implement CI/CD pipeline
3. Add monitoring and alerting
4. Plan for scaling as your user base grows
5. Consider implementing additional features like:
   - Real-time notifications
   - File sharing
   - Voice/video calls
   - Message encryption
