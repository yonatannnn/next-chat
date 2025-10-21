import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'notification_service.dart';
import 'chat_repository.dart';
import 'users_repository.dart';

class ChatNotificationManager {
  static final ChatNotificationManager _instance = ChatNotificationManager._internal();
  factory ChatNotificationManager() => _instance;
  ChatNotificationManager._internal();

  final NotificationService _notificationService = NotificationService();
  final ChatRepository _chatRepository = ChatRepository();
  final UsersRepository _usersRepository = UsersRepository();
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  String? _currentUserId;
  String? _currentChatUserId;
  StreamSubscription? _messageSubscription;
  final Map<String, String> _lastMessageIds = {};
  bool _isAppInForeground = true;
  bool _forceShowNotifications = false;
  DateTime? _lastProcessedTime;

  /// Initialize notification manager for a user
  Future<void> initializeForUser(String userId) async {
    print('🔔 CHAT NOTIFICATION MANAGER: Initializing for user: $userId');
    
    _currentUserId = userId;
    
    // Set the last processed time to now, so we only process NEW messages
    _lastProcessedTime = DateTime.now();
    print('🔔 CHAT NOTIFICATION MANAGER: Set last processed time to: $_lastProcessedTime');
    
    // Stop any existing subscription
    await _stopListening();
    
    // Start listening to incoming messages
    await _startListening();
    
    // Set up app lifecycle listener
    _setupAppLifecycleListener();
    
    print('🔔 CHAT NOTIFICATION MANAGER: Initialization complete for user: $userId');
  }

  /// Start listening to incoming messages
  Future<void> _startListening() async {
    if (_currentUserId == null) return;

    print('🔔 CHAT NOTIFICATION MANAGER: Starting message listener');

    try {
      // Listen to all messages where current user is the receiver
      // This mirrors the web app's subscribeToAllIncomingMessages
      final messagesRef = _firestore.collection('messages');
      final query = messagesRef.where('receiverId', isEqualTo: _currentUserId!);
      
      _messageSubscription = query.snapshots().listen((snapshot) {
        print('🔔 CHAT NOTIFICATION MANAGER: Firestore snapshot received with ${snapshot.docs.length} documents');
        
        final messages = snapshot.docs.map((doc) {
          final data = doc.data();
          return {
            'id': doc.id,
            'senderId': data['senderId'],
            'receiverId': data['receiverId'],
            'text': data['text'],
            'timestamp': data['timestamp']?.toDate() ?? DateTime.now(),
            'deleted': data['deleted'] ?? false,
            'seen': data['seen'] ?? false,
          };
        }).toList();
        
        print('🔔 CHAT NOTIFICATION MANAGER: Processed ${messages.length} messages');
        _handleNewMessages(messages);
      }, onError: (error) {
        print('❌ CHAT NOTIFICATION MANAGER: Firestore subscription error: $error');
      });
    } catch (e) {
      print('❌ CHAT NOTIFICATION MANAGER: Error starting listener: $e');
    }
  }

  /// Stop listening to messages
  Future<void> _stopListening() async {
    print('🔔 CHAT NOTIFICATION MANAGER: Stopping message listener');
    await _messageSubscription?.cancel();
    _messageSubscription = null;
  }

