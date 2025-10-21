import 'dart:convert';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/app_config.dart';

class BackgroundNotificationService {
  static final BackgroundNotificationService _instance = BackgroundNotificationService._internal();
  factory BackgroundNotificationService() => _instance;
  BackgroundNotificationService._internal();

  final FlutterLocalNotificationsPlugin _localNotifications = 
      FlutterLocalNotificationsPlugin();
  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;

  bool _isInitialized = false;

  /// Initialize the background notification service
  Future<void> initialize() async {
    if (_isInitialized) return;

    print('🔔 BACKGROUND NOTIFICATION SERVICE: Initializing...');

    // Initialize local notifications
    await _initializeLocalNotifications();

    // Set up Firebase messaging handlers
    await _setupFirebaseMessaging();

    _isInitialized = true;
    print('✅ BACKGROUND NOTIFICATION SERVICE: Initialized successfully');
  }

  /// Initialize local notifications
  Future<void> _initializeLocalNotifications() async {
    const AndroidInitializationSettings androidSettings = 
        AndroidInitializationSettings('@mipmap/ic_launcher');

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
    const AndroidNotificationChannel channel = AndroidNotificationChannel(
      'chat_notifications',
      'Chat Notifications',
      description: 'Notifications for new chat messages',
      importance: Importance.high,
      enableVibration: true,
      playSound: true,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);
  }

  /// Set up Firebase messaging
  Future<void> _setupFirebaseMessaging() async {
    // Request permission
    await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    // Set up message handlers
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

    // Get initial message if app was opened from notification
    final RemoteMessage? initialMessage = 
        await _firebaseMessaging.getInitialMessage();
    if (initialMessage != null) {
      _handleNotificationTap(initialMessage);
    }
  }

  /// Handle foreground messages
  void _handleForegroundMessage(RemoteMessage message) {
    print('🔔 BACKGROUND NOTIFICATION SERVICE: Foreground message received');
    print('   Title: ${message.notification?.title}');
    print('   Body: ${message.notification?.body}');
    print('   Data: ${message.data}');

    // Show local notification for foreground messages
    _showLocalNotification(message);
  }

  /// Handle notification taps
  void _handleNotificationTap(RemoteMessage message) {
    print('🔔 BACKGROUND NOTIFICATION SERVICE: Notification tapped');
    print('   Data: ${message.data}');

    // Handle navigation based on notification data
    _handleNotificationNavigation(message.data);
  }

  /// Handle local notification taps
  void _onNotificationTapped(NotificationResponse response) {
    print('🔔 BACKGROUND NOTIFICATION SERVICE: Local notification tapped');
    print('   Payload: ${response.payload}');

    if (response.payload != null) {
      final Map<String, dynamic> data = jsonDecode(response.payload!);
      _handleNotificationNavigation(data);
    }
  }

  /// Handle notification navigation
  void _handleNotificationNavigation(Map<String, dynamic> data) {
    print('🔔 BACKGROUND NOTIFICATION SERVICE: Handling navigation');
    print('   Data: $data');

    // Extract navigation information from data
    final String? type = data['type'];
    final String? senderId = data['senderId'];
    final String? senderName = data['senderName'];

    if (type == 'chat' && senderId != null) {
      // Navigate to chat with specific user
      print('🔔 BACKGROUND NOTIFICATION SERVICE: Navigating to chat with $senderName ($senderId)');
      // TODO: Implement navigation to specific chat
    }
  }

  /// Show local notification
  Future<void> _showLocalNotification(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    final AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'chat_notifications',
      'Chat Notifications',
      channelDescription: 'Notifications for new chat messages',
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

  /// Show chat notification manually
  Future<void> showChatNotification({
    required String senderName,
    required String messageText,
    required String senderId,
  }) async {
    print('🔔 BACKGROUND NOTIFICATION SERVICE: Showing chat notification');
    print('   Sender: $senderName');
    print('   Message: $messageText');
    print('   Sender ID: $senderId');

    final AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'chat_notifications',
      'Chat Notifications',
      channelDescription: 'Notifications for new chat messages',
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

  /// Get FCM token for device registration
  Future<String?> getFCMToken() async {
    try {
      final token = await _firebaseMessaging.getToken();
      print('🔔 BACKGROUND NOTIFICATION SERVICE: FCM Token: $token');
      return token;
    } catch (e) {
      print('❌ BACKGROUND NOTIFICATION SERVICE: Error getting FCM token: $e');
      return null;
    }
  }

  /// Register device with Supabase for background notifications
  Future<bool> registerDeviceForBackgroundNotifications(String userId) async {
    try {
      final token = await getFCMToken();
      if (token == null) {
        print('❌ BACKGROUND NOTIFICATION SERVICE: No FCM token available');
        return false;
      }

      final supabase = Supabase.instance.client;
      
      // Generate device ID
      final deviceId = 'flutter_${DateTime.now().millisecondsSinceEpoch}';
      
      // Check if subscription already exists
      final existingSubscriptions = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .eq('device_id', deviceId);

      if (existingSubscriptions.isNotEmpty) {
        // Update existing subscription
        final response = await supabase
            .from('push_subscriptions')
            .update({
              'endpoint': token,
              'p256dh': 'fcm',
              'auth': 'fcm',
              'user_agent': 'flutter_mobile_background',
              'platform': 'android', // or 'ios'
              'updated_at': DateTime.now().toIso8601String(),
            })
            .eq('user_id', userId)
            .eq('device_id', deviceId);

        if (response.error != null) {
          print('❌ BACKGROUND NOTIFICATION SERVICE: Error updating subscription: ${response.error}');
          return false;
        }

        print('🔔 BACKGROUND NOTIFICATION SERVICE: Updated existing subscription for background notifications');
        return true;
      } else {
        // Insert new subscription
        final response = await supabase
            .from('push_subscriptions')
            .insert({
              'user_id': userId,
              'device_id': deviceId,
              'endpoint': token,
              'p256dh': 'fcm',
              'auth': 'fcm',
              'user_agent': 'flutter_mobile_background',
              'platform': 'android', // or 'ios'
            });

        if (response.error != null) {
          print('❌ BACKGROUND NOTIFICATION SERVICE: Error inserting subscription: ${response.error}');
          return false;
        }

        print('🔔 BACKGROUND NOTIFICATION SERVICE: Created new subscription for background notifications');
        return true;
      }
    } catch (e) {
      print('❌ BACKGROUND NOTIFICATION SERVICE: Error registering device: $e');
      return false;
    }
  }
}

