import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

import { db } from '../config/firebase';
import { MOCK_ROOMS } from '../data/mockData';
import {
  DEFAULT_BOOKING_SLOT,
  getDateKey,
  getRoomSlotBookingCounts,
} from './bookingService';
import {
  DEFAULT_ROOM_TIME_SLOTS,
  Room,
  RoomStatus,
} from '../types/room';

const ROOMS_COLLECTION = 'rooms';
const roomsCollection = collection(db, ROOMS_COLLECTION);

const isRoomStatus = (value: unknown): value is RoomStatus =>
  value === 'available' || value === 'occupied' || value === 'booked';

const normalizeTime = (value: unknown, roomId: string): string => {
  if (typeof value !== 'string') {
    throw new Error(`Room document "${roomId}" has an invalid time slot.`);
  }
  const match = value.trim().match(/^(\d{1,2}):([0-5]\d)$/);
  if (!match || Number(match[1]) > 23) {
    throw new Error(`Room document "${roomId}" has an invalid time slot.`);
  }
  return `${match[1].padStart(2, '0')}:${match[2]}`;
};

const normalizeRoomTimeSlots = (
  value: unknown,
  roomId: string,
): string[] => {
  if (!Array.isArray(value)) {
    throw new Error(`Room document "${roomId}" has invalid timeSlots.`);
  }

  return value.map((slot: unknown) => {
    let startTime: unknown;
    let endTime: unknown;
    if (typeof slot === 'string') {
      const match = slot.match(/^\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*$/);
      if (!match) {
        throw new Error(`Room document "${roomId}" has an invalid time slot.`);
      }
      [, startTime, endTime] = match;
    } else if (slot && typeof slot === 'object') {
      const timeSlot = slot as Record<string, unknown>;
      startTime = timeSlot.startTime;
      endTime = timeSlot.endTime;
    } else {
      throw new Error(`Room document "${roomId}" has an invalid time slot.`);
    }

    return `${normalizeTime(startTime, roomId)} - ${normalizeTime(endTime, roomId)}`;
  });
};

const toRoom = (id: string, data: Record<string, unknown>): Room => {
  if (
    typeof data.name !== 'string' ||
    typeof data.building !== 'string' ||
    typeof data.capacity !== 'number' ||
    !Number.isFinite(data.capacity) ||
    data.capacity < 1 ||
    !isRoomStatus(data.status) ||
    (data.imageUrl !== undefined && typeof data.imageUrl !== 'string')
  ) {
    throw new Error(`Room document "${id}" has invalid data.`);
  }

  return {
    id,
    name: data.name,
    building: data.building,
    capacity: data.capacity,
    status: data.status,
    timeSlots:
      data.timeSlots === undefined
        ? [...DEFAULT_ROOM_TIME_SLOTS]
        : normalizeRoomTimeSlots(data.timeSlots, id),
    ...(typeof data.imageUrl === 'string' ? { imageUrl: data.imageUrl } : {}),
  };
};

export const getRooms = async (
  date = getDateKey(),
  slot = DEFAULT_BOOKING_SLOT,
): Promise<Room[]> => {
  const [snapshot, bookingCounts] = await Promise.all([
    getDocs(roomsCollection),
    getRoomSlotBookingCounts(date, slot),
  ]);
  return snapshot.docs.map((roomDoc) => {
    const room = toRoom(roomDoc.id, roomDoc.data());
    const bookingCount = bookingCounts[room.id] ?? 0;
    return {
      ...room,
      bookingCount,
      status:
        bookingCount >= room.capacity
          ? 'occupied'
          : 'available',
    };
  });
};

export const addRoom = async (room: Omit<Room, 'id'>): Promise<Room> => {
  const { bookingCount: _bookingCount, ...roomData } = room;
  const roomRef = await addDoc(roomsCollection, roomData);
  return { ...room, id: roomRef.id };
};

export const updateRoom = async (
  roomId: string,
  changes: Partial<Omit<Room, 'id'>>,
): Promise<void> => {
  if (Object.keys(changes).length === 0) return;
  if (
    changes.capacity !== undefined &&
    (!Number.isFinite(changes.capacity) || changes.capacity < 1)
  ) {
    throw new Error('Room capacity must be a positive number.');
  }
  const { bookingCount: _bookingCount, ...roomChanges } = changes;
  if (Object.keys(roomChanges).length === 0) return;
  await updateDoc(doc(db, ROOMS_COLLECTION, roomId), roomChanges);
};

export const deleteRoom = async (roomId: string): Promise<void> => {
  await deleteDoc(doc(db, ROOMS_COLLECTION, roomId));
};

export const seedRoomsIfEmpty = async (): Promise<boolean> => {
  const snapshot = await getDocs(roomsCollection);
  if (!snapshot.empty) return false;

  const batch = writeBatch(db);
  MOCK_ROOMS.forEach(({ id, ...room }) => {
    batch.set(doc(db, ROOMS_COLLECTION, id), room);
  });
  await batch.commit();
  return true;
};
