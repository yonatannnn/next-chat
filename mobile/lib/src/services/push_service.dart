import 'dart:convert';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';

class PushService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  Future<void> requestPermission() async {
    await _messaging.requestPermission();
  }

  Future<String?> getToken() async {
    return _messaging.getToken();
  }

  Future<bool> registerDeviceToken({
    required String userId,
    required String deviceId,
    required String token,
  }) async {
    final url = Uri.parse('${AppConfig.backendBaseUrl}/api/push-subscriptions');
    final response = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'userId': userId,
        'deviceId': deviceId,
        // Map FCM token to endpoint-like field to reuse server API schema
        'endpoint': token,
        'p256dh': 'fcm',
        'auth': 'fcm',
        'userAgent': 'flutter',
        'platform': 'mobile',
      }),
    );
    return response.statusCode == 200;
  }
}



