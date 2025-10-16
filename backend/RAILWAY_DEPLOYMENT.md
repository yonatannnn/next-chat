# Railway Deployment Guide

This guide will help you deploy your Next.js Chat Backend to Railway.

## Prerequisites

1. A GitHub account
2. A Railway account (sign up at [railway.app](https://railway.app))
3. Your code pushed to GitHub

## Deployment Steps

### 1. Push Your Code to GitHub

First, make sure your code is committed and pushed to GitHub:

```bash
git add .
git commit -m "Add Railway deployment configuration"
git push origin main
```

### 2. Deploy to Railway

#### Option A: Deploy from GitHub (Recommended)

1. **Go to [Railway.app](https://railway.app)** and sign in
2. **Click "New Project"**
3. **Select "Deploy from GitHub repo"**
4. **Choose your repository** (`next-chat-backend` or your repo name)
5. **Railway will automatically detect it's a Node.js app**
6. **Click "Deploy"**

#### Option B: Deploy with Railway CLI

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Initialize Railway project:**
   ```bash
   railway init
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

### 3. Configure Environment Variables

In your Railway dashboard:

1. **Go to your project**
2. **Click on "Variables" tab**
3. **Add these environment variables:**

```
PORT=3001
FRONTEND_URL=https://your-frontend-domain.railway.app
```

### 4. Get Your Backend URL

After deployment, Railway will provide you with a URL like:
```
https://your-backend-name-production.up.railway.app
```

### 5. Update Your Frontend

Update your frontend to use the Railway backend URL:

```javascript
// In your frontend code
const BACKEND_URL = 'https://your-backend-name-production.up.railway.app';
```

## Railway Configuration Files

The following files have been added for Railway deployment:

- `railway.json` - Railway-specific configuration
- `Procfile` - Process file for Railway
- `env.example` - Environment variables example

## Health Check

Your app includes a health check endpoint at `/health` that Railway can use to monitor your service.

## Monitoring

Railway provides:
- **Logs** - View real-time logs in the dashboard
- **Metrics** - CPU, memory, and network usage
- **Deployments** - Track deployment history

## Troubleshooting

### Common Issues:

1. **Port Issues**: Railway automatically sets the PORT environment variable
2. **CORS Issues**: The server is configured to allow Railway domains
3. **Database**: Using JSON file storage (consider upgrading to a database for production)

### Useful Commands:

```bash
# View logs
railway logs

# Connect to your service
railway connect

# Check status
railway status
```

## Next Steps

1. **Set up a database** (PostgreSQL, MongoDB, etc.) for production
2. **Configure custom domain** in Railway settings
3. **Set up monitoring** and alerts
4. **Configure CI/CD** for automatic deployments

## Support

- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Railway GitHub](https://github.com/railwayapp)
