# Online Status System Setup

This document explains how to set up and use the online status tracking system for the Next.js chat application.

## Overview

The online status system consists of:
- **Backend Server**: Node.js/Express server with Socket.IO for real-time status tracking
- **Frontend Integration**: React hooks and services for status management
- **30-Second Checker**: Automated cron job that checks user activity every 30 seconds

## Features

- ✅ Real-time online/offline status tracking
- ✅ 30-second interval status checking
- ✅ Automatic disconnection detection
- ✅ Visual online indicators in the UI
- ✅ Heartbeat system to maintain connections
- ✅ REST API for status queries

## Quick Start

### Option 1: Use the Combined Startup Script
```bash
./start-with-status.sh
```

### Option 2: Manual Setup

1. **Start the Backend Server**:
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **Start the Frontend** (in a new terminal):
   ```bash
   npm run dev
   ```

## Backend Server Details

### Ports
- Backend: `https://web-production-ac2a6.up.railway.app` (Railway deployment)
- Frontend: `http://localhost:3000`

### API Endpoints

- `GET /health` - Health check
- `GET /api/status` - Get all user statuses  
- `GET /api/status/:userId` - Get specific user status

### Production Deployment
- **Health Check**: https://web-production-ac2a6.up.railway.app/health
- **Status API**: https://web-production-ac2a6.up.railway.app/api/status

### Socket.IO Events

**Client → Server:**
- `user-online` - Notify user is online
- `user-offline` - Notify user is offline
- `ping` - Heartbeat ping

**Server → Client:**
- `user-status-changed` - Status update for a user
- `status-update` - Bulk status update
- `pong` - Heartbeat response

## Frontend Integration

### Services

- `onlineStatusService` - Main service for status management
- `useOnlineStatus` - React hook for status tracking

### Usage Example

```typescript
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

function ChatComponent() {
  const { isOnline, allStatuses } = useOnlineStatus(userId);
  
  return (
    <div>
      {isOnline ? 'Online' : 'Offline'}
      {allStatuses[otherUserId]?.isOnline && 'User is online'}
    </div>
  );
}
```

## Configuration

### Environment Variables

Set `NEXT_PUBLIC_BACKEND_URL` in your environment:
```bash
export NEXT_PUBLIC_BACKEND_URL=https://web-production-ac2a6.up.railway.app
```

### Backend Configuration

The backend server automatically:
- Checks user activity every 30 seconds
- Marks users as offline after 60 seconds of inactivity
- Stores status in `backend/database.json`
- Broadcasts status changes to all connected clients

## How It Works

1. **User Login**: Frontend connects to backend via Socket.IO
2. **Status Tracking**: Backend tracks user activity and connection status
3. **30-Second Checker**: Cron job runs every 30 seconds to check for inactive users
4. **Real-time Updates**: Status changes are broadcast to all connected clients
5. **Visual Indicators**: Frontend shows green dots for online users

## Troubleshooting

### Backend Won't Start
- Check if port 3001 is available
- Ensure all dependencies are installed: `cd backend && npm install`

### Frontend Can't Connect
- Verify `NEXT_PUBLIC_BACKEND_URL` is set correctly
- Check if backend is running on the correct port
- Check browser console for connection errors

### Status Not Updating
- Check browser network tab for WebSocket connections
- Verify backend logs for connection events
- Ensure heartbeat is working (check console for ping/pong messages)

## Development

### Backend Development
```bash
cd backend
npm run dev  # Uses nodemon for auto-restart
```

### Frontend Development
```bash
npm run dev
```

## Production Deployment

For production, you'll need to:
1. Set up proper environment variables
2. Configure CORS for your domain
3. Use a process manager like PM2
4. Set up proper logging and monitoring

## Database

The backend uses a simple JSON file (`backend/database.json`) to store status information. For production, consider using a proper database like Redis or MongoDB.

## Monitoring

- Health check: `https://web-production-ac2a6.up.railway.app/health`
- Status API: `https://web-production-ac2a6.up.railway.app/api/status`
- Backend logs show connection events and status changes
