import 'dart:io';
import 'dart:typed_data';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

import '../services/users_repository.dart';
import '../services/file_upload_service.dart';
import '../services/chat_repository.dart';
import '../widgets/recommend_profile_modal.dart';
import 'chat_detail_screen.dart';

class ProfileScreen extends StatefulWidget {
  final String? userId; // If null, shows current user's profile (editable)
  const ProfileScreen({super.key, this.userId});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _users = UsersRepository();
  final _imagePicker = ImagePicker();
  final _formKey = GlobalKey<FormState>();
  
  UserProfile? _profile;
  bool _isLoading = true;
  bool _isSaving = false;
  bool _isUploadingAvatar = false;
  String? _errorMessage;
  String? _successMessage;
  
  // Form controllers
  final _nameController = TextEditingController();
  final _usernameController = TextEditingController();
  final _emailController = TextEditingController();
  
  String? _avatarUrl;
  String? _selectedImagePath;
  
  // Hard hidden chat access
  int _avatarClickCount = 0;
  DateTime? _lastClickTime;
  bool _showHardHiddenAccess = false;
  final _passwordController = TextEditingController();
  bool _isPasswordCorrect = false;
  
  bool get _isOwnProfile => widget.userId == null || widget.userId == FirebaseAuth.instance.currentUser?.uid;
  String get _currentUserId => FirebaseAuth.instance.currentUser?.uid ?? '';

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _usernameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _handleAvatarClick() {
    final now = DateTime.now();
    
    // Reset counter if more than 2 seconds have passed since last click
    if (_lastClickTime != null && now.difference(_lastClickTime!).inSeconds > 2) {
      _avatarClickCount = 0;
    }
    
    _avatarClickCount++;
    _lastClickTime = now;
    
    // If 5 clicks within 2 seconds, show hard hidden access
    if (_avatarClickCount >= 5) {
      setState(() {
        _showHardHiddenAccess = true;
        _avatarClickCount = 0; // Reset counter
      });
      _showHardHiddenAccessDialog();
    }
  }

