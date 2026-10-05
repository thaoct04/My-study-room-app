import { collection, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../config/firebase";

// Danh sách khung giờ chuẩn áp dụng cho tất cả các phòng
const DEFAULT_TIME_SLOTS = [
  "08:00 - 10:00",
  "10:15 - 12:15",
  "13:00 - 15:00",
  "15:15 - 17:15",
  "17:30 - 19:30"
];

/**
 * Hàm cập nhật hàng loạt field timeSlots cho tất cả document trong collection 'rooms'
 */
export const updateAllRoomsTimeSlots = async (): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    const roomsRef = collection(db, "rooms");
    const snapshot = await getDocs(roomsRef);

    if (snapshot.empty) {
      console.log("Không tìm thấy phòng nào trong collection 'rooms'.");
      return { success: false, count: 0, error: "Collection 'rooms' rỗng." };
    }

    const batch = writeBatch(db);
    let updatedCount = 0;

    snapshot.docs.forEach((roomDoc) => {
      // Gán mảng timeSlots chuẩn vào từng document phòng
      batch.update(roomDoc.ref, {
        timeSlots: DEFAULT_TIME_SLOTS
      });
      updatedCount++;
    });

    // Thực thi batch ghi đồng loạt vào Firestore
    await batch.commit();

    console.log(`✅ Thành công! Đã cập nhật timeSlots cho ${updatedCount} phòng trên Firestore.`);
    return { success: true, count: updatedCount };
  } catch (error: any) {
    console.error("❌ Lỗi khi cập nhật timeSlots hàng loạt:", error);
    return { success: false, count: 0, error: error?.message || "Đã xảy ra lỗi." };
  }
};