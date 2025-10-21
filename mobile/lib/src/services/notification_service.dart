import 'dart:convert';
import 'dart:io';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

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

  /// Initialize the notification service
  Future<void> initialize() async {
    if (_isInitialized) return;

    print('🔔 NOTIFICATION SERVICE: Initializing...');

    // Initialize local notifications
    await _initializeLocalNotifications();

    // Initialize Firebase messaging
    await _initializeFirebaseMessaging();

    _isInitialized = true;
    print('✅ NOTIFICATION SERVICE: Initialized successfully');
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

  /// Initialize Firebase messaging
  Future<void> _initializeFirebaseMessaging() async {
    // Request permission
    await _requestPermissions();

    // Set up message handlers
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Get initial message if app was opened from notification
    final RemoteMessage? initialMessage = 
        await _firebaseMessaging.getInitialMessage();
    if (initialMessage != null) {
      _handleNotificationTap(initialMessage);
    }
  }

  /// Request notification permissions
  Future<bool> _requestPermissions() async {
    print('🔔 NOTIFICATION SERVICE: Requesting permissions...');

    // Request Firebase messaging permission
    final NotificationSettings settings = 
        await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    print('🔔 NOTIFICATION SERVICE: Firebase permission status: ${settings.authorizationStatus}');

    // Request local notification permission
    if (Platform.isAndroid) {
      final bool? granted = await _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.requestNotificationsPermission();
      
      print('🔔 NOTIFICATION SERVICE: Android local permission granted: $granted');
    }

    return settings.authorizationStatus == AuthorizationStatus.authorized;
  }

  /// Register user for notifications
  Future<void> registerUser(String userId) async {
    print('🔔 NOTIFICATION SERVICE: Registering user: $userId');
    
    _currentUserId = userId;
    _deviceId = await _generateDeviceId();

    // Get FCM token
    final String? token = await _firebaseMessaging.getToken();
    if (token == null) {
      print('❌ NOTIFICATION SERVICE: Failed to get FCM token');
      return;
    }

    print('🔔 NOTIFICATION SERVICE: FCM Token: $token');

    // Register with server
    final bool success = await _registerWithServer(userId, token);
    if (success) {
      print('✅ NOTIFICATION SERVICE: User registered successfully');
    } else {
      print('❌ NOTIFICATION SERVICE: Failed to register user');
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

  /// Register device token with server
  Future<bool> _registerWithServer(String userId, String token) async {
    try {
      final url = Uri.parse('${AppConfig.backendBaseUrl}/api/push-subscriptions');
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'deviceId': _deviceId,
          'endpoint': token,
          'p256dh': 'fcm',
          'auth': 'fcm',
          'userAgent': 'flutter_mobile',
          'platform': Platform.isIOS ? 'ios' : 'android',
        }),
      );

      print('🔔 NOTIFICATION SERVICE: Server response: ${response.statusCode}');
      if (response.statusCode == 200) {
        print('🔔 NOTIFICATION SERVICE: Registration successful');
        return true;
      } else {
        print('🔔 NOTIFICATION SERVICE: Registration failed: ${response.body}');
        return false;
      }
    } catch (e) {
      print('❌ NOTIFICATION SERVICE: Registration error: $e');
      return false;
    }
  }

  /// Handle foreground messages
  void _handleForegroundMessage(RemoteMessage message) {
    print('🔔 NOTIFICATION SERVICE: Foreground message received');
    print('   Title: ${message.notification?.title}');
    print('   Body: ${message.notification?.body}');
    print('   Data: ${message.data}');

    // Show local notification for foreground messages
    _showLocalNotification(message);
  }

  /// Handle notification taps
  void _handleNotificationTap(RemoteMessage message) {
    print('🔔 NOTIFICATION SERVICE: Notification tapped');
    print('   Data: ${message.data}');

    // Handle navigation based on notification data
    _handleNotificationNavigation(message.data);
  }

  /// Handle local notification taps
  void _onNotificationTapped(NotificationResponse response) {
    print('🔔 NOTIFICATION SERVICE: Local notification tapped');
    print('   Payload: ${response.payload}');

    if (response.payload != null) {
      final Map<String, dynamic> data = jsonDecode(response.payload!);
      _handleNotificationNavigation(data);
    }
  }

  /// Handle notification navigation
  void _handleNotificationNavigation(Map<String, dynamic> data) {
    print('🔔 NOTIFICATION SERVICE: Handling navigation');
    print('   Data: $data');

    // Extract navigation information from data
    final String? type = data['type'];
    final String? senderId = data['senderId'];
    final String? senderName = data['senderName'];

    if (type == 'chat' && senderId != null) {
      // Navigate to chat with specific user
      print('🔔 NOTIFICATION SERVICE: Navigating to chat with $senderName ($senderId)');
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
    print('🔔 NOTIFICATION SERVICE: Showing chat notification');
    print('   Sender: $senderName');
    print('   Message: $messageText');
    print('   Sender ID: $senderId');

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
    print('🔔 NOTIFICATION SERVICE: Unregistering user');
    
    if (_currentUserId != null && _deviceId != null) {
      // TODO: Implement server-side unregistration
      // This would involve calling an API to remove the device token
    }

    _currentUserId = null;
    _deviceId = null;
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