  void _showHardHiddenAccessDialog() {
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.lock, color: Colors.orange, size: 20),
            const SizedBox(width: 8),
            const Expanded(
              child: Text(
                'Hard Hidden Chats Access',
                style: TextStyle(fontSize: 16),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('You have accessed the hard hidden chats section.'),
              const SizedBox(height: 8),
              const Text(
                'Hard hidden chats are completely removed from normal view and require special access to manage.',
                style: TextStyle(fontSize: 14),
              ),
              const SizedBox(height: 8),
              const Text('Enter password to access hard hidden chats:'),
              const SizedBox(height: 8),
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.lock),
                  isDense: true,
                ),
              ),
              if (_isPasswordCorrect) ...[
                const SizedBox(height: 8),
                const Text(
                  'Password correct! You can now manage hard hidden chats.',
                  style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ],
            ],
          ),
        ),
        actions: [
          Wrap(
            alignment: WrapAlignment.end,
            children: [
              TextButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  setState(() {
                    _showHardHiddenAccess = false;
                    _isPasswordCorrect = false;
                    _passwordController.clear();
                  });
                },
                child: const Text('Close'),
              ),
              TextButton(
                onPressed: () {
                  _verifyPassword(setDialogState);
                },
                child: const Text('Verify'),
              ),
              if (_isPasswordCorrect)
                TextButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                    setState(() {
                      _showHardHiddenAccess = false;
                      _isPasswordCorrect = false;
                      _passwordController.clear();
                    });
                    _navigateToHardHiddenChats();
                  },
                  child: const Text('Manage'),
                ),
            ],
          ),
        ],
        ),
      ),
    );
  }

  void _verifyPassword(StateSetter setDialogState) {
    if (_passwordController.text == 'unhide123') {
      setDialogState(() {
        _isPasswordCorrect = true;
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Incorrect password. Please try again.'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _navigateToHardHiddenChats() {
    // Navigate to a special screen for managing hard hidden chats
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => _HardHiddenChatsScreen(),
      ),
    );
  }

  Future<void> _loadProfile() async {
    try {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });

      final userId = widget.userId ?? _currentUserId;
      
      // For own profile, ensure we have the data in Firestore
      if (_isOwnProfile) {
        await _ensureOwnProfileExists();
      }
      
      final profile = await _users.getProfile(userId);
      
      setState(() {
        _profile = profile;
        _nameController.text = profile.name ?? '';
        _usernameController.text = profile.username;
        _avatarUrl = profile.avatarUrl;
        _isLoading = false;
      });

      // Load email for both own profile and friends
      if (_isOwnProfile) {
        final user = FirebaseAuth.instance.currentUser;
        if (user != null) {
          _emailController.text = user.email ?? '';
        }
      } else {
        // For friend profiles, get email from Firestore
        await _loadFriendEmail();
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load profile: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _ensureOwnProfileExists() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;

      // Check if profile exists in Firestore
      final doc = await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .get();

      if (!doc.exists) {
        // Create profile if it doesn't exist
        await FirebaseFirestore.instance
            .collection('users')
            .doc(user.uid)
            .set({
          'username': user.displayName ?? 'User',
          'name': user.displayName ?? '',
          'email': user.email ?? '',
          'avatar': user.photoURL ?? '',
          'usernameLower': (user.displayName ?? 'User').toLowerCase(),
          'emailLower': (user.email ?? '').toLowerCase(),
          'createdAt': FieldValue.serverTimestamp(),
        });
      }
    } catch (e) {
      print('Error ensuring profile exists: $e');
    }
  }

  Future<void> _loadFriendEmail() async {
    try {
      print('Loading friend email for user: ${widget.userId}');
      final userDoc = await FirebaseFirestore.instance
          .collection('users')
          .doc(widget.userId)
          .get();
      
      if (userDoc.exists) {
        final userData = userDoc.data();
        print('Friend user data: $userData');
        final email = userData?['email'] as String?;
        print('Friend email from data: $email');
        
        if (email != null && email.isNotEmpty) {
          _emailController.text = email;
          print('Set email controller to: $email');
          if (mounted) {
            setState(() {}); // Refresh UI to show email
          }
        } else {
          _emailController.text = 'Not provided';
          print('Email is null or empty, setting to Not provided');
          if (mounted) {
            setState(() {}); // Refresh UI
          }
        }
      } else {
        print('Friend user document does not exist');
        _emailController.text = 'Not provided';
        if (mounted) {
          setState(() {}); // Refresh UI
        }
      }
    } catch (e) {
      print('Error loading friend email: $e');
      _emailController.text = 'Not provided';
      if (mounted) {
        setState(() {}); // Refresh UI
      }
    }
  }

  Future<void> _pickImage() async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );
      
      if (image != null) {
        // Try to crop the image, but fallback to original if cropping fails
        final croppedFile = await _cropImage(image.path);
        if (croppedFile != null) {
          setState(() {
            _selectedImagePath = croppedFile.path;
            // Show preview immediately
            _avatarUrl = croppedFile.path;
          });
        } else {
          // Use original image if cropping fails
          setState(() {
            _selectedImagePath = image.path;
            _avatarUrl = image.path;
          });
        }
      }
    } catch (e) {
      _showErrorSnackBar('Failed to pick image: $e');
    }
  }

  Future<File?> _cropImage(String imagePath) async {
    try {
      final croppedFile = await ImageCropper().cropImage(
        sourcePath: imagePath,
        aspectRatio: const CropAspectRatio(ratioX: 1, ratioY: 1),
        uiSettings: [
          AndroidUiSettings(
            toolbarTitle: 'Crop Profile Picture',
            toolbarColor: const Color(0xFF3B82F6),
            toolbarWidgetColor: Colors.white,
            initAspectRatio: CropAspectRatioPreset.square,
            lockAspectRatio: true,
            backgroundColor: Colors.black,
            activeControlsWidgetColor: const Color(0xFF3B82F6),
            cropFrameColor: Colors.white,
            cropGridColor: Colors.white.withValues(alpha: 0.5),
          ),
          IOSUiSettings(
            title: 'Crop Profile Picture',
            aspectRatioLockEnabled: true,
            resetAspectRatioEnabled: false,
            aspectRatioPickerButtonHidden: true,
          ),
        ],
      );
      return croppedFile != null ? File(croppedFile.path) : null;
    } catch (e) {
      print('Image cropping error: $e');
      // If cropping fails, show a dialog to let user choose
      return await _showCropFallbackDialog(imagePath);
    }
  }

  Future<File?> _showCropFallbackDialog(String imagePath) async {
    return await showDialog<File?>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Image Cropping Unavailable'),
          content: const Text(
            'The image cropping feature is not available on this device. '
            'Would you like to use the original image or try again?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(null),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(File(imagePath)),
              child: const Text('Use Original'),
            ),
            TextButton(
              onPressed: () {
                Navigator.of(context).pop(null);
                _pickImage(); // Try again
              },
              child: const Text('Try Again'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _uploadAvatar() async {
    if (_selectedImagePath == null) return;

    setState(() {
      _isUploadingAvatar = true;
    });

    try {
      final file = File(_selectedImagePath!);
      final downloadUrl = await FileUploadService.uploadAvatar(file);
      
      setState(() {
        _avatarUrl = downloadUrl;
        _selectedImagePath = null;
        _isUploadingAvatar = false;
      });
      
      _showSuccessSnackBar('Avatar updated successfully!');
    } catch (e) {
      setState(() {
        _isUploadingAvatar = false;
      });
      _showErrorSnackBar('Failed to upload avatar: $e');
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_isOwnProfile) return;

    setState(() {
      _isSaving = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      // Upload avatar if changed
      if (_selectedImagePath != null) {
        await _uploadAvatar();
      }

      // Update profile in Firestore
      final updates = <String, dynamic>{};
      
      if (_nameController.text.trim() != (_profile?.name ?? '')) {
        updates['name'] = _nameController.text.trim();
      }
      
      if (_usernameController.text.trim() != _profile?.username) {
        updates['username'] = _usernameController.text.trim();
        updates['usernameLower'] = _usernameController.text.trim().toLowerCase();
      }
      
      if (_avatarUrl != _profile?.avatarUrl) {
        updates['avatar'] = _avatarUrl;
      }

      if (updates.isNotEmpty) {
        await FirebaseFirestore.instance
            .collection('users')
            .doc(_currentUserId)
            .update(updates);
        
        // Update local cache
        _users.getCachedProfile(_currentUserId);
        
        setState(() {
          _successMessage = 'Profile updated successfully!';
          _isSaving = false;
        });
        
        // Show success message and navigate back to main page
        _showSuccessSnackBar('Profile updated successfully!');
        
        // Navigate back to conversations screen after a short delay
        Future.delayed(const Duration(milliseconds: 1500), () {
          if (mounted) {
            Navigator.of(context).popUntil((route) => route.isFirst);
          }
        });
      } else {
        setState(() {
          _successMessage = 'No changes to save';
          _isSaving = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to update profile: $e';
        _isSaving = false;
      });
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }

  void _showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _showRecommendModal() {
    if (widget.userId == null) return;
    
    showDialog(
      context: context,
      builder: (context) => RecommendProfileModal(
        friendName: _profile?.username ?? 'User',
        friendId: widget.userId!,
        onSendRecommendation: (imageUrl, message) async {
          // This callback is handled inside the modal
        },
      ),
    );
  }

  String _getInitials(String? name) {
    if (name == null || name.isEmpty) return 'U';
    final parts = name.trim().split(' ').where((e) => e.isNotEmpty).toList();
    if (parts.isEmpty) return 'U';
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return (parts[0].characters.first + parts[1].characters.first).toUpperCase();
  }

  ImageProvider? _getImageProvider() {
    if (_avatarUrl != null) {
      if (_avatarUrl!.startsWith('http')) {
        // Network image
        return NetworkImage(_avatarUrl!);
      } else {
        // Local file (preview after cropping)
        return FileImage(File(_avatarUrl!));
      }
    }
    return null;
  }

  Widget _buildAvatar() {
    return Stack(
      children: [
        GestureDetector(
          onTap: _isOwnProfile ? _handleAvatarClick : null,
          child: CircleAvatar(
            radius: 60,
            backgroundColor: Colors.grey.shade300,
            backgroundImage: _getImageProvider(),
            child: _getImageProvider() == null 
                ? Text(
                    _getInitials(_profile?.name ?? _profile?.username),
                    style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
                  )
                : null,
          ),
        ),
        if (_isOwnProfile)
          Positioned(
            bottom: 0,
            right: 0,
            child: GestureDetector(
              onTap: _isUploadingAvatar ? null : _pickImage,
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: Colors.blue,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 3),
                ),
                child: _isUploadingAvatar
                    ? const Center(
                        child: SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        ),
                      )
                    : const Icon(Icons.camera_alt, color: Colors.white, size: 20),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildProfileInfo() {
    if (_isOwnProfile) {
      return Column(
        children: [
          const SizedBox(height: 20),
          _buildAvatar(),
          const SizedBox(height: 20),
          Text(
            _profile?.username ?? 'User',
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
            ),
          ),
          if (_profile?.name != null && _profile!.name!.isNotEmpty)
            Text(
              _profile!.name!,
              style: TextStyle(
                fontSize: 18,
                color: Colors.grey.shade600,
              ),
            ),
          if (_emailController.text.isNotEmpty)
            Text(
              _emailController.text,
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey.shade500,
              ),
            ),
          const SizedBox(height: 30),
        ],
      );
    } else {
      // Friend profile - match web design
      return Column(
        children: [
          const SizedBox(height: 20),
          _buildFriendProfileHeader(),
          const SizedBox(height: 20),
          _buildFriendProfileDetails(),
          const SizedBox(height: 20),
          _buildFriendStatusIndicators(),
          const SizedBox(height: 30),
          _buildFriendActionButtons(),
        ],
      );
    }
  }

  Widget _buildFriendProfileHeader() {
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF3B82F6), Color(0xFF8B5CF6)],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      padding: const EdgeInsets.all(24),
      child: Row(
        children: [
          CircleAvatar(
            radius: 40,
            backgroundColor: Colors.white.withOpacity(0.2),
            backgroundImage: _getImageProvider(),
            child: _getImageProvider() == null 
                ? Text(
                    _getInitials(_profile?.name ?? _profile?.username),
                    style: const TextStyle(
                      fontSize: 24, 
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  )
                : null,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _profile?.username ?? 'User',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                if (_profile?.name != null && _profile!.name!.isNotEmpty)
                  Text(
                    _profile!.name!,
                    style: const TextStyle(
                      fontSize: 16,
                      color: Colors.white70,
                    ),
                  ),
                if (_emailController.text.isNotEmpty)
                  Text(
                    _emailController.text,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Colors.white60,
                    ),
                  ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Colors.green,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'Online',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.white70,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFriendProfileDetails() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            spreadRadius: 1,
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildDetailRow('Username', _profile?.username ?? 'Not provided'),
          const SizedBox(height: 16),
          _buildDetailRow('Full Name', _profile?.name ?? 'Not provided'),
          const SizedBox(height: 16),
          _buildDetailRow('Email Address', _emailController.text.isNotEmpty ? _emailController.text : 'Not provided'),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: Colors.grey.shade700,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Text(
            value,
            style: const TextStyle(fontSize: 16),
          ),
        ),
      ],
    );
  }

  Widget _buildFriendStatusIndicators() {
    return Row(
      children: [
        Expanded(
          child: _buildStatusCard(
            icon: Icons.person,
            title: 'Profile ID',
            value: _profile?.id.substring(0, 8) ?? 'Unknown',
            color: Colors.blue,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatusCard(
            icon: Icons.calendar_today,
            title: 'Status',
            value: 'Online',
            color: Colors.green,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatusCard(
            icon: Icons.verified,
            title: 'Account Status',
            value: 'Verified',
            color: Colors.green,
          ),
        ),
      ],
    );
  }

  Widget _buildStatusCard({
    required IconData icon,
    required String title,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 8),
          Text(
            title,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: Colors.grey.shade700,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 11,
              color: color,
              fontWeight: FontWeight.w600,
            ),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildFriendActionButtons() {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () {
              Navigator.of(context).popUntil((route) => route.isFirst);
            },
            icon: const Icon(Icons.arrow_back, size: 18),
            label: const Text('Back to Chat'),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () {
              _showRecommendModal();
            },
            icon: const Icon(Icons.camera_alt, size: 18),
            label: const Text('Recommend Profile'),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () {
              // Navigate to chat with this user
              Navigator.of(context).popUntil((route) => route.isFirst);
              // Note: Chat navigation would be handled by the conversations screen
            },
            icon: const Icon(Icons.chat, size: 18),
            label: const Text('Start Chat'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF3B82F6),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildFormFields() {
    if (!_isOwnProfile) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            spreadRadius: 1,
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Profile Information',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.grey.shade800,
              ),
            ),
            const SizedBox(height: 20),
            
            // Name field
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Full Name',
                hintText: 'Enter your full name',
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Name is required';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            
            // Username field
            TextFormField(
              controller: _usernameController,
              decoration: const InputDecoration(
                labelText: 'Username',
                hintText: 'Enter your username',
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Username is required';
                }
                if (value.trim().length < 3) {
                  return 'Username must be at least 3 characters';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            
            // Email field (read-only)
            TextFormField(
              controller: _emailController,
              decoration: const InputDecoration(
                labelText: 'Email',
                border: OutlineInputBorder(),
                suffixIcon: Icon(Icons.lock),
              ),
              enabled: false,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons() {
    if (!_isOwnProfile) {
      return const SizedBox.shrink();
    }

    return Column(
      children: [
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _isSaving ? null : _saveProfile,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: _isSaving
                ? const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      SizedBox(width: 12),
                      Text('Saving...'),
                    ],
                  )
                : const Text('Save Changes'),
          ),
        ),
      ],
    );
  }

  Widget _buildMessages() {
    return Column(
      children: [
        if (_errorMessage != null)
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.red.shade50,
              border: Border.all(color: Colors.red.shade200),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(Icons.error, color: Colors.red.shade600),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _errorMessage!,
                    style: TextStyle(color: Colors.red.shade700),
                  ),
                ),
              ],
            ),
          ),
        if (_successMessage != null)
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              border: Border.all(color: Colors.green.shade200),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.green.shade600),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _successMessage!,
                    style: TextStyle(color: Colors.green.shade700),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isOwnProfile ? 'My Profile' : 'Profile'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: _isOwnProfile
            ? [
                if (_selectedImagePath != null)
                  IconButton(
                    onPressed: _isUploadingAvatar ? null : _uploadAvatar,
                    icon: _isUploadingAvatar
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.upload),
                    tooltip: 'Upload Avatar',
                  ),
              ]
            : null,
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _profile == null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.person_off, size: 64, color: Colors.grey.shade400),
                        const SizedBox(height: 16),
                        Text(
                          'Profile not found',
                          style: TextStyle(
                            fontSize: 18,
                            color: Colors.grey.shade600,
                          ),
                        ),
                        const SizedBox(height: 8),
                        ElevatedButton(
                          onPressed: () => Navigator.of(context).pop(),
                          child: const Text('Go Back'),
                        ),
                      ],
                    ),
                  )
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      children: [
                        _buildProfileInfo(),
                        _buildMessages(),
                        if (_isOwnProfile) ...[
                          _buildFormFields(),
                          _buildActionButtons(),
                        ],
                      ],
                    ),
                  ),
      ),
    );
  }
}

