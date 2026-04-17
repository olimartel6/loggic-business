import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { supabase, getAdminBusiness } from './src/services/supabase';
import LoginScreen from './src/screens/LoginScreen';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadBusiness(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadBusiness(session.user.id);
      } else {
        setBusiness(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadBusiness = async (userId: string) => {
    try {
      const admin = await getAdminBusiness(userId);
      setBusiness(admin.loyalty_businesses);
    } catch (err) {
      console.error('No business found for this admin:', err);
      setBusiness(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    setSession(null);
    setBusiness(null);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      {session && business ? (
        <AppNavigator business={business} onSignOut={handleSignOut} />
      ) : (
        <LoginScreen />
      )}
    </NavigationContainer>
  );
}
