import 'dart:convert';
import 'dart:io';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import '../config/app_config.dart';

class SupabasePushService {
  static final SupabasePushService _instance = SupabasePushService._internal();
  factory SupabasePushService() => _instance;
  SupabasePushService._internal();

  final FlutterLocalNotificationsPlugin _localNotifications = 
      FlutterLocalNotificationsPlugin();
  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;

  bool _isInitialized = false;
  String? _currentUserId;
  String? _deviceId;

  // Notification data models
  static const String _channelId = 'chat_notifications';
  static const String _channelName = 'Chat Notifications';
  static const String _channelDescription = 'Notifications for new chat messages';

  /// Initialize the Supabase push service
  Future<void> initialize() async {
    if (_isInitialized) return;

    print('🔔 SUPABASE PUSH SERVICE: Initializing...');

    // Initialize local notifications
    await _initializeLocalNotifications();

    // Initialize Firebase messaging for FCM token
    await _initializeFirebaseMessaging();

    _isInitialized = true;
    print('✅ SUPABASE PUSH SERVICE: Initialized successfully');
  }

  /// Initialize local notifications
  Future<void> _initializeLocalNotifications() async {
    // Android initialization settings
    const AndroidInitializationSettings androidSettings = 
        AndroidInitializationSettings('@mipmap/ic_launcher');

    // iOS initialization settings
    const DarwinInitializationSettings iosSettings = 
        DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const InitializationSettings initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // Create notification channel for Android
    if (Platform.isAndroid) {
      await _createNotificationChannel();
    }
  }

  /// Create notification channel for Android
  Future<void> _createNotificationChannel() async {
    const AndroidNotificationChannel channel = AndroidNotificationChannel(
      _channelId,
      _channelName,
      description: _channelDescription,
      importance: Importance.high,
      enableVibration: true,
      playSound: true,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);
  }

  /// Initialize Firebase messaging for FCM token
  Future<void> _initializeFirebaseMessaging() async {
    // Request permission
    await _requestPermissions();

    // Set up message handlers for FCM (fallback)
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Get initial message if app was opened from notification
    final RemoteMessage? initialMessage = 
        await _firebaseMessaging.getInitialMessage();
    if (initialMessage != null) {
      _handleNotificationTap(initialMessage);
    }

    // Set up background message handler for Supabase notifications
    _setupBackgroundNotificationHandler();
  }

  /// Request notification permissions
  Future<bool> _requestPermissions() async {
    print('🔔 SUPABASE PUSH SERVICE: Requesting permissions...');

    // Request Firebase messaging permission
    final NotificationSettings settings = 
        await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    print('🔔 SUPABASE PUSH SERVICE: Firebase permission status: ${settings.authorizationStatus}');

    // Request local notification permission
    if (Platform.isAndroid) {
      final bool? granted = await _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.requestNotificationsPermission();
      
      print('🔔 SUPABASE PUSH SERVICE: Android local permission granted: $granted');
    }

    return settings.authorizationStatus == AuthorizationStatus.authorized;
  }

  /// Register user for Supabase push notifications
  Future<void> registerUser(String userId) async {
    _currentUserId = userId;
    _deviceId = await _generateDeviceId();

    // Get FCM token
    final String? token = await _firebaseMessaging.getToken();
    if (token == null) {
      print('❌ SUPABASE PUSH SERVICE: Failed to get FCM token');
      return;
    }

    // Register with Supabase database
    final bool success = await _registerWithSupabase(userId, token);
    if (success) {
      print('✅ SUPABASE PUSH SERVICE: User registered successfully');
    } else {
      print('❌ SUPABASE PUSH SERVICE: Failed to register user');
    }
  }

  /// Generate unique device ID
  Future<String> _generateDeviceId() async {
    // Try to get existing device ID from storage
    // For now, generate a simple ID based on timestamp and random
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final random = (timestamp % 10000).toString();
    return 'flutter_${timestamp}_$random';
  }

