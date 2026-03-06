import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
    url: string | null;
    token: string | null;
    isLoading: boolean;
    biometricEnabled: boolean;
    isUnlocked: boolean;
    setCredentials: (url: string, token: string) => Promise<void>;
    logout: () => Promise<void>;
    loadCredentials: () => Promise<void>;
    setBiometric: (enabled: boolean) => Promise<void>;
    unlock: () => void;
    lock: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    url: null,
    token: null,
    isLoading: true,
    biometricEnabled: false,
    isUnlocked: false,
    setCredentials: async (url, token) => {
        const formattedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        await SecureStore.setItemAsync('firefly_url', formattedUrl);
        await SecureStore.setItemAsync('firefly_token', token);
        set({ url: formattedUrl, token, isLoading: false });
    },
    loadCredentials: async () => {
        try {
            const url = await SecureStore.getItemAsync('firefly_url');
            const token = await SecureStore.getItemAsync('firefly_token');
            const bioStr = await SecureStore.getItemAsync('firefly_biometric');
            const biometricEnabled = bioStr === 'true';
            set({ url, token, biometricEnabled, isLoading: false, isUnlocked: !biometricEnabled });
        } catch (e) {
            console.warn("SecureStore load error", e);
            set({ url: null, token: null, isLoading: false, isUnlocked: true });
        }
    },
    setBiometric: async (enabled: boolean) => {
        await SecureStore.setItemAsync('firefly_biometric', enabled ? 'true' : 'false');
        set({ biometricEnabled: enabled });
    },
    unlock: () => set({ isUnlocked: true }),
    lock: () => set((state) => ({ isUnlocked: state.biometricEnabled ? false : true })),
    logout: async () => {
        await SecureStore.deleteItemAsync('firefly_url');
        await SecureStore.deleteItemAsync('firefly_token');
        await SecureStore.deleteItemAsync('firefly_biometric');
        set({ url: null, token: null, biometricEnabled: false, isUnlocked: true });
    },
}));
