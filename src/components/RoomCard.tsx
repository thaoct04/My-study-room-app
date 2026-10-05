// src/components/RoomCard.tsx
// Component thẻ hiển thị một phòng học trong lưới 2 cột.
// Bao gồm: ảnh, tên phòng, địa điểm, sức chứa và badge trạng thái.

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Room, RoomCardProps } from '../types/room';

/**
 * Component badge hiển thị trạng thái đặt phòng.
 * - available -> badge xanh lá + icon tick (checkmark)
 * - occupied  -> badge đỏ + icon chấm tròn
 */
const StatusBadge: React.FC<{ status: Room['status'] }> = ({ status }) => {
  const isAvailable = status === 'available';
  const isBooked = status === 'booked';

  return (
    <View
      style={[
        styles.badge,
        isAvailable
          ? styles.badgeAvailable
          : isBooked
            ? styles.badgeBooked
            : styles.badgeOccupied,
      ]}
    >
      <Ionicons
        name={isAvailable ? 'checkmark-circle' : isBooked ? 'calendar' : 'ellipse'}
        size={12}
        color={isAvailable ? '#16A34A' : isBooked ? '#2563EB' : '#DC2626'}
      />
      <Text
        style={[
          styles.badgeText,
          isAvailable
            ? styles.badgeTextAvailable
            : isBooked
              ? styles.badgeTextBooked
              : styles.badgeTextOccupied,
        ]}
      >
        {isAvailable ? 'Available' : isBooked ? 'My booking' : 'Occupied'}
      </Text>
    </View>
  );
};

const RoomCard: React.FC<RoomCardProps> = ({ room, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => onPress?.(room)}
    >
      {/* 1. Ảnh đại diện phòng */}
      <Image
        source={{
          uri:
            room.imageUrl ??
            'https://via.placeholder.com/300x180?text=Room',
        }}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Phần nội dung text */}
      <View style={styles.content}>
        {/* 2. Tên phòng */}
        <Text style={styles.name} numberOfLines={1}>
          {room.name}
        </Text>

        {/* 3. Địa điểm / Tòa nhà */}
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={12} color="#7B8494" />
          <Text style={styles.infoText} numberOfLines={1}>
            {room.building}
          </Text>
        </View>

        {/* 4. Sức chứa */}
        <View style={styles.infoRow}>
          <Ionicons name="people-outline" size={12} color="#7B8494" />
          <Text style={styles.infoText} numberOfLines={1}>
            {room.capacity} seats
          </Text>
        </View>

        {/* 5. Badge trạng thái */}
        <StatusBadge status={room.status} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    marginBottom: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EEF0F3',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 96,
    backgroundColor: '#E5E7EB',
  },
  content: {
    paddingHorizontal: 9,
    paddingTop: 8,
    paddingBottom: 9,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    gap: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 10,
    color: '#6B7280',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 4,
  },
  badgeAvailable: {
    backgroundColor: '#DCFCE7',
  },
  badgeOccupied: {
    backgroundColor: '#FEE2E2',
  },
  badgeBooked: {
    backgroundColor: '#DBEAFE',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
    marginLeft: 4,
  },
  badgeTextAvailable: {
    color: '#16A34A',
  },
  badgeTextOccupied: {
    color: '#DC2626',
  },
  badgeTextBooked: {
    color: '#2563EB',
  },
});

export default RoomCard;