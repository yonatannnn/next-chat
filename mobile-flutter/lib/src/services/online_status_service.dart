import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:firebase_auth/firebase_auth.dart';
import '../config/app_config.dart';

class UserStatus {
  final String userId;
  final bool isOnline;
  final int lastSeen;

  UserStatus({
    required this.userId,
    required this.isOnline,
    required this.lastSeen,
  });

  factory UserStatus.fromJson(Map<String, dynamic> json) {
    return UserStatus(
      userId: json['userId']?.toString() ?? '',
      isOnline: json['isOnline'] as bool? ?? false,
      lastSeen: json['lastSeen'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'isOnline': isOnline,
      'lastSeen': lastSeen,
    };
  }
}

class OnlineStatusService {
  static final OnlineStatusService _instance = OnlineStatusService._internal();
  factory OnlineStatusService() => _instance;
  OnlineStatusService._internal();

  IO.Socket? _socket;
  bool _isConnected = false;
  Timer? _heartbeatTimer;
  final Set<Function(UserStatus)> _statusChangeCallbacks = {};
  String? _currentUserId;

  final String _backendUrl = AppConfig.backendBaseUrl;

  void connect(String userId, Map<String, dynamic> userData) {
    
    if (_isConnected && _currentUserId == userId) {
      return;
    }

    // Disconnect existing connection if any
    print('   Disconnecting existing connection...');
    disconnect();

    _currentUserId = userId;
    print('   Creating new socket connection...');
    
    // Force disconnect any existing socket first
    if (_socket != null) {
      _socket!.disconnect();
      _socket = null;
    }
    
    _socket = IO.io(_backendUrl, IO.OptionBuilder()
        .setTransports(['websocket', 'polling'])
        .setTimeout(10000)
        .enableAutoConnect()
        .enableReconnection()
        .setReconnectionAttempts(5)
        .setReconnectionDelay(1000)
        .build());

    _setupSocketListeners(userId, userData);
    
    // Force connection attempt after a short delay
    Future.delayed(Duration(milliseconds: 500), () {
      if (_socket != null && !_isConnected) {
        print('🔌 ONLINE STATUS: Forcing socket connection...');
        _socket!.connect();
      }
    });
    
    // Add a timeout to check connection status
    Future.delayed(Duration(seconds: 15), () {
      if (_socket != null && !_isConnected) {
        print('⚠️ ONLINE STATUS: Socket connection timeout after 15 seconds');
        print('   Socket ID: ${_socket?.id}');
        print('   Socket connected: ${_socket?.connected}');
        print('   Is connected: $_isConnected');
        print('   Attempting to reconnect...');
        
        // Try to reconnect
        _socket!.connect();
      }
    });
  }

  void _setupSocketListeners(String userId, Map<String, dynamic> userData) {
    print('👂 ONLINE STATUS: Setting up socket listeners');
    print('   Socket ID: ${_socket?.id}');
    print('   Socket connected: ${_socket?.connected}');
    
    _socket!.onConnect((_) {
      print('✅ ONLINE STATUS: Connected to server');
      print('   Socket ID: ${_socket?.id}');
      print('   Socket connected: ${_socket?.connected}');
      _isConnected = true;
      
      // Notify server that user is online
      print('📤 ONLINE STATUS: Emitting user-online event');
      _socket!.emit('user-online', {
        'userId': userId,
        'userData': userData,
      });

      // Start heartbeat
      print('💓 ONLINE STATUS: Starting heartbeat');
      startHeartbeat();
    });

    _socket!.onConnectError((error) {
      print('❌ ONLINE STATUS: Connection error: $error');
      _isConnected = false;
    });

    _socket!.onError((error) {
      print('❌ ONLINE STATUS: Socket error: $error');
      _isConnected = false;
    });

    _socket!.onDisconnect((_) {
      print('❌ ONLINE STATUS: Disconnected from server');
      _isConnected = false;
      stopHeartbeat();
    });

    _socket!.on('user-status-changed', (data) {
      print('📢 ONLINE STATUS: user-status-changed event received');
      print('   Data: $data');
      try {
        if (data != null && data is Map<String, dynamic>) {
          final status = UserStatus.fromJson(Map<String, dynamic>.from(data));
          print('   Parsed status: ${status.userId} - ${status.isOnline}');
          for (final callback in _statusChangeCallbacks) {
            callback(status);
          }
        }
      } catch (error) {
        print('❌ ONLINE STATUS: Error handling status change: $error');
      }
    });

    _socket!.on('status-update', (data) {
      // Handle status updates if needed
    });

    _socket!.on('pong', (data) {
      // Handle pong responses if needed
    });

    _socket!.onReconnect((_) {
      print('🔄 ONLINE STATUS: Reconnected to server');
      print('   Socket ID: ${_socket?.id}');
      print('   Socket connected: ${_socket?.connected}');
      _isConnected = true;
      
      // Re-emit user-online event on reconnection
      print('📤 ONLINE STATUS: Re-emitting user-online event after reconnection');
      _socket!.emit('user-online', {
        'userId': userId,
        'userData': userData,
      });
      
      // Restart heartbeat
      print('💓 ONLINE STATUS: Restarting heartbeat after reconnection');
      startHeartbeat();
    });
  }

