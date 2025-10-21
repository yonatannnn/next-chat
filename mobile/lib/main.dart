import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter/material.dart';

import 'src/screens/conversations_screen.dart';
import 'src/screens/login_screen.dart';
import 'src/screens/register_screen.dart';
import 'src/screens/profile_screen.dart';
import 'src/services/firebase_bootstrap.dart';
import 'src/bloc/conversations/conversations_bloc.dart';
import 'src/services/chat_repository.dart';
import 'src/services/users_repository.dart';
import 'src/config/supabase_config.dart';
import 'src/services/global_online_status_manager.dart';
import 'src/services/notification_service.dart';
import 'src/services/chat_notification_manager.dart';
import 'src/services/supabase_push_service.dart';
import 'src/services/supabase_chat_notification_manager.dart';
import 'src/services/background_notification_service.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

/// Background message handler (must be top-level function)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Initialize the background notification service
  await BackgroundNotificationService().initialize();
  
  // Show the notification
  await BackgroundNotificationService().showChatNotification(
    senderName: message.data['senderName'] ?? 'Someone',
    messageText: message.data['messageText'] ?? message.notification?.body ?? 'New message',
    senderId: message.data['senderId'] ?? 'unknown',
  );
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await safeInitializeFirebase();
  await SupabaseConfig.initialize();
  
  // Register background message handler
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  
  // Initialize notification services
  await NotificationService().initialize();
  await SupabasePushService().initialize();
  await BackgroundNotificationService().initialize();
  
  runApp(const NextChatApp());
}

class NextChatApp extends StatelessWidget {
  const NextChatApp({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF6B7280)),
      useMaterial3: true,
    );

    return MaterialApp(
      title: 'Next Chat',
      theme: theme,
      home: const _AuthGate(),
      routes: {
        '/register': (_) => const RegisterScreen(),
        '/login': (_) => const LoginScreen(),
        '/conversations': (_) => const _ConversationsWithBloc(),
        '/profile': (context) {
          final args = ModalRoute.of(context)?.settings.arguments;
          final userId = args is String ? args : null;
          return ProfileScreen(userId: userId);
        },
      },
      builder: (context, child) {
        if (Firebase.apps.isEmpty) {
          return const _FirebaseNotReady();
        }
        return child!;
      },
    );
  }
}

class _FirebaseNotReady extends StatelessWidget {
  const _FirebaseNotReady();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Text(
          'Firebase not configured. Run: flutterfire configure',
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}

class _AuthGate extends StatefulWidget {
  const _AuthGate();

  @override
  State<_AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<_AuthGate> {
  User? _previousUser;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snapshot) {
        final user = snapshot.data;
        
        if (user != _previousUser) {
          if (user != null) {
            // User logged in
            GlobalOnlineStatusManager().initializeForUser(user.uid);
            
            // Register user for notifications (both Firebase and Supabase)
            NotificationService().registerUser(user.uid);
            SupabasePushService().registerUser(user.uid);
            BackgroundNotificationService().registerDeviceForBackgroundNotifications(user.uid);
            
            // Initialize chat notification managers
            ChatNotificationManager().initializeForUser(user.uid);
            SupabaseChatNotificationManager().initializeForUser(user.uid);
            
            // Refresh status after a short delay to ensure connection is established
            Future.delayed(const Duration(seconds: 2), () {
              GlobalOnlineStatusManager().refreshStatus();
            });
            
            // Force reconnection after a longer delay to ensure socket connects
            Future.delayed(const Duration(seconds: 5), () {
              GlobalOnlineStatusManager().forceReconnect();
            });
          } else {
            // User logged out
            GlobalOnlineStatusManager().dispose();
            
            // Unregister user from notifications
            NotificationService().unregisterUser();
            SupabasePushService().unregisterUser();
            
            // Dispose chat notification managers
            ChatNotificationManager().dispose();
            SupabaseChatNotificationManager().dispose();
          }
          _previousUser = user;
        }
        
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        if (user == null) {
          return const LoginScreen();
        }
        
        // Check if we need to initialize online status for existing user
        if (user != null && _previousUser == null) {
          GlobalOnlineStatusManager().initializeForUser(user.uid);
          _previousUser = user;
          
          // Refresh status after a short delay
          Future.delayed(const Duration(seconds: 2), () {
            GlobalOnlineStatusManager().refreshStatus();
          });
          
          // Force reconnection after a longer delay
          Future.delayed(const Duration(seconds: 5), () {
            GlobalOnlineStatusManager().forceReconnect();
          });
        }
        
        return const _ConversationsWithBloc();
      },
    );
  }
}

class _ConversationsWithBloc extends StatelessWidget {
  const _ConversationsWithBloc();

  @override
  Widget build(BuildContext context) {
    final uid = FirebaseAuth.instance.currentUser?.uid ?? '';
    return BlocProvider(
      create: (_) => ConversationsBloc(
        chatRepository: ChatRepository(),
        usersRepository: UsersRepository(),
        currentUserId: uid,
      )..add(const ConversationsStarted()),
      child: const ConversationsScreen(),
    );
  }
}
