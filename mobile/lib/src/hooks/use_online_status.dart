import 'dart:async';
import 'package:flutter/foundation.dart';
import '../services/online_status_service.dart';

class UseOnlineStatus {
  final String? userId;
  final bool isOnline;
  final int? lastSeen;
  final Map<String, UserStatus> allStatuses;
  final Function(String, bool) updateUserStatus;

  UseOnlineStatus({
    required this.userId,
    required this.isOnline,
    required this.lastSeen,
    required this.allStatuses,
    required this.updateUserStatus,
  });
}

class OnlineStatusNotifier extends ChangeNotifier {
  bool _isOnline = false;
  int? _lastSeen;
  Map<String, UserStatus> _allStatuses = {};
  String? _userId;

  bool get isOnline => _isOnline;
  int? get lastSeen => _lastSeen;
  Map<String, UserStatus> get allStatuses => _allStatuses;
  String? get userId => _userId;

  final OnlineStatusService _onlineStatusService = OnlineStatusService();

  void initialize(String userId, Map<String, dynamic> userData) {
    print('🔔 NOTIFIER: initialize called');
    print('   User ID: $userId');
    print('   User data: $userData');
    
    // Always dispose existing connection first
    if (_userId != null) {
      print('   Disposing existing connection');
      _onlineStatusService.offStatusChange(_handleStatusChange);
      _onlineStatusService.disconnect();
    }

    _userId = userId;
    
    // Connect to status service
    print('   Connecting to status service...');
    _onlineStatusService.connect(userId, userData);

    // Set up status change listener
    print('   Setting up status change listener');
    _onlineStatusService.onStatusChange(_handleStatusChange);

    // Fetch initial status
    print('   Fetching initial status...');
    _fetchInitialStatus();
  }

  void _handleStatusChange(UserStatus status) {
    print('📢 NOTIFIER: Status change received');
    print('   User ID: ${status.userId}');
    print('   Is Online: ${status.isOnline}');
    print('   Last Seen: ${status.lastSeen}');
    
    _allStatuses[status.userId] = status;

    // Update current user's status if it matches
    if (_userId != null && status.userId == _userId!) {
      print('   This is current user status update');
      _isOnline = status.isOnline;
      _lastSeen = status.lastSeen;
    }
    
    // Always notify listeners when any user's status changes
    print('   Notifying listeners...');
    notifyListeners();
  }

  Future<void> _fetchInitialStatus() async {
    if (_userId == null) return;
    
    try {
      final status = await _onlineStatusService.getStatus(_userId!);
      if (status != null) {
        _isOnline = status.isOnline;
        _lastSeen = status.lastSeen;
      }

      // Fetch all statuses
      final allStatuses = await _onlineStatusService.getAllStatuses();
      _allStatuses = allStatuses;
      
      notifyListeners();
    } catch (error) {
      // Handle error silently
    }
  }

  Future<void> refreshStatus() async {
    if (_userId == null) return;
    await _fetchInitialStatus();
  }
  
  void forceReconnect() {
    print('🔄 NOTIFIER: Force reconnect called');
    if (_userId != null) {
      print('   Forcing reconnection for user: $_userId');
      _onlineStatusService.forceReconnect();
    }
  }

  void updateUserStatus(String userId, bool isOnline) {
    _allStatuses[userId] = UserStatus(
      userId: userId,
      isOnline: isOnline,
      lastSeen: DateTime.now().millisecondsSinceEpoch,
    );
    notifyListeners();
  }

  @override
  void dispose() {
    _onlineStatusService.offStatusChange(_handleStatusChange);
    _onlineStatusService.disconnect();
    super.dispose();
  }
}

// Hook-like function for easier usage
UseOnlineStatus useOnlineStatus(OnlineStatusNotifier notifier) {
  return UseOnlineStatus(
    userId: notifier.userId,
    isOnline: notifier.isOnline,
    lastSeen: notifier.lastSeen,
    allStatuses: notifier.allStatuses,
    updateUserStatus: notifier.updateUserStatus,
  );
}