  /// Register device token with Supabase database
  Future<bool> _registerWithSupabase(String userId, String token) async {
    try {
      final supabase = Supabase.instance.client;
      
      // Check if subscription already exists for this device
      if (_deviceId == null) {
        return false;
      }
      
      final existingSubscriptions = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .eq('device_id', _deviceId!);

      if (existingSubscriptions.isNotEmpty) {
        // Update existing subscription
        final response = await supabase
            .from('push_subscriptions')
            .update({
              'endpoint': token,
              'p256dh': 'fcm',
              'auth': 'fcm',
              'user_agent': 'flutter_mobile',
              'platform': Platform.isIOS ? 'ios' : 'android',
              'updated_at': DateTime.now().toIso8601String(),
            })
            .eq('user_id', userId)
            .eq('device_id', _deviceId!);

        if (response.error != null) {
          print('❌ SUPABASE PUSH SERVICE: Error updating subscription: ${response.error}');
          return false;
        }

        print('🔔 SUPABASE PUSH SERVICE: Updated existing subscription');
        return true;
      } else {
        // Insert new subscription
        final response = await supabase
            .from('push_subscriptions')
            .insert({
              'user_id': userId,
              'device_id': _deviceId,
              'endpoint': token,
              'p256dh': 'fcm',
              'auth': 'fcm',
              'user_agent': 'flutter_mobile',
              'platform': Platform.isIOS ? 'ios' : 'android',
            });

        if (response.error != null) {
          print('❌ SUPABASE PUSH SERVICE: Error inserting subscription: ${response.error}');
          return false;
        }

        print('🔔 SUPABASE PUSH SERVICE: Created new subscription');
        return true;
      }
    } catch (e) {
      print('❌ SUPABASE PUSH SERVICE: Registration error: $e');
      return false;
    }
  }

  /// Handle foreground messages (FCM fallback)
  void _handleForegroundMessage(RemoteMessage message) {
    print('🔔 SUPABASE PUSH SERVICE: Foreground message received');
    print('   Title: ${message.notification?.title}');
    print('   Body: ${message.notification?.body}');
    print('   Data: ${message.data}');

    // Show local notification for foreground messages
    _showLocalNotification(message);
  }

  /// Handle notification taps
  void _handleNotificationTap(RemoteMessage message) {
    print('🔔 SUPABASE PUSH SERVICE: Notification tapped');
    print('   Data: ${message.data}');

    // Handle navigation based on notification data
    _handleNotificationNavigation(message.data);
  }

  /// Handle local notification taps
  void _onNotificationTapped(NotificationResponse response) {
    print('🔔 SUPABASE PUSH SERVICE: Local notification tapped');
    print('   Payload: ${response.payload}');

    if (response.payload != null) {
      final Map<String, dynamic> data = jsonDecode(response.payload!);
      _handleNotificationNavigation(data);
    }
  }

  /// Handle notification navigation
  void _handleNotificationNavigation(Map<String, dynamic> data) {
    print('🔔 SUPABASE PUSH SERVICE: Handling navigation');
    print('   Data: $data');

    // Extract navigation information from data
    final String? type = data['type'];
    final String? senderId = data['senderId'];
    final String? senderName = data['senderName'];

    if (type == 'chat' && senderId != null) {
      // Navigate to chat with specific user
      print('🔔 SUPABASE PUSH SERVICE: Navigating to chat with $senderName ($senderId)');
      // TODO: Implement navigation to specific chat
      // This would typically involve using a navigation service or state management
    }
  }

  /// Show local notification
  Future<void> _showLocalNotification(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    final AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      _channelId,
      _channelName,
      channelDescription: _channelDescription,
      importance: Importance.high,
      icon: '@mipmap/ic_launcher',
      enableVibration: true,
      playSound: true,
      showWhen: true,
      when: DateTime.now().millisecondsSinceEpoch,
    );

    const DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    final NotificationDetails details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    // Create payload for tap handling
    final Map<String, dynamic> payload = {
      'type': 'chat',
      'senderId': message.data['senderId'],
      'senderName': message.data['senderName'],
      'messageText': message.data['messageText'],
    };

