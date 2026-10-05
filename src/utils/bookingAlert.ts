
import Toast from 'react-native-toast-message';

export const showBookingSuccess = (
  roomName: string,
  date: string,
  slot: string,
): void => {
  Toast.show({
    type: 'success',
    text1: 'Thành công 🎉',
    text2: `Đặt phòng: ${roomName}\nNgày: ${date} | Khung giờ: ${slot}`,
    position: 'top',
    visibilityTime: 3000, // Tự biến mất sau 3 giây
  });
};

export const showBookingFailure = (reason: string): void => {
  Toast.show({
    type: 'error',
    text1: 'Đặt phòng thất bại ❌',
    text2: reason,
    position: 'top',
    visibilityTime: 3000,
  });
};