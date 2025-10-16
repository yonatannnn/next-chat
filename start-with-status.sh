#!/bin/bash

# Start both backend and frontend with online status tracking

echo "🚀 Starting Next.js Chat with Online Status Tracking"
echo "=================================================="

# Function to cleanup background processes
cleanup() {
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend server
echo "📡 Starting backend server (port 3001)..."
cd backend
npm install --silent
npm start &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend server
echo "🌐 Starting frontend server (port 3000)..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Services started successfully!"
echo "📡 Backend: http://localhost:3001"
echo "🌐 Frontend: http://localhost:3000"
echo "📊 Health check: http://localhost:3001/health"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
