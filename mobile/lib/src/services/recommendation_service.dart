import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class ProfileRecommendation {
  final String id;
  final String senderId;
  final String receiverId;
  final String imageUrl;
  final String message;
  final String status; // 'pending', 'accepted', 'rejected'
  final DateTime createdAt;
  final DateTime? updatedAt;

  ProfileRecommendation({
    required this.id,
    required this.senderId,
    required this.receiverId,
    required this.imageUrl,
    required this.message,
    required this.status,
    required this.createdAt,
    this.updatedAt,
  });

  factory ProfileRecommendation.fromMap(Map<String, dynamic> data, String id) {
    return ProfileRecommendation(
      id: id,
      senderId: data['senderId'] ?? '',
      receiverId: data['receiverId'] ?? '',
      imageUrl: data['imageUrl'] ?? '',
      message: data['message'] ?? '',
      status: data['status'] ?? 'pending',
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'senderId': senderId,
      'receiverId': receiverId,
      'imageUrl': imageUrl,
      'message': message,
      'status': status,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': updatedAt != null ? Timestamp.fromDate(updatedAt!) : null,
    };
  }
}

class RecommendationService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Send a profile picture recommendation
  Future<String> sendRecommendation({
    required String receiverId,
    required String imageUrl,
    String message = '',
  }) async {
    try {
      final currentUser = _auth.currentUser;
      if (currentUser == null) {
        throw Exception('User not authenticated');
      }

      final recommendationData = {
        'senderId': currentUser.uid,
        'receiverId': receiverId,
        'imageUrl': imageUrl,
        'message': message,
        'status': 'pending',
        'createdAt': FieldValue.serverTimestamp(),
      };

      final docRef = await _db.collection('profileRecommendations').add(recommendationData);
      return docRef.id;
    } catch (e) {
      print('Error sending recommendation: $e');
      rethrow;
    }
  }

  // Get recommendations for a user
  Future<List<ProfileRecommendation>> getRecommendations(String userId) async {
    try {
      final querySnapshot = await _db
          .collection('profileRecommendations')
          .where('receiverId', isEqualTo: userId)
          .where('status', isEqualTo: 'pending')
          .orderBy('createdAt', descending: true)
          .get();

      return querySnapshot.docs.map((doc) {
        return ProfileRecommendation.fromMap(doc.data(), doc.id);
      }).toList();
    } catch (e) {
      print('Error getting recommendations: $e');
      return [];
    }
  }

  // Accept a recommendation (update user's profile picture)
  Future<void> acceptRecommendation(String recommendationId) async {
    try {
      final currentUser = _auth.currentUser;
      if (currentUser == null) {
        throw Exception('User not authenticated');
      }

      // Get the recommendation data first
      final recommendationDoc = await _db
          .collection('profileRecommendations')
          .doc(recommendationId)
          .get();

      if (!recommendationDoc.exists) {
        throw Exception('Recommendation not found');
      }

      final recommendationData = recommendationDoc.data()!;
      final imageUrl = recommendationData['imageUrl'] as String;
      final senderId = recommendationData['senderId'] as String;

      // Update user's profile picture in users collection
      await _db.collection('users').doc(currentUser.uid).update({
        'avatar': imageUrl,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      // Send confirmation message to chat
      await _sendConfirmationMessage(
        senderId: currentUser.uid,
        receiverId: senderId,
        message: '✅ Profile picture recommendation accepted.',
        type: 'recommendation_accepted',
      );

      // Delete the recommendation after accepting
      await _db.collection('profileRecommendations').doc(recommendationId).delete();
    } catch (e) {
      print('Error accepting recommendation: $e');
      rethrow;
    }
  }

  // Reject a recommendation
  Future<void> rejectRecommendation(String recommendationId) async {
    try {
      final currentUser = _auth.currentUser;
      if (currentUser == null) {
        throw Exception('User not authenticated');
      }

      // Get the recommendation data first
      final recommendationDoc = await _db
          .collection('profileRecommendations')
          .doc(recommendationId)
          .get();

      if (!recommendationDoc.exists) {
        throw Exception('Recommendation not found');
      }

      final recommendationData = recommendationDoc.data()!;
      final senderId = recommendationData['senderId'] as String;

      // Send confirmation message to chat
      await _sendConfirmationMessage(
        senderId: currentUser.uid,
        receiverId: senderId,
        message: '❌ Profile picture recommendation rejected.',
        type: 'recommendation_rejected',
      );

      // Delete the recommendation after rejecting
      await _db.collection('profileRecommendations').doc(recommendationId).delete();
    } catch (e) {
      print('Error rejecting recommendation: $e');
      rethrow;
    }
  }

  // Delete a recommendation
  Future<void> deleteRecommendation(String recommendationId) async {
    try {
      await _db.collection('profileRecommendations').doc(recommendationId).delete();
    } catch (e) {
      print('Error deleting recommendation: $e');
      rethrow;
    }
  }

  // Listen to recommendations in real-time
  Stream<List<ProfileRecommendation>> listenToRecommendations(String userId) {
    return _db
        .collection('profileRecommendations')
        .where('receiverId', isEqualTo: userId)
        .where('status', isEqualTo: 'pending')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        return ProfileRecommendation.fromMap(doc.data(), doc.id);
      }).toList();
    });
  }

  // Listen to recommendations where user is either sender or receiver
  Stream<List<ProfileRecommendation>> listenToAllRecommendations(String userId) {
    // Try a simpler approach - get all documents and filter in memory
    // This avoids potential Firestore index issues
    return _db
        .collection('profileRecommendations')
        .snapshots()
        .map((snapshot) {
      final allDocs = snapshot.docs.map((doc) {
        return ProfileRecommendation.fromMap(doc.data(), doc.id);
      }).toList();
      
      // Filter in memory to avoid Firestore index issues
      final filtered = allDocs.where((rec) {
        return rec.senderId == userId || rec.receiverId == userId;
      }).toList();
      
      // Sort by creation date
      filtered.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      
      return filtered;
    });
  }

  // Send confirmation message to chat
  Future<void> _sendConfirmationMessage({
    required String senderId,
    required String receiverId,
    required String message,
    required String type,
  }) async {
    try {
      await _db.collection('messages').add({
        'senderId': senderId,
        'receiverId': receiverId,
        'text': message,
        'timestamp': FieldValue.serverTimestamp(),
        'seen': false,
        'type': type, // 'recommendation_accepted' or 'recommendation_rejected'
      });
    } catch (e) {
      print('Error sending confirmation message: $e');
      // Don't rethrow - this is not critical for the main functionality
    }
  }
}