  /// Handle new messages and show notifications
  void _handleNewMessages(List<Map<String, dynamic>> messages) {
    if (messages.isEmpty) return;


    // Sort messages by timestamp to get the latest ones first
    messages.sort((a, b) {
      final aTime = a['timestamp']?.millisecondsSinceEpoch ?? 0;
      final bTime = b['timestamp']?.millisecondsSinceEpoch ?? 0;
      return bTime.compareTo(aTime);
    });

    // Process each new message
    for (final message in messages) {
      final String messageId = message['id'] ?? '';
      final String senderId = message['senderId'] ?? '';
      final String messageText = message['text'] ?? '';
      final bool isDeleted = message['deleted'] ?? false;
      final DateTime timestamp = message['timestamp'] ?? DateTime.now();

      print('🔔 CHAT NOTIFICATION MANAGER: Processing message: $messageId from $senderId');

      // Skip if this is the current user's own message
      if (senderId == _currentUserId) {
        print('🔔 CHAT NOTIFICATION MANAGER: Skipping own message from $senderId');
        continue;
      }

      // Skip if message is deleted
      if (isDeleted) {
        print('🔔 CHAT NOTIFICATION MANAGER: Skipping deleted message $messageId');
        continue;
      }

      // Skip if we already processed this message
      if (_lastMessageIds[senderId] == messageId) {
        print('🔔 CHAT NOTIFICATION MANAGER: Already processed message $messageId from $senderId');
        continue;
      }

      // Skip if user is currently viewing this chat
      if (_currentChatUserId == senderId) {
        _lastMessageIds[senderId] = messageId;
        continue;
      }

      
      // Skip if this message is older than when we started listening
      if (_lastProcessedTime != null && timestamp.isBefore(_lastProcessedTime!)) {
        continue;
      }
      
      // Skip if app is in foreground and focused (unless force show is enabled)
      // But allow notifications if the message is very recent (within last 5 minutes)
      final now = DateTime.now();
      final messageAge = now.difference(timestamp).inSeconds;
      final isRecentMessage = messageAge <= 300; // 5 minutes instead of 30 seconds
      
      
      if (isAppInForeground() && !_forceShowNotifications && !isRecentMessage) {
        _lastMessageIds[senderId] = messageId;
        continue;
      }
      
      if (isAppInForeground() && isRecentMessage) {
      }


      // Get sender name and show notification
      _getSenderName(senderId).then((senderName) {
        _notificationService.showChatNotification(
          senderName: senderName,
          messageText: messageText,
          senderId: senderId,
        );
      });

      // Update last message ID and last processed time
      _lastMessageIds[senderId] = messageId;
      _lastProcessedTime = timestamp;
    }
  }


  /// Get sender name from user ID
  Future<String> _getSenderName(String senderId) async {
    try {
      final user = await _usersRepository.getProfile(senderId);
      return user.username;
    } catch (e) {
      print('❌ CHAT NOTIFICATION MANAGER: Error getting sender name: $e');
      return 'Someone';
    }
  }

  /// Set up app lifecycle listener
  void _setupAppLifecycleListener() {
    SystemChannels.lifecycle.setMessageHandler((message) async {
      print('🔔 CHAT NOTIFICATION MANAGER: Lifecycle message: $message');
      if (message == 'AppLifecycleState.resumed') {
        _isAppInForeground = true;
        print('🔔 CHAT NOTIFICATION MANAGER: App resumed - notifications will be suppressed');
      } else if (message == 'AppLifecycleState.paused') {
        _isAppInForeground = false;
        print('🔔 CHAT NOTIFICATION MANAGER: App paused - notifications will be shown');
      } else if (message == 'AppLifecycleState.inactive') {
        _isAppInForeground = false;
        print('🔔 CHAT NOTIFICATION MANAGER: App inactive - notifications will be shown');
      } else if (message == 'AppLifecycleState.detached') {
        _isAppInForeground = false;
        print('🔔 CHAT NOTIFICATION MANAGER: App detached - notifications will be shown');
      }
      return null;
    });
  }

  /// Check if app is in foreground
  bool isAppInForeground() {
    return _isAppInForeground;
  }


  /// Set current chat user (to avoid notifications when viewing that chat)
  void setCurrentChatUser(String? userId) {
    _currentChatUserId = userId;
  }

  /// Clear current chat user
  void clearCurrentChatUser() {
    _currentChatUserId = null;
  }

  /// Dispose the notification manager
  Future<void> dispose() async {
    await _stopListening();
    _currentUserId = null;
    _currentChatUserId = null;
    _lastMessageIds.clear();
    _lastProcessedTime = null;
  }
}
