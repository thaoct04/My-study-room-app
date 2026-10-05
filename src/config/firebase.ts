// import { initializeApp } from "firebase/app";
// import { getFirestore } from "firebase/firestore";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import {
//   getAuth,
//   getReactNativePersistence,
//   initializeAuth,
// } from "firebase/auth";

// // Mã cấu hình Firebase của bạn
// const firebaseConfig = {
//   apiKey: "AIzaSyDAGQPRANdvM1QrGhc7ugdPwUg47WaXMM0",
//   authDomain: "appdatphong-5cd01.firebaseapp.com",
//   projectId: "appdatphong-5cd01",
//   storageBucket: "appdatphong-5cd01.firebasestorage.app",
//   messagingSenderId: "574014102588",
//   appId: "1:574014102588:web:1e249a02bc9b2aa0997739"
// };

// // Khởi tạo ứng dụng Firebase
// const app = initializeApp(firebaseConfig);

// // Xuất các dịch vụ ra để dùng trong toàn bộ dự án
// export const db = getFirestore(app);
// const createAuth = () => {
//   try {
//     return initializeAuth(app, {
//       persistence: getReactNativePersistence(AsyncStorage),
//     });
//   } catch (error: unknown) {
//     if (
//       typeof error === 'object' &&
//       error !== null &&
//       'code' in error &&
//       error.code === 'auth/already-initialized'
//     ) {
//       return getAuth(app);
//     }
//     throw error;
//   }
// };

// export const auth = createAuth();

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
  getAuth,
  getReactNativePersistence,
  browserLocalPersistence,
  initializeAuth,
} from "firebase/auth";

// Mã cấu hình Firebase của bạn
const firebaseConfig = {
  apiKey: "AIzaSyDAGQPRANdvM1QrGhc7ugdPwUg47WaXMM0",
  authDomain: "appdatphong-5cd01.firebaseapp.com",
  projectId: "appdatphong-5cd01",
  storageBucket: "appdatphong-5cd01.firebasestorage.app",
  messagingSenderId: "574014102588",
  appId: "1:574014102588:web:1e249a02bc9b2aa0997739"
};

// Khởi tạo ứng dụng Firebase
const app = initializeApp(firebaseConfig);

// Xuất các dịch vụ ra để dùng trong toàn bộ dự án
export const db = getFirestore(app);

const createAuth = () => {
  try {
    // Phân biệt môi trường Web và Mobile để dùng persistence tương ứng
    const persistence = Platform.OS === 'web'
      ? browserLocalPersistence
      : getReactNativePersistence(AsyncStorage);

    return initializeAuth(app, { persistence });
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'auth/already-initialized'
    ) {
      return getAuth(app);
    }
    throw error;
  }
};

export const auth = createAuth();