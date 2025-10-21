import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../services/chat_repository.dart';
import '../services/users_repository.dart';
import '../services/file_upload_service.dart';
import '../services/global_online_status_manager.dart';
import '../services/recommendation_service.dart';
import '../services/chat_notification_manager.dart';
import '../widgets/recommendation_bubble.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';
import 'dart:io';
import 'dart:async';

class ChatDetailScreen extends StatefulWidget {
  final String peerId;
  const ChatDetailScreen({super.key, required this.peerId});

  @override
  State<ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends State<ChatDetailScreen> {
  final _chat = ChatRepository();
  final _users = UsersRepository();
  final _recommendationService = RecommendationService();
  final _textCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  final _imagePicker = ImagePicker();
  final _audioRecorder = AudioRecorder();
  
  bool _isRecording = false;
  String? _recordingPath;
  Message? _replyingTo;
  Message? _editingMessage;
  final _editController = TextEditingController();

  String? get _uid => FirebaseAuth.instance.currentUser?.uid;

  @override
  void initState() {
    super.initState();
    
    // Set current chat user to prevent notifications for this chat
    ChatNotificationManager().setCurrentChatUser(widget.peerId);
    
    // Mark messages as seen when chat is opened
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _markMessagesAsSeen();
    });
    
    // Set up periodic seen status updates
    _setupSeenStatusUpdates();
  }

  @override
  void dispose() {
    // Clear current chat user when leaving chat
    ChatNotificationManager().clearCurrentChatUser();
    super.dispose();
  }

  void _setupSeenStatusUpdates() {
    // Mark messages as seen every 2 seconds when chat is active
    Timer.periodic(const Duration(seconds: 2), (timer) {
      if (mounted) {
        _markMessagesAsSeen();
      } else {
        timer.cancel();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final uid = _uid;
    final cachedProfile = _users.getCachedProfile(widget.peerId);
    final title = cachedProfile?.username ?? 'User';
    return SafeArea(
      top: false,
      child: Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: ListenableBuilder(
          listenable: GlobalOnlineStatusManager().onlineStatusNotifier ?? ValueNotifier(null),
          builder: (context, _) {
            // Always use cached profile if available, otherwise show loading
            final profile = cachedProfile;
            final displayName = profile?.username ?? 'User';
            final isOnline = GlobalOnlineStatusManager().onlineStatusNotifier?.allStatuses[widget.peerId]?.isOnline ?? false;
            
            // If no cached profile, fetch it
            if (profile == null) {
              return FutureBuilder<UserProfile?>(
                future: _users.getProfile(widget.peerId),
                builder: (context, snap) {
                  final fetchedProfile = snap.data;
                  final finalDisplayName = fetchedProfile?.username ?? 'User';
                  return Row(
                    children: [
                      Stack(
                        children: [
                          GestureDetector(
                            onTap: () {
                              Navigator.of(context).pushNamed(
                                '/profile',
                                arguments: widget.peerId,
                              );
                            },
                            child: CircleAvatar(
                              radius: 18,
                              backgroundColor: Colors.grey.shade300,
                              backgroundImage: fetchedProfile?.avatarUrl != null ? NetworkImage(fetchedProfile!.avatarUrl!) : null,
                              child: fetchedProfile?.avatarUrl == null ? Text(finalDisplayName.characters.first.toUpperCase()) : null,
                            ),
                          ),
                          // Online status indicator
                          if (isOnline)
                            Positioned(
                              bottom: 0,
                              right: 0,
                              child: Container(
                                width: 12,
                                height: 12,
                                decoration: BoxDecoration(
                                  color: Colors.green,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white, width: 2),
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(finalDisplayName, style: const TextStyle(fontWeight: FontWeight.w600)),
                          Row(
                            children: [
                              if (isOnline)
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: const BoxDecoration(
                                    color: Colors.green,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              if (isOnline) const SizedBox(width: 4),
                              Text(
                                isOnline ? 'Online' : 'Offline',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isOnline ? Colors.green : Colors.grey.shade600,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  );
                },
              );
            }
            
            // Use cached profile
            return Row(
              children: [
                Stack(
                  children: [
                    GestureDetector(
                      onTap: () {
                        Navigator.of(context).pushNamed(
                          '/profile',
                          arguments: widget.peerId,
                        );
                      },
                      child: CircleAvatar(
                        radius: 18,
                        backgroundColor: Colors.grey.shade300,
                        backgroundImage: profile?.avatarUrl != null ? NetworkImage(profile!.avatarUrl!) : null,
                        child: profile?.avatarUrl == null ? Text(displayName.characters.first.toUpperCase()) : null,
                      ),
                    ),
                    // Online status indicator
                    if (isOnline)
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            color: Colors.green,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(displayName, style: const TextStyle(fontWeight: FontWeight.w600)),
                    Row(
                      children: [
                        if (isOnline)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: Colors.green,
                              shape: BoxShape.circle,
                            ),
                          ),
                        if (isOnline) const SizedBox(width: 4),
                        Text(
                          isOnline ? 'Online' : 'Offline',
                          style: TextStyle(
                            fontSize: 12,
                            color: isOnline ? Colors.green : Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            );
          },
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.more_vert),
            onPressed: _showOptions,
            tooltip: 'Options',
          )
        ],
      ),
      body: uid == null
          ? const Center(child: Text('Not authenticated'))
          : Column(
              children: [
                Expanded(
                  child: StreamBuilder<List<Message>>(
                    stream: _chat.subscribeToMessages(currentUserId: uid, otherUserId: widget.peerId),
                    builder: (context, snapshot) {
                      final msgs = snapshot.data ?? const <Message>[];
                      return StreamBuilder<List<ProfileRecommendation>>(
                        stream: _recommendationService.listenToAllRecommendations(uid),
                        builder: (context, recSnapshot) {
                          final allRecommendations = recSnapshot.data ?? [];
                          
                          // Filter recommendations to only show those related to the current chat
                          final chatRecommendations = allRecommendations.where((recommendation) {
                            return (recommendation.senderId == uid && recommendation.receiverId == widget.peerId) ||
                                   (recommendation.receiverId == uid && recommendation.senderId == widget.peerId);
                          }).toList();
                          
                          // Combine messages and recommendations
                          final List<dynamic> allItems = [];
                          
                          // Add messages
                          for (final msg in msgs) {
                            allItems.add({'type': 'message', 'data': msg});
                          }
                          
                          // Add recommendations
                          for (final rec in chatRecommendations) {
                            allItems.add({'type': 'recommendation', 'data': rec});
                          }
                          
                          // Sort by timestamp (oldest first for normal list)
                          allItems.sort((a, b) {
                            DateTime aTime, bTime;
                            if (a['type'] == 'message') {
                              aTime = (a['data'] as Message).timestamp;
                            } else {
                              aTime = (a['data'] as ProfileRecommendation).createdAt;
                            }
                            if (b['type'] == 'message') {
                              bTime = (b['data'] as Message).timestamp;
                            } else {
                              bTime = (b['data'] as ProfileRecommendation).createdAt;
                            }
                            return aTime.compareTo(bTime);
                          });
                          
                          return ListView.builder(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            reverse: true, // Open anchored at bottom like chat apps
                            controller: _scrollCtrl,
                            itemCount: allItems.length,
                            itemBuilder: (context, i) {
                              final item = allItems[allItems.length - 1 - i]; // render newest at bottom visually
                              
                              if (item['type'] == 'message') {
                                final m = item['data'] as Message;
                                final mine = m.senderId == uid;
                                return Align(
                                  alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                                  child: _MessageBubble(
                                    message: m, 
                                    isMine: mine,
                                    onReply: (message) => setState(() => _replyingTo = message),
                                    onEdit: (message) => setState(() {
                                      _editingMessage = message;
                                      _editController.text = message.text;
                                    }),
                                    onDelete: (message) => _handleDeleteMessage(message),
                                    onForward: (message) => _showForwardDialog(),
                                  ),
                                );
                              } else {
                                final rec = item['data'] as ProfileRecommendation;
                                final isReceiver = rec.receiverId == uid;
                                return Align(
                                  alignment: isReceiver ? Alignment.centerLeft : Alignment.centerRight,
                                child: RecommendationBubble(
                                  recommendation: rec,
                                  isReceiver: isReceiver,
                                  onStatusChanged: () => setState(() {}),
                                ),
                                );
                              }
                            },
                          );
                        },
                      );
                    },
                  ),
                ),
                
                // Reply preview
                if (_replyingTo != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: Colors.blue.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border(
                        left: BorderSide(color: Colors.blue, width: 3),
                      ),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Replying to ${_replyingTo!.senderId}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                _replyingTo!.text.length > 50 
                                  ? '${_replyingTo!.text.substring(0, 50)}...' 
                                  : _replyingTo!.text,
                                style: const TextStyle(fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: () => setState(() => _replyingTo = null),
                          icon: const Icon(Icons.close, size: 16),
                        ),
                      ],
                    ),
                  ),
                
                // Edit preview
                if (_editingMessage != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: Colors.orange.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border(
                        left: BorderSide(color: Colors.orange, width: 3),
                      ),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Editing message',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                              const SizedBox(height: 4),
                              TextField(
                                controller: _editController,
                                decoration: const InputDecoration(
                                  hintText: 'Edit message...',
                                  border: OutlineInputBorder(),
                                  contentPadding: EdgeInsets.all(8),
                                ),
                                maxLines: 3,
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: () => setState(() => _editingMessage = null),
                          icon: const Icon(Icons.close, size: 16),
                        ),
                      ],
                    ),
                  ),

                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _textCtrl,
                          minLines: 1,
                          maxLines: 4,
                          decoration: InputDecoration(
                            hintText: 'Type a message...',
                            filled: true,
                            fillColor: Colors.grey.shade100,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: Colors.grey.shade300),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: Colors.grey.shade300),
                            ),
                            focusedBorder: const OutlineInputBorder(
                              borderRadius: BorderRadius.all(Radius.circular(12)),
                              borderSide: BorderSide(color: Color(0xFF3B82F6), width: 2),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        onPressed: _pickImage,
                        icon: const Icon(Icons.image),
                        color: const Color(0xFF3B82F6),
                      ),
                      IconButton(
                        onPressed: _isRecording ? _stopRecording : _startRecording,
                        icon: Icon(_isRecording ? Icons.stop : Icons.mic),
                        color: _isRecording ? Colors.red : const Color(0xFF3B82F6),
                      ),
                      IconButton(
                        onPressed: () async {
                          if (uid == null) return;
                          
                          if (_editingMessage != null) {
                            // Handle edit
                            final txt = _editController.text.trim();
                            if (txt.isEmpty) return;
                            
                            try {
                              await _chat.editMessage(_editingMessage!.id, txt);
                              setState(() {
                                _editingMessage = null;
                                _editController.clear();
                              });
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Message edited')),
                              );
                            } catch (e) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Error editing message: $e')),
                              );
                            }
                          } else {
                            // Handle send with reply
                            final txt = _textCtrl.text.trim();
                            if (txt.isEmpty) return;
                            
                            final replyData = _replyingTo != null ? {
                              'messageId': _replyingTo!.id,
                              'text': _replyingTo!.text,
                              'senderName': _replyingTo!.senderId,
                            } : null;
                            
                            await _chat.sendMessage(
                              senderId: uid, 
                              receiverId: widget.peerId, 
                              text: txt,
                              replyTo: replyData,
                            );
                            _textCtrl.clear();
                            setState(() => _replyingTo = null);
                          }
                        },
                        icon: Icon(_editingMessage != null ? Icons.check : Icons.send),
                        color: const Color(0xFF3B82F6),
                      )
                    ],
                  ),
                )
              ],
            ),
      ),
    );
  }

  void _showOptions() {
    final profile = _users.getCachedProfile(widget.peerId);
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: CircleAvatar(
                  backgroundColor: Colors.grey.shade300,
                  backgroundImage: profile?.avatarUrl != null ? NetworkImage(profile!.avatarUrl!) : null,
                  child: profile?.avatarUrl == null ? Text((profile?.username ?? 'U').characters.first.toUpperCase()) : null,
                ),
                title: Text(profile?.username ?? 'User'),
                subtitle: profile?.name != null && profile!.name!.isNotEmpty ? Text(profile!.name!) : null,
              ),
              const Divider(height: 0),
              ListTile(
                leading: const Icon(Icons.info_outline),
                title: const Text('Chat Info'),
                onTap: () {
                  Navigator.pop(context);
                  _showChatInfo();
                },
              ),
              ListTile(
                leading: const Icon(Icons.search),
                title: const Text('Search by word'),
                onTap: () {
                  Navigator.pop(context);
                  _showSearchDialog();
                },
              ),
              ListTile(
                leading: const Icon(Icons.visibility_off),
                title: const Text('Hide Chat'),
                onTap: () {
                  Navigator.pop(context);
                  _hideChat();
                },
              ),
              ListTile(
                leading: const Icon(Icons.lock, color: Colors.orange),
                title: const Text('Hard Hide Chat', style: TextStyle(color: Colors.orange)),
                onTap: () {
                  Navigator.pop(context);
                  _showHardHideDialog();
                },
              ),
              ListTile(
                leading: const Icon(Icons.delete_forever, color: Colors.red),
                title: const Text('Delete chat', style: TextStyle(color: Colors.red)),
                onTap: () {
                  Navigator.pop(context);
                  _showDeleteChatDialog();
                },
              ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }

  void _handleDeleteMessage(Message message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Message'),
        content: const Text('Are you sure you want to delete this message?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.of(context).pop();
              try {
                await _chat.deleteMessage(message.id);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Message deleted')),
                );
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Error deleting message: $e')),
                );
              }
            },
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _showForwardDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Forward Message'),
        content: const Text('Forward functionality will be implemented with contact selection.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showSearchDialog() {
    final searchController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Search Messages'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: searchController,
              decoration: const InputDecoration(
                hintText: 'Enter search term...',
                border: OutlineInputBorder(),
              ),
              autofocus: true,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              final query = searchController.text.trim();
              if (query.isNotEmpty && _uid != null) {
                Navigator.of(context).pop();
                _showSearchResults(query);
              }
            },
            child: const Text('Search'),
          ),
        ],
      ),
    );
  }

  void _showSearchResults(String searchQuery) async {
    if (_uid == null) return;

    try {
      // Show loading
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(),
        ),
      );

      final results = await _chat.searchMessages(_uid!, widget.peerId, searchQuery);
      
      // Hide loading
      Navigator.of(context).pop();

      if (results.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No messages found')),
        );
        return;
      }

      // Show results in a new screen
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => _SearchResultsScreen(
            searchQuery: searchQuery,
            results: results,
            peerId: widget.peerId,
          ),
        ),
      );
    } catch (e) {
      // Hide loading
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error searching messages: $e')),
      );
    }
  }

  void _showDeleteChatDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Chat'),
        content: const Text('Are you sure you want to delete this entire conversation? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.of(context).pop();
              if (_uid != null) {
                try {
                  await _chat.deleteChat(_uid!, widget.peerId);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Chat deleted successfully')),
                  );
                  Navigator.of(context).pop(); // Go back to conversations list
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error deleting chat: $e')),
                  );
                }
              }
            },
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _showChatInfo() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => _ChatInfoScreen(
          peerId: widget.peerId,
          currentUserId: _uid!,
        ),
      ),
    );
  }

  void _hideChat() async {
    if (_uid != null) {
      try {
        await _chat.hideConversation(_uid!, widget.peerId);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Chat hidden successfully')),
        );
        Navigator.of(context).pop(); // Go back to conversations list
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error hiding chat: $e')),
        );
      }
    }
  }

  void _showHardHideDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.lock, color: Colors.orange),
            SizedBox(width: 8),
            Text('Hard Hide Chat'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('This will hard hide the conversation, removing it from both chat list and archived list.'),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.orange.shade200),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.warning, size: 16, color: Colors.orange),
                      SizedBox(width: 4),
                      Text('Warning:', style: TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  SizedBox(height: 4),
                  Text('• Chat will be completely removed from all lists', style: TextStyle(fontSize: 12)),
                  Text('• Password required to access and unhide', style: TextStyle(fontSize: 12)),
                  Text('• Click your profile avatar 5 times to access', style: TextStyle(fontSize: 12)),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.of(context).pop();
              if (_uid != null) {
                try {
                  await _chat.hardHideConversation(_uid!, widget.peerId);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Chat hard hidden successfully')),
                  );
                  Navigator.of(context).pop(); // Go back to conversations list
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error hard hiding chat: $e')),
                  );
                }
              }
            },
            child: const Text('Hard Hide', style: TextStyle(color: Colors.orange)),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatefulWidget {
  final Message message;
  final bool isMine;
  final Function(Message) onReply;
  final Function(Message) onEdit;
  final Function(Message) onDelete;
  final Function(Message) onForward;
  const _MessageBubble({
    required this.message, 
    required this.isMine,
    required this.onReply,
    required this.onEdit,
    required this.onDelete,
    required this.onForward,
  });

  @override
  State<_MessageBubble> createState() => _MessageBubbleState();
}

