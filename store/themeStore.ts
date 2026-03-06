import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
    bg: string;
    bgCard: string;
    bgSecondary: string;
    border: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    primary: string;
    primaryBg: string;
    tabBar: string;
    tabBarBorder: string;
    tabInactive: string;
    success: string;
    danger: string;
    warning: string;
    inputBg: string;
}

export const LIGHT: ThemeColors = {
    bg: '#f6f7f8',
    bgCard: '#ffffff',
    bgSecondary: '#f1f5f9',
    border: '#e2e8f0',
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    primary: '#1d4ed8',
    primaryBg: 'rgba(29,78,216,0.08)',
    tabBar: '#ffffff',
    tabBarBorder: '#e2e8f0',
    tabInactive: '#94a3b8',
    success: '#16a34a',
    danger: '#dc2626',
    warning: '#d97706',
    inputBg: '#f1f5f9',
};

export const DARK: ThemeColors = {
    bg: '#0c1320',
    bgCard: '#0f172a',
    bgSecondary: '#1e293b',
    border: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#64748b',
    textMuted: '#475569',
    primary: '#3b82f6',
    primaryBg: 'rgba(59,130,246,0.12)',
    tabBar: '#0f172a',
    tabBarBorder: '#1e293b',
    tabInactive: '#475569',
    success: '#34d399',
    danger: '#f87171',
    warning: '#f59e0b',
    inputBg: '#0f172a',
};

interface ThemeState {
    mode: ThemeMode;
    colors: ThemeColors;
    toggleTheme: () => Promise<void>;
    loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
    mode: 'dark',
    colors: DARK,
    toggleTheme: async () => {
        const newMode = get().mode === 'dark' ? 'light' : 'dark';
        await SecureStore.setItemAsync('firefly_theme', newMode);
        set({ mode: newMode, colors: newMode === 'dark' ? DARK : LIGHT });
    },
    loadTheme: async () => {
        try {
            const saved = await SecureStore.getItemAsync('firefly_theme');
            if (saved === 'light' || saved === 'dark') {
                set({ mode: saved, colors: saved === 'dark' ? DARK : LIGHT });
            }
        } catch { }
    },
}));
