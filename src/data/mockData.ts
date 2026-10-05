// src/data/mockData.ts
// Chứa danh sách dữ liệu phòng học mẫu (mock data) để phát triển UI
// trước khi kết nối với API backend thật.

import { Room } from '../types/room';

/**
 * Danh sách 8 phòng học mẫu.
 * Bao gồm cả trạng thái 'available' và 'occupied' để minh họa UI badge.
 */
export const MOCK_ROOMS: Room[] = [
  {
    id: '1',
    name: 'Lab A3-101',
    building: 'Building A3',
    capacity: 30,
    status: 'available',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400',
  },
  {
    id: '2',
    name: 'Library Zone B',
    building: 'Main Library',
    capacity: 50,
    status: 'occupied',
    imageUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=400',
  },
  {
    id: '3',
    name: 'Study Room 204',
    building: 'Building C2',
    capacity: 12,
    status: 'available',
    imageUrl: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=400',
  },
  {
    id: '4',
    name: 'Conference Hall',
    building: 'Building A1',
    capacity: 100,
    status: 'occupied',
    imageUrl: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=400',
  },
  {
    id: '5',
    name: 'Quiet Corner 305',
    building: 'Main Library',
    capacity: 8,
    status: 'available',
    imageUrl: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400',
  },
  {
    id: '6',
    name: 'Lab B2-210',
    building: 'Building B2',
    capacity: 25,
    status: 'available',
    imageUrl: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400',
  },
  {
    id: '7',
    name: 'Group Study 112',
    building: 'Building C1',
    capacity: 18,
    status: 'occupied',
    imageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400',
  },
  {
    id: '8',
    name: 'Innovation Hub',
    building: 'Building D4',
    capacity: 40,
    status: 'available',
    imageUrl: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=400',
  },
];