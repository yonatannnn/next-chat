import 'package:firebase_auth/firebase_auth.dart';
import '../hooks/use_online_status.dart';

class GlobalOnlineStatusManager {
  static final GlobalOnlineStatusManager _instance = GlobalOnlineStatusManager._internal();
  factory GlobalOnlineStatusManager() => _instance;
  GlobalOnlineStatusManager._internal();

  OnlineStatusNotifier? _onlineStatusNotifier;
  String? _currentUserId;

  OnlineStatusNotifier? get onlineStatusNotifier => _onlineStatusNotifier;
  String? get currentUserId => _currentUserId;

  void initializeForUser(String userId) {
    print('🌐 GLOBAL MANAGER: initializeForUser called');
    print('   User ID: $userId');
    print('   Previous user ID: $_currentUserId');
    
    // Always dispose existing notifier first to ensure clean state
    if (_onlineStatusNotifier != null) {
      print('   Disposing existing notifier');
      _onlineStatusNotifier?.dispose();
      _onlineStatusNotifier = null;
    }

    // Small delay to ensure previous connection is fully closed
    Future.delayed(Duration(milliseconds: 100), () {
      _currentUserId = userId;
      _onlineStatusNotifier = OnlineStatusNotifier();
      print('   Created new notifier');

      // Initialize with user data
      final user = FirebaseAuth.instance.currentUser;
      final userData = {
        'userId': userId,
        'username': user?.displayName ?? 'User',
        'email': user?.email ?? '',
      };
      
      print('   User data: $userData');
      _onlineStatusNotifier!.initialize(userId, userData);
      print('✅ GLOBAL MANAGER: Initialization completed');
    });
  }

  void dispose() {
    _onlineStatusNotifier?.dispose();
    _onlineStatusNotifier = null;
    _currentUserId = null;
  }

  Future<void> refreshStatus() async {
    if (_onlineStatusNotifier != null) {
      await _onlineStatusNotifier!.refreshStatus();
    }
  }
  
  void forceReconnect() {
    print('🔄 GLOBAL MANAGER: Force reconnect called');
    if (_onlineStatusNotifier != null && _currentUserId != null) {
      print('   Forcing reconnection for user: $_currentUserId');
      _onlineStatusNotifier!.forceReconnect();
    }
  }

  void handleAuthStateChange(User? user) {
    if (user != null) {
      // User logged in - initialize online status
      initializeForUser(user.uid);
    } else {
      // User logged out - dispose online status
      dispose();
    }
  }
}