class _MessageBubbleState extends State<_MessageBubble> {
  bool _showOptions = false;
  bool _isLoadingImage = false;

  void _showImageFullScreen(BuildContext context, String imageUrl) async {
    setState(() {
      _isLoadingImage = true;
    });
    
    try {
      // Add a small delay to show loading state
      await Future.delayed(const Duration(milliseconds: 300));
      
      if (mounted) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => _FullScreenImageViewer(imageUrl: imageUrl),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingImage = false;
        });
      }
    }
  }

  String _formatTime(DateTime timestamp) {
    final now = DateTime.now();
    final diff = now.difference(timestamp);
    
    if (diff.inMinutes < 1) {
      return 'now';
    } else if (diff.inHours < 1) {
      return '${diff.inMinutes}m';
    } else if (diff.inDays < 1) {
      return '${diff.inHours}h';
    } else if (diff.inDays < 7) {
      return '${diff.inDays}d';
    } else {
      return '${timestamp.day}/${timestamp.month}';
    }
  }

  void _showMessageOptions() {
    setState(() {
      _showOptions = true;
    });
    
    // Auto-hide after 3 seconds
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) {
        setState(() {
          _showOptions = false;
        });
      }
    });
  }

  void _hideOptions() {
    setState(() {
      _showOptions = false;
    });
  }

  void _handleReply() {
    _hideOptions();
    widget.onReply(widget.message);
  }

  void _handleForward() {
    _hideOptions();
    widget.onForward(widget.message);
  }

  void _handleEdit() {
    _hideOptions();
    widget.onEdit(widget.message);
  }

  void _handleDelete() {
    _hideOptions();
    widget.onDelete(widget.message);
  }


  @override
  Widget build(BuildContext context) {
    final bg = widget.isMine ? Colors.blue.shade100 : Colors.grey.shade200;
    final radius = BorderRadius.circular(12);
    Widget content;
    if ((widget.message.fileUrl != null && widget.message.fileUrl!.isNotEmpty) || (widget.message.fileUrls != null && widget.message.fileUrls!.isNotEmpty)) {
      if (widget.message.fileUrls != null && widget.message.fileUrls!.length > 1) {
        // Multiple images - show button with count
        content = GestureDetector(
          onTap: () => _showImageFullScreen(context, widget.message.fileUrls!.first as String),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: widget.isMine ? Colors.blue.shade100 : Colors.grey.shade200,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_isLoadingImage)
                  SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        widget.isMine ? Colors.blue : Colors.grey,
                      ),
                    ),
                  )
                else
                  Icon(Icons.image, size: 16, color: widget.isMine ? Colors.blue : Colors.grey),
                const SizedBox(width: 8),
                Text(
                  _isLoadingImage ? 'Loading...' : '${widget.message.fileUrls!.length} Images',
                  style: TextStyle(
                    color: widget.isMine ? Colors.blue : Colors.grey.shade700,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        );
      } else {
        // Single image - show button
        final url = widget.message.fileUrl ?? (widget.message.fileUrls!.first as String?);
        content = GestureDetector(
          onTap: () => _showImageFullScreen(context, url!),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: widget.isMine ? Colors.blue.shade100 : Colors.grey.shade200,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_isLoadingImage)
                  SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        widget.isMine ? Colors.blue : Colors.grey,
                      ),
                    ),
                  )
                else
                  Icon(Icons.image, size: 16, color: widget.isMine ? Colors.blue : Colors.grey),
                const SizedBox(width: 8),
                Text(
                  _isLoadingImage ? 'Loading...' : 'Image',
                  style: TextStyle(
                    color: widget.isMine ? Colors.blue : Colors.grey.shade700,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        );
      }
    } else if (widget.message.voiceUrl != null && widget.message.voiceUrl!.isNotEmpty) {
      content = _VoicePlayer(url: widget.message.voiceUrl!, durationSec: widget.message.voiceDuration ?? 0);
    } else {
      if (widget.message.deleted == true) {
        content = const Text(
          'This message was deleted',
          style: TextStyle(
            fontStyle: FontStyle.italic,
            color: Colors.grey,
          ),
        );
      } else {
        content = Text(widget.message.text);
      }
    }
    return GestureDetector(
      onLongPress: _showMessageOptions,
      onTap: _hideOptions,
      child: Stack(
        children: [
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: bg, borderRadius: radius),
            child: Column(
              crossAxisAlignment: widget.isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                // Reply context
                if (widget.message.replyTo != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: widget.isMine ? Colors.blue.withOpacity(0.2) : Colors.grey.shade200,
                      borderRadius: BorderRadius.circular(8),
                      border: Border(
                        left: BorderSide(
                          color: widget.isMine ? Colors.blue : Colors.grey,
                          width: 2,
                        ),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Replying to ${widget.message.replyTo!['senderName'] ?? 'Unknown'}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          widget.message.replyTo!['text'] ?? '',
                          style: const TextStyle(fontSize: 12),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                
                // Forward context
                if (widget.message.isForwarded == true)
                  Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: widget.isMine ? Colors.purple.withOpacity(0.2) : Colors.grey.shade200,
                      borderRadius: BorderRadius.circular(8),
                      border: Border(
                        left: BorderSide(
                          color: widget.isMine ? Colors.purple : Colors.grey,
                          width: 2,
                        ),
                      ),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.forward, size: 12, color: Colors.grey),
                        const SizedBox(width: 4),
                        Text(
                          'Forwarded from ${widget.message.originalSenderName ?? 'Unknown'}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  ),
                
                content,
                
                // Edited status
                if (widget.message.edited == true)
                  const Padding(
                    padding: EdgeInsets.only(top: 4),
                    child: Text(
                      '(edited)',
                      style: TextStyle(
                        fontSize: 10,
                        color: Colors.grey,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ),
                
                if (widget.isMine) ...[
                  const SizedBox(height: 4),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _formatTime(widget.message.timestamp),
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Icon(
                        widget.message.seen == true ? Icons.done_all : Icons.done,
                        size: 16,
                        color: widget.message.seen == true ? Colors.blue : Colors.grey,
                      ),
                    ],
                  ),
                ] else ...[
                  const SizedBox(height: 4),
                  Text(
                    _formatTime(widget.message.timestamp),
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (_showOptions)
            Positioned(
              top: 0,
              right: 0,
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.8),
                  borderRadius: BorderRadius.circular(8),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildOptionButton(
                      icon: Icons.reply,
                      onTap: _handleReply,
                      color: Colors.green,
                    ),
                    const SizedBox(width: 4),
                    _buildOptionButton(
                      icon: Icons.forward,
                      onTap: _handleForward,
                      color: Colors.blue,
                    ),
                    if (widget.isMine) ...[
                      const SizedBox(width: 4),
                      _buildOptionButton(
                        icon: Icons.edit,
                        onTap: _handleEdit,
                        color: Colors.orange,
                      ),
                      const SizedBox(width: 4),
                      _buildOptionButton(
                        icon: Icons.delete,
                        onTap: _handleDelete,
                        color: Colors.red,
                      ),
                    ],
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildOptionButton({
    required IconData icon,
    required VoidCallback onTap,
    required Color color,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(4),
        ),
        child: Icon(
          icon,
          color: Colors.white,
          size: 16,
        ),
      ),
    );
  }
}

class _VoicePlayer extends StatefulWidget {
  final String url;
  final int durationSec;
  const _VoicePlayer({required this.url, required this.durationSec});

  @override
  State<_VoicePlayer> createState() => _VoicePlayerState();
}

class _VoicePlayerState extends State<_VoicePlayer> {
  final _player = AudioPlayer();
  bool _playing = false;

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          icon: Icon(_playing ? Icons.pause_circle_filled : Icons.play_circle_fill),
          onPressed: () async {
            if (_playing) {
              await _player.pause();
            } else {
              await _player.play(UrlSource(widget.url));
            }
            if (mounted) setState(() => _playing = !_playing);
          },
        ),
        Text(_format(widget.durationSec)),
      ],
    );
  }

  String _format(int seconds) {
    final m = (seconds ~/ 60).toString().padLeft(1, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }
}

// Image and voice recording methods
extension _ChatDetailScreenMethods on _ChatDetailScreenState {
  Future<void> _pickImage() async {
    try {
      final XFile? image = await _imagePicker.pickImage(source: ImageSource.gallery);
      if (image != null && _uid != null) {
        // Show loading indicator
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Uploading image...')),
        );

        // Upload image to Supabase Storage
        final imageUrl = await FileUploadService.uploadImage(File(image.path));
        
        // Send message with image
        await _chat.sendMessage(
          senderId: _uid!,
          receiverId: widget.peerId,
          text: '',
          fileUrl: imageUrl,
        );

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Image sent!')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error uploading image: $e')),
      );
    }
  }

  Future<void> _startRecording() async {
    try {
      final status = await Permission.microphone.request();
      if (status != PermissionStatus.granted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Microphone permission denied')),
        );
        return;
      }

      if (await _audioRecorder.hasPermission()) {
        // Use proper temporary directory
        final tempPath = await FileUploadService.createTemporaryAudioFile();
        await _audioRecorder.start(const RecordConfig(), path: tempPath);
        setState(() {
          _isRecording = true;
          _recordingPath = tempPath;
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error starting recording: $e')),
      );
    }
  }

  Future<void> _stopRecording() async {
    try {
      final path = await _audioRecorder.stop();
      setState(() {
        _isRecording = false;
        _recordingPath = path;
      });
      
      if (path != null && _uid != null) {
        // Show loading indicator
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Uploading voice message...')),
        );

        // Get audio duration
        final audioFile = File(path);
        final duration = await _getAudioDuration(audioFile);
        
        // Upload voice message to Supabase Storage
        final uploadResult = await FileUploadService.uploadVoiceMessage(path, duration);
        
        // Send message with voice
        await _chat.sendMessage(
          senderId: _uid!,
          receiverId: widget.peerId,
          text: '',
          voiceUrl: uploadResult['url'],
          voiceDuration: uploadResult['duration'],
        );

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Voice message sent!')),
        );

        // Clean up temporary file
        await FileUploadService.cleanupTemporaryFile(path);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error uploading voice message: $e')),
      );
    }
  }

  Future<int> _getAudioDuration(File audioFile) async {
    try {
      final player = AudioPlayer();
      await player.setSourceDeviceFile(audioFile.path);
      final duration = await player.getDuration();
      await player.dispose();
      return duration?.inSeconds ?? 0;
    } catch (e) {
      print('Error getting audio duration: $e');
      return 0;
    }
  }

  Future<void> _markMessagesAsSeen() async {
    final uid = _uid;
    if (uid == null) return;

    try {
      // Get all unseen messages from the peer
      final messages = await _chat.getMessages(uid, widget.peerId);
      final unseenMessages = messages.where((msg) => 
        msg.senderId == widget.peerId && 
        msg.receiverId == uid && 
        (msg.seen != true)
      ).toList();

      // Mark each unseen message as seen
      for (final message in unseenMessages) {
        await _chat.markMessageAsSeen(message.id);
      }
    } catch (e) {
      print('Error marking messages as seen: $e');
    }
  }

  String _formatTime(DateTime timestamp) {
    final now = DateTime.now();
    final diff = now.difference(timestamp);
    
    if (diff.inMinutes < 1) {
      return 'now';
    } else if (diff.inHours < 1) {
      return '${diff.inMinutes}m';
    } else if (diff.inDays < 1) {
      return '${diff.inHours}h';
    } else if (diff.inDays < 7) {
      return '${diff.inDays}d';
    } else {
      return '${timestamp.day}/${timestamp.month}';
    }
  }

}

