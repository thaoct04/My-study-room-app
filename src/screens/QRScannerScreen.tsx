import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppState } from '../context/AppStateContext';

const getBookingId = (data: string): string | null => {
  const value = data.trim();
  if (!value) return null;

  let bookingId = value;
  if (value.startsWith('{')) {
    try {
      const payload: unknown = JSON.parse(value);
      if (
        typeof payload !== 'object' ||
        payload === null ||
        !('bookingId' in payload) ||
        typeof payload.bookingId !== 'string'
      ) {
        return null;
      }
      bookingId = payload.bookingId.trim();
    } catch {
      return null;
    }
  }

  return bookingId && !bookingId.includes('/') ? bookingId : null;
};

const QRScannerScreen: React.FC = () => {
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const { checkInBooking } = useAppState();
  const [hasScanned, setHasScanned] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const scanLock = useRef(false);

  useEffect(() => {
    if (isFocused) {
      scanLock.current = false;
      setHasScanned(false);
      setScanMessage(null);
    }
  }, [isFocused]);

  useEffect(() => {
    if (isFocused && permission && !permission.granted) {
      void requestPermission().catch((permissionError: unknown) => {
        Alert.alert(
          'Không thể xin quyền camera',
          permissionError instanceof Error
            ? permissionError.message
            : 'Vui lòng kiểm tra cài đặt quyền camera trên thiết bị.',
        );
      });
    }
  }, [isFocused, permission?.granted, requestPermission]);

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (scanLock.current) return;
      scanLock.current = true;
      setHasScanned(true);

      const bookingId = getBookingId(data);
      if (!bookingId) {
        const message = 'Mã QR không đúng định dạng booking.';
        setScanMessage(message);
        Alert.alert('Mã QR không hợp lệ', message);
        return;
      }

      try {
        await checkInBooking(bookingId);
        const message = 'Check-in thành công. Lượt đặt đã được xác nhận.';
        setScanMessage(message);
        Alert.alert('Check-in thành công', message);
      } catch (checkInError: unknown) {
        const message =
          checkInError instanceof Error
            ? checkInError.message
            : 'Không thể check-in. Vui lòng thử lại.';
        setScanMessage(message);
        Alert.alert('Không thể check-in', message);
      }
    },
    [checkInBooking],
  );

  const retryScan = () => {
    scanLock.current = false;
    setHasScanned(false);
    setScanMessage(null);
  };

  const showPermissionRequest = !permission || !permission.granted;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Self Check-in</Text>
        <Text style={styles.subtitle}>
          Quét mã QR trên lượt đặt phòng để check-in.
        </Text>
      </View>

      <View style={styles.cameraFrame}>
        {showPermissionRequest ? (
          <View style={styles.centerContent}>
            {!permission ? (
              <ActivityIndicator size="large" color="#2563EB" />
            ) : (
              <>
                <Text style={styles.permissionTitle}>Cần quyền truy cập camera</Text>
                <Text style={styles.permissionText}>
                  Cho phép camera để quét mã QR check-in.
                </Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => {
                    void requestPermission().catch((permissionError: unknown) => {
                      Alert.alert(
                        'Không thể xin quyền camera',
                        permissionError instanceof Error
                          ? permissionError.message
                          : 'Vui lòng kiểm tra cài đặt quyền camera trên thiết bị.',
                      );
                    });
                  }}
                >
                  <Text style={styles.primaryButtonText}>Cấp quyền camera</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : hasScanned ? (
          <View style={styles.centerContent}>
            <Text style={styles.resultTitle}>Đã dừng quét</Text>
            <Text style={styles.resultText}>{scanMessage}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={retryScan}>
              <Text style={styles.primaryButtonText}>Quét lại</Text>
            </TouchableOpacity>
          </View>
        ) : isFocused ? (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarcodeScanned}
            />
            <View pointerEvents="none" style={styles.scanOverlay}>
              <View style={styles.scanFrame} />
              <Text style={styles.scanHint}>Đặt mã QR vào trong khung</Text>
            </View>
          </>
        ) : (
          <View style={styles.centerContent}>
            <Text style={styles.permissionText}>Mở tab này để bắt đầu quét.</Text>
          </View>
        )}
      </View>

      {Platform.OS === 'web' && (
        <Text style={styles.webHint}>
          Trên web, hãy mở ứng dụng bằng trình duyệt có hỗ trợ camera và cấp quyền truy cập.
        </Text>
      )}
    </SafeAreaView>
  );
};

export default QRScannerScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 },
  title: { color: '#111827', fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#6B7280', fontSize: 14, marginTop: 5 },
  cameraFrame: {
    flex: 1,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: '#111827',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  permissionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  permissionText: { color: '#D1D5DB', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    marginTop: 20,
    paddingHorizontal: 22,
    paddingVertical: 13,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  resultTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  resultText: { color: '#D1D5DB', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  scanOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  scanHint: {
    color: '#FFFFFF',
    backgroundColor: 'rgba(17, 24, 39, 0.65)',
    borderRadius: 8,
    marginTop: 22,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  webHint: { color: '#6B7280', fontSize: 12, textAlign: 'center', padding: 12 },
});
