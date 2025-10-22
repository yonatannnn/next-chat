import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs,
  limit,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Message, Group, GroupMember, GroupConversation } from '../store/chatStore';
import { conversationSettingsService } from '@/services/conversationSettingsService';

export const groupChatService = {
  async createGroup(
    name: string, 
    description: string, 
    createdBy: string, 
    memberIds: string[], 
    memberData: { userId: string; username: string; email: string; avatar?: string }[]
  ): Promise<string> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      // Create group members array with creator as admin
      const members: GroupMember[] = [
        {
          userId: createdBy,
          username: memberData.find(m => m.userId === createdBy)?.username || 'Unknown',
          email: memberData.find(m => m.userId === createdBy)?.email || '',
          avatar: memberData.find(m => m.userId === createdBy)?.avatar,
          role: 'admin',
          joinedAt: new Date(),
          isActive: true
        },
        ...memberData
          .filter(m => m.userId !== createdBy)
          .map(member => ({
            userId: member.userId,
            username: member.username,
            email: member.email,
            avatar: member.avatar,
            role: 'member' as const,
            joinedAt: new Date(),
            isActive: true
          }))
      ];

      const groupData = {
        name,
        description,
        createdBy,
        members,
        createdAt: serverTimestamp(),
        isActive: true
      };
      
      const groupRef = await addDoc(collection(db, 'groups'), groupData);
      return groupRef.id;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('resource-exhausted')) {
        throw new Error('Service temporarily unavailable. Please try again later.');
      }
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },

  async sendGroupMessage(
    groupId: string, 
    senderId: string, 
    text: string, 
    fileUrl?: string, 
    fileUrls?: string[], 
    replyTo?: any, 
    voiceUrl?: string, 
    voiceDuration?: number,
    messageType?: 'system' | 'user',
    expirationMinutes?: number | null
  ) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      // Calculate expiration time if specified
      let expiresAt = null;
      if (expirationMinutes && expirationMinutes > 0) {
        const expirationTime = new Date();
        expirationTime.setMinutes(expirationTime.getMinutes() + expirationMinutes);
        expiresAt = expirationTime;
      }

      const messageData = {
        groupId,
        senderId: messageType === 'system' ? 'system' : senderId,
        text,
        fileUrl: fileUrl || null,
        fileUrls: fileUrls || null,
        timestamp: serverTimestamp(),
        replyTo: replyTo ? {
          messageId: replyTo.id,
          text: replyTo.text,
          senderName: replyTo.senderId === senderId ? 'You' : 'Other'
        } : null,
        voiceUrl: voiceUrl || null,
        voiceDuration: voiceDuration || null,
        messageType: messageType || 'user',
        expiresAt: expiresAt,
        expirationMinutes: expirationMinutes || null,
        isExpired: false,
      };
      
      await addDoc(collection(db, 'groupMessages'), messageData);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('resource-exhausted')) {
        throw new Error('Service temporarily unavailable. Please try again later.');
      }
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },

  subscribeToGroupMessages(groupId: string, callback: (messages: Message[]) => void) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    const messagesRef = collection(db, 'groupMessages');
    const q = query(
      messagesRef,
      where('groupId', '==', groupId),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const messages: Message[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId,
          receiverId: '', // Not used for group messages
          groupId: data.groupId,
          text: data.text,
          fileUrl: data.fileUrl,
          fileUrls: data.fileUrls,
          timestamp: data.timestamp?.toDate() || new Date(),
          edited: data.edited || false,
          editedAt: data.editedAt?.toDate(),
          deleted: data.deleted || false,
          replyTo: data.replyTo || null,
          isForwarded: data.isForwarded || false,
          originalSenderId: data.originalSenderId || null,
          originalSenderName: data.originalSenderName || null,
          forwardedBy: data.forwardedBy || null,
          voiceUrl: data.voiceUrl || null,
          voiceDuration: data.voiceDuration || null,
          seen: data.seen || false,
          seenAt: data.seenAt?.toDate(),
          expiresAt: data.expiresAt?.toDate() || null,
          expirationMinutes: data.expirationMinutes || null,
          isExpired: data.isExpired || false,
        };
      });
      callback(messages);
    });
  },

  async addMemberToGroup(groupId: string, memberData: { userId: string; username: string; email: string; avatar?: string }) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const groupRef = doc(db, 'groups', groupId);
      const newMember: GroupMember = {
        userId: memberData.userId,
        username: memberData.username,
        email: memberData.email,
        avatar: memberData.avatar,
        role: 'member',
        joinedAt: new Date(),
        isActive: true
      };
      
      await updateDoc(groupRef, {
        members: arrayUnion(newMember)
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('resource-exhausted')) {
        throw new Error('Service temporarily unavailable. Please try again later.');
      }
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },

  async removeMemberFromGroup(groupId: string, userId: string) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const groupRef = doc(db, 'groups', groupId);
      // Get current group data to find the member to remove
      const groupDoc = await getDocs(query(collection(db, 'groups'), where('__name__', '==', groupId)));
      if (groupDoc.empty) {
        throw new Error('Group not found');
      }
      
      const groupData = groupDoc.docs[0].data();
      const memberToRemove = groupData.members.find((m: GroupMember) => m.userId === userId);
      
      if (memberToRemove) {
        await updateDoc(groupRef, {
          members: arrayRemove(memberToRemove)
        });
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('resource-exhausted')) {
        throw new Error('Service temporarily unavailable. Please try again later.');
      }
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },

  async leaveGroup(groupId: string, userId: string) {
    return this.removeMemberFromGroup(groupId, userId);
  },

  async updateGroupInfo(groupId: string, updates: { name?: string; description?: string; avatar?: string }) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('resource-exhausted')) {
        throw new Error('Service temporarily unavailable. Please try again later.');
      }
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },

  async deleteGroup(groupId: string) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        isActive: false,
        deletedAt: serverTimestamp()
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('resource-exhausted')) {
        throw new Error('Service temporarily unavailable. Please try again later.');
      }
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },

  async getUserGroups(userId: string, callback: (groups: Group[]) => void) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    const groupsRef = collection(db, 'groups');
    const q = query(
      groupsRef,
      where('members', 'array-contains-any', [{ userId }]),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const groups: Group[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          avatar: data.avatar,
          createdBy: data.createdBy,
          createdAt: data.createdAt?.toDate() || new Date(),
          members: data.members || [],
          isActive: data.isActive || false
        };
      });
      callback(groups);
    });
  },

  async getGroupConversations(userId: string, callback: (conversations: GroupConversation[]) => void) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    // Get user's groups first
    const groupsRef = collection(db, 'groups');
    const userGroupsQuery = query(
      groupsRef,
      where('isActive', '==', true)
    );

    return onSnapshot(userGroupsQuery, async (groupsSnapshot) => {
      // Filter groups where user is a member
      const userGroups = groupsSnapshot.docs.filter(doc => {
        const groupData = doc.data();
        return groupData.members?.some((member: any) => member.userId === userId);
      });
      
      if (userGroups.length === 0) {
        callback([]);
        return;
      }

      // Get last messages for each group
      const conversations: GroupConversation[] = [];
      
      for (const groupDoc of userGroups) {
        const groupData = groupDoc.data();
        const groupId = groupDoc.id;
        
        // Get last message for this group
        const messagesRef = collection(db!, 'groupMessages');
        // Get the last message for this group (simplified to avoid index requirement)
        const lastMessageQuery = query(
          messagesRef,
          where('groupId', '==', groupId)
        );
        
        const lastMessageSnapshot = await getDocs(lastMessageQuery);
        const lastMessage = lastMessageSnapshot.docs
          .sort((a, b) => b.data().timestamp?.toMillis() - a.data().timestamp?.toMillis())[0]?.data();
        
        // Count unread messages for this user (simplified to avoid index requirement)
        const unreadQuery = query(
          messagesRef,
          where('groupId', '==', groupId)
        );
        
        const unreadSnapshot = await getDocs(unreadQuery);
        const unreadCount = unreadSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.senderId !== userId && !data.seen;
        }).length;
        
        // Load expiration settings for this group
        let expirationMinutes: number | null = null;
        try {
          expirationMinutes = await conversationSettingsService.getGroupExpiration(
            userId, 
            groupId
          );
        } catch (error) {
          console.error('Error loading expiration settings for group:', groupId, error);
        }
        
        conversations.push({
          id: groupId,
          groupId,
          groupName: groupData.name,
          groupAvatar: groupData.avatar,
          lastMessage: lastMessage?.text || '',
          lastMessageTime: lastMessage?.timestamp?.toDate(),
          lastMessageSeen: unreadCount === 0,
          unreadCount,
          memberCount: groupData.members?.length || 0,
          isActive: groupData.isActive,
          expirationMinutes
        });
      }
      
      // Sort by last message time
      conversations.sort((a, b) => {
        if (!a.lastMessageTime && !b.lastMessageTime) return 0;
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
      });
      
      callback(conversations);
    });
  },

  async markGroupMessageAsSeen(messageId: string) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const messageRef = doc(db, 'groupMessages', messageId);
      await updateDoc(messageRef, {
        seen: true,
        seenAt: serverTimestamp(),
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('resource-exhausted')) {
        throw new Error('Service temporarily unavailable. Please try again later.');
      }
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },

  async editGroupMessage(messageId: string, newText: string) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const messageRef = doc(db, 'groupMessages', messageId);
      await updateDoc(messageRef, {
        text: newText,
        edited: true,
        editedAt: serverTimestamp(),
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('resource-exhausted')) {
        throw new Error('Service temporarily unavailable. Please try again later.');
      }
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },

  async deleteGroupMessage(messageId: string) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const messageRef = doc(db, 'groupMessages', messageId);
      await updateDoc(messageRef, {
        deleted: true,
        text: 'This message was deleted',
        fileUrl: null,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('resource-exhausted')) {
        throw new Error('Service temporarily unavailable. Please try again later.');
      }
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  },

  async uploadVoiceMessage(audioBlob: Blob): Promise<{ url: string; duration: number }> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      // Create a unique filename for the voice message
      const fileName = `voice-${Date.now()}.webm`;
      const filePath = `voice-messages/${fileName}`;

      // Upload to Firebase Storage (you'll need to import storage functions)
      // For now, we'll create a data URL as a placeholder
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = () => {
          const dataUrl = reader.result as string;
          
          // Get audio duration
          const audio = new Audio(dataUrl);
          audio.onloadedmetadata = () => {
            resolve({
              url: dataUrl,
              duration: audio.duration
            });
          };
          audio.onerror = () => {
            reject(new Error('Failed to load audio'));
          };
        };
        reader.onerror = () => {
          reject(new Error('Failed to read audio file'));
        };
        reader.readAsDataURL(audioBlob);
      });
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'An error occurred');
    }
  }
};
