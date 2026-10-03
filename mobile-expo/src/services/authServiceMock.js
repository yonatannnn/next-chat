// Mock auth service for testing without Firebase
class AuthServiceMock {
  constructor() {
    this.currentUser = null;
    this.isLoading = false;
  }

  async signInWithEmailAndPassword(email, password) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock successful login
    if (email && password) {
      this.currentUser = {
        uid: 'mock-user-id',
        email: email,
        displayName: 'Test User'
      };
      return { success: true, user: this.currentUser };
    } else {
      return { success: false, error: 'Invalid credentials' };
    }
  }

  async createUserWithEmailAndPassword(email, password, username, name = null, avatar = null) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock successful registration
    if (email && password && username) {
      this.currentUser = {
        uid: 'mock-user-id',
        email: email,
        displayName: name || username
      };
      return { success: true, user: this.currentUser };
    } else {
      return { success: false, error: 'Registration failed' };
    }
  }

  async signOut() {
    this.currentUser = null;
    return { success: true };
  }

  getCurrentUser() {
    return this.currentUser;
  }

  onAuthStateChanged(callback) {
    // Mock auth state change
    callback(this.currentUser);
    return () => {}; // Unsubscribe function
  }

  async getUserData(userId) {
    return {
      success: true,
      data: {
        id: userId,
        username: 'testuser',
        email: this.currentUser?.email,
        name: 'Test User',
        avatar: ''
      }
    };
  }

  async updateUserProfile(userId, updateData) {
    return { success: true };
  }

  async searchUsers(searchTerm) {
    return { success: true, data: [] };
  }
}

export default new AuthServiceMock();
