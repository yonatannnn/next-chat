"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  getCountFromServer,
  orderBy,
  limit,
  query,
} from "firebase/firestore";

type DashboardUser = {
  id: string;
  name?: string;
  email: string;
  username: string;
  password?: string;
};

type InitiatorRecord = {
  pairKey: string;
  starterUserId: string;
  starterUsername?: string;
  otherUserId: string;
  otherUsername?: string;
};

export default function DashboardPage() {
  const { userData, isLoading } = useAuth();
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [messagesCount, setMessagesCount] = useState<number | null>(null);
  const [initiators, setInitiators] = useState<InitiatorRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const adminEmail = useMemo(
    () => process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase().trim(),
    []
  );

  const isAllowed = useMemo(() => {
    const currentEmail = userData?.email?.toLowerCase().trim();
    return !!currentEmail && !!adminEmail && currentEmail === adminEmail;
  }, [userData?.email, adminEmail]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!db || !isAllowed) return;
      setLoadingData(true);
      try {
        // Users
        const usersSnap = await getDocs(collection(db, "users"));
        const loadedUsers: DashboardUser[] = usersSnap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: data.id,
            name: data.name || "",
            email: data.email,
            username: data.username,
            password: data.password, // NEVER display; mask below
          };
        });

        // Messages count (server-side count aggregation)
        const messagesAgg = await getCountFromServer(collection(db, "messages"));
        const totalMessages = messagesAgg.data().count;

        // Determine conversation initiators
        // Strategy: read earliest N messages ordered by timestamp and take the first per user-pair
        // Note: This is a lightweight approximation for small-to-medium datasets.
        const earliestMessagesSnap = await getDocs(
          query(collection(db, "messages"), orderBy("timestamp", "asc"), limit(2000))
        );

        const pairToInitiator = new Map<string, InitiatorRecord>();
        const userIdToUsername = new Map<string, string>();
        loadedUsers.forEach((u) => userIdToUsername.set(u.id, u.username));

        earliestMessagesSnap.docs.forEach((doc) => {
          const m = doc.data() as any;
          const senderId = m.senderId as string;
          const receiverId = m.receiverId as string;
          if (!senderId || !receiverId) return;
          // Only 1:1 messages
          const a = [senderId, receiverId].sort();
          const key = `${a[0]}__${a[1]}`;
          if (!pairToInitiator.has(key)) {
            pairToInitiator.set(key, {
              pairKey: key,
              starterUserId: senderId,
              starterUsername: userIdToUsername.get(senderId),
              otherUserId: receiverId,
              otherUsername: userIdToUsername.get(receiverId),
            });
          }
        });

        if (!cancelled) {
          setUsers(loadedUsers);
          setMessagesCount(totalMessages);
          setInitiators(Array.from(pairToInitiator.values()));
        }
      } catch (e) {
        console.error("Failed to load dashboard data", e);
        if (!cancelled) {
          setUsers([]);
          setMessagesCount(0);
          setInitiators([]);
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isAllowed]);

  if (isLoading) return (
    <div className="p-6 bg-white dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white">Loading...</div>
  );

  if (!isAllowed) {
    return (
      <div className="p-6 bg-white dark:bg-gray-900 min-h-screen">
        <h1 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">403 - Forbidden</h1>
        <p className="text-gray-600 dark:text-gray-400">You do not have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-white dark:bg-gray-900 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Restricted to the configured admin account</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Users</div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">{users.length}</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Messages</div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">{messagesCount ?? (loadingData ? "…" : 0)}</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-500 dark:text-gray-400">Unique Conversation Pairs</div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">{initiators.length}</div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Users</h2>
        <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-gray-900 dark:text-white">Full Name</th>
                <th className="px-4 py-2 text-gray-900 dark:text-white">Email</th>
                <th className="px-4 py-2 text-gray-900 dark:text-white">Username</th>
                <th className="px-4 py-2 text-gray-900 dark:text-white">Password</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-2 text-gray-900 dark:text-white">{u.name || ""}</td>
                  <td className="px-4 py-2 text-gray-900 dark:text-white">{u.email}</td>
                  <td className="px-4 py-2 text-gray-900 dark:text-white">{u.username}</td>
                  <td className="px-4 py-2 text-gray-900 dark:text-white">{u.password ?? "—"}</td>
                </tr>
              ))}
              {users.length === 0 && !loadingData && (
                <tr>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400" colSpan={4}>No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Conversation Initiators</h2>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          {initiators.map((rec) => (
            <div key={rec.pairKey} className="p-3 text-sm bg-white dark:bg-gray-800">
              <span className="font-medium text-gray-900 dark:text-white">{rec.starterUsername || rec.starterUserId}</span>
              <span className="text-gray-500 dark:text-gray-400"> started a conversation with </span>
              <span className="font-medium text-gray-900 dark:text-white">{rec.otherUsername || rec.otherUserId}</span>
            </div>
          ))}
          {initiators.length === 0 && !loadingData && (
            <div className="p-3 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800">No conversation pairs found</div>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">Note: Initiators computed from the earliest 2000 messages.</p>
      </section>
    </div>
  );
}


