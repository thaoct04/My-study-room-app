// App.tsx - Root component của ứng dụng

// Bao bọc toàn bộ app trong NavigationContainer và SafeAreaProvider
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { onAuthStateChanged, User } from 'firebase/auth';
import Toast from 'react-native-toast-message';
import AppNavigator from './src/navigation/AppNavigator';
import { AppStateProvider } from './src/context/AppStateContext';
import AuthScreen from './src/screens/AuthScreen';
import { auth } from './src/config/firebase';

import { updateAllRoomsTimeSlots } from './src/utils/seedTimeSlots';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {

    // updateAllRoomsTimeSlots().catch((err) =>
    //   console.error("Lỗi tự động seed timeSlots:", err)
    // );

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setCheckingAuth(false);
    });
    return unsubscribe;
  }, []);


  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {checkingAuth ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : user ? (
        <AppStateProvider key={user.uid}>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </AppStateProvider>
      ) : (
        <AuthScreen />
      )}

      {/* ĐẶT TOAST Ở ĐÂY - DÒNG CUỐI CÙNG TRƯỚC SAFEAREAPROVIDER */}
      <Toast />
    </SafeAreaProvider>
  );

}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
});