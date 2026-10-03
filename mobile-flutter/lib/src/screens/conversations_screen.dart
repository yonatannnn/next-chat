import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../services/chat_repository.dart';
import '../services/users_repository.dart';
import '../bloc/conversations/conversations_bloc.dart';
import '../services/online_status_service.dart';
import '../services/global_online_status_manager.dart';
import '../services/chat_notification_manager.dart';
import 'chat_detail_screen.dart';

class ConversationsScreen extends StatefulWidget {
  const ConversationsScreen({super.key});

  @override
  State<ConversationsScreen> createState() => _ConversationsScreenState();
}

class _ConversationsScreenState extends State<ConversationsScreen> {
  final _chat = ChatRepository();
  final _users = UsersRepository();
  final _searchCtrl = TextEditingController();
  final _textCtrl = TextEditingController();
  String? _selectedPeerId;
  Map<String, UserStatus> _allStatuses = {};
  Timer? _statusRefreshTimer;
  Timer? _profileRefreshTimer;
  bool _showHidden = false;

  String? get _uid => FirebaseAuth.instance.currentUser?.uid;

  @override
  void initState() {
    super.initState();
    
    // Ensure bloc is started even on hot reload or direct navigation
    context.read<ConversationsBloc>().add(const ConversationsStarted());
    
    // Initialize online status tracking
    _initializeOnlineStatus();
  }

