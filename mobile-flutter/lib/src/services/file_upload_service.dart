import 'dart:io';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;

class FileUploadService {
  static final SupabaseClient _supabase = Supabase.instance.client;

  /// Upload image files to Supabase Storage (following web app logic)
  static Future<String> uploadImage(File imageFile) async {
    try {
      final fileExt = path.extension(imageFile.path).split('.').last;
      final fileName = '${DateTime.now().millisecondsSinceEpoch}.$fileExt';
      final filePath = 'chat-files/$fileName';

      // Read file bytes
      final fileBytes = await imageFile.readAsBytes();

      // Upload to Supabase Storage
      final response = await _supabase.storage
          .from('chat-files')
          .uploadBinary(filePath, fileBytes);

      if (response.isNotEmpty) {
        // Get public URL
        final publicUrl = _supabase.storage
            .from('chat-files')
            .getPublicUrl(filePath);

        return publicUrl;
      } else {
        throw Exception('Failed to upload image to Supabase');
      }
    } catch (e) {
      print('Error uploading image: $e');
      rethrow;
    }
  }

  /// Upload multiple images to Supabase Storage
  static Future<List<String>> uploadMultipleImages(List<File> imageFiles) async {
    try {
      final uploadPromises = imageFiles.map((file) => uploadImage(file));
      return await Future.wait(uploadPromises);
    } catch (e) {
      print('Error uploading multiple images: $e');
      rethrow;
    }
  }

  /// Upload voice message to Supabase Storage
  static Future<Map<String, dynamic>> uploadVoiceMessage(String audioPath, int duration) async {
    try {
      final fileExt = audioPath.split('.').last;
      final fileName = 'voice-messages/${DateTime.now().millisecondsSinceEpoch}.$fileExt';
      
      final response = await _supabase.storage
          .from('voice-messages')
          .upload(fileName, File(audioPath),
              fileOptions: const FileOptions(cacheControl: '3600', upsert: false));

      if (response.isEmpty) {
        throw Exception('Supabase voice upload failed: No response data');
      }

      final publicUrl = _supabase.storage.from('voice-messages').getPublicUrl(fileName);
      
      return {
        'url': publicUrl,
        'duration': duration,
      };
    } catch (e) {
      print('Error uploading voice message to Supabase: $e');
      rethrow;
    }
  }

  /// Upload avatar image to Supabase Storage
  static Future<String> uploadAvatar(File imageFile) async {
    try {
      final fileExt = path.extension(imageFile.path).split('.').last;
      final fileName = '${DateTime.now().millisecondsSinceEpoch}.$fileExt';
      final filePath = 'avatars/$fileName';

      // Read file bytes
      final fileBytes = await imageFile.readAsBytes();

      // Upload to Supabase Storage
      final response = await _supabase.storage
          .from('avatars')
          .uploadBinary(filePath, fileBytes);

      if (response.isNotEmpty) {
        // Get public URL
        final publicUrl = _supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        return publicUrl;
      } else {
        throw Exception('Failed to upload avatar to Supabase');
      }
    } catch (e) {
      print('Error uploading avatar: $e');
      rethrow;
    }
  }

  /// Get temporary directory for file operations
  static Future<String> getTemporaryDirectoryPath() async {
    final tempDir = await getTemporaryDirectory();
    return tempDir.path;
  }

  /// Create temporary file for voice recording
  static Future<String> createTemporaryAudioFile() async {
    final tempDir = await getTemporaryDirectory();
    final fileName = 'voice_${DateTime.now().millisecondsSinceEpoch}.m4a';
    return path.join(tempDir.path, fileName);
  }

  /// Clean up temporary files
  static Future<void> cleanupTemporaryFile(String filePath) async {
    try {
      final file = File(filePath);
      if (await file.exists()) {
        await file.delete();
      }
    } catch (e) {
      print('Error cleaning up temporary file: $e');
    }
  }
}