  void disconnect() {
    print('🗑️ ONLINE STATUS: disconnect called');
    print('   Current state:');
    print('     - isConnected: $_isConnected');
    print('     - currentUserId: $_currentUserId');
    print('     - socket exists: ${_socket != null}');
    
    if (_socket != null && _isConnected && _currentUserId != null) {
      print('📤 ONLINE STATUS: Emitting user-offline event');
      print('   User ID: $_currentUserId');
      _socket!.emit('user-offline', {'userId': _currentUserId});
      print('✅ ONLINE STATUS: user-offline event emitted');
    } else {
      print('⚠️ ONLINE STATUS: Cannot emit user-offline event');
      print('   Socket exists: ${_socket != null}');
      print('   Is connected: $_isConnected');
      print('   Current user ID: $_currentUserId');
    }
    
    print('💓 ONLINE STATUS: Stopping heartbeat');
    stopHeartbeat();
    
    if (_socket != null) {
      print('🔌 ONLINE STATUS: Disconnecting socket');
      _socket!.disconnect();
      _socket = null;
      print('✅ ONLINE STATUS: Socket disconnected and cleared');
    } else {
      print('⚠️ ONLINE STATUS: No socket to disconnect');
    }
    
    _isConnected = false;
    _currentUserId = null;
    
    print('✅ ONLINE STATUS: Disconnect completed');
    print('   Final state:');
    print('     - isConnected: $_isConnected');
    print('     - currentUserId: $_currentUserId');
    print('     - socket exists: ${_socket != null}');
  }

  Future<UserStatus?> getStatus(String userId) async {
    print('📡 ONLINE STATUS: getStatus called');
    print('   User ID: $userId');
    print('   URL: $_backendUrl/api/status/$userId');
    
    try {
      print('   Making HTTP GET request...');
      final response = await http.get(
        Uri.parse('$_backendUrl/api/status/$userId'),
        headers: {'Content-Type': 'application/json'},
      );
      
      print('   Response received:');
      print('     - Status code: ${response.statusCode}');
      print('     - Body length: ${response.body.length}');
      print('     - Body: ${response.body}');
      
      if (response.statusCode == 200) {
        print('   Parsing response data...');
        final data = json.decode(response.body);
        print('   Parsed data: $data');
        
        if (data != null && data is Map<String, dynamic>) {
          print('   Creating UserStatus object...');
          // Add userId to the data since API doesn't return it
          final dataWithUserId = Map<String, dynamic>.from(data);
          dataWithUserId['userId'] = userId;
          final status = UserStatus.fromJson(dataWithUserId);
          print('   UserStatus created:');
          print('     - User ID: ${status.userId}');
          print('     - Is Online: ${status.isOnline}');
          print('     - Last Seen: ${status.lastSeen}');
          return status;
        } else {
          print('❌ ONLINE STATUS: Invalid data format in response');
        }
      } else {
        print('❌ ONLINE STATUS: Failed to fetch user status: ${response.statusCode}');
        print('   Response body: ${response.body}');
      }
    } catch (error) {
      print('❌ ONLINE STATUS: Error fetching user status: $error');
      print('   Error type: ${error.runtimeType}');
    }
    print('   Returning null');
    return null;
  }