class _ImageGrid extends StatelessWidget {
  final List<String> urls;
  const _ImageGrid({required this.urls});

  void _showImageFullScreen(BuildContext context, String imageUrl) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => _FullScreenImageViewer(imageUrl: imageUrl),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (urls.length == 2) {
      return Row(
        children: urls.map((url) => Expanded(
          child: GestureDetector(
            onTap: () => _showImageFullScreen(context, url),
            child: Container(
              height: 120,
              margin: const EdgeInsets.all(2),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(url, fit: BoxFit.cover),
              ),
            ),
          ),
        )).toList(),
      );
    } else if (urls.length == 3) {
      return Column(
        children: [
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => _showImageFullScreen(context, urls[0]),
                  child: Container(
                    height: 120,
                    margin: const EdgeInsets.all(2),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(urls[0], fit: BoxFit.cover),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: GestureDetector(
                  onTap: () => _showImageFullScreen(context, urls[1]),
                  child: Container(
                    height: 120,
                    margin: const EdgeInsets.all(2),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(urls[1], fit: BoxFit.cover),
                    ),
                  ),
                ),
              ),
            ],
          ),
          GestureDetector(
            onTap: () => _showImageFullScreen(context, urls[2]),
            child: Container(
              height: 120,
              margin: const EdgeInsets.all(2),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(urls[2], fit: BoxFit.cover),
              ),
            ),
          ),
        ],
      );
    } else {
      // 4+ images - show 2x2 grid with "+X more" for additional
      return Column(
        children: [
          Row(
            children: [
              Expanded(child: _buildImageTile(context, urls[0])),
              Expanded(child: _buildImageTile(context, urls[1])),
            ],
          ),
          Row(
            children: [
              Expanded(child: _buildImageTile(context, urls[2])),
              Expanded(
                child: Stack(
                  children: [
                    _buildImageTile(context, urls[3]),
                    if (urls.length > 4)
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Center(
                          child: Text(
                            '+${urls.length - 4}',
                            style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ],
      );
    }
  }

  Widget _buildImageTile(BuildContext context, String url) {
    return GestureDetector(
      onTap: () => _showImageFullScreen(context, url),
      child: Container(
        height: 120,
        margin: const EdgeInsets.all(2),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Image.network(url, fit: BoxFit.cover),
        ),
      ),
    );
  }
}

class _FullScreenImageViewer extends StatelessWidget {
  final String imageUrl;
  const _FullScreenImageViewer({required this.imageUrl});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Center(
        child: InteractiveViewer(
          child: Image.network(imageUrl, fit: BoxFit.contain),
        ),
      ),
    );
  }
}

class _SearchResultsScreen extends StatelessWidget {
  final String searchQuery;
  final List<Message> results;
  final String peerId;

  const _SearchResultsScreen({
    required this.searchQuery,
    required this.results,
    required this.peerId,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Search: "$searchQuery"'),
            Text(
              '${results.length} result${results.length == 1 ? '' : 's'}',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.normal),
            ),
          ],
        ),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: results.length,
        itemBuilder: (context, index) {
          final message = results[index];
          final isMine = message.senderId == FirebaseAuth.instance.currentUser?.uid;
          
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isMine ? Colors.blue.shade100 : Colors.grey.shade200,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: Colors.yellow.shade400,
                width: 2,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      isMine ? Icons.person : Icons.person_outline,
                      size: 16,
                      color: Colors.grey.shade600,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      isMine ? 'You' : 'Other',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.grey.shade700,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      _formatTime(message.timestamp),
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  message.text,
                  style: const TextStyle(fontSize: 16),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  String _formatTime(DateTime timestamp) {
    final now = DateTime.now();
    final diff = now.difference(timestamp);
    
    if (diff.inMinutes < 1) {
      return 'now';
    } else if (diff.inHours < 1) {
      return '${diff.inMinutes}m ago';
    } else if (diff.inDays < 1) {
      return '${diff.inHours}h ago';
    } else if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    } else {
      return '${timestamp.day}/${timestamp.month}/${timestamp.year}';
    }
  }
}

class _ChatInfoScreen extends StatefulWidget {
  final String peerId;
  final String currentUserId;

  const _ChatInfoScreen({
    required this.peerId,
    required this.currentUserId,
  });

  @override
  State<_ChatInfoScreen> createState() => _ChatInfoScreenState();
}

class _ChatInfoScreenState extends State<_ChatInfoScreen> {
  final _chat = ChatRepository();
  final _users = UsersRepository();
  List<Message> _messages = [];
  UserProfile? _peerProfile;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      // Load messages
      final messages = await _chat.getMessages(widget.currentUserId, widget.peerId);
      
      // Load peer profile
      final profile = await _users.getProfile(widget.peerId);
      
      setState(() {
        _messages = messages.where((m) => m.deleted != true).toList();
        _peerProfile = profile;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading chat info: $e')),
        );
      }
    }
  }

  Map<String, dynamic> _calculateAnalytics() {
    final myMessages = _messages.where((m) => m.senderId == widget.currentUserId).toList();
    final theirMessages = _messages.where((m) => m.senderId == widget.peerId).toList();
    
    // Message counts
    final myMessageCount = myMessages.length;
    final theirMessageCount = theirMessages.length;
    final totalMessages = _messages.length;
    
    // Word and letter counts
    final myWords = myMessages.fold(0, (acc, msg) => acc + msg.text.split(' ').length);
    final theirWords = theirMessages.fold(0, (acc, msg) => acc + msg.text.split(' ').length);
    final myLetters = myMessages.fold(0, (acc, msg) => acc + msg.text.length);
    final theirLetters = theirMessages.fold(0, (acc, msg) => acc + msg.text.length);
    
    // Averages
    final myAvgWords = myMessageCount > 0 ? (myWords / myMessageCount).round() : 0;
    final theirAvgWords = theirMessageCount > 0 ? (theirWords / theirMessageCount).round() : 0;
    final myAvgLetters = myMessageCount > 0 ? (myLetters / myMessageCount).round() : 0;
    final theirAvgLetters = theirMessageCount > 0 ? (theirLetters / theirMessageCount).round() : 0;
    
    // Conversation streak (days with at least one message)
    final messageDates = _messages.map((msg) => msg.timestamp.toLocal().toIso8601String().split('T')[0]).toSet();
    final streak = messageDates.length;
    
    // Most active day
    final dayCounts = <String, int>{};
    for (final msg in _messages) {
      final day = msg.timestamp.toLocal().weekday;
      final dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][day - 1];
      dayCounts[dayName] = (dayCounts[dayName] ?? 0) + 1;
    }
    final mostActiveDay = dayCounts.entries.isNotEmpty 
        ? dayCounts.entries.reduce((a, b) => a.value > b.value ? a : b)
        : const MapEntry('Monday', 0);
    
    // Longest message
    final longestMessage = _messages.isNotEmpty 
        ? _messages.reduce((a, b) => a.text.length > b.text.length ? a : b).text
        : '';
    
    // Conversation starter
    final sortedMessages = List<Message>.from(_messages)..sort((a, b) => a.timestamp.compareTo(b.timestamp));
    final firstMessage = sortedMessages.isNotEmpty ? sortedMessages.first : null;
    final conversationStarter = firstMessage?.senderId == widget.currentUserId ? 'You' : (_peerProfile?.username ?? 'Other');
    
    // Response time analysis
    final responseTimes = <int>[];
    for (int i = 1; i < sortedMessages.length; i++) {
      final prevMsg = sortedMessages[i - 1];
      final currMsg = sortedMessages[i];
      if (prevMsg.senderId != currMsg.senderId) {
        final timeDiff = currMsg.timestamp.difference(prevMsg.timestamp).inMinutes;
        responseTimes.add(timeDiff);
      }
    }
    final avgResponseTime = responseTimes.isNotEmpty 
        ? (responseTimes.reduce((a, b) => a + b) / responseTimes.length).round()
        : 0;
    
    // Emoji usage
    final emojiRegex = RegExp(r'[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]', unicode: true);
    final myEmojis = myMessages.fold(0, (acc, msg) => acc + (emojiRegex.allMatches(msg.text).length));
    final theirEmojis = theirMessages.fold(0, (acc, msg) => acc + (emojiRegex.allMatches(msg.text).length));
    
    // Message patterns
    final myQuestions = myMessages.where((msg) => msg.text.contains('?')).length;
    final theirQuestions = theirMessages.where((msg) => msg.text.contains('?')).length;
    final myExclamations = myMessages.where((msg) => msg.text.contains('!')).length;
    final theirExclamations = theirMessages.where((msg) => msg.text.contains('!')).length;
    
    // Message length distribution
    final shortMessages = _messages.where((msg) => msg.text.length < 20).length;
    final mediumMessages = _messages.where((msg) => msg.text.length >= 20 && msg.text.length < 100).length;
    final longMessages = _messages.where((msg) => msg.text.length >= 100).length;
    
    // Achievements
    final achievements = <Map<String, dynamic>>[];
    if (totalMessages >= 100) achievements.add({'icon': Icons.emoji_events, 'text': 'Century Club', 'color': Colors.amber});
    if (streak >= 7) achievements.add({'icon': Icons.local_fire_department, 'text': 'Week Warrior', 'color': Colors.orange});
    if (myAvgWords >= 20) achievements.add({'icon': Icons.psychology, 'text': 'Word Wizard', 'color': Colors.purple});
    if (myEmojis >= 10) achievements.add({'icon': Icons.sentiment_very_satisfied, 'text': 'Emoji Master', 'color': Colors.pink});
    if (avgResponseTime < 5) achievements.add({'icon': Icons.flash_on, 'text': 'Speed Demon', 'color': Colors.blue});
    
    // Conversation health score
    final healthScore = (100 * (totalMessages / 10).clamp(0.0, 1.0) * 0.2 +
                        100 * (streak / 7).clamp(0.0, 1.0) * 0.2 +
                        100 * (avgResponseTime / 60).clamp(0.0, 1.0) * 0.2 +
                        100 * ((myEmojis + theirEmojis) / 5).clamp(0.0, 1.0) * 0.2 +
                        100 * ((myQuestions + theirQuestions) / 5).clamp(0.0, 1.0) * 0.2).round();
    
    return {
      'myMessageCount': myMessageCount,
      'theirMessageCount': theirMessageCount,
      'totalMessages': totalMessages,
      'myAvgWords': myAvgWords,
      'theirAvgWords': theirAvgWords,
      'myAvgLetters': myAvgLetters,
      'theirAvgLetters': theirAvgLetters,
      'streak': streak,
      'mostActiveDay': mostActiveDay,
      'longestMessage': longestMessage,
      'conversationStarter': conversationStarter,
      'avgResponseTime': avgResponseTime,
      'myEmojis': myEmojis,
      'theirEmojis': theirEmojis,
      'myQuestions': myQuestions,
      'theirQuestions': theirQuestions,
      'myExclamations': myExclamations,
      'theirExclamations': theirExclamations,
      'shortMessages': shortMessages,
      'mediumMessages': mediumMessages,
      'longMessages': longMessages,
      'achievements': achievements,
      'healthScore': healthScore,
    };
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Chat Info'),
        ),
        body: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    final analytics = _calculateAnalytics();
    final peerName = _peerProfile?.username ?? 'User';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chat Info'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // User Info
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: Colors.grey.shade300,
                    backgroundImage: _peerProfile?.avatarUrl != null 
                        ? NetworkImage(_peerProfile!.avatarUrl!) 
                        : null,
                    child: _peerProfile?.avatarUrl == null 
                        ? Text(peerName.characters.first.toUpperCase(), style: const TextStyle(fontSize: 24))
                        : null,
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          peerName,
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          _peerProfile?.name ?? '',
                          style: TextStyle(color: Colors.grey.shade600),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(Icons.favorite, color: Colors.red, size: 16),
                            const SizedBox(width: 4),
                            Text(
                              'Health Score: ${analytics['healthScore']}/100',
                              style: const TextStyle(fontWeight: FontWeight.w500),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Achievements
            if ((analytics['achievements'] as List).isNotEmpty) ...[
              const Text('🏆 Achievements', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: (analytics['achievements'] as List).map<Widget>((achievement) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade50,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.amber.shade200),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(achievement['icon'], size: 16, color: achievement['color']),
                        const SizedBox(width: 4),
                        Text(
                          achievement['text'],
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),
            ],

            // Basic Stats
            const Text('📊 Statistics', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildStatCard(
                    'Total Messages',
                    '${analytics['totalMessages']}',
                    Icons.message,
                    Colors.blue,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatCard(
                    'Conversation Streak',
                    '${analytics['streak']} days',
                    Icons.flash_on,
                    Colors.green,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Message Distribution
            const Text('💬 Message Distribution', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  _buildDistributionRow('You', analytics['myMessageCount'], Colors.blue),
                  const SizedBox(height: 8),
                  _buildDistributionRow(peerName, analytics['theirMessageCount'], Colors.purple),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Writing Style
            const Text('✍️ Writing Style', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildStyleCard(
                    'Your Average',
                    '${analytics['myAvgWords']} words/message',
                    '${analytics['myAvgLetters']} letters/message',
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStyleCard(
                    '$peerName\'s Average',
                    '${analytics['theirAvgWords']} words/message',
                    '${analytics['theirAvgLetters']} letters/message',
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Communication Patterns
            const Text('🗣️ Communication Patterns', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.purple.shade50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  _buildPatternRow('Emoji Usage', 'You: ${analytics['myEmojis']}', '$peerName: ${analytics['theirEmojis']}'),
                  const SizedBox(height: 12),
                  _buildPatternRow('Questions Asked', 'You: ${analytics['myQuestions']}', '$peerName: ${analytics['theirQuestions']}'),
                  const SizedBox(height: 12),
                  _buildPatternRow('Excitement Level', 'You: ${analytics['myExclamations']} !', '$peerName: ${analytics['theirExclamations']} !'),
                  const SizedBox(height: 12),
                  _buildPatternRow('Response Time', 'Average: ${analytics['avgResponseTime']} min', ''),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Fun Facts
            const Text('🎯 Fun Facts', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  _buildFactRow(Icons.emoji_events, 'Conversation Starter', analytics['conversationStarter']),
                  const SizedBox(height: 8),
                  _buildFactRow(Icons.schedule, 'Most Active Day', '${analytics['mostActiveDay'].key} (${analytics['mostActiveDay'].value} messages)'),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Message Length Distribution
            const Text('📏 Message Lengths', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildLengthCard('Short (<20)', '${analytics['shortMessages']}', Colors.green),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildLengthCard('Medium (20-99)', '${analytics['mediumMessages']}', Colors.orange),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildLengthCard('Long (100+)', '${analytics['longMessages']}', Colors.red),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 4),
          Text(title, style: TextStyle(fontSize: 12, color: color.withOpacity(0.7))),
        ],
      ),
    );
  }

  Widget _buildDistributionRow(String label, int count, Color color) {
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 8),
        Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
        const Spacer(),
        Text('$count messages', style: const TextStyle(fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildStyleCard(String title, String words, String letters) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 12, color: Colors.grey)),
          const SizedBox(height: 4),
          Text(words, style: const TextStyle(fontWeight: FontWeight.bold)),
          Text(letters, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        ],
      ),
    );
  }

  Widget _buildPatternRow(String title, String value1, String value2) {
    return Row(
      children: [
        Expanded(
          child: Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
        ),
        if (value1.isNotEmpty) Text(value1, style: const TextStyle(fontWeight: FontWeight.bold)),
        if (value2.isNotEmpty) ...[
          const SizedBox(width: 16),
          Text(value2, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ],
    );
  }

  Widget _buildFactRow(IconData icon, String title, String value) {
    return Row(
      children: [
        Icon(icon, size: 16, color: Colors.orange),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
              Text(value, style: const TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLengthCard(String title, String count, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Text(count, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
          Text(title, style: TextStyle(fontSize: 10, color: color.withOpacity(0.7))),
        ],
      ),
    );
  }
}


