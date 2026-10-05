import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import SearchBar from '../components/SearchBar';
import FilterButton from '../components/FilterButton';
import NotificationBadge from '../components/NotificationBadge';
import RoomCard from '../components/RoomCard';
import NotificationScreen from './NotificationScreen';
import { useAppState } from '../context/AppStateContext';
import { DEFAULT_ROOM_TIME_SLOTS, Room } from '../types/room';
import { auth } from '../config/firebase';
import {
  BookingConflictError,
  getBookingTimeRange,
} from '../services/bookingService';
import { showBookingFailure, showBookingSuccess } from '../utils/bookingAlert';

const NUM_COLUMNS = 2;
type AvailabilityFilter = 'all' | 'available' | 'unavailable';

const getDateOptions = () => {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const toDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`;
  return [
    { key: toDateKey(today), label: 'Today' },
    { key: toDateKey(tomorrow), label: 'Tomorrow' },
  ];
};

const BrowseRoomsScreen: React.FC = () => {
  const {
    rooms,
    bookings,
    profile,
    createBooking,
    loading,
    availabilityLoading,
    availabilityDate,
    availabilitySlot,
    error,
    refreshData,
    refreshRooms,
  } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilter>('all');
  const [capacityFilter, setCapacityFilter] = useState(0);
  const [draftAvailability, setDraftAvailability] =
    useState<AvailabilityFilter>('all');
  const [draftCapacity, setDraftCapacity] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const dateOptions = useMemo(getDateOptions, []);
  const [selectedDate, setSelectedDate] = useState(dateOptions[0].key);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [now, setNow] = useState(Date.now());
  const currentSelectedRoom = selectedRoom
    ? rooms.find((room) => room.id === selectedRoom.id) ?? selectedRoom
    : null;
  const selectedRoomTimeSlots =
    currentSelectedRoom?.timeSlots ?? DEFAULT_ROOM_TIME_SLOTS;
  const availabilityReady =
    availabilityDate === selectedDate &&
    availabilitySlot === selectedSlot &&
    !availabilityLoading;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedRoom || !selectedSlot || availabilityReady) return;
    void refreshRooms(selectedDate, selectedSlot).catch(() => undefined);
  }, [
    selectedRoom?.id,
    selectedDate,
    selectedSlot,
    availabilityReady,
    refreshRooms,
  ]);

  const filteredRooms = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return rooms.filter((room) => {
      const matchesQuery =
        !query ||
        room.name.toLocaleLowerCase().includes(query) ||
        room.building.toLocaleLowerCase().includes(query);
      const matchesAvailability =
        availabilityFilter === 'all' ||
        (availabilityFilter === 'available'
          ? room.status === 'available'
          : room.status === 'occupied');
      return (
        matchesQuery &&
        matchesAvailability &&
        room.capacity >= capacityFilter
      );
    });
  }, [availabilityFilter, capacityFilter, rooms, searchQuery]);
  const draftResultCount = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return rooms.filter((room) => {
      const matchesQuery =
        !query ||
        room.name.toLocaleLowerCase().includes(query) ||
        room.building.toLocaleLowerCase().includes(query);
      const matchesAvailability =
        draftAvailability === 'all' ||
        (draftAvailability === 'available'
          ? room.status === 'available'
          : room.status === 'occupied');
      return matchesQuery && matchesAvailability && room.capacity >= draftCapacity;
    }).length;
  }, [draftAvailability, draftCapacity, rooms, searchQuery]);

  const openRoom = (room: Room) => {
    const initialSlot = (room.timeSlots ?? DEFAULT_ROOM_TIME_SLOTS)[0] ?? '';
    setSelectedRoom(room);
    setSelectedDate(dateOptions[0].key);
    setSelectedSlot(initialSlot);
    if (initialSlot) {
      void refreshRooms(dateOptions[0].key, initialSlot).catch(() => undefined);
    }
  };

  const handleBooking = async () => {
    if (!selectedRoom) return;
    setBookingSubmitting(true);
    try {
      await createBooking(selectedRoom, selectedDate, selectedSlot);
      setSelectedRoom(null);
      showBookingSuccess(selectedRoom.name, selectedDate, selectedSlot);
    } catch (bookingError: unknown) {
      void refreshRooms(selectedDate, selectedSlot).catch(() => undefined);
      const message =
        bookingError instanceof BookingConflictError
          ? bookingError.message
          : bookingError instanceof Error
            ? bookingError.message
            : 'Could not create this booking. Please try again.';
      showBookingFailure(message);
    } finally {
      setBookingSubmitting(false);
    }
  };

  const isSlotFull = (room: Room, date: string, slot: string) =>
    availabilityReady &&
    availabilityDate === date &&
    availabilitySlot === slot &&
    (room.bookingCount ?? 0) >= room.capacity;

  const hasOwnBooking = (room: Room, date: string, slot: string) =>
    bookings.some(
      (booking) =>
        booking.roomId === room.id &&
        booking.date === date &&
        booking.slot === slot &&
        (booking.status === 'CONFIRMED' || booking.status === 'IN_USE'),
    );

  const isPastSlot = (date: string, slot: string) => {
    if (!slot) return true;
    const { startTime, endTime } = getBookingTimeRange(date, slot);
    const start = Date.parse(startTime);
    const end = Date.parse(endTime);
    const isCurrentOrUpcoming =
      (start <= now && now < end) || (now < start && now < end);
    return !isCurrentOrUpcoming;
  };

  const selectSlot = (slot: string) => setSelectedSlot(slot);

  const openFilters = () => {
    setDraftAvailability(availabilityFilter);
    setDraftCapacity(capacityFilter);
    setShowFilters(true);
  };

  const firstName = profile.name.trim().split(/\s+/)[0] || 'there';
  const currentUserId = auth.currentUser?.uid;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.greetingRow}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={20} color="#2563EB" />
          </View>
          <View style={styles.greetingCopy}>
            <Text style={styles.greeting}>Hi, {firstName}</Text>
            <Text style={styles.greetingSubtitle}>Let’s find your study space</Text>
          </View>
          {currentUserId && (
            <NotificationBadge
              userId={currentUserId}
              onPress={() => setShowNotifications(true)}
            />
          )}
        </View>

        <View style={styles.categoryRow}>
          {([
            ['all', 'All rooms'],
            ['available', 'Available'],
            ['unavailable', 'Occupied'],
          ] as [AvailabilityFilter, string][]).map(([value, label]) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.categoryTab,
                availabilityFilter === value && styles.categoryTabSelected,
              ]}
              onPress={() => setAvailabilityFilter(value)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.categoryText,
                  availabilityFilter === value && styles.categoryTextSelected,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.searchRow}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search rooms..."
          />
          <FilterButton onPress={openFilters} />
        </View>
      </View>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#2563EB" />
          <Text style={styles.loadingText}>Loading rooms from Firestore...</Text>
        </View>
      )}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => void refreshData().catch(() => undefined)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredRooms}
        keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <RoomCard
            room={item}
            onPress={openRoom}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={38} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>
              {loading
                ? 'Loading rooms'
                : error
                  ? 'Could not load rooms'
                  : 'No rooms found'}
            </Text>
            {!loading && !error && (
              <Text style={styles.emptyText}>Try changing your search or filters.</Text>
            )}
          </View>
        }
      />

      {currentUserId && (
        <NotificationScreen
          visible={showNotifications}
          userId={currentUserId}
          onClose={() => setShowNotifications(false)}
        />
      )}

      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowFilters(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Filter rooms</Text>
            <Text style={styles.sectionLabel}>Availability</Text>
            <View style={styles.optionsRow}>
              {([
                ['all', 'All rooms'],
                ['available', 'Available'],
                ['unavailable', 'Unavailable'],
              ] as [AvailabilityFilter, string][]).map(([value, label]) => (
                <ChoiceChip
                  key={value}
                  label={label}
                  selected={draftAvailability === value}
                  onPress={() => setDraftAvailability(value)}
                />
              ))}
            </View>
            <Text style={styles.sectionLabel}>Minimum capacity</Text>
            <View style={styles.optionsRow}>
              {[0, 10, 25, 50].map((value) => (
                <ChoiceChip
                  key={value}
                  label={value === 0 ? 'Any' : `${value}+`}
                  selected={draftCapacity === value}
                  onPress={() => setDraftCapacity(value)}
                />
              ))}
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setDraftAvailability('all');
                  setDraftCapacity(0);
                }}
              >
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  setAvailabilityFilter(draftAvailability);
                  setCapacityFilter(draftCapacity);
                  setShowFilters(false);
                }}
              >
                <Text style={styles.primaryButtonText}>Show {draftResultCount} rooms</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={selectedRoom !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedRoom(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedRoom(null)} />
          {selectedRoom && (
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedRoom(null)}
                accessibilityLabel="Close room details"
              >
                <Ionicons name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
              <Image
                source={{ uri: selectedRoom.imageUrl }}
                style={styles.detailImage}
                resizeMode="cover"
              />
              <Text style={styles.sheetTitle}>{selectedRoom.name}</Text>
              <Text style={styles.detailText}>
                {selectedRoom.building} · {selectedRoom.capacity} seats
              </Text>
              <Text style={styles.sectionLabel}>Choose a day</Text>
              <View style={styles.optionsRow}>
                {dateOptions.map((option) => (
                  <ChoiceChip
                    key={option.key}
                    label={option.label}
                    selected={selectedDate === option.key}
                    onPress={() => setSelectedDate(option.key)}
                  />
                ))}
              </View>
              <Text style={styles.sectionLabel}>Choose a time</Text>
              <View style={styles.optionsColumn}>
                {selectedRoomTimeSlots.map((slot) => {
                  const slotFull = isSlotFull(
                    currentSelectedRoom ?? selectedRoom,
                    selectedDate,
                    slot,
                  );
                  const slotEnded = isPastSlot(selectedDate, slot);
                  const ownBooking = hasOwnBooking(selectedRoom, selectedDate, slot);
                  const currentCount =
                    availabilityReady && availabilitySlot === slot
                      ? currentSelectedRoom?.bookingCount ?? 0
                      : undefined;
                  const capacity =
                    currentSelectedRoom?.capacity ?? selectedRoom.capacity;
                  const label = slotEnded
                    ? `${slot} · Ended`
                    : ownBooking
                      ? `${slot} · Your booking`
                      : slotFull
                        ? `${slot} · Fully booked`
                        : currentCount !== undefined
                          ? `${slot} · ${Math.max(0, capacity - currentCount)} seats available`
                          : `${slot} · Available`;
                  return (
                    <ChoiceChip
                      key={slot}
                      label={label}
                      selected={selectedSlot === slot}
                      disabled={slotFull || slotEnded || ownBooking}
                      onPress={() => selectSlot(slot)}
                    />
                  );
                })}
                {selectedRoomTimeSlots.length === 0 && (
                  <Text style={styles.loadingText}>No time slots configured.</Text>
                )}
              </View>
              {availabilityLoading && (
                <View style={styles.slotLoading}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.loadingText}>Checking capacity...</Text>
                </View>
              )}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  styles.bookButton,
                  (!availabilityReady ||
                    isSlotFull(
                      currentSelectedRoom ?? selectedRoom,
                      selectedDate,
                      selectedSlot,
                    ) ||
                    isPastSlot(selectedDate, selectedSlot) ||
                    hasOwnBooking(selectedRoom, selectedDate, selectedSlot)) &&
                    styles.disabledButton,
                ]}
                disabled={
                  bookingSubmitting ||
                  !availabilityReady ||
                  isSlotFull(
                    currentSelectedRoom ?? selectedRoom,
                    selectedDate,
                    selectedSlot,
                  ) ||
                  isPastSlot(selectedDate, selectedSlot) ||
                  hasOwnBooking(selectedRoom, selectedDate, selectedSlot)
                }
                onPress={handleBooking}
              >
                <Text style={styles.primaryButtonText}>
                  {bookingSubmitting
                    ? 'Booking...'
                    : !selectedSlot
                      ? 'No time slots configured'
                      : isSlotFull(
                          currentSelectedRoom ?? selectedRoom,
                          selectedDate,
                          selectedSlot,
                        )
                        ? `Fully booked (${currentSelectedRoom?.bookingCount ?? 0}/${currentSelectedRoom?.capacity ?? selectedRoom.capacity})`
                        : isPastSlot(selectedDate, selectedSlot)
                          ? 'Khung giờ đã kết thúc'
                          : 'Đặt phòng'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

interface ChoiceChipProps {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}

const ChoiceChip: React.FC<ChoiceChipProps> = ({
  label,
  selected,
  disabled = false,
  onPress,
}) => (
  <TouchableOpacity
    style={[
      styles.chip,
      selected && styles.chipSelected,
      disabled && styles.chipDisabled,
    ]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text
      style={[
        styles.chipText,
        selected && styles.chipTextSelected,
        disabled && styles.chipTextDisabled,
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
  },
  greetingCopy: { flex: 1, marginLeft: 11 },
  greeting: { color: '#111827', fontSize: 16, fontWeight: '700' },
  greetingSubtitle: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoryTab: {
    paddingTop: 5,
    paddingBottom: 11,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  categoryTabSelected: { borderBottomColor: '#2563EB' },
  categoryText: { color: '#6B7280', fontSize: 13, fontWeight: '500' },
  categoryTextSelected: { color: '#2563EB', fontWeight: '700' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 13,
  },
  columnWrapper: { gap: 10 },
  listContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 20, flexGrow: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 70 },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '700', color: '#374151' },
  emptyText: { marginTop: 5, fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 18, paddingBottom: 10 },
  loadingText: { color: '#6B7280', fontSize: 13 },
  slotLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  errorBox: { marginHorizontal: 16, marginBottom: 10, padding: 12, borderRadius: 10, backgroundColor: '#FEF2F2' },
  errorText: { color: '#B91C1C', fontSize: 13 },
  retryText: { color: '#2563EB', fontWeight: '700', marginTop: 8 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0006' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
    maxHeight: '90%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginBottom: 18,
  },
  sheetTitle: { fontSize: 21, fontWeight: '700', color: '#111827', marginBottom: 8 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginTop: 18, marginBottom: 10 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionsColumn: { gap: 8, alignItems: 'flex-start' },
  chip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipSelected: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  chipDisabled: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  chipText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  chipTextSelected: { color: '#2563EB', fontWeight: '700' },
  chipTextDisabled: { color: '#9CA3AF' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 28 },
  resetButton: { paddingHorizontal: 14, paddingVertical: 13 },
  resetText: { fontWeight: '700', color: '#4B5563' },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  detailImage: { width: '100%', height: 170, borderRadius: 14, marginBottom: 16 },
  detailText: { color: '#6B7280', fontSize: 14 },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFFE8',
  },
  bookButton: { flex: 0, marginTop: 22 },
  disabledButton: { backgroundColor: '#9CA3AF' },
});

export default BrowseRoomsScreen;