  void _initializeOnlineStatus() {
    // Check if we need to initialize the GlobalOnlineStatusManager
    final currentUser = FirebaseAuth.instance.currentUser;
    if (currentUser != null && GlobalOnlineStatusManager().onlineStatusNotifier == null) {
      
      final userData = {
        'userId': currentUser.uid,
        'username': currentUser.displayName ?? 'User',
        'email': currentUser.email ?? '',
      };
      
      GlobalOnlineStatusManager().initializeForUser(currentUser.uid);
      
      // Refresh status after a short delay
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) {
          GlobalOnlineStatusManager().refreshStatus();
        }
      });
    }
    
    // Listen to online status changes
    GlobalOnlineStatusManager().onlineStatusNotifier?.addListener(_onOnlineStatusChanged);
    
    // Get current statuses
    _updateOnlineStatuses();
    
    // Periodic check to ensure status is updated
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        _updateOnlineStatuses();
      }
    });
    
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) {
        _updateOnlineStatuses();
      }
    });
    
    // Add a periodic refresh every 10 seconds to ensure status stays updated
    _statusRefreshTimer = Timer.periodic(const Duration(seconds: 10), (timer) {
      if (mounted) {
        _updateOnlineStatuses();
      } else {
        timer.cancel();
      }
    });

    // Refresh profiles every 2 minutes to get updated usernames and avatars
    _profileRefreshTimer = Timer.periodic(const Duration(minutes: 1), (timer) {
      if (mounted) {
        _refreshProfiles();
      } else {
        timer.cancel();
      }
    });
  }

  void _onOnlineStatusChanged() {
    _updateOnlineStatuses();
  }

  void _updateOnlineStatuses() {
    final notifier = GlobalOnlineStatusManager().onlineStatusNotifier;
    if (notifier != null) {
      // Force a rebuild by calling setState
      if (mounted) {
        setState(() {
          _allStatuses = Map<String, UserStatus>.from(notifier.allStatuses);
        });
      }
    }
  }

  @override
  void dispose() {
    // Remove listener
    GlobalOnlineStatusManager().onlineStatusNotifier?.removeListener(_onOnlineStatusChanged);
    // Cancel timers
    _statusRefreshTimer?.cancel();
    _profileRefreshTimer?.cancel();
    super.dispose();
  }

  InputDecoration _decor(String hint) => InputDecoration(
        hintText: hint,
        filled: true,
        fillColor: Colors.grey.shade100,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        prefixIcon: const Icon(Icons.search),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF3B82F6), width: 2)),
      );

  String _initialsFrom(String name) {
    final parts = name.trim().split(' ').where((e) => e.isNotEmpty).toList();
    if (parts.isEmpty) return 'U';
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return (parts[0].characters.first + parts[1].characters.first).toUpperCase();
  }

  String _firstLetter(String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return 'U';
    return trimmed.characters.first.toUpperCase();
  }

  ImageProvider? _avatarProvider(String? url) {
    if (url == null) return null;
    try {
      final uri = Uri.tryParse(url);
      if (uri == null) return null;
      if (uri.isScheme('http') || uri.isScheme('https')) {
        return NetworkImage(url);
      }
      // Ignore file:/// or unsupported schemes in conversation list
      return null;
    } catch (_) {
      return null;
    }
  }

  String _relativeTime(DateTime when) {
    final d = DateTime.now().difference(when);
    if (d.inMinutes < 1) return 'now';
    if (d.inMinutes < 60) return '${d.inMinutes}m';
    if (d.inHours < 24) return '${d.inHours}h';
    return '${d.inDays}d';
  }

  @override
  Widget build(BuildContext context) {
    final uid = _uid;
    return SafeArea(
      top: false,
      child: Scaffold(
      appBar: AppBar(
        title: const Text('Next Chat'),
        actions: [
          IconButton(
            onPressed: () {
              Navigator.of(context).pushNamed('/profile');
            },
            icon: const Icon(Icons.person),
            tooltip: 'My Profile',
          ),
          IconButton(
            onPressed: () async {
              await FirebaseAuth.instance.signOut();
              if (mounted) {
                Navigator.of(context).pushReplacementNamed('/login');
              }
            },
            icon: const Icon(Icons.logout),
            tooltip: 'Logout',
          )
        ],
      ),
      body: uid == null
          ? const Center(child: Text('Not authenticated'))
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: TextField(
                    controller: _searchCtrl,
                    decoration: _decor('Search users...'),
                    onChanged: (v) async {
                      final q = v.trim();
                      context.read<ConversationsBloc>().add(SearchChanged(q));
                      // If query non-empty, fetch exact username matches and inject into cache
                      if (q.isNotEmpty) {
                        final bloc = context.read<ConversationsBloc>();
                        final results = await bloc.searchDirectory(q);
                        for (final p in results) {
                          // cache is updated inside repository; nothing else required here
                        }
                        if (mounted) setState(() {});
                      }
                    },
                  ),
                ),
                Expanded(
                  child: BlocBuilder<ConversationsBloc, ConversationsState>(
                    builder: (context, state) {
                      if (state.status == ConversationsStatus.loading) {
                        return const Center(child: CircularProgressIndicator());
                      }
                      final query = state.search.toLowerCase();
                      // Filter conversations based on hidden status and search query
                      final items = state.conversations.where((c) {
                        // Hard hidden conversations are NEVER shown in normal list
                        if (c.hardHidden) {
                          return false;
                        }
                        
                        // Filter by hidden status (only for regular hidden, not hard hidden)
                        if (!_showHidden && c.hidden) {
                          return false;
                        }
                        if (_showHidden && !c.hidden) {
                          return false;
                        }
                        
                        // Filter by search query
                        if (query.isEmpty) return true;
                        final cached = (_users.getCachedUsername(c.peerId) ?? 'user').toLowerCase();
                        final q = query.startsWith('@') ? query.substring(1) : query;
                        return cached == q.toLowerCase();
                      }).toList();
                      if (items.isEmpty) {
                        return const Center(child: Text('No conversations'));
                      }
                      return ListView.separated(
                        itemCount: items.length,
                        separatorBuilder: (_, __) => Divider(height: 1, color: Colors.grey.shade200),
                        itemBuilder: (context, index) {
                          final c = items[index];
                          return Builder(builder: (context) {
                            final cachedProfile = _users.getCachedProfile(c.peerId);
                            final title = cachedProfile?.username ?? 'User';
                            return FutureBuilder<UserProfile?>(
                              future: _users.hasCached(c.peerId) ? Future.value(cachedProfile) : _users.getProfile(c.peerId),
                              builder: (context, snap) {
                                final UserProfile? profile = snap.data ?? cachedProfile;
                                final effectiveTitle = profile?.username ?? title;
                                final mine = c.latest.senderId == uid;
                                final subtitle = mine ? 'Me: ${c.latest.text}' : c.latest.text;
                              return Container(
                                color: Colors.transparent,
                                child: InkWell(
                                  onTap: () {
                                    Navigator.of(context).push(
                                      MaterialPageRoute(
                                        builder: (_) => ChatDetailScreen(peerId: c.peerId),
                                      ),
                                    );
                                  },
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.center,
                                      children: [
                                        Stack(
                                          children: [
                                            GestureDetector(
                                              onTap: () {
                                                Navigator.of(context).pushNamed(
                                                  '/profile',
                                                  arguments: c.peerId,
                                                );
                                              },
                                              child: CircleAvatar(
                                                radius: 22,
                                                backgroundColor: Colors.grey.shade300,
                                                backgroundImage: _avatarProvider(profile?.avatarUrl),
                                                child: (profile?.avatarUrl == null) ? Text(_firstLetter(effectiveTitle), style: const TextStyle(fontWeight: FontWeight.w600)) : null,
                                              ),
                                            ),
                                            // Online status indicator
                                            Builder(
                                              builder: (context) {
                                                final isOnline = _allStatuses.containsKey(c.peerId) && _allStatuses[c.peerId]?.isOnline == true;
                                                return isOnline
                                                    ? Positioned(
                                                        bottom: 0,
                                                        right: 0,
                                                        child: Container(
                                                          width: 14,
                                                          height: 14,
                                                          decoration: BoxDecoration(
                                                            color: Colors.green,
                                                            shape: BoxShape.circle,
                                                            border: Border.all(color: Colors.white, width: 2),
                                                          ),
                                                        ),
                                                      )
                                                    : const SizedBox.shrink();
                                              },
                                            ),
                                          ],
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                children: [
                                                  Expanded(
                                                    child: Text(effectiveTitle, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                                                  ),
                                                  if (c.hidden) ...[
                                                    const SizedBox(width: 4),
                                                    const Icon(
                                                      Icons.visibility_off,
                                                      size: 14,
                                                      color: Colors.grey,
                                                    ),
                                                  ],
                                                ],
                                              ),
                                              const SizedBox(height: 2),
                                              Text(subtitle, style: TextStyle(color: Colors.grey.shade700), maxLines: 1, overflow: TextOverflow.ellipsis),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Column(
                                          mainAxisSize: MainAxisSize.min,
                                          crossAxisAlignment: CrossAxisAlignment.end,
                                          children: [
                                            Text(_relativeTime(c.latest.timestamp), style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                                            const SizedBox(height: 6),
                                            if (c.unreadCount > 0)
                                              CircleAvatar(
                                                radius: 10,
                                                backgroundColor: const Color(0xFF3B82F6),
                                                child: Text('${c.unreadCount}', style: const TextStyle(color: Colors.white, fontSize: 11)),
                                              ),
                                          ],
                                        )
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            },
                          );
                          // Close outer Builder
                        });
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
      ),
    );
  }

  void _refreshProfiles() {
    // Clear the cache to force refresh of all profiles
    _users.clearCache();
    // Trigger a rebuild to fetch fresh profile data
    setState(() {
      // This will cause the FutureBuilder to fetch fresh data
    });
  }
}



