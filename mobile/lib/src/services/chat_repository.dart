import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';

class ChatRepository {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  Stream<List<Message>> subscribeToMessages({
    required String currentUserId,
    required String otherUserId,
  }) {
    final messagesRef = _db.collection('messages');

    final q = messagesRef
        .where('senderId', whereIn: [currentUserId, otherUserId])
        .where('receiverId', whereIn: [currentUserId, otherUserId])
        .orderBy('timestamp', descending: false);

    return q.snapshots().map((snapshot) {
      return snapshot.docs.map((doc) => Message.fromMap(doc.id, doc.data())).toList();
    });
  }

  /// Aggregate latest message per peer (like web conversation list)
  Stream<List<Conversation>> subscribeToConversations({required String currentUserId}) {
    final messagesRef = _db.collection('messages');
    final sentStream = messagesRef.where('senderId', isEqualTo: currentUserId).snapshots();
    final receivedStream = messagesRef.where('receiverId', isEqualTo: currentUserId).snapshots();
    final hiddenStream = _db.collection('hidden_conversations').where('currentUserId', isEqualTo: currentUserId).snapshots();

    final controller = StreamController<List<Conversation>>.broadcast();
    List<QueryDocumentSnapshot<Map<String, dynamic>>> sentDocs = [];
    List<QueryDocumentSnapshot<Map<String, dynamic>>> receivedDocs = [];
    Map<String, Map<String, dynamic>> hiddenStates = {};

    void emitCombined() async {
      final allDocs = <QueryDocumentSnapshot<Map<String, dynamic>>>[]
        ..addAll(sentDocs)
        ..addAll(receivedDocs);
      final byPeer = <String, List<Message>>{};
      for (final d in allDocs) {
        final m = Message.fromMap(d.id, d.data());
        // Only include non-deleted messages
        if (m.deleted != true) {
          final peerId = m.senderId == currentUserId ? m.receiverId : m.senderId;
          byPeer.putIfAbsent(peerId, () => <Message>[]).add(m);
        }
      }
      final items = <Conversation>[];
      byPeer.forEach((peerId, msgs) {
        msgs.sort((a, b) => a.timestamp.compareTo(b.timestamp));
        final latest = msgs.isNotEmpty ? msgs.last : null;
        final unread = msgs.where((m) => m.receiverId == currentUserId && !(m.seen ?? false)).length;
        if (latest != null) {
          final hiddenState = hiddenStates[peerId];
          final hidden = hiddenState?['hidden'] as bool? ?? false;
          final hardHidden = hiddenState?['hardHidden'] as bool? ?? false;
          
          items.add(Conversation(
            peerId: peerId, 
            latest: latest, 
            unreadCount: unread,
            hidden: hidden,
            hardHidden: hardHidden,
          ));
        }
      });
      items.sort((a, b) => b.latest.timestamp.compareTo(a.latest.timestamp));
      controller.add(items);
    }

    late final StreamSubscription sentSub;
    late final StreamSubscription receivedSub;
    late final StreamSubscription hiddenSub;
    
    sentSub = sentStream.listen((qs) {
      sentDocs = qs.docs;
      emitCombined();
    });
    receivedSub = receivedStream.listen((qs) {
      receivedDocs = qs.docs;
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
      await sentSub.cancel();
      await receivedSub.cancel();
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
  }) async {
    final messagesRef = _db.collection('messages');
    await messagesRef.add({
      'senderId': senderId,
      'receiverId': receiverId,
      'text': text,
      'fileUrl': fileUrl,
      'fileUrls': fileUrls,
      'voiceUrl': voiceUrl,
      'voiceDuration': voiceDuration,
      'replyTo': replyTo,
      'timestamp': FieldValue.serverTimestamp(),
      'seen': false,
    });
  }

  Future<void> markMessageAsSeen(String messageId) async {
    try {
      final messageRef = _db.collection('messages').doc(messageId);
      await messageRef.update({
        'seen': true,
        'seenAt': FieldValue.serverTimestamp(),
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
          'text': message.text,
          'fileUrl': message.fileUrl,
          'fileUrls': message.fileUrls,
          'voiceUrl': message.voiceUrl,
          'voiceDuration': message.voiceDuration,
          'timestamp': FieldValue.serverTimestamp(),
          'isForwarded': true,
          'originalMessageId': message.id,
          'originalSenderId': message.senderId,
          'originalSenderName': originalSenderName,
          'forwardedBy': senderId,
        };
        
        return _db.collection('messages').add(forwardedMessageData);
      });

      await Future.wait(forwardPromises);
    } catch (e) {
      print('Error forwarding message: $e');
      rethrow;
    }
  }

  Future<List<Message>> getMessages(String userId1, String userId2) async {
    try {
      final query = await _db
          .collection('messages')
          .where('senderId', whereIn: [userId1, userId2])
          .where('receiverId', whereIn: [userId1, userId2])
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

  Message({
    required this.id,
    required this.senderId,
    required this.receiverId,
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



