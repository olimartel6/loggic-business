import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen from '../screens/DashboardScreen';
import ScannerScreen from '../screens/ScannerScreen';
import ClientsScreen from '../screens/ClientsScreen';
import OffersScreen from '../screens/OffersScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const tabConfig: Record<string, { icon: string; label: string }> = {
  Dashboard: { icon: 'grid', label: 'Accueil' },
  Scanner: { icon: 'qr-code', label: 'Scanner' },
  Clients: { icon: 'people', label: 'Clients' },
  Offers: { icon: 'pricetag', label: 'Offres' },
  Settings: { icon: 'settings', label: 'Reglages' },
};

export default function AppNavigator({ business, onSignOut }: { business: any; onSignOut: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const cfg = tabConfig[route.name];
          const iconName = focused ? cfg.icon : `${cfg.icon}-outline`;
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#0f0f1a',
          borderTopColor: '#1a1a2e',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 88,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: '#0f0f1a', shadowColor: 'transparent' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Accueil', headerTitle: 'Tableau de bord' }}
        initialParams={{ business }}
      />
      <Tab.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{ tabBarLabel: 'Scanner', headerTitle: 'Scanner QR' }}
        initialParams={{ business }}
      />
      <Tab.Screen
        name="Clients"
        component={ClientsScreen}
        options={{ tabBarLabel: 'Clients', headerTitle: 'Clients' }}
        initialParams={{ business }}
      />
      <Tab.Screen
        name="Offers"
        component={OffersScreen}
        options={{ tabBarLabel: 'Offres', headerTitle: 'Offres' }}
        initialParams={{ business }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Reglages', headerTitle: 'Reglages' }}
        initialParams={{ business, onSignOut }}
      />
    </Tab.Navigator>
  );
}
