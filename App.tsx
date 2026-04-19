import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { supabase, getAdminBusiness } from './src/services/supabase';
import LoginScreen from './src/screens/LoginScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AppNavigator from './src/navigation/AppNavigator';

function AppContent() {
  const [session, setSession] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    checkOnboarding();
    loadSession();
  }, []);

  const checkOnboarding = async () => {
    try {
      const done = await SecureStore.getItemAsync('onboarding_done');
      if (!done) setShowOnboarding(true);
    } catch {}
    setCheckingOnboarding(false);
  };

  const loadSession = () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadBusiness(session.user.id);
      else setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadBusiness(session.user.id);
      } else {
        setBusiness(null);
        setLoading(false);
      }
    });
  };

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

  const handleOnboardingComplete = async () => {
    await SecureStore.setItemAsync('onboarding_done', 'true');
    setShowOnboarding(false);
  };

  if (checkingOnboarding || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <StatusBar style="light" />
      </View>
    );
  }

  if (showOnboarding) {
    return (
      <>
        <StatusBar style="light" />
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </>
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

export default function App() {
  return <AppContent />;
}
