import {
  collection,
  doc,
  getDocs,
  increment,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

import { db } from '../config/firebase';
import type { Booking, BookingStatus } from '../context/AppStateContext';
import { Room } from '../types/room';

const BOOKINGS_COLLECTION = 'bookings';
const ROOMS_COLLECTION = 'rooms';
export const DEFAULT_BOOKING_SLOT = '09:00 - 11:00';
const CHECK_IN_GRACE_MS = 15 * 60 * 1000;

const isBookingStatus = (status: unknown): status is BookingStatus =>
  status === 'CONFIRMED' ||
  status === 'IN_USE' ||
  status === 'COMPLETED' ||
  status === 'NO_SHOW';

export class BookingConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookingConflictError';
  }
}

export const getDateKey = (date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

export const getBookingTimeRange = (
  date: string,
  slot: string,
): { startTime: string; endTime: string } => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Booking date must use YYYY-MM-DD format.');
  }
  const match = slot.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) throw new Error(`Invalid booking time slot "${slot}".`);

  const [, startHour, startMinute, endHour, endMinute] = match;
  const startTime = new Date(
    `${date}T${startHour.padStart(2, '0')}:${startMinute}:00+07:00`,
  );
  const endTime = new Date(
    `${date}T${endHour.padStart(2, '0')}:${endMinute}:00+07:00`,
  );
  if (
    Number.isNaN(startTime.getTime()) ||
    Number.isNaN(endTime.getTime()) ||
    endTime.getTime() <= startTime.getTime()
  ) {
    throw new Error(`Invalid booking time range for "${date}" and "${slot}".`);
  }
  return {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
  };
};

export const getBookingEndTime = (date: string, slot: string): string =>
  getBookingTimeRange(date, slot).endTime;

export const isBookingExpired = (
  data: Record<string, unknown>,
  now = Date.now(),
): boolean => {
  const endTime =
    typeof data.endTime === 'string'
      ? Date.parse(data.endTime)
      : typeof data.date === 'string' && typeof data.slot === 'string'
        ? Date.parse(getBookingEndTime(data.date, data.slot))
        : Number.NaN;
  if (Number.isNaN(endTime)) {
    throw new Error('Booking is missing a valid endTime, date, or time slot.');
  }
  return now > endTime;
};

const isBookingOccupyingSlot = (
  data: Record<string, unknown>,
  now = Date.now(),
): boolean => {
  if (data.status === 'NO_SHOW' || data.status === 'COMPLETED') return false;
  if (data.status === 'CONFIRMED') {
    const { startTime, endTime } = getBookingRange(data);
    return now <= Math.min(endTime, startTime + CHECK_IN_GRACE_MS);
  }
  if (data.status === 'IN_USE') return !isBookingExpired(data, now);
  return !isBookingExpired(data, now);
};

const getBookingRange = (
  data: Record<string, unknown>,
): { startTime: number; endTime: number } => {
  const fallbackRange =
    typeof data.date === 'string' && typeof data.slot === 'string'
      ? getBookingTimeRange(data.date, data.slot)
      : undefined;
  const startTime =
    typeof data.startTime === 'string'
      ? Date.parse(data.startTime)
      : fallbackRange
        ? Date.parse(fallbackRange.startTime)
        : Number.NaN;
  const endTime =
    typeof data.endTime === 'string'
      ? Date.parse(data.endTime)
      : fallbackRange
        ? Date.parse(fallbackRange.endTime)
        : Number.NaN;
  if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime <= startTime) {
    throw new Error('Booking has an invalid time range.');
  }
  return { startTime, endTime };
};

const overlapsTimeRange = (
  booking: Record<string, unknown>,
  startTime: number,
  endTime: number,
): boolean => {
  const bookingRange = getBookingRange(booking);
  return bookingRange.startTime < endTime && bookingRange.endTime > startTime;
};

