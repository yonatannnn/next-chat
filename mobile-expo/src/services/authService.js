import { auth as firebaseAuth, firestore } from '../config/firebase';

class AuthService {
  // Firebase Authentication methods (React Native Firebase)
  async signInWithEmailAndPassword(email, password) {
    try {
      const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createUserWithEmailAndPassword(email, password, username, name = null, avatar = null) {
    try {
      const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore (same as web app)
      const userData = {
        id: user.uid,
        username,
        email,
        name: name || '',
        avatar: avatar || '',
        password: password, // Store hashed password for reference
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };
      
      await firestore.collection('users').doc(user.uid).set(userData);
      
      return { success: true, user, userData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async signOut() {
    try {
      await firebaseAuth.signOut();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getCurrentUser() {
    return firebaseAuth.currentUser;
  }

  onAuthStateChanged(callback) {
    return firebaseAuth.onAuthStateChanged(callback);
  }

  // Get user data from Firestore
  async getUserData(userId) {
    try {
      const userDoc = await firestore.collection('users').doc(userId).get();
      if (userDoc.exists) {
        return { success: true, data: userDoc.data() };
      } else {
        return { success: false, error: 'User not found' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Update user profile
  async updateUserProfile(userId, updateData) {
    try {
      await firestore.collection('users').doc(userId).update({
        ...updateData,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Search users by username or email
  async searchUsers(searchTerm) {
    try {
      const snapshot = await firestore
        .collection('users')
        .where('username', '>=', searchTerm)
        .where('username', '<=', searchTerm + '\uf8ff')
        .get();
      
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return { success: true, data: users };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Additional Firebase methods can be added here if needed
}

export default new AuthService();
