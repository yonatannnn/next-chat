import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

const IndividualChatScreen = ({ navigation, route }) => {
  const { userId, username, avatar, isNewChat } = route.params;
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  // Mock messages data
  const mockMessages = [
    {
      id: '1',
      senderId: userId,
      receiverId: 'current_user',
      text: 'Hey! How are you doing?',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      seen: true
    },
    {
      id: '2',
      senderId: 'current_user',
      receiverId: userId,
      text: 'I\'m doing great! Thanks for asking. How about you?',
      timestamp: new Date(Date.now() - 1000 * 60 * 25),
      seen: true
    },
    {
      id: '3',
      senderId: userId,
      receiverId: 'current_user',
      text: 'I\'m good too! Just working on some projects.',
      timestamp: new Date(Date.now() - 1000 * 60 * 20),
      seen: true
    },
    {
      id: '4',
      senderId: 'current_user',
      receiverId: userId,
      text: 'That sounds interesting! What kind of projects?',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      seen: false
    }
  ];

  useEffect(() => {
    if (!isNewChat) {
      setMessages(mockMessages);
    }
  }, [isNewChat]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      senderId: 'current_user',
      receiverId: userId,
      text: message.trim(),
      timestamp: new Date(),
      seen: false
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage('');

    // Simulate typing indicator
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      // Simulate response
      const responseMessage = {
        id: (Date.now() + 1).toString(),
        senderId: userId,
        receiverId: 'current_user',
        text: 'Thanks for the message!',
        timestamp: new Date(),
        seen: false
      };
      setMessages(prev => [...prev, responseMessage]);
    }, 2000);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item, index }) => {
    const isCurrentUser = item.senderId === 'current_user';
    const showTime = index === 0 || 
      new Date(item.timestamp) - new Date(messages[index - 1].timestamp) > 5 * 60 * 1000;

    return (
      <View style={styles.messageContainer}>
        {showTime && (
          <Text style={styles.messageTime}>
            {formatTime(item.timestamp)}
          </Text>
        )}
        
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
        ]}>
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText
          ]}>
            {item.text}
          </Text>
          
          {isCurrentUser && (
            <View style={styles.messageStatus}>
              <Ionicons 
                name={item.seen ? "checkmark-done" : "checkmark"} 
                size={16} 
                color={item.seen ? "#2563eb" : "#9ca3af"} 
              />
            </View>
          )}
        </View>
      </View>
    );
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleUserInfo = () => {
    Alert.alert(
      'User Info',
      `Name: ${username}\nUser ID: ${userId}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.userInfo} onPress={handleUserInfo}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerDefaultAvatar}>
                <Text style={styles.headerAvatarText}>
                  {username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            
            <View style={styles.userDetails}>
              <Text style={styles.headerUsername}>{username}</Text>
              <Text style={styles.headerStatus}>Online</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="call" size={24} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="videocam" size={24} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="ellipsis-vertical" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        inverted
      />

      {/* Typing Indicator */}
      {isTyping && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>{username} is typing...</Text>
        </View>
      )}

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.inputButton}>
          <Ionicons name="add" size={24} color="#6b7280" />
        </TouchableOpacity>
        
        <View style={styles.messageInputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Type a message..."
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
          />
        </View>
        
        <TouchableOpacity style={styles.inputButton}>
          <Ionicons name="camera" size={24} color="#6b7280" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!message.trim()}
        >
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerDefaultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  userDetails: {
    flex: 1,
  },
  headerUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  headerStatus: {
    fontSize: 12,
    color: '#10b981',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  messageContainer: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  messageTime: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
    marginVertical: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  currentUserMessage: {
    backgroundColor: '#2563eb',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  otherUserMessage: {
    backgroundColor: 'white',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    flex: 1,
  },
  currentUserText: {
    color: 'white',
  },
  otherUserText: {
    color: '#111827',
  },
  messageStatus: {
    marginLeft: 8,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  inputButton: {
    padding: 8,
    marginRight: 8,
  },
  messageInputContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
  },
  messageInput: {
    fontSize: 16,
    color: '#111827',
    minHeight: 20,
  },
  sendButton: {
    backgroundColor: '#2563eb',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
});

export default IndividualChatScreen;