const toBooking = (
  id: string,
  data: Record<string, unknown>,
  now = Date.now(),
): Booking => {
  if (
    typeof data.roomId !== 'string' ||
    typeof data.roomName !== 'string' ||
    typeof data.building !== 'string' ||
    typeof data.date !== 'string' ||
    typeof data.slot !== 'string' ||
    typeof data.userId !== 'string'
  ) {
    throw new Error(`Booking document "${id}" has invalid data.`);
  }
  const bookingTimeRange = getBookingTimeRange(data.date, data.slot);
  const startTime =
    typeof data.startTime === 'string'
      ? data.startTime
      : bookingTimeRange.startTime;
  const endTime =
    typeof data.endTime === 'string' ? data.endTime : bookingTimeRange.endTime;
  const storedStatus = data.status;
  const status: BookingStatus = isBookingStatus(storedStatus)
    ? storedStatus
    : storedStatus === 'expired' || isBookingExpired({ ...data, endTime }, now)
      ? 'COMPLETED'
      : 'CONFIRMED';
  return {
    id,
    roomId: data.roomId,
    roomName: data.roomName,
    building: data.building,
    date: data.date,
    slot: data.slot,
    userId: data.userId,
    startTime,
    endTime,
    status,
  };
};

const toBookings = (
  documents: Array<{ id: string; data: () => Record<string, unknown> }>,
): Booking[] =>
  documents.map((bookingDoc) => toBooking(bookingDoc.id, bookingDoc.data()));

export const getBookings = async (userId: string): Promise<Booking[]> => {
  const bookingsQuery = query(
    collection(db, BOOKINGS_COLLECTION),
    where('userId', '==', userId),
  );
  const snapshot = await getDocs(bookingsQuery);
  return toBookings(snapshot.docs);
};

export const subscribeToBookings = (
  userId: string,
  onBookings: (bookings: Booking[]) => void,
  onError: (error: Error) => void,
): (() => void) => {
  const bookingsQuery = query(
    collection(db, BOOKINGS_COLLECTION),
    where('userId', '==', userId),
  );
  return onSnapshot(
    bookingsQuery,
    (snapshot) => onBookings(toBookings(snapshot.docs)),
    onError,
  );
};

export const getRoomSlotBookingCounts = async (
  date: string,
  slot: string,
): Promise<Record<string, number>> => {
  const requestedRange = getBookingTimeRange(date, slot);
  const bookingsQuery = query(
    collection(db, BOOKINGS_COLLECTION),
    where('date', '==', date),
  );
  const snapshot = await getDocs(bookingsQuery);
  const counts: Record<string, number> = {};

  snapshot.docs.forEach((bookingDoc) => {
    const data = bookingDoc.data();
    if (
      !isBookingOccupyingSlot(data) ||
      !overlapsTimeRange(
        data,
        Date.parse(requestedRange.startTime),
        Date.parse(requestedRange.endTime),
      )
    ) {
      return;
    }
    if (typeof data.roomId !== 'string') {
      throw new Error(`Booking document "${bookingDoc.id}" has no roomId.`);
    }
    counts[data.roomId] = (counts[data.roomId] ?? 0) + 1;
  });
  return counts;
};

