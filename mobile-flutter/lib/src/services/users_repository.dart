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

  UserProfile _profileFromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? {};
    return UserProfile(
      id: (data['id'] as String?) ?? doc.id,
      username: (data['username'] as String?) ?? (data['name'] as String?) ?? 'User',
      name: data['name'] as String?,
      avatarUrl: data['avatar'] as String?,
    );
  }

  Future<String> getUsername(String userId) async {
    final p = await getProfile(userId);
    return p.username;
  }

  Future<UserProfile> getProfile(String userId) async {
    if (_cache.containsKey(userId)) return _cache[userId]!;
    try {
      final doc = await _db.collection('users').doc(userId).get();
      final profile = _profileFromDoc(doc);
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
        final username = q.substring(1);
        final snap = await _db
            .collection('users')
            .where('username', isGreaterThanOrEqualTo: username)
            .where('username', isLessThanOrEqualTo: '${username}\uf8ff')
            .limit(10)
            .get();
        for (final d in snap.docs) {
          final profile = _profileFromDoc(d);
          if (profile.id != currentUserId) {
            _cache[profile.id] = profile;
            results.add(profile);
          }
        }
      } else {
        // Search by email and username prefix; merge.
        final futures = <Future<QuerySnapshot<Map<String, dynamic>>>>[
          _db.collection('users').where('email', isGreaterThanOrEqualTo: q).where('email', isLessThanOrEqualTo: '${q}\uf8ff').limit(10).get(),
          _db.collection('users').where('username', isGreaterThanOrEqualTo: q).where('username', isLessThanOrEqualTo: '${q}\uf8ff').limit(10).get(),
        ];
        final snaps = await Future.wait(futures);
        for (final snap in snaps) {
          for (final d in snap.docs) {
            final profile = _profileFromDoc(d);
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
    final q = query.trim().replaceFirst('@', '');
    if (q.isEmpty) return [];
    try {
      final snap = await _db
          .collection('users')
          .where('username', isEqualTo: q)
          .limit(5)
          .get();
      final results = <UserProfile>[];
      for (final d in snap.docs) {
        if (d.id == currentUserId) continue; // exclude self
        final profile = _profileFromDoc(d);
        _cache[profile.id] = profile;
        results.add(profile);
      }
      return results;
    } catch (_) {
      return [];
    }
  }
}

