import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { subscribeToNotifications } from '../services/notificationService';

interface NotificationBadgeProps {
  userId: string;
  onPress: () => void;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  userId,
  onPress,
}) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    return subscribeToNotifications(
      userId,
      (notifications) =>
        setUnreadCount(notifications.filter((notification) => !notification.isRead).length),
      (error) => console.error('Could not load notification badge:', error),
    );
  }, [userId]);

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount > 0
          ? `Notifications, ${unreadCount} unread`
          : 'Notifications'
      }
    >
      <Ionicons name="notifications-outline" size={21} color="#1F2937" />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -3,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
});

export default NotificationBadge;
