import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';

class ChatRepository {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  String conversationIdFor(String userId1, String userId2) {
    final participants = [userId1, userId2]..sort();
    return participants.join('_');
  }

  List<String> participantsFor(String userId1, String userId2) {
    final participants = [userId1, userId2]..sort();
    return List<String>.unmodifiable(participants);
  }

  Stream<List<Message>> subscribeToMessages({
    required String currentUserId,
    required String otherUserId,
  }) {
    final conversationId = conversationIdFor(currentUserId, otherUserId);
    final q = _db
        .collection('messages')
        .where('conversationId', isEqualTo: conversationId)
        .orderBy('timestamp', descending: false);

    return q.snapshots().map((snapshot) {
      return snapshot.docs.map((doc) => Message.fromMap(doc.id, doc.data())).toList();
    });
  }

  /// Aggregate latest message per peer (like web conversation list)
  Stream<List<Conversation>> subscribeToConversations({required String currentUserId}) {
    final conversationsStream = _db
        .collection('conversations')
        .where('participants', arrayContains: currentUserId)
        .orderBy('lastMessageAt', descending: true)
        .snapshots();
    final hiddenStream = _db.collection('hidden_conversations').where('currentUserId', isEqualTo: currentUserId).snapshots();

    final controller = StreamController<List<Conversation>>.broadcast();
    List<QueryDocumentSnapshot<Map<String, dynamic>>> conversationDocs = [];
    Map<String, Map<String, dynamic>> hiddenStates = {};

    void emitCombined() async {
      final items = <Conversation>[];
      for (final doc in conversationDocs) {
        final data = doc.data();
        final participants = (data['participants'] as List<dynamic>? ?? const []).cast<String>();
        final peerId = participants.firstWhere(
          (participantId) => participantId != currentUserId,
          orElse: () => '',
        );
        if (peerId.isEmpty) continue;

        final hiddenState = hiddenStates[peerId];
        final hidden = hiddenState?['hidden'] as bool? ?? false;
        final hardHidden = hiddenState?['hardHidden'] as bool? ?? false;
        final unreadCounts = (data['unreadCounts'] as Map<String, dynamic>? ?? const {});
        final lastSenderId = data['lastSenderId'] as String? ?? peerId;
        final lastMessageAt = (data['lastMessageAt'] as Timestamp?)?.toDate() ?? DateTime.now();

        items.add(Conversation(
          peerId: peerId,
          latest: Message(
            id: doc.id,
            senderId: lastSenderId,
            receiverId: lastSenderId == currentUserId ? peerId : currentUserId,
            conversationId: doc.id,
            participants: participants,
            text: data['lastMessage'] as String? ?? '',
            timestamp: lastMessageAt,
            seen: (unreadCounts[currentUserId] as int? ?? 0) == 0,
            messageType: 'user',
          ),
          unreadCount: unreadCounts[currentUserId] as int? ?? 0,
          hidden: hidden,
          hardHidden: hardHidden,
        ));
      }
      controller.add(items);
    }

    late final StreamSubscription conversationsSub;
    late final StreamSubscription hiddenSub;

    conversationsSub = conversationsStream.listen((qs) {
      conversationDocs = qs.docs;
      emitCombined();
    });
    hiddenSub = hiddenStream.listen((qs) {
      hiddenStates.clear();
      for (final doc in qs.docs) {
        final data = doc.data();
        final peerId = data['peerId'] as String;
        hiddenStates[peerId] = data;
      }
      emitCombined();
    });

    controller.onCancel = () async {
      await conversationsSub.cancel();
      await hiddenSub.cancel();
    };

    return controller.stream;
  }

