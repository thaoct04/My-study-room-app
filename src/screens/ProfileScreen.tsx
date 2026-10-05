import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut, updateProfile as updateFirebaseProfile } from 'firebase/auth';

import { useAppState, UserProfile } from '../context/AppStateContext';
import { auth } from '../config/firebase';

const ProfileScreen: React.FC = () => {
  const { profile, updateProfile } = useAppState();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<UserProfile>(profile);

  useEffect(() => {
    if (editing) setDraft(profile);
  }, [editing, profile]);

  const saveProfile = () => {
    const name = draft.name.trim();
    const phone = draft.phone.trim();
    if (!name) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    void updateFirebaseProfile(currentUser, { displayName: name })
      .then(() => {
        updateProfile({ name, email: currentUser.email ?? '', phone });
        setEditing(false);
      })
      .catch(() => {
        Alert.alert('Could not update profile', 'Please check your connection and try again.');
      });
  };

  const handleSignOut = () => {
    void signOut(auth).catch(() => {
      Alert.alert('Could not sign out', 'Please try again.');
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Profile</Text>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={38} color="#2563EB" />
          </View>
          <Text style={styles.name}>{auth.currentUser?.displayName || profile.name}</Text>
          <Text style={styles.email}>{auth.currentUser?.email || profile.email}</Text>
          <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
            <Ionicons name="create-outline" size={17} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Edit profile</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Contact information</Text>
        <View style={styles.infoCard}>
          <ProfileRow
            icon="mail-outline"
            label="Email"
            value={auth.currentUser?.email || profile.email}
          />
          <View style={styles.divider} />
          <ProfileRow
            icon="call-outline"
            label="Phone"
            value={profile.phone || 'Not provided'}
          />
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={19} color="#DC2626" />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={19} color="#2563EB" />
          <Text style={styles.noticeText}>
            Your account is managed by Firebase. Phone number is stored for this app session only.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={editing}
        transparent
        animationType="slide"
        onRequestClose={() => setEditing(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditing(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Edit profile</Text>
            <Text style={styles.fieldLabel}>Full name</Text>
            <TextInput
              style={styles.input}
              value={draft.name}
              onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
              placeholder="Your name"
              autoCapitalize="words"
            />
            <Text style={styles.fieldLabel}>Phone (optional)</Text>
            <TextInput
              style={styles.input}
              value={draft.phone}
              onChangeText={(phone) => setDraft((current) => ({ ...current, phone }))}
              placeholder="Phone number"
              keyboardType="phone-pad"
            />
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditing(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
                <Text style={styles.saveText}>Save changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

interface ProfileRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

const ProfileRow: React.FC<ProfileRowProps> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon} size={19} color="#2563EB" />
    </View>
    <View style={styles.infoTextWrap}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, paddingBottom: 30 },
  pageTitle: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 20 },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
    marginBottom: 14,
  },
  name: { fontSize: 20, fontWeight: '700', color: '#111827' },
  email: { fontSize: 14, color: '#6B7280', marginTop: 5 },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 18,
  },
  editButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginLeft: 7 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 24, marginBottom: 10 },
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E5E7EB' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  infoIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#EFF6FF',
    marginRight: 12,
  },
  infoTextWrap: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#9CA3AF' },
  infoValue: { fontSize: 14, color: '#374151', fontWeight: '600', marginTop: 3 },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 18, gap: 8 },
  noticeText: { flex: 1, color: '#6B7280', fontSize: 13, lineHeight: 18 },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 22,
  },
  signOutText: { color: '#DC2626', fontWeight: '700', fontSize: 14 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0006' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
  sheetHandle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', marginBottom: 18 },
  sheetTitle: { fontSize: 21, fontWeight: '700', color: '#111827', marginBottom: 18 },
  fieldLabel: { color: '#374151', fontSize: 13, fontWeight: '600', marginBottom: 7 },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#111827',
    marginBottom: 15,
    fontSize: 15,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  cancelButton: { paddingHorizontal: 14, paddingVertical: 13 },
  cancelText: { color: '#4B5563', fontWeight: '700' },
  saveButton: { flex: 1, alignItems: 'center', borderRadius: 11, paddingVertical: 14, backgroundColor: '#2563EB' },
  saveText: { color: '#FFFFFF', fontWeight: '700' },
});

export default ProfileScreen;
