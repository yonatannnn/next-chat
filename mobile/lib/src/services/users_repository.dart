import 'package:cloud_firestore/cloud_firestore.dart';

class UserProfile {
  final String id;
  final String username;
  final String? name;
  final String? avatarUrl;

  UserProfile({required this.id, required this.username, this.name, this.avatarUrl});
}

class UsersRepository {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final Map<String, UserProfile> _cache = {};

  Future<String> getUsername(String userId) async {
    final p = await getProfile(userId);
    return p.username;
  }

  Future<UserProfile> getProfile(String userId) async {
    if (_cache.containsKey(userId)) return _cache[userId]!;
    try {
      final doc = await _db.collection('users').doc(userId).get();
      final data = doc.data() ?? {};
      final username = (data['username'] as String?) ?? (data['name'] as String?) ?? 'User';
      final name = data['name'] as String?;
      final avatar = data['avatar'] as String? ?? data['photoURL'] as String?;
      final profile = UserProfile(id: userId, username: username, name: name, avatarUrl: avatar);
      _cache[userId] = profile;
      return profile;
    } catch (_) {
      final profile = UserProfile(id: userId, username: 'User');
      _cache[userId] = profile;
      return profile;
    }
  }

  bool hasCached(String userId) => _cache.containsKey(userId);

  String? getCachedUsername(String userId) => _cache[userId]?.username;

  UserProfile? getCachedProfile(String userId) => _cache[userId];

  void clearCache() {
    _cache.clear();
  }

  void clearUserCache(String userId) {
    _cache.remove(userId);
  }

  Future<UserProfile> getProfileForceRefresh(String userId) async {
    _cache.remove(userId); // Clear cache for this user
    return await getProfile(userId); // Fetch fresh data
  }

  Future<List<UserProfile>> searchUsers(String searchQuery, String currentUserId) async {
    if (searchQuery.trim().isEmpty) return [];
    final q = searchQuery.trim();
    final List<UserProfile> results = [];
    try {
      if (q.startsWith('@')) {
        final username = q.substring(1).toLowerCase();
        final snap = await _db
            .collection('users')
            .where('usernameLower', isGreaterThanOrEqualTo: username)
            .where('usernameLower', isLessThanOrEqualTo: '${username}\uf8ff')
            .limit(10)
            .get();
        for (final d in snap.docs) {
          final data = d.data();
          final profile = UserProfile(
            id: d.id,
            username: (data['username'] as String?) ?? (data['name'] as String?) ?? 'User',
            name: data['name'] as String?,
            avatarUrl: data['avatar'] as String? ?? data['photoURL'] as String?,
          );
          if (profile.id != currentUserId) {
            _cache[profile.id] = profile;
            results.add(profile);
          }
        }
      } else {
        final qLower = q.toLowerCase();
        // Search by email exact-ish and username prefix; merge
        final futures = <Future<QuerySnapshot<Map<String, dynamic>>>>[
          _db.collection('users').where('emailLower', isEqualTo: qLower).limit(10).get(),
          _db.collection('users').where('usernameLower', isGreaterThanOrEqualTo: qLower).where('usernameLower', isLessThanOrEqualTo: '${qLower}\uf8ff').limit(10).get(),
        ];
        final snaps = await Future.wait(futures);
        for (final snap in snaps) {
          for (final d in snap.docs) {
            final data = d.data();
            final profile = UserProfile(
              id: d.id,
              username: (data['username'] as String?) ?? (data['name'] as String?) ?? 'User',
              name: data['name'] as String?,
              avatarUrl: data['avatar'] as String? ?? data['photoURL'] as String?,
            );
            if (profile.id != currentUserId && results.indexWhere((p) => p.id == profile.id) == -1) {
              _cache[profile.id] = profile;
              results.add(profile);
            }
          }
        }
      }
    } catch (_) {
      // ignore
    }
    return results.take(10).toList();
  }

  Future<List<UserProfile>> searchExactUsername(String query, String currentUserId) async {
    final q = query.trim().replaceFirst('@', '').toLowerCase();
    if (q.isEmpty) return [];
    try {
      final snap = await _db
          .collection('users')
          .where('usernameLower', isEqualTo: q)
          .limit(5)
          .get();
      final results = <UserProfile>[];
      for (final d in snap.docs) {
        if (d.id == currentUserId) continue; // exclude self
        final data = d.data();
        final profile = UserProfile(
          id: d.id,
          username: (data['username'] as String?) ?? (data['name'] as String?) ?? 'User',
          name: data['name'] as String?,
          avatarUrl: data['avatar'] as String? ?? data['photoURL'] as String?,
        );
        _cache[profile.id] = profile;
        results.add(profile);
      }
      return results;
    } catch (_) {
      return [];
    }
  }
}