export const addBooking = async (
  room: Room,
  date: string,
  slot: string,
  userId: string,
): Promise<Booking> => {
  const { startTime, endTime } = getBookingTimeRange(date, slot);
  if (Date.parse(endTime) <= Date.now()) {
    throw new BookingConflictError('Khung giờ đặt phòng đã kết thúc.');
  }
  const roomRef = doc(db, ROOMS_COLLECTION, room.id);
  const roomBookingsQuery = query(
    collection(db, BOOKINGS_COLLECTION),
    where('roomId', '==', room.id),
    where('date', '==', date),
  );
  const bookingRef = doc(collection(db, BOOKINGS_COLLECTION));
  let createdBooking: Booking | undefined;

  await runTransaction(db, async (transaction) => {
    const roomSnapshot = await transaction.get(roomRef);
    if (!roomSnapshot.exists()) {
      throw new Error('This room no longer exists.');
    }
    const roomCapacity = roomSnapshot.data().capacity;
    if (
      typeof roomCapacity !== 'number' ||
      !Number.isFinite(roomCapacity) ||
      roomCapacity < 1
    ) {
      throw new Error('Sức chứa của phòng trong Firestore không hợp lệ.');
    }
    const bookingsSnapshot = await getDocs(roomBookingsQuery);
    const active = bookingsSnapshot.docs.filter(
      (bookingDoc) =>
        isBookingOccupyingSlot(bookingDoc.data()) &&
        overlapsTimeRange(
          bookingDoc.data(),
          Date.parse(startTime),
          Date.parse(endTime),
        ),
    );

    if (active.some((bookingDoc) => bookingDoc.data().userId === userId)) {
      throw new BookingConflictError(
        'Bạn đã đặt phòng này trong khung giờ đã chọn.',
      );
    }
    if (active.length >= roomCapacity) {
      throw new BookingConflictError(
        `Phòng đã đủ sức chứa (${active.length}/${roomCapacity}).`,
      );
    }

    const bookingId = bookingRef.id;
    createdBooking = {
      id: bookingId,
      roomId: room.id,
      roomName: room.name,
      building: room.building,
      date,
      slot,
      userId,
      startTime,
      endTime,
      status: 'CONFIRMED',
    };
    transaction.set(bookingRef, {
      roomId: room.id,
      roomName: room.name,
      building: room.building,
      date,
      slot,
      userId,
      startTime,
      endTime,
      status: 'CONFIRMED',
      createdAt: serverTimestamp(),
    });
    transaction.update(roomRef, { bookingRevision: increment(1) });
  });

  if (!createdBooking) {
    throw new Error('Firestore completed without creating a booking.');
  }
  return createdBooking;
};

const functions = getFunctions(undefined, 'us-central1');
const extendBookingCallable = httpsCallable<
  { bookingId: string; minutes: number },
  { endTime: string }
>(functions, 'extendBooking');

export const checkInBooking = async (
  bookingId: string,
  userId: string,
): Promise<void> => {
  const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
  await runTransaction(db, async (transaction) => {
    const bookingSnapshot = await transaction.get(bookingRef);
    if (!bookingSnapshot.exists()) {
      throw new Error('Không tìm thấy lượt đặt này. Mã QR có thể không hợp lệ hoặc lượt đặt đã bị hủy.');
    }

    const bookingData = bookingSnapshot.data();
    if (bookingData.userId !== userId) {
      throw new Error('Mã QR không thuộc tài khoản đang đăng nhập.');
    }
    if (bookingData.status === 'IN_USE' || bookingData.checkedInAt) {
      throw new Error('Lượt đặt này đã được check-in trước đó.');
    }
    if (
      bookingData.status === 'CANCELLED' ||
      bookingData.status === 'CANCELED' ||
      bookingData.status === 'cancelled' ||
      bookingData.status === 'canceled'
    ) {
      throw new Error('Lượt đặt này đã bị hủy, không thể check-in.');
    }
    if (bookingData.status === 'NO_SHOW' || bookingData.status === 'COMPLETED') {
      throw new Error('Lượt đặt này đã bị hủy hoặc đã kết thúc, không thể check-in.');
    }
    if (bookingData.status !== 'CONFIRMED') {
      throw new Error('Trạng thái lượt đặt không hợp lệ để check-in.');
    }

    transaction.update(bookingRef, {
      status: 'IN_USE',
      checkedInAt: serverTimestamp(),
    });
  });
};

export const extendBooking = async (
  bookingId: string,
  minutes: number,
): Promise<void> => {
  await extendBookingCallable({ bookingId, minutes });
};

export const cancelBooking = async (
  bookingId: string,
  userId: string,
): Promise<void> => {
  const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
  await runTransaction(db, async (transaction) => {
    const bookingSnapshot = await transaction.get(bookingRef);
    if (!bookingSnapshot.exists()) {
      throw new Error('This booking no longer exists.');
    }
    if (bookingSnapshot.data().userId !== userId) {
      throw new Error('You can only cancel your own bookings.');
    }
    const roomId = bookingSnapshot.data().roomId;
    if (typeof roomId !== 'string') {
      throw new Error('This booking has no associated room.');
    }
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);
    const roomSnapshot = await transaction.get(roomRef);
    if (roomSnapshot.exists()) {
      transaction.update(roomRef, { bookingRevision: increment(1) });
    }
    transaction.delete(bookingRef);
  });
};
