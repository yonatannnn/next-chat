import 'package:flutter/material.dart';
import '../services/recommendation_service.dart';
import '../services/users_repository.dart';

class RecommendationBubble extends StatefulWidget {
  final ProfileRecommendation recommendation;
  final bool isReceiver;
  final VoidCallback onStatusChanged;

  const RecommendationBubble({
    super.key,
    required this.recommendation,
    required this.isReceiver,
    required this.onStatusChanged,
  });

  @override
  State<RecommendationBubble> createState() => _RecommendationBubbleState();
}

class _RecommendationBubbleState extends State<RecommendationBubble> {
  final _recommendationService = RecommendationService();
  final _usersRepository = UsersRepository();
  bool _isProcessing = false;

  @override
  Widget build(BuildContext context) {
    final bg = widget.isReceiver ? Colors.grey.shade200 : Colors.blue.shade100;
    final radius = BorderRadius.circular(12);
    
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: bg, borderRadius: radius),
      child: Column(
        crossAxisAlignment: widget.isReceiver ? CrossAxisAlignment.start : CrossAxisAlignment.end,
        children: [
          // Sender info and status
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.person,
                color: Colors.grey.shade600,
                size: 14,
              ),
              const SizedBox(width: 4),
              Text(
                widget.isReceiver ? 'From: ${_getSenderName()}' : 'To: ${_getReceiverName()}',
                style: TextStyle(
                  fontWeight: FontWeight.w500,
                  color: Colors.grey.shade700,
                  fontSize: 11,
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                _getStatusIcon(),
                color: _getStatusColor(),
                size: 14,
              ),
              const SizedBox(width: 4),
              Text(
                _getStatusText(),
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: _getStatusColor(),
                  fontSize: 11,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          
          // Image preview
          Container(
            width: 200,
            height: 120,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(
                widget.recommendation.imageUrl,
                fit: BoxFit.cover,
                loadingBuilder: (context, child, loadingProgress) {
                  if (loadingProgress == null) return child;
                  return Center(
                    child: CircularProgressIndicator(
                      value: loadingProgress.expectedTotalBytes != null
                          ? loadingProgress.cumulativeBytesLoaded /
                              loadingProgress.expectedTotalBytes!
                          : null,
                    ),
                  );
                },
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    color: Colors.grey.shade200,
                    child: const Center(
                      child: Icon(
                        Icons.broken_image,
                        color: Colors.grey,
                        size: 32,
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          
          // Message if present
          if (widget.recommendation.message.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              widget.recommendation.message,
              style: const TextStyle(fontSize: 12),
            ),
          ],
          
          const SizedBox(height: 8),
          
          // Action buttons or status
          if (widget.recommendation.status == 'pending')
            _buildActionButtons()
          else
            _buildStatusMessage(),
          
          const SizedBox(height: 4),
          
          // Timestamp
          Text(
            _formatTime(widget.recommendation.createdAt),
            style: TextStyle(
              fontSize: 10,
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }

  String _getSenderName() {
    final senderProfile = _usersRepository.getCachedProfile(widget.recommendation.senderId);
    return senderProfile?.username ?? 'Unknown';
  }

  String _getReceiverName() {
    final receiverProfile = _usersRepository.getCachedProfile(widget.recommendation.receiverId);
    return receiverProfile?.username ?? 'Unknown';
  }

  Widget _buildActionButtons() {
    if (widget.isReceiver) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          OutlinedButton.icon(
            onPressed: _isProcessing ? null : _rejectRecommendation,
            icon: _isProcessing
                ? const SizedBox(
                    width: 12,
                    height: 12,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.close, size: 14),
            label: const Text('Reject', style: TextStyle(fontSize: 10)),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.red,
              side: const BorderSide(color: Colors.red),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton.icon(
            onPressed: _isProcessing ? null : _acceptRecommendation,
            icon: _isProcessing
                ? const SizedBox(
                    width: 12,
                    height: 12,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : const Icon(Icons.check, size: 14),
            label: const Text('Accept', style: TextStyle(fontSize: 10)),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            ),
          ),
        ],
      );
    } else {
      return OutlinedButton.icon(
        onPressed: _isProcessing ? null : _deleteRecommendation,
        icon: _isProcessing
            ? const SizedBox(
                width: 12,
                height: 12,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Icon(Icons.delete, size: 14),
        label: const Text('Delete', style: TextStyle(fontSize: 10)),
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.red,
          side: const BorderSide(color: Colors.red),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        ),
      );
    }
  }

  Widget _buildStatusMessage() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          _getStatusIcon(),
          color: _getStatusColor(),
          size: 14,
        ),
        const SizedBox(width: 4),
        Text(
          _getStatusText(),
          style: TextStyle(
            color: _getStatusColor(),
            fontWeight: FontWeight.w500,
            fontSize: 10,
          ),
        ),
      ],
    );
  }

  Color _getStatusColor() {
    switch (widget.recommendation.status) {
      case 'pending':
        return Colors.orange;
      case 'accepted':
        return Colors.green;
      case 'rejected':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  IconData _getStatusIcon() {
    switch (widget.recommendation.status) {
      case 'pending':
        return Icons.schedule;
      case 'accepted':
        return Icons.check_circle;
      case 'rejected':
        return Icons.cancel;
      default:
        return Icons.help;
    }
  }

  String _getStatusText() {
    switch (widget.recommendation.status) {
      case 'pending':
        return 'Profile Picture Recommendation';
      case 'accepted':
        return 'Recommendation Accepted';
      case 'rejected':
        return 'Recommendation Rejected';
      default:
        return 'Unknown Status';
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

  Future<void> _acceptRecommendation() async {
    setState(() {
      _isProcessing = true;
    });

    try {
      await _recommendationService.acceptRecommendation(widget.recommendation.id);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile picture updated successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        
        widget.onStatusChanged();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error accepting recommendation: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }

  Future<void> _rejectRecommendation() async {
    setState(() {
      _isProcessing = true;
    });

    try {
      await _recommendationService.rejectRecommendation(widget.recommendation.id);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Recommendation rejected'),
            backgroundColor: Colors.orange,
          ),
        );
        
        widget.onStatusChanged();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error rejecting recommendation: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }

  Future<void> _deleteRecommendation() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Recommendation'),
        content: const Text('Are you sure you want to delete this recommendation?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() {
      _isProcessing = true;
    });

    try {
      await _recommendationService.deleteRecommendation(widget.recommendation.id);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Recommendation deleted'),
            backgroundColor: Colors.green,
          ),
        );
        
        widget.onStatusChanged();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error deleting recommendation: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }
}