  Future<Map<String, UserStatus>> getAllStatuses() async {
    print('📡 ONLINE STATUS: getAllStatuses called');
    print('   URL: $_backendUrl/api/status');
    
    try {
      print('   Making HTTP GET request...');
      final response = await http.get(
        Uri.parse('$_backendUrl/api/status'),
        headers: {'Content-Type': 'application/json'},
      );
      
      print('   Response received:');
      print('     - Status code: ${response.statusCode}');
      print('     - Body length: ${response.body.length}');
      print('     - Body: ${response.body}');
      
      if (response.statusCode == 200) {
        print('   Parsing response data...');
        final data = json.decode(response.body);
        print('   Parsed data: $data');
        
        if (data != null && data is Map<String, dynamic>) {
          print('   Processing status entries...');
          final Map<String, UserStatus> statuses = {};
          for (final entry in data.entries) {
            print('   Processing entry: ${entry.key} = ${entry.value}');
            if (entry.value is Map<String, dynamic>) {
              // Ensure userId is set to the key (user ID)
              final entryData = Map<String, dynamic>.from(entry.value);
              entryData['userId'] = entry.key;
              final status = UserStatus.fromJson(entryData);
              statuses[entry.key] = status;
              print('   Added status: ${entry.key} -> ${status.isOnline}');
            } else {
              print('   Skipping invalid entry: ${entry.key}');
            }
          }
          print('✅ ONLINE STATUS: Retrieved ${statuses.length} statuses');
          return statuses;
        } else {
          print('❌ ONLINE STATUS: Invalid data format in response');
        }
      } else {
        print('❌ ONLINE STATUS: Failed to fetch all statuses: ${response.statusCode}');
        print('   Response body: ${response.body}');
      }
    } catch (error) {
      print('❌ ONLINE STATUS: Error fetching all statuses: $error');
      print('   Error type: ${error.runtimeType}');
    }
    print('   Returning empty map');
    return {};
  }

  void onStatusChange(Function(UserStatus) callback) {
    print('👂 ONLINE STATUS: Adding status change callback');
    _statusChangeCallbacks.add(callback);
    print('   Total callbacks: ${_statusChangeCallbacks.length}');
  }

  void offStatusChange(Function(UserStatus) callback) {
    print('🗑️ ONLINE STATUS: Removing status change callback');
    _statusChangeCallbacks.remove(callback);
    print('   Remaining callbacks: ${_statusChangeCallbacks.length}');
  }

  void startHeartbeat() {
    if (_heartbeatTimer != null) {
      print('💓 ONLINE STATUS: Heartbeat already running');
      return;
    }

    print('💓 ONLINE STATUS: Starting heartbeat timer (30s interval)');
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      if (_socket != null && _isConnected && _currentUserId != null) {
        print('🏓 ONLINE STATUS: Sending ping for user: $_currentUserId');
        _socket!.emit('ping', {'userId': _currentUserId});
      } else {
        print('⚠️ ONLINE STATUS: Cannot send ping - connection issues');
        print('   Socket exists: ${_socket != null}');
        print('   Is connected: $_isConnected');
        print('   Current user ID: $_currentUserId');
      }
    });
  }

  void stopHeartbeat() {
    if (_heartbeatTimer != null) {
      print('💓 ONLINE STATUS: Stopping heartbeat timer');
      _heartbeatTimer!.cancel();
      _heartbeatTimer = null;
      print('✅ ONLINE STATUS: Heartbeat stopped');
    } else {
      print('⚠️ ONLINE STATUS: No heartbeat timer to stop');
    }
  }

  bool get isConnected => _isConnected;
  String? get currentUserId => _currentUserId;
  
  void forceReconnect() {
    print('🔄 ONLINE STATUS: Force reconnect called');
    if (_socket != null && _currentUserId != null) {
      print('   Disconnecting existing socket...');
      _socket!.disconnect();
      _socket = null;
      _isConnected = false;
      
      print('   Creating new socket connection...');
      _socket = IO.io(_backendUrl, IO.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .setTimeout(10000)
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(5)
          .setReconnectionDelay(1000)
          .build());
      
      // Get user data and re-setup listeners
      final user = FirebaseAuth.instance.currentUser;
      final userData = {
        'userId': _currentUserId,
        'username': user?.displayName ?? 'User',
        'email': user?.email ?? '',
      };
      
      _setupSocketListeners(_currentUserId!, userData);
      
      // Force connection
      Future.delayed(Duration(milliseconds: 500), () {
        if (_socket != null && !_isConnected) {
          print('🔌 ONLINE STATUS: Forcing reconnection...');
          _socket!.connect();
        }
      });
    }
  }
}