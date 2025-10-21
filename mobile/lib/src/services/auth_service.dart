import 'package:firebase_auth/firebase_auth.dart' as fb;
import 'package:cloud_firestore/cloud_firestore.dart';

class AuthService {
  final fb.FirebaseAuth _auth = fb.FirebaseAuth.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  Stream<fb.User?> get authStateChanges => _auth.authStateChanges();

  Future<fb.UserCredential> register({
    required String email,
    required String password,
    required String username,
    String? name,
    String? avatarUrl,
  }) async {
    final cred = await _auth.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );
    
    // Update Firebase Auth profile
    await cred.user?.updateDisplayName(name ?? username);
    if (avatarUrl != null) {
      await cred.user?.updatePhotoURL(avatarUrl);
    }
    
    // Create user document in Firestore (like web version)
    final userData = {
      'id': cred.user!.uid,
      'username': username,
      'email': email,
      'name': name ?? '',
      'avatar': avatarUrl ?? '',
      'usernameLower': username.toLowerCase(),
      'emailLower': email.toLowerCase(),
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    };
    
    await _db.collection('users').doc(cred.user!.uid).set(userData);
    
    return cred;
  }

  Future<fb.UserCredential> login({
    required String email,
    required String password,
  }) async {
    return _auth.signInWithEmailAndPassword(email: email, password: password);
  }

  Future<void> logout() => _auth.signOut();
}



