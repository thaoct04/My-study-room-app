import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth } from '../config/firebase';

type AuthMode = 'signIn' | 'signUp';

const getAuthErrorMessage = (error: unknown): string => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return 'An unexpected error occurred. Please try again.';
  }

  switch (error.code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'The email or password is incorrect.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Use a password with at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait and try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled in Firebase Console.';
    default:
      return 'Could not authenticate. Check your Firebase settings and try again.';
  }
};

const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      Alert.alert('Missing information', 'Enter your email and password.');
      return;
    }
    if (mode === 'signUp' && !name.trim()) {
      Alert.alert('Name required', 'Enter your name to create an account.');
      return;
    }
    if (mode === 'signUp' && password.length < 6) {
      Alert.alert('Password too short', 'Use a password with at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signUp') {
        const credential = await createUserWithEmailAndPassword(
          auth,
          normalizedEmail,
          password,
        );
        await updateProfile(credential.user, { displayName: name.trim() });
      } else {
        await signInWithEmailAndPassword(auth, normalizedEmail, password);
      }
    } catch (error: unknown) {
      Alert.alert('Authentication failed', getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      Alert.alert('Email required', 'Enter your email address first.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      Alert.alert('Check your inbox', 'A password reset link has been sent.');
    } catch (error: unknown) {
      Alert.alert('Could not send reset email', getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const isSignUp = mode === 'signUp';

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.logo}>
            <Ionicons name="library-outline" size={34} color="#2563EB" />
          </View>
          <Text style={styles.title}>Study Room</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? 'Create your account to get started.' : 'Sign in to continue to your rooms.'}
          </Text>

          <View style={styles.form}>
            {isSignUp && (
              <>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  autoCapitalize="words"
                  editable={!loading}
                  returnKeyType="next"
                />
              </>
            )}
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              returnKeyType="next"
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={submit}
            />

            {!isSignUp && (
              <TouchableOpacity
                style={styles.resetLink}
                onPress={resetPassword}
                disabled={loading}
              >
                <Text style={styles.linkText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={submit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>
                  {isSignUp ? 'Create account' : 'Sign in'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity
              onPress={() => setMode(isSignUp ? 'signIn' : 'signUp')}
              disabled={loading}
            >
              <Text style={styles.linkText}>{isSignUp ? 'Sign in' : 'Sign up'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  keyboardView: { flex: 1, justifyContent: 'center' },
  content: { paddingHorizontal: 26, paddingVertical: 28 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 18,
  },
  title: { textAlign: 'center', fontSize: 27, color: '#111827', fontWeight: '800' },
  subtitle: { textAlign: 'center', color: '#6B7280', fontSize: 14, marginTop: 8 },
  form: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 18,
    marginTop: 28,
  },
  label: { color: '#374151', fontSize: 13, fontWeight: '700', marginBottom: 7 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 11,
    paddingHorizontal: 13,
    color: '#111827',
    fontSize: 15,
    marginBottom: 16,
  },
  resetLink: { alignSelf: 'flex-end', marginTop: -5, marginBottom: 18 },
  linkText: { color: '#2563EB', fontWeight: '700', fontSize: 14 },
  submitButton: {
    height: 49,
    borderRadius: 11,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.65 },
  submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 22,
  },
  switchText: { color: '#6B7280', fontSize: 14 },
});

export default AuthScreen;
