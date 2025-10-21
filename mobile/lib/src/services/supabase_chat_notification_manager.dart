import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'supabase_push_service.dart';
import 'chat_repository.dart';
import 'users_repository.dart';

class SupabaseChatNotificationManager {
  static final SupabaseChatNotificationManager _instance = SupabaseChatNotificationManager._internal();
  factory SupabaseChatNotificationManager() => _instance;
  SupabaseChatNotificationManager._internal();

  final SupabasePushService _pushService = SupabasePushService();
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
    _currentUserId = userId;
    
    // Set the last processed time to now, so we only process NEW messages
    _lastProcessedTime = DateTime.now();
    
    // Stop any existing subscription
    await _stopListening();
    
    // Start listening to incoming messages
    await _startListening();
    
    // Set up app lifecycle listener
    _setupAppLifecycleListener();
  }

  /// Start listening to incoming messages
  Future<void> _startListening() async {
    if (_currentUserId == null) {
      return;
    }

    try {
      // Listen to all messages where current user is the receiver
      // This mirrors the web app's subscribeToAllIncomingMessages
      final messagesRef = _firestore.collection('messages');
      final query = messagesRef.where('receiverId', isEqualTo: _currentUserId!);
      
      _messageSubscription = query.snapshots().listen((snapshot) {
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
        
        _handleNewMessages(messages);
      }, onError: (error) {
        print('❌ SUPABASE CHAT NOTIFICATION MANAGER: Firestore subscription error: $error');
      });
    } catch (e) {
      print('❌ SUPABASE CHAT NOTIFICATION MANAGER: Error starting listener: $e');
    }
  }

  /// Stop listening to messages
  Future<void> _stopListening() async {
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

      // Skip if this is the current user's own message
      if (senderId == _currentUserId) {
        print('🔔 SUPABASE CHAT NOTIFICATION MANAGER: ❌ SKIPPING - Own message from $senderId (current user: $_currentUserId)');
        continue;
      }

      // Skip if message is deleted
      if (isDeleted) {
        continue;
      }

      // Skip if we already processed this message
      if (_lastMessageIds[senderId] == messageId) {
        continue;
      }

      // Skip if user is currently viewing this chat
      if (_currentChatUserId == senderId) {
        print('🔔 SUPABASE CHAT NOTIFICATION MANAGER: ❌ SKIPPING - Currently viewing chat with $senderId (current chat: $_currentChatUserId)');
        _lastMessageIds[senderId] = messageId;
        continue;
      }

      // Skip if this message is older than when we started listening
      if (_lastProcessedTime != null && timestamp.isBefore(_lastProcessedTime!)) {
        print('🔔 SUPABASE CHAT NOTIFICATION MANAGER: ❌ SKIPPING - Old message (before app start) - Message: $timestamp, App start: $_lastProcessedTime');
        continue;
      }
      
      // Skip if app is in foreground and focused (unless force show is enabled)
      // But allow notifications if the message is very recent (within last 5 minutes)
      final now = DateTime.now();
      final messageAge = now.difference(timestamp).inSeconds;
      final isRecentMessage = messageAge <= 300; // 5 minutes instead of 30 seconds
      
      // For now, let's be more permissive and show notifications even in foreground for testing
      // TODO: Make this configurable based on user preferences
      if (isAppInForeground() && !_forceShowNotifications && !isRecentMessage) {
        // Comment out the continue to allow notifications in foreground
        // _lastMessageIds[senderId] = messageId;
        // continue;
      }

      print('🔔 SUPABASE CHAT NOTIFICATION MANAGER: ✅ Showing notification for message from $senderId');
      print('🔔 SUPABASE CHAT NOTIFICATION MANAGER: Message text: $messageText');

      // Get sender name and show notification
      _getSenderName(senderId).then((senderName) {
        print('🔔 SUPABASE CHAT NOTIFICATION MANAGER: Sender name: $senderName');
        print('🔔 SUPABASE CHAT NOTIFICATION MANAGER: Calling SupabasePushService.showChatNotification');
        _pushService.showChatNotification(
          senderName: senderName,
          messageText: messageText,
          senderId: senderId,
        ).then((_) {
          print('🔔 SUPABASE CHAT NOTIFICATION MANAGER: Notification display completed');
        }).catchError((error) {
          print('❌ SUPABASE CHAT NOTIFICATION MANAGER: Error showing notification: $error');
        });
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
      print('❌ SUPABASE CHAT NOTIFICATION MANAGER: Error getting sender name: $e');
      return 'Someone';
    }
  }

  /// Set up app lifecycle listener
  void _setupAppLifecycleListener() {
    SystemChannels.lifecycle.setMessageHandler((message) async {
      print('🔔 SUPABASE CHAT NOTIFICATION MANAGER: Lifecycle message: $message');
      if (message == 'AppLifecycleState.resumed') {
        _isAppInForeground = true;
        print('🔔 SUPABASE CHAT NOTIFICATION MANAGER: App resumed - notifications will be suppressed');
      } else if (message == 'AppLifecycleState.paused') {
        _isAppInForeground = false;
        print('🔔 SUPABASE CHAT NOTIFICATION MANAGER: App paused - notifications will be shown');
      } else if (message == 'AppLifecycleState.inactive') {
        _isAppInForeground = false;
        print('🔔 SUPABASE CHAT NOTIFICATION MANAGER: App inactive - notifications will be shown');
      } else if (message == 'AppLifecycleState.detached') {
        _isAppInForeground = false;
        print('🔔 SUPABASE CHAT NOTIFICATION MANAGER: App detached - notifications will be shown');
      }
      return null;
    });
  }

  /// Check if app is in foreground
  bool isAppInForeground() {
    return _isAppInForeground;
  }

  /// Force show notification for testing
  Future<void> forceShowNotification(String senderId, String messageText) async {
    print('🔔 SUPABASE CHAT NOTIFICATION MANAGER: Force showing notification for testing');
    final senderName = await _getSenderName(senderId);
    await _pushService.showChatNotification(
      senderName: senderName,
      messageText: messageText,
      senderId: senderId,
    );
  }

  /// Force show notification for any message (bypass all checks)
  Future<void> forceShowNotificationForAnyMessage(String senderId, String messageText) async {
    print('🔔 SUPABASE CHAT NOTIFICATION MANAGER: Force showing notification for ANY message');
    final senderName = await _getSenderName(senderId);
    await _pushService.showChatNotification(
      senderName: senderName,
      messageText: messageText,
      senderId: senderId,
    );
  }

  /// Force show notification for testing (bypassing foreground check)
  Future<void> forceShowNotificationBypass(String senderId, String messageText) async {
    print('🔔 SUPABASE CHAT NOTIFICATION MANAGER: Force showing notification (bypassing foreground check)');
    final senderName = await _getSenderName(senderId);
    await _pushService.showChatNotification(
      senderName: senderName,
      messageText: messageText,
      senderId: senderId,
    );
  }

  /// Set app foreground state manually for testing
  void setAppForegroundState(bool isForeground) {
    _isAppInForeground = isForeground;
    print('🔔 SUPABASE CHAT NOTIFICATION MANAGER: Manually set app foreground state: $isForeground');
  }

  /// Enable/disable force notifications (for testing)
  void setForceShowNotifications(bool forceShow) {
    _forceShowNotifications = forceShow;
    print('🔔 SUPABASE CHAT NOTIFICATION MANAGER: Force show notifications: $forceShow');
  }

  /// Temporarily enable notifications for testing (auto-disables after 60 seconds)
  void enableNotificationsTemporarily() {
    _forceShowNotifications = true;
    print('🔔 SUPABASE CHAT NOTIFICATION MANAGER: Temporarily enabling notifications for 60 seconds');
    
    // Auto-disable after 60 seconds
    Future.delayed(const Duration(seconds: 60), () {
      _forceShowNotifications = false;
      print('🔔 SUPABASE CHAT NOTIFICATION MANAGER: Auto-disabled force notifications after 60 seconds');
    });
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
