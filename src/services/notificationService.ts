import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '../config/firebase';
import type { AppNotification, NotificationType } from '../types/notification';

const NOTIFICATIONS_COLLECTION = 'notifications';

const toNotification = (
  snapshot: QueryDocumentSnapshot,
): AppNotification => {
  const data = snapshot.data();
  if (
    typeof data.userId !== 'string' ||
    typeof data.title !== 'string' ||
    typeof data.message !== 'string' ||
    (data.type !== 'UPCOMING' && data.type !== 'EXPIRING')
  ) {
    throw new Error(`Notification document "${snapshot.id}" has invalid data.`);
  }

  return {
    id: snapshot.id,
    userId: data.userId,
    title: data.title,
    message: data.message,
    type: data.type as NotificationType,
    createdAt: data.createdAt ?? null,
    isRead: data.isRead === true,
  };
};

const getUserNotificationsQuery = (userId: string) =>
  query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('userId', '==', userId),
  );

const sortNotifications = (notifications: AppNotification[]) =>
  notifications.sort((left, right) => {
    const leftTime =
      left.createdAt instanceof Date
        ? left.createdAt.getTime()
        : left.createdAt?.toMillis() ?? 0;
    const rightTime =
      right.createdAt instanceof Date
        ? right.createdAt.getTime()
        : right.createdAt?.toMillis() ?? 0;
    return rightTime - leftTime;
  });

export const fetchNotifications = async (
  userId: string,
): Promise<AppNotification[]> => {
  const snapshot = await getDocs(getUserNotificationsQuery(userId));
  return sortNotifications(snapshot.docs.map(toNotification));
};

export const subscribeToNotifications = (
  userId: string,
  onNotifications: (notifications: AppNotification[]) => void,
  onError: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    getUserNotificationsQuery(userId),
    (snapshot) => {
      onNotifications(
        sortNotifications(snapshot.docs.map(toNotification)),
      );
    },
    (error) => onError(error),
  );

export const markAsRead = async (notificationId: string): Promise<void> => {
  await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), {
    isRead: true,
  });
};

export const deleteNotification = async (
  notificationId: string,
): Promise<void> => {
  await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId));
};

export const clearAllNotifications = async (userId: string): Promise<void> => {
  const snapshot = await getDocs(getUserNotificationsQuery(userId));
  const documents = snapshot.docs;

  for (let index = 0; index < documents.length; index += 450) {
    const batch = writeBatch(db);
    documents
      .slice(index, index + 450)
      .forEach((notification) => batch.delete(notification.ref));
    await batch.commit();
  }
};
