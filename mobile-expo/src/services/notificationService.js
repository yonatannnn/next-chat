import messaging from '@react-native-firebase/messaging';
import { firestore } from '../config/firebase';

class NotificationService {
  async requestPermission() {
    try {
      const authStatus = await messaging.requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Authorization status:', authStatus);
        return { success: true, status: authStatus };
      } else {
        return { success: false, error: 'Permission not granted' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getToken() {
    try {
      const token = await messaging.getToken();
      return { success: true, token };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async saveTokenToFirestore(userId, token) {
    try {
      await firestore.collection('user_tokens').doc(userId).set({
        token: token,
        updated_at: firestore.FieldValue.serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteTokenFromFirestore(userId) {
    try {
      await firestore.collection('user_tokens').doc(userId).delete();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Set up message handlers
  setupMessageHandlers() {
    // Handle background messages
    messaging.setBackgroundMessageHandler(async remoteMessage => {
      console.log('Message handled in the background!', remoteMessage);
    });

    // Handle foreground messages
    const unsubscribe = messaging.onMessage(async remoteMessage => {
      console.log('A new FCM message arrived!', remoteMessage);
      // You can show a local notification here
    });

    return unsubscribe;
  }

  // Handle notification opens
  async getInitialNotification() {
    try {
      const remoteMessage = await messaging.getInitialNotification();
      if (remoteMessage) {
        console.log('Notification caused app to open from quit state:', remoteMessage);
        return remoteMessage;
      }
      return null;
    } catch (error) {
      console.error('Error getting initial notification:', error);
      return null;
    }
  }

  // Handle notification opens when app is in background
  setupNotificationOpenedApp() {
    const unsubscribe = messaging.onNotificationOpenedApp(remoteMessage => {
      console.log('Notification caused app to open from background state:', remoteMessage);
    });

    return unsubscribe;
  }
}

export default new NotificationService();
