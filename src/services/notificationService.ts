import type { DocumentData } from 'firebase/firestore';
import { createUserScopedCollection } from './firestoreCollection';
import { toDate } from '../utils/formatDate';
import type { AppNotification, NewNotificationInput } from '../types/notification';

function mapNotificationDoc(id: string, data: DocumentData): AppNotification {
  return {
    id,
    userId: data.userId,
    sourceKey: data.sourceKey ?? '',
    severity: data.severity ?? 'info',
    title: data.title ?? '',
    message: data.message ?? '',
    actionLabel: typeof data.actionLabel === 'string' ? data.actionLabel : null,
    actionPath: typeof data.actionPath === 'string' ? data.actionPath : null,
    read: Boolean(data.read),
    createdAt: toDate(data.createdAt)?.toISOString() ?? '',
    updatedAt: toDate(data.updatedAt)?.toISOString() ?? '',
  };
}

const notificationsCollection = createUserScopedCollection<AppNotification>(
  'notifications',
  mapNotificationDoc,
);

/** Creates one notification, unread, from a `NewNotificationInput` built by
 * `utils/notificationSync.ts`'s `selectNewNotifications` — the only writer
 * of new notifications (see `hooks/useNotificationSync.ts`). */
export function createNotification(userId: string, input: NewNotificationInput): Promise<string> {
  return notificationsCollection.create(userId, { ...input, read: false });
}

export function markNotificationRead(id: string): Promise<void> {
  return notificationsCollection.update(id, { read: true });
}

/** Marks every currently-unread notification read at once — the bell
 * popover's "Mark all as read" action. Takes the already-loaded list
 * (from `useNotifications`) rather than re-fetching, same "caller supplies
 * what it already has" convention `generateDueOccurrences` uses. */
export function markAllNotificationsRead(notifications: AppNotification[]): Promise<void[]> {
  const unread = notifications.filter((n) => !n.read);
  return Promise.all(unread.map((n) => markNotificationRead(n.id)));
}

export function deleteNotification(id: string): Promise<void> {
  return notificationsCollection.remove(id);
}

/** Realtime subscription to a user's notifications, most recently created
 * first — the bell popover's own order. */
export function subscribeToNotifications(
  userId: string,
  onData: (notifications: AppNotification[]) => void,
  onError: (error: Error) => void,
): () => void {
  return notificationsCollection.subscribeForUser(userId, onData, onError, {
    orderByField: 'createdAt',
    orderDirection: 'desc',
  });
}
