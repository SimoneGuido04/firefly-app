import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useState } from 'react';

function BiometricLockScreen({ onUnlock, isDark }: { onUnlock: () => void; isDark: boolean }) {
  const [error, setError] = useState('');

  const authenticate = useCallback(async () => {
    try {
      setError('');
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) { onUnlock(); return; }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sblocca Firefly III',
        cancelLabel: 'Annulla',
        fallbackLabel: 'Usa password',
        disableDeviceFallback: false,
      });
      if (result.success) onUnlock();
      else setError('Autenticazione fallita');
    } catch (e) {
      console.error(e);
      setError('Errore biometrico');
    }
  }, [onUnlock]);

  useEffect(() => { authenticate(); }, [authenticate]);

  return (
    <View style={[ls.root, { backgroundColor: isDark ? '#0c1320' : '#f6f7f8' }]}>
      <View style={[ls.iconCircle, { backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(29,78,216,0.08)' }]}>
        <MaterialIcons name="fingerprint" size={64} color={isDark ? '#3b82f6' : '#1d4ed8'} />
      </View>
      <Text style={[ls.title, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>Firefly III</Text>
      <Text style={ls.subtitle}>Usa la biometria per sbloccare</Text>
      {error ? <Text style={ls.error}>{error}</Text> : null}
      <TouchableOpacity style={ls.retryBtn} onPress={authenticate}>
        <MaterialIcons name="fingerprint" size={24} color="white" />
        <Text style={ls.retryText}>Riprova</Text>
      </TouchableOpacity>
    </View>
  );
}

const ls = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  iconCircle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  error: { color: '#f87171', fontSize: 13, marginBottom: 16 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1d4ed8', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14,
  },
  retryText: { color: 'white', fontSize: 15, fontWeight: '700' },
});

export default function RootLayout() {
  const { loadCredentials, isLoading, biometricEnabled, isUnlocked, unlock, lock } = useAuthStore();
  const { loadTheme, mode } = useThemeStore();

  useEffect(() => {
    loadCredentials();
    loadTheme();
  }, []);

  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        if (biometricEnabled) lock();
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [biometricEnabled, lock]);

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: mode === 'dark' ? '#0c1320' : '#f6f7f8' }} />;
  }

  if (biometricEnabled && !isUnlocked) {
    return <BiometricLockScreen onUnlock={unlock} isDark={mode === 'dark'} />;
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="setup" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="new-transaction" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="piggy-banks" options={{ headerShown: false }} />
        <Stack.Screen name="bills" options={{ headerShown: false }} />
        <Stack.Screen name="recurring" options={{ headerShown: false }} />
        <Stack.Screen name="reports" options={{ headerShown: false }} />
        <Stack.Screen name="transaction/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="new-piggy-bank" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="new-bill" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="new-recurring" options={{ headerShown: false, presentation: 'modal' }} />
      </Stack>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </>
  );
}
