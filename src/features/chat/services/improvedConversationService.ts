import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  getDoc,
  doc,
  limit,
  DocumentData,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Conversation } from '../store/chatStore';
import { conversationSettingsService } from '@/services/conversationSettingsService';

export const improvedConversationService = {
  subscribeToConversations(currentUserId: string, callback: (conversations: Conversation[]) => void) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', currentUserId),
      orderBy('lastMessageAt', 'desc'),
      limit(100)
    );

    let settingsMapPromise: Promise<Map<string, number | null>> | null = null;
    let settingsMapCache: Map<string, number | null> | null = null;
    let lastSnapshotVersion = 0;

    const getSettingsMap = async () => {
      if (settingsMapCache) return settingsMapCache;
      if (!settingsMapPromise) {
        settingsMapPromise = conversationSettingsService.getAllConversationSettings(currentUserId);
      }
      settingsMapCache = await settingsMapPromise;
      return settingsMapCache;
    };

    const buildConversations = (snapshot: QuerySnapshot<DocumentData>, settingsMap?: Map<string, number | null>) => {
      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const participants: string[] = data.participants || [];
        const peerId = participants.find((id) => id !== currentUserId);
        if (!peerId) return null;
        const profiles = data.profiles || {};
        const peerProfile = profiles[peerId] || {};
        const lastMessageText = data.lastMessage || '';
        const lastMessageSenderId = data.lastSenderId;
        const formattedLastMessage = lastMessageSenderId === currentUserId
          ? `Me: ${lastMessageText}`
          : `${peerProfile.username || 'Unknown'}: ${lastMessageText}`;

        const unreadCounts = data.unreadCounts || {};
        const unreadCount = unreadCounts[currentUserId] || 0;

        return {
          id: peerId,
          userId: peerId,
          username: peerProfile.username || 'Unknown',
          email: peerProfile.email || '',
          avatar: peerProfile.avatar || undefined,
          lastMessage: formattedLastMessage,
          lastMessageTime: data.lastMessageAt?.toDate() || new Date(),
          lastMessageSeen: unreadCount === 0,
          unreadCount,
          isOnline: true,
          expirationMinutes: settingsMap?.get(peerId) ?? null,
        } as Conversation;
      }).filter(Boolean) as Conversation[];
    };

    // Cache of fresh user profiles fetched from the users collection
    let freshProfilesCache: Map<string, { username: string; email: string; avatar?: string }> | null = null;

    const fetchFreshProfiles = async (peerIds: string[]): Promise<Map<string, { username: string; email: string; avatar?: string }>> => {
      const profiles = new Map<string, { username: string; email: string; avatar?: string }>();
      const fetches = peerIds.map(async (peerId) => {
        try {
          const userDoc = await getDoc(doc(db!, 'users', peerId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            profiles.set(peerId, {
              username: data.username || 'Unknown',
              email: data.email || '',
              avatar: data.avatar || undefined,
            });
          }
        } catch {
          // Ignore individual fetch failures, cached profile will be used
        }
      });
      await Promise.all(fetches);
      return profiles;
    };

    const applyFreshProfiles = (conversations: Conversation[], freshProfiles: Map<string, { username: string; email: string; avatar?: string }>): Conversation[] => {
      return conversations.map((conv) => {
        const fresh = freshProfiles.get(conv.userId);
        if (!fresh) return conv;
        return {
          ...conv,
          username: fresh.username,
          email: fresh.email,
          avatar: fresh.avatar,
        };
      });
    };

    const mapSnapshot = async (snapshot: QuerySnapshot<DocumentData>) => {
      const snapshotVersion = ++lastSnapshotVersion;

      // Render immediately with cached profiles from the conversation document.
      let conversations = buildConversations(snapshot, settingsMapCache || undefined);

      // If we already have fresh profiles from a previous snapshot, apply them right away.
      if (freshProfilesCache) {
        conversations = applyFreshProfiles(conversations, freshProfilesCache);
      }
      callback(conversations);

      // Collect peer IDs to fetch fresh profiles from the users collection.
      const peerIds = conversations.map((c) => c.userId);

      // Hydrate fresh profiles and expiration settings in the background.
      const promises: Promise<void>[] = [];

      promises.push(
        fetchFreshProfiles(peerIds)
          .then((freshProfiles) => {
            if (snapshotVersion !== lastSnapshotVersion) return;
            freshProfilesCache = freshProfiles;
          })
          .catch((error) => {
            console.error('Error fetching fresh user profiles:', error);
          })
      );

      if (!settingsMapCache) {
        promises.push(
          getSettingsMap()
            .then(() => {
              // settings are now in settingsMapCache
            })
            .catch((error) => {
              console.error('Error loading conversation settings:', error);
            })
        );
      }

      await Promise.all(promises);

      if (snapshotVersion !== lastSnapshotVersion) return;

      // Re-build with fresh data and emit updated conversations.
      let hydrated = buildConversations(snapshot, settingsMapCache || undefined);
      if (freshProfilesCache) {
        hydrated = applyFreshProfiles(hydrated, freshProfilesCache);
      }
      callback(hydrated);
    };

    return onSnapshot(q, (snapshot) => {
      mapSnapshot(snapshot).catch((error) => {
        console.error('Error processing conversations snapshot:', error);
      });
    }, (error) => {
      console.error('Error fetching conversations:', error);
    });
  },

  async searchUsers(searchQuery: string, currentUserId: string): Promise<Conversation[]> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      const usersRef = collection(db, 'users');
      
      // Get all users and filter on client side for better partial matching
      const allUsersQuery = query(usersRef, limit(100)); // Increased limit to get more users
      const snapshot = await getDocs(allUsersQuery);
      
      const allUsers = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.id,
          userId: data.id,
          username: data.username,
          email: data.email,
          avatar: data.avatar,
          lastMessage: '',
          lastMessageTime: new Date(),
          unreadCount: 0,
          isOnline: true
        };
      }).filter(user => user.userId !== currentUserId);
      
      // Filter users based on search query - EXACT MATCHING ONLY
      const filteredUsers = allUsers.filter(user => {
        const query = searchQuery.toLowerCase();
        
        if (searchQuery.startsWith('@')) {
          // Search by username (exact match) - remove @ prefix
          const username = searchQuery.substring(1).toLowerCase();
          return user.username.toLowerCase() === username;
        } else {
          // Search both username and email (exact match)
          return user.email.toLowerCase() === query || 
                 user.username.toLowerCase() === query;
        }
      });
      
      return filteredUsers.slice(0, 10); // Limit to 10 results
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }
};
