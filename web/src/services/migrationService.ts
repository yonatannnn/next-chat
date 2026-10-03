import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  writeBatch,
  QueryDocumentSnapshot,
  DocumentData,
  Query,
  QuerySnapshot,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { buildMessagePreview, getConversationId } from '@/features/chat/services/chatUtils';

type UserProfile = {
  username?: string;
  email?: string;
  avatar?: string;
};

type ConversationAgg = {
  participants: [string, string];
  lastMessageAt: Date;
  lastMessage: string;
  lastSenderId: string;
};

export const migrationService = {
  async migrateMessagesAndConversations(): Promise<{ messagesUpdated: number; conversationsWritten: number }> {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    const usersSnap = await getDocs(collection(db, 'users'));
    const userMap = new Map<string, UserProfile>();
    usersSnap.docs.forEach((docSnap) => {
      const data = docSnap.data() as any;
      userMap.set(docSnap.id, {
        username: data.username || 'Unknown',
        email: data.email || '',
        avatar: data.avatar || '',
      });
    });

    const messagesRef = collection(db, 'messages');
    const pageSize = 400;
    let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
    let messagesUpdated = 0;
    const conversationMap = new Map<string, ConversationAgg>();

    while (true) {
      const q: Query<DocumentData> = lastDoc
        ? query(messagesRef, orderBy('timestamp', 'asc'), startAfter(lastDoc), limit(pageSize))
        : query(messagesRef, orderBy('timestamp', 'asc'), limit(pageSize));

      const snapshot: QuerySnapshot<DocumentData> = await getDocs(q);
      if (snapshot.empty) break;

      const batch = writeBatch(db);
      snapshot.docs.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
        const data = docSnap.data() as any;
        const senderId = data.senderId as string | undefined;
        const receiverId = data.receiverId as string | undefined;
        const groupId = data.groupId as string | undefined;
        if (!senderId || !receiverId || groupId) return;

        const conversationId = getConversationId(senderId, receiverId);
        const needsUpdate =
          data.conversationId !== conversationId ||
          !Array.isArray(data.participants) ||
          data.participants?.length !== 2;

        if (needsUpdate) {
          batch.update(docSnap.ref, {
            conversationId,
            participants: [senderId, receiverId],
          });
          messagesUpdated += 1;
        }

        if (data.text === 'CONVERSATION_DELETED' && data.isSystemMessage) return;

        const timestamp = data.timestamp?.toDate?.() || new Date(0);
        const previewText = buildMessagePreview({
          text: data.text,
          fileUrl: data.fileUrl,
          fileUrls: data.fileUrls,
          voiceUrl: data.voiceUrl,
          messageType: data.messageType,
        });

        const existing = conversationMap.get(conversationId);
        if (!existing || timestamp.getTime() >= existing.lastMessageAt.getTime()) {
          conversationMap.set(conversationId, {
            participants: [senderId, receiverId].sort() as [string, string],
            lastMessageAt: timestamp,
            lastMessage: previewText,
            lastSenderId: senderId,
          });
        }
      });

      await batch.commit();
      lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      if (snapshot.docs.length < pageSize) break;
    }

    const conversationEntries = Array.from(conversationMap.entries());
    let conversationsWritten = 0;
    for (let i = 0; i < conversationEntries.length; i += pageSize) {
      const chunk = conversationEntries.slice(i, i + pageSize);
      const batch = writeBatch(db);
      chunk.forEach(([conversationId, agg]) => {
        const [userA, userB] = agg.participants;
        const profileA = userMap.get(userA) || { username: 'Unknown', email: '', avatar: '' };
        const profileB = userMap.get(userB) || { username: 'Unknown', email: '', avatar: '' };

        batch.set(
          doc(db!, 'conversations', conversationId),
          {
            participants: [userA, userB],
            profiles: {
              [userA]: profileA,
              [userB]: profileB,
            },
            lastMessage: agg.lastMessage,
            lastMessageAt: Timestamp.fromDate(agg.lastMessageAt),
            lastSenderId: agg.lastSenderId,
            updatedAt: Timestamp.fromDate(agg.lastMessageAt),
            unreadCounts: {
              [userA]: 0,
              [userB]: 0,
            },
            lastReadAt: {
              [userA]: Timestamp.fromDate(agg.lastMessageAt),
              [userB]: Timestamp.fromDate(agg.lastMessageAt),
            },
          },
          { merge: true }
        );
        conversationsWritten += 1;
      });
      await batch.commit();
    }

    return { messagesUpdated, conversationsWritten };
  },
};
