// Test script to verify push subscription storage works
// Run this with: node test-push-fix.js

const testUserId = 'FKj9DhK9DghKyUk48xap0E0TlTn1'; // Your Firebase UID
const testEndpoint = 'https://fcm.googleapis.com/fcm/send/test-endpoint';
const testP256dh = 'test-p256dh-key';
const testAuth = 'test-auth-key';

async function testPushSubscription() {
  try {
    console.log('🧪 Testing push subscription storage...');
    console.log('User ID:', testUserId);
    
    const response = await fetch('http://localhost:3000/api/push-subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: testUserId,
        endpoint: testEndpoint,
        p256dh: testP256dh,
        auth: testAuth,
        userAgent: 'test-user-agent',
        platform: 'web'
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Push subscription stored successfully!');
      console.log('Response:', result);
    } else {
      console.log('❌ Failed to store push subscription');
      console.log('Error:', result);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPushSubscription();
