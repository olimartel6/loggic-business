import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen from '../screens/DashboardScreen';
import ScannerScreen from '../screens/ScannerScreen';
import ClientsScreen from '../screens/ClientsScreen';
import ClientDetailScreen from '../screens/ClientDetailScreen';
import OffersScreen from '../screens/OffersScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AuditScreen from '../screens/AuditScreen';

const Tab = createBottomTabNavigator();
const ClientsStackNav = createNativeStackNavigator();
const SettingsStackNav = createNativeStackNavigator();

const stackScreenOptions = {
  headerStyle: { backgroundColor: '#0f0f1a' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' as const },
};

function ClientsStack({ route }: any) {
  const { business } = route.params;
  return (
    <ClientsStackNav.Navigator screenOptions={stackScreenOptions}>
      <ClientsStackNav.Screen name="ClientsList" component={ClientsScreen} options={{ headerTitle: 'Clients' }} initialParams={{ business }} />
      <ClientsStackNav.Screen name="ClientDetail" component={ClientDetailScreen} options={{ headerTitle: 'Detail client' }} initialParams={{ business }} />
    </ClientsStackNav.Navigator>
  );
}

function SettingsStack({ route }: any) {
  const { business, onSignOut } = route.params;
  return (
    <SettingsStackNav.Navigator screenOptions={stackScreenOptions}>
      <SettingsStackNav.Screen name="SettingsMain" component={SettingsScreen} options={{ headerTitle: 'Reglages' }} initialParams={{ business, onSignOut }} />
      <SettingsStackNav.Screen name="Audit" component={AuditScreen} options={{ headerTitle: 'Audit employes' }} initialParams={{ business }} />
    </SettingsStackNav.Navigator>
  );
}

const tabIcons: Record<string, string> = {
  Dashboard: 'grid',
  Scanner: 'qr-code',
  ClientsTab: 'people',
  Offers: 'pricetag',
  SettingsTab: 'settings',
};

export default function AppNavigator({ business, onSignOut }: { business: any; onSignOut: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icon = tabIcons[route.name] || 'ellipse';
          const iconName = focused ? icon : `${icon}-outline`;
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
        name="ClientsTab"
        component={ClientsStack}
        options={{ tabBarLabel: 'Clients', headerShown: false }}
        initialParams={{ business }}
      />
      <Tab.Screen
        name="Offers"
        component={OffersScreen}
        options={{ tabBarLabel: 'Offres', headerTitle: 'Offres' }}
        initialParams={{ business }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{ tabBarLabel: 'Reglages', headerShown: false }}
        initialParams={{ business, onSignOut }}
      />
    </Tab.Navigator>
  );
}