  Future<void> sendMessage({
    required String senderId,
    required String receiverId,
    required String text,
    String? fileUrl,
    List<String>? fileUrls,
    String? voiceUrl,
    int? voiceDuration,
    Map<String, dynamic>? replyTo,
    String messageType = 'user',
  }) async {
    final conversationId = conversationIdFor(senderId, receiverId);
    final participants = participantsFor(senderId, receiverId);
    final senderProfile = await _getUserSummary(senderId);
    final receiverProfile = await _getUserSummary(receiverId);
    final batch = _db.batch();
    final messageRef = _db.collection('messages').doc();
    final conversationRef = _db.collection('conversations').doc(conversationId);

    batch.set(messageRef, {
      'senderId': senderId,
      'receiverId': receiverId,
      'conversationId': conversationId,
      'participants': participants,
      'text': text,
      'fileUrl': fileUrl,
      'fileUrls': fileUrls,
      'voiceUrl': voiceUrl,
      'voiceDuration': voiceDuration,
      'replyTo': replyTo,
      'timestamp': FieldValue.serverTimestamp(),
      'seen': false,
      'messageType': messageType,
    });

    batch.set(conversationRef, {
      'participants': participants,
      'lastMessage': _conversationPreview(
        text: text,
        fileUrl: fileUrl,
        fileUrls: fileUrls,
        voiceUrl: voiceUrl,
        messageType: messageType,
      ),
      'lastMessageAt': FieldValue.serverTimestamp(),
      'lastSenderId': senderId,
      'updatedAt': FieldValue.serverTimestamp(),
      'unreadCounts.$senderId': 0,
      'unreadCounts.$receiverId': FieldValue.increment(1),
      'lastReadAt.$senderId': FieldValue.serverTimestamp(),
      'profiles.$senderId': senderProfile,
      'profiles.$receiverId': receiverProfile,
    }, SetOptions(merge: true));

    await batch.commit();
  }

  Future<void> markMessageAsSeen(String messageId) async {
    try {
      final messageRef = _db.collection('messages').doc(messageId);
      await _db.runTransaction((transaction) async {
        final messageSnap = await transaction.get(messageRef);
        if (!messageSnap.exists) return;

        final data = messageSnap.data() ?? {};
        if (data['seen'] == true) return;

        final receiverId = data['receiverId'] as String?;
        final conversationId = data['conversationId'] as String?;
        transaction.update(messageRef, {
          'seen': true,
          'seenAt': FieldValue.serverTimestamp(),
        });

        if (receiverId != null && conversationId != null) {
          transaction.set(
            _db.collection('conversations').doc(conversationId),
            {
              'unreadCounts.$receiverId': 0,
              'lastReadAt.$receiverId': FieldValue.serverTimestamp(),
              'updatedAt': FieldValue.serverTimestamp(),
            },
            SetOptions(merge: true),
          );
        }
      });
    } catch (e) {
      print('Error marking message as seen: $e');
      rethrow;
    }
  }

