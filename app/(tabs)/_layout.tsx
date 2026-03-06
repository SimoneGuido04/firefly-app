import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { MaterialIcons } from '@expo/vector-icons';

export default function TabLayout() {
  const { url, token, isLoading } = useAuthStore();
  const { colors } = useThemeStore();

  if (!isLoading && (!url || !token)) {
    return <Redirect href="/setup" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 14,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <MaterialIcons size={24} name="dashboard" color={color} /> }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transazioni', tabBarIcon: ({ color }) => <MaterialIcons size={24} name="receipt-long" color={color} /> }} />
      <Tabs.Screen name="accounts" options={{ title: 'Conti', tabBarIcon: ({ color }) => <MaterialIcons size={24} name="account-balance-wallet" color={color} /> }} />
      <Tabs.Screen name="budget" options={{ title: 'Budget', tabBarIcon: ({ color }) => <MaterialIcons size={24} name="pie-chart" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Altro', tabBarIcon: ({ color }) => <MaterialIcons size={24} name="more-horiz" color={color} /> }} />
    </Tabs>
  );
}