class _HardHiddenChatsScreen extends StatefulWidget {
  @override
  State<_HardHiddenChatsScreen> createState() => _HardHiddenChatsScreenState();
}

class _HardHiddenChatsScreenState extends State<_HardHiddenChatsScreen> {
  final _chat = ChatRepository();
  final _users = UsersRepository();
  List<Conversation> _hardHiddenChats = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadHardHiddenChats();
  }

  Future<void> _loadHardHiddenChats() async {
    try {
      setState(() {
        _isLoading = true;
      });

      final currentUserId = FirebaseAuth.instance.currentUser?.uid;
      if (currentUserId == null) return;

      // Get hard hidden conversations directly from the hidden_conversations collection
      final hiddenDocs = await FirebaseFirestore.instance
          .collection('hidden_conversations')
          .where('currentUserId', isEqualTo: currentUserId)
          .where('hardHidden', isEqualTo: true)
          .get();

      final hardHiddenChats = <Conversation>[];
      
      for (final doc in hiddenDocs.docs) {
        final data = doc.data();
        final peerId = data['peerId'] as String;
        
        // Get the latest message for this conversation
        final messages = await _chat.getMessages(currentUserId, peerId);
        if (messages.isNotEmpty) {
          // Sort messages by timestamp to get the latest
          messages.sort((a, b) => a.timestamp.compareTo(b.timestamp));
          final latestMessage = messages.last;
          
          // Count unread messages
          final unreadCount = messages.where((m) => m.receiverId == currentUserId && !(m.seen ?? false)).length;
          
          hardHiddenChats.add(Conversation(
            peerId: peerId,
            latest: latestMessage,
            unreadCount: unreadCount,
            hidden: false,
            hardHidden: true,
          ));
        }
      }
      
      setState(() {
        _hardHiddenChats = hardHiddenChats;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading hard hidden chats: $e')),
      );
    }
  }

  Future<void> _unhideChat(String peerId) async {
    try {
      final currentUserId = FirebaseAuth.instance.currentUser?.uid;
      if (currentUserId == null) return;

      await _chat.unhideHardHiddenConversation(currentUserId, peerId);
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Chat unhidden successfully')),
      );
      
      // Reload the list
      _loadHardHiddenChats();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error unhiding chat: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Hard Hidden Chats'),
        backgroundColor: Colors.orange.shade50,
        iconTheme: const IconThemeData(color: Colors.orange),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _hardHiddenChats.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.lock, size: 64, color: Colors.grey),
                      SizedBox(height: 16),
                      Text(
                        'No hard hidden chats',
                        style: TextStyle(fontSize: 18, color: Colors.grey),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'Hard hidden chats will appear here',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  itemCount: _hardHiddenChats.length,
                  itemBuilder: (context, index) {
                    final chat = _hardHiddenChats[index];
                    return FutureBuilder<UserProfile?>(
                      future: _users.getProfile(chat.peerId),
                      builder: (context, snapshot) {
                        final profile = snapshot.data;
                        final username = profile?.username ?? 'User';
                        
                        return Card(
                          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          child: ListTile(
                            onTap: () => _openChatDetails(chat.peerId),
                            leading: CircleAvatar(
                              backgroundColor: Colors.orange.shade100,
                              backgroundImage: profile?.avatarUrl != null 
                                  ? NetworkImage(profile!.avatarUrl!) 
                                  : null,
                              child: profile?.avatarUrl == null 
                                  ? Text(
                                      username.characters.first.toUpperCase(),
                                      style: const TextStyle(fontWeight: FontWeight.bold),
                                    )
                                  : null,
                            ),
                            title: Text(username),
                            subtitle: Text(
                              chat.latest.text,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.lock,
                                  color: Colors.orange,
                                  size: 16,
                                ),
                                const SizedBox(width: 8),
                                IconButton(
                                  onPressed: () => _showUnhideDialog(chat.peerId, username),
                                  icon: const Icon(Icons.visibility),
                                  tooltip: 'Unhide Chat',
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    );
                  },
                ),
    );
  }

  void _openChatDetails(String peerId) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => ChatDetailScreen(peerId: peerId),
      ),
    );
  }

  void _showUnhideDialog(String peerId, String username) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Unhide Chat'),
        content: Text('Are you sure you want to unhide the chat with $username?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _unhideChat(peerId);
            },
            child: const Text('Unhide'),
          ),
        ],
      ),
    );
  }
}
