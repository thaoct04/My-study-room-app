// src/types/room.ts
// Định nghĩa các kiểu dữ liệu (Type) cho thực thể Room (phòng học)
// Giúp code an toàn về kiểu dữ liệu (Type-safe) và dễ bảo trì.

/**
 * Trạng thái đặt phòng của một phòng học.
 * - 'available': phòng còn trống, có thể đặt
 * - 'occupied' : phòng đã bị đặt/đang sử dụng
 */
export type RoomStatus = 'available' | 'occupied' | 'booked';

export const DEFAULT_ROOM_TIME_SLOTS = [
  '09:00 - 11:00',
  '13:00 - 15:00',
  '15:00 - 17:00',
];

/**
 * Interface mô tả một phòng học trong hệ thống.
 */
export interface Room {
  /** Mã định danh duy nhất của phòng */
  id: string;

  /** Tên phòng, ví dụ: "Lab A3-101", "Library Zone B" */
  name: string;

  /** Địa điểm / tòa nhà chứa phòng, ví dụ: "Building A3", "Main Library" */
  building: string;

  /** Sức chứa (số chỗ ngồi), ví dụ: 30, 50 */
  capacity: number;

  /** Trạng thái đặt phòng hiện tại */
  status: RoomStatus;
  /** Number of active bookings in the currently selected time slot. */
  bookingCount?: number;
  /** Booking time ranges configured for this room. */
  timeSlots?: string[];

  /**
   * URL ảnh đại diện của phòng (có thể là ảnh remote hoặc placeholder).
   * Optional vì có thể không phải phòng nào cũng có ảnh.
   */
  imageUrl?: string;
}

/**
 * Props cho component RoomCard.
 */
export interface RoomCardProps {
  /** Dữ liệu phòng cần hiển thị */
  room: Room;

  /** Hàm callback khi người dùng bấm vào thẻ phòng (tùy chọn) */
  onPress?: (room: Room) => void;
}