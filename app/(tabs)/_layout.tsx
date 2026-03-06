import { MaterialIcons } from '@expo/vector-icons';
import { Redirect, Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';

export default function TabLayout() {
  const { url, token, isLoading } = useAuthStore();
  const { colors } = useThemeStore();
  const router = useRouter();

  if (!isLoading && (!url || !token)) {
    return <Redirect href="/setup" />;
  }

  // Custom button component for the center
  const CenterAddButton = ({ children, onPress }: any) => (
    <TouchableOpacity
      style={{
        top: -20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
      }}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <MaterialIcons name="add" size={30} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 85 : 70,
          paddingBottom: Platform.OS === 'ios' ? 24 : 14,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <MaterialIcons size={24} name="dashboard" color={color} /> }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transazioni', tabBarIcon: ({ color }) => <MaterialIcons size={24} name="receipt-long" color={color} /> }} />

      {/* The centered Add button */}
      <Tabs.Screen
        name="new-tx-placeholder"
        options={{
          title: '',
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <CenterAddButton {...props} onPress={() => router.push('/new-transaction' as any)} />
          ),
        }}
        listeners={() => ({
          tabPress: (e) => {
            e.preventDefault(); // Prevent default navigation
            router.push('/new-transaction' as any);
          },
        })}
      />

      <Tabs.Screen name="accounts" options={{ title: 'Conti', tabBarIcon: ({ color }) => <MaterialIcons size={24} name="account-balance-wallet" color={color} /> }} />

      {/* Budget is removed from tabs to make space, placed in Altro menu */}
      <Tabs.Screen name="budget" options={{ href: null }} />

      <Tabs.Screen name="profile" options={{ title: 'Altro', tabBarIcon: ({ color }) => <MaterialIcons size={24} name="more-horiz" color={color} /> }} />
    </Tabs>
  );
}
