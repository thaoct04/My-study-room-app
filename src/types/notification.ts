import type { Timestamp } from 'firebase/firestore';

export type NotificationType = 'UPCOMING' | 'EXPIRING';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: Timestamp | Date | null;
  isRead: boolean;
}
