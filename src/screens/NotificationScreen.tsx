import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  clearAllNotifications,
  deleteNotification,
  markAsRead,
  subscribeToNotifications,
} from '../services/notificationService';
import type { AppNotification } from '../types/notification';

interface NotificationScreenProps {
  visible: boolean;
  userId: string;
  onClose: () => void;
}

const formatNotificationDate = (
  createdAt: AppNotification['createdAt'],
): string => {
  if (!createdAt) return 'Just now';
  const date = createdAt instanceof Date ? createdAt : createdAt.toDate();
  if (Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const NotificationScreen: React.FC<NotificationScreenProps> = ({
  visible,
  userId,
  onClose,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setError(null);
    return subscribeToNotifications(
      userId,
      (items) => {
        setNotifications(items);
        setLoading(false);
      },
      (loadError) => {
        setError(loadError.message);
        setLoading(false);
      },
    );
  }, [userId, visible]);

  const removeNotification = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
    } catch (actionError: unknown) {
      Alert.alert(
        'Could not delete notification',
        actionError instanceof Error ? actionError.message : 'Please try again.',
      );
    }
  };

  const confirmClearAll = () => {
    Alert.alert(
      'Clear all notifications?',
      'This will permanently delete all your notifications.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear all',
          style: 'destructive',
          onPress: () => {
            setBusy(true);
            void clearAllNotifications(userId)
              .catch((actionError: unknown) => {
                Alert.alert(
                  'Could not clear notifications',
                  actionError instanceof Error
                    ? actionError.message
                    : 'Please try again.',
                );
              })
              .finally(() => setBusy(false));
          },
        },
      ],
    );
  };

  const openNotification = async (item: AppNotification) => {
    if (item.isRead) return;
    try {
      await markAsRead(item.id);
    } catch (actionError: unknown) {
      Alert.alert(
        'Could not update notification',
        actionError instanceof Error ? actionError.message : 'Please try again.',
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClose}
            accessibilityLabel="Close notifications"
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              {notifications.filter((item) => !item.isRead).length} unread
            </Text>
          </View>
          {notifications.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={confirmClearAll}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Text style={styles.clearText}>Clear all</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#2563EB" />
            <Text style={styles.stateText}>Loading notifications...</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              notifications.length === 0 && styles.emptyList,
            ]}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.centerState}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="notifications-off-outline"
                    size={28}
                    color="#64748B"
                  />
                </View>
                <Text style={styles.emptyTitle}>You’re all caught up</Text>
                <Text style={styles.stateText}>
                  Booking reminders will appear here.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isUpcoming = item.type === 'UPCOMING';
              return (
                <TouchableOpacity
                  style={[
                    styles.notificationCard,
                    !item.isRead && styles.unreadCard,
                  ]}
                  onPress={() => void openNotification(item)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.typeIcon,
                      isUpcoming ? styles.upcomingIcon : styles.expiringIcon,
                    ]}
                  >
                    <Ionicons
                      name={isUpcoming ? 'time-outline' : 'hourglass-outline'}
                      size={21}
                      color={isUpcoming ? '#2563EB' : '#D97706'}
                    />
                  </View>
                  <View style={styles.notificationContent}>
                    <View style={styles.titleRow}>
                      <Text style={styles.notificationTitle}>{item.title}</Text>
                      {!item.isRead && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.message}>{item.message}</Text>
                    <Text style={styles.timestamp}>
                      {formatNotificationDate(item.createdAt)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => void removeNotification(item.id)}
                    accessibilityLabel={`Delete notification: ${item.title}`}
                  >
                    <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F3',
  },
  backButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, marginLeft: 10 },
  title: { fontSize: 19, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  clearButton: { minWidth: 58, alignItems: 'flex-end', paddingVertical: 8 },
  clearText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  listContent: { padding: 14, paddingBottom: 24 },
  emptyList: { flexGrow: 1 },
  separator: { height: 10 },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 13,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#EEF0F3',
  },
  unreadCard: { backgroundColor: '#F3F7FF', borderColor: '#DBEAFE' },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  upcomingIcon: { backgroundColor: '#DBEAFE' },
  expiringIcon: { backgroundColor: '#FEF3C7' },
  notificationContent: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notificationTitle: { flex: 1, color: '#111827', fontSize: 14, fontWeight: '700' },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#2563EB' },
  message: { color: '#4B5563', fontSize: 13, lineHeight: 19, marginTop: 4 },
  timestamp: { color: '#9CA3AF', fontSize: 11, marginTop: 7 },
  deleteButton: { padding: 7, marginLeft: 4 },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  stateText: { color: '#6B7280', fontSize: 13, textAlign: 'center', marginTop: 9 },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
    marginBottom: 14,
  },
  emptyTitle: { color: '#111827', fontSize: 16, fontWeight: '700' },
  errorBox: {
    margin: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  errorText: { color: '#B91C1C', fontSize: 13 },
});

export default NotificationScreen;
