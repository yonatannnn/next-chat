import { io, Socket } from 'socket.io-client';

interface UserStatus {
  userId: string;
  isOnline: boolean;
  lastSeen: number;
}

interface OnlineStatusService {
  connect: (userId: string, userData: any) => void;
  disconnect: () => void;
  getStatus: (userId: string) => Promise<UserStatus | null>;
  getAllStatuses: () => Promise<Record<string, UserStatus>>;
  onStatusChange: (callback: (status: UserStatus) => void) => void;
  offStatusChange: (callback: (status: UserStatus) => void) => void;
  startHeartbeat: () => void;
  stopHeartbeat: () => void;
}

class OnlineStatusServiceImpl implements OnlineStatusService {
  private socket: Socket | null = null;
  private isConnected = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private statusChangeCallbacks: Set<(status: UserStatus) => void> = new Set();
  private currentUserId: string | null = null;

  private readonly BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://next-chat-backend-7u70.onrender.com';

  connect(userId: string, userData: any) {
    if (this.isConnected && this.currentUserId === userId) {
      return;
    }

    // Disconnect existing connection if any
    this.disconnect();

    this.currentUserId = userId;
    this.socket = io(this.BACKEND_URL, {
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to status server');
      this.isConnected = true;
      
      // Notify server that user is online
      this.socket?.emit('user-online', {
        userId,
        userData
      });

      // Start heartbeat
      this.startHeartbeat();
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from status server');
      this.isConnected = false;
      this.stopHeartbeat();
    });

    this.socket.on('user-status-changed', (status: UserStatus) => {
      console.log('User status changed:', status);
      this.statusChangeCallbacks.forEach(callback => callback(status));
    });

    this.socket.on('status-update', (data: any) => {
      console.log('Status update received:', data);
    });

    this.socket.on('pong', (data: any) => {
      console.log('Pong received:', data);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });
  }

  disconnect() {
    if (this.socket && this.isConnected && this.currentUserId) {
      this.socket.emit('user-offline', { userId: this.currentUserId });
    }
    
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.currentUserId = null;
  }

  async getStatus(userId: string): Promise<UserStatus | null> {
    try {
      const response = await fetch(`${this.BACKEND_URL}/api/status/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user status');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching user status:', error);
      return null;
    }
  }

  async getAllStatuses(): Promise<Record<string, UserStatus>> {
    try {
      const response = await fetch(`${this.BACKEND_URL}/api/status`);
      if (!response.ok) {
        throw new Error('Failed to fetch all statuses');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching all statuses:', error);
      return {};
    }
  }

  onStatusChange(callback: (status: UserStatus) => void) {
    this.statusChangeCallbacks.add(callback);
  }

  offStatusChange(callback: (status: UserStatus) => void) {
    this.statusChangeCallbacks.delete(callback);
  }

  startHeartbeat() {
    if (this.heartbeatInterval) {
      return;
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.isConnected && this.currentUserId) {
        this.socket.emit('ping', { userId: this.currentUserId });
      }
    }, 30000); // Send ping every 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

export const onlineStatusService = new OnlineStatusServiceImpl();