    await _localNotifications.show(
      message.hashCode,
      notification.title,
      notification.body,
      details,
      payload: jsonEncode(payload),
    );
  }

  /// Show chat notification manually (for testing or direct calls)
  Future<void> showChatNotification({
    required String senderName,
    required String messageText,
    required String senderId,
  }) async {
    print('🔔 SUPABASE PUSH SERVICE: Showing chat notification');
    print('   Sender: $senderName');
    print('   Message: $messageText');
    print('   Sender ID: $senderId');

    if (!_isInitialized) {
      await initialize();
    }

    final AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      _channelId,
      _channelName,
      channelDescription: _channelDescription,
      importance: Importance.high,
      icon: '@mipmap/ic_launcher',
      enableVibration: true,
      playSound: true,
      showWhen: true,
      when: DateTime.now().millisecondsSinceEpoch,
    );

    const DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    final NotificationDetails details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    // Create payload for tap handling
    final Map<String, dynamic> payload = {
      'type': 'chat',
      'senderId': senderId,
      'senderName': senderName,
      'messageText': messageText,
    };

    await _localNotifications.show(
      senderId.hashCode,
      senderName,
      messageText,
      details,
      payload: jsonEncode(payload),
    );
    
    print('✅ SUPABASE PUSH SERVICE: Local notification displayed successfully');
  }

  /// Clear all notifications
  Future<void> clearAllNotifications() async {
    await _localNotifications.cancelAll();
  }

  /// Clear notifications for specific sender
  Future<void> clearNotificationsForSender(String senderId) async {
    await _localNotifications.cancel(senderId.hashCode);
  }

  /// Check if notifications are enabled
  Future<bool> areNotificationsEnabled() async {
    if (Platform.isAndroid) {
      final bool? enabled = await _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.areNotificationsEnabled();
      return enabled ?? false;
    }
    return true; // iOS doesn't have a direct way to check
  }

  /// Unregister user from notifications
  Future<void> unregisterUser() async {
    print('🔔 SUPABASE PUSH SERVICE: Unregistering user');
    
    if (_currentUserId != null && _deviceId != null) {
      try {
        final supabase = Supabase.instance.client;
        
        final response = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', _currentUserId!)
            .eq('device_id', _deviceId!);

        if (response.error != null) {
          print('❌ SUPABASE PUSH SERVICE: Error removing subscription: ${response.error}');
        } else {
          print('✅ SUPABASE PUSH SERVICE: Subscription removed successfully');
        }
      } catch (e) {
        print('❌ SUPABASE PUSH SERVICE: Error unregistering: $e');
      }
    }

    _currentUserId = null;
    _deviceId = null;
  }

  /// Get all push subscriptions for a user (for debugging)
  Future<List<Map<String, dynamic>>> getAllPushSubscriptions(String userId) async {
    try {
      final supabase = Supabase.instance.client;
      
      final subscriptions = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', userId);

      return subscriptions;
    } catch (e) {
      print('❌ SUPABASE PUSH SERVICE: Error getting subscriptions: $e');
      return [];
    }
  }

  /// Set up background notification handler
  void _setupBackgroundNotificationHandler() {
    print('🔔 SUPABASE PUSH SERVICE: Setting up background notification handler');
    
    // This will be called when the app receives a notification while in background
    // We'll use Firebase Cloud Messaging to send notifications to the device
    // The web app will send FCM notifications to mobile devices
  }

  /// Test notification (for debugging)
  Future<void> testNotification() async {
    await showChatNotification(
      senderName: 'Test User',
      messageText: 'This is a test notification from Supabase Push Service',
      senderId: 'test_user_123',
    );
  }
}

/// Background message handler (must be top-level function)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  print('🔔 BACKGROUND: Message received: ${message.messageId}');
  print('   Title: ${message.notification?.title}');
  print('   Body: ${message.notification?.body}');
  print('   Data: ${message.data}');
}