  Future<void> editMessage(String messageId, String newText) async {
    try {
      final messageRef = _db.collection('messages').doc(messageId);
      await messageRef.update({
        'text': newText,
        'edited': true,
        'editedAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      print('Error editing message: $e');
      rethrow;
    }
  }

  Future<void> deleteMessage(String messageId) async {
    try {
      final messageRef = _db.collection('messages').doc(messageId);
      await messageRef.update({
        'deleted': true,
        'deletedAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      print('Error deleting message: $e');
      rethrow;
    }
  }

  Future<void> forwardMessage(Message message, String senderId, List<String> recipientIds, String originalSenderName) async {
    try {
      final forwardPromises = recipientIds.map((recipientId) async {
        final forwardedMessageData = {
          'senderId': senderId,
          'receiverId': recipientId,
          'conversationId': conversationIdFor(senderId, recipientId),
          'participants': participantsFor(senderId, recipientId),
          'text': message.text,
          'fileUrl': message.fileUrl,
          'fileUrls': message.fileUrls,
          'voiceUrl': message.voiceUrl,
          'voiceDuration': message.voiceDuration,
          'timestamp': FieldValue.serverTimestamp(),
          'seen': false,
          'messageType': message.messageType ?? 'user',
          'isForwarded': true,
          'originalMessageId': message.id,
          'originalSenderId': message.senderId,
          'originalSenderName': originalSenderName,
          'forwardedBy': senderId,
        };

        final senderProfile = await _getUserSummary(senderId);
        final recipientProfile = await _getUserSummary(recipientId);
        final batch = _db.batch();
        final messageRef = _db.collection('messages').doc();
        final conversationRef = _db.collection('conversations').doc(
          conversationIdFor(senderId, recipientId),
        );

        batch.set(messageRef, forwardedMessageData);
        batch.set(conversationRef, {
          'participants': participantsFor(senderId, recipientId),
          'lastMessage': _conversationPreview(
            text: message.text,
            fileUrl: message.fileUrl,
            fileUrls: message.fileUrls?.cast<String>(),
            voiceUrl: message.voiceUrl,
            messageType: message.messageType ?? 'user',
          ),
          'lastMessageAt': FieldValue.serverTimestamp(),
          'lastSenderId': senderId,
          'updatedAt': FieldValue.serverTimestamp(),
          'unreadCounts.$senderId': 0,
          'unreadCounts.$recipientId': FieldValue.increment(1),
          'lastReadAt.$senderId': FieldValue.serverTimestamp(),
          'profiles.$senderId': senderProfile,
          'profiles.$recipientId': recipientProfile,
        }, SetOptions(merge: true));

        return batch.commit();
      });

      await Future.wait(forwardPromises);
    } catch (e) {
      print('Error forwarding message: $e');
      rethrow;
    }
  }

  Future<List<Message>> getMessages(String userId1, String userId2) async {
    try {
      final conversationId = conversationIdFor(userId1, userId2);
      final query = await _db
          .collection('messages')
          .where('conversationId', isEqualTo: conversationId)
          .orderBy('timestamp', descending: false)
          .get();

      return query.docs.map((doc) => Message.fromMap(doc.id, doc.data())).toList();
    } catch (e) {
      print('Error getting messages: $e');
      return [];
    }
  }

  Future<void> deleteChat(String currentUserId, String otherUserId) async {
    try {
      // Get all messages between the two users
      final messages = await getMessages(currentUserId, otherUserId);
      
      if (messages.isEmpty) {
        print('No messages found to delete for chat between $currentUserId and $otherUserId');
        return;
      }
      
      print('Deleting ${messages.length} messages from chat between $currentUserId and $otherUserId');
      
      // Mark all messages as deleted using batch operation
      final batch = _db.batch();
      for (final message in messages) {
        final messageRef = _db.collection('messages').doc(message.id);
        batch.update(messageRef, {
          'deleted': true,
          'deletedAt': FieldValue.serverTimestamp(),
        });
      }
      
      await batch.commit();
      print('Successfully deleted chat between $currentUserId and $otherUserId');
    } catch (e) {
      print('Error deleting chat: $e');
      rethrow;
    }
  }

  Future<List<Message>> searchMessages(String currentUserId, String otherUserId, String searchQuery) async {
    try {
      if (searchQuery.trim().isEmpty) return [];
      
      // Get all messages between the two users
      final messages = await getMessages(currentUserId, otherUserId);
      
      // Filter messages that contain the search query (case insensitive)
      final query = searchQuery.toLowerCase();
      return messages.where((message) {
        return message.text.toLowerCase().contains(query) && 
               message.deleted != true; // Exclude deleted messages
      }).toList();
    } catch (e) {
      print('Error searching messages: $e');
      return [];
    }
  }

  Future<void> hideConversation(String currentUserId, String peerId) async {
    try {
      // Store hidden state in a separate collection for persistence
      await _db.collection('hidden_conversations').doc('${currentUserId}_$peerId').set({
        'currentUserId': currentUserId,
        'peerId': peerId,
        'hidden': true,
        'hiddenAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      print('Error hiding conversation: $e');
      rethrow;
    }
  }

  Future<void> unhideConversation(String currentUserId, String peerId) async {
    try {
      await _db.collection('hidden_conversations').doc('${currentUserId}_$peerId').delete();
    } catch (e) {
      print('Error unhiding conversation: $e');
      rethrow;
    }
  }

  Future<void> hardHideConversation(String currentUserId, String peerId) async {
    try {
      // Store hard hidden state
      await _db.collection('hidden_conversations').doc('${currentUserId}_$peerId').set({
        'currentUserId': currentUserId,
        'peerId': peerId,
        'hardHidden': true,
        'hidden': false,
        'hardHiddenAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      print('Error hard hiding conversation: $e');
      rethrow;
    }
  }

  Future<void> unhideHardHiddenConversation(String currentUserId, String peerId) async {
    try {
      await _db.collection('hidden_conversations').doc('${currentUserId}_$peerId').delete();
    } catch (e) {
      print('Error unhiding hard hidden conversation: $e');
      rethrow;
    }
  }

  Future<Map<String, bool>> getHiddenStates(String currentUserId) async {
    try {
      final snapshot = await _db
          .collection('hidden_conversations')
          .where('currentUserId', isEqualTo: currentUserId)
          .get();
      
      final states = <String, bool>{};
      for (final doc in snapshot.docs) {
        final data = doc.data();
        final peerId = data['peerId'] as String;
        final hidden = data['hidden'] as bool? ?? false;
        final hardHidden = data['hardHidden'] as bool? ?? false;
        
        states['${peerId}_hidden'] = hidden;
        states['${peerId}_hardHidden'] = hardHidden;
      }
      
      return states;
    } catch (e) {
      print('Error getting hidden states: $e');
      return {};
    }
  }
}

class Message {
  final String id;
  final String senderId;
  final String receiverId;
  final String? conversationId;
  final List<String>? participants;
  final String text;
  final DateTime timestamp;
  final bool? seen;
  final String? fileUrl;
  final List<dynamic>? fileUrls;
  final String? voiceUrl;
  final int? voiceDuration;
  final DateTime? seenAt;
  final bool? edited;
  final DateTime? editedAt;
  final bool? deleted;
  final DateTime? deletedAt;
  final Map<String, dynamic>? replyTo;
  final bool? isForwarded;
  final String? originalSenderId;
  final String? originalSenderName;
  final String? forwardedBy;
  final String? messageType;

  Message({
    required this.id,
    required this.senderId,
    required this.receiverId,
    this.conversationId,
    this.participants,
    required this.text,
    required this.timestamp,
    this.seen,
    this.fileUrl,
    this.fileUrls,
    this.voiceUrl,
    this.voiceDuration,
    this.seenAt,
    this.edited,
    this.editedAt,
    this.deleted,
    this.deletedAt,
    this.replyTo,
    this.isForwarded,
    this.originalSenderId,
    this.originalSenderName,
    this.forwardedBy,
    this.messageType,
  });

  factory Message.fromMap(String id, Map<String, dynamic> map) {
    final ts = map['timestamp'];
    DateTime when;
    if (ts is Timestamp) {
      when = ts.toDate();
    } else {
      when = DateTime.now();
    }
    return Message(
      id: id,
      senderId: map['senderId'] as String,
      receiverId: map['receiverId'] as String,
      conversationId: map['conversationId'] as String?,
      participants: (map['participants'] as List<dynamic>?)?.cast<String>(),
      text: map['text'] as String? ?? '',
      timestamp: when,
      seen: map['seen'] as bool?,
      fileUrl: map['fileUrl'] as String?,
      fileUrls: map['fileUrls'] as List<dynamic>?,
      voiceUrl: map['voiceUrl'] as String?,
      voiceDuration: _safeIntFromMap(map['voiceDuration']),
      seenAt: map['seenAt'] != null ? (map['seenAt'] as Timestamp).toDate() : null,
      edited: map['edited'] as bool?,
      editedAt: map['editedAt'] != null ? (map['editedAt'] as Timestamp).toDate() : null,
      deleted: map['deleted'] as bool?,
      deletedAt: map['deletedAt'] != null ? (map['deletedAt'] as Timestamp).toDate() : null,
      replyTo: map['replyTo'] as Map<String, dynamic>?,
      isForwarded: map['isForwarded'] as bool?,
      originalSenderId: map['originalSenderId'] as String?,
      originalSenderName: map['originalSenderName'] as String?,
      forwardedBy: map['forwardedBy'] as String?,
      messageType: map['messageType'] as String?,
    );
  }

  static int? _safeIntFromMap(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is double) {
      if (value.isFinite && !value.isNaN) {
        return value.toInt();
      }
    }
    return null;
  }
}

extension on ChatRepository {
  Future<Map<String, dynamic>> _getUserSummary(String userId) async {
    final doc = await _db.collection('users').doc(userId).get();
    final data = doc.data() ?? {};
    return {
      'username': data['username'] as String? ?? data['name'] as String? ?? 'User',
      'email': data['email'] as String? ?? '',
      'avatar': data['avatar'] as String? ?? '',
    };
  }

  String _conversationPreview({
    required String text,
    String? fileUrl,
    List<String>? fileUrls,
    String? voiceUrl,
    String? messageType,
  }) {
    if (messageType == 'system') return text;
    if (text.trim().isNotEmpty) return text.trim();
    if (voiceUrl != null && voiceUrl.isNotEmpty) return 'Voice message';
    if ((fileUrls?.isNotEmpty ?? false) || (fileUrl?.isNotEmpty ?? false)) return 'Attachment';
    return '';
  }
}

class Conversation {
  final String peerId;
  final Message latest;
  final int unreadCount;
  final bool hidden;
  final bool hardHidden;

  Conversation({
    required this.peerId, 
    required this.latest, 
    required this.unreadCount,
    this.hidden = false,
    this.hardHidden = false,
  });
}


