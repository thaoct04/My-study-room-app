// index.ts - Điểm khởi tạo ứng dụng Expo
// Đăng ký root component của app với Expo
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent gọi AppRegistry.registerComponent('main', () => App)
// và đảm bảo môi trường được thiết lập đúng cho cả Expo Go và native build.
registerRootComponent(App);