import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { supabase, getAdminBusiness } from './src/services/supabase';
import LoginScreen from './src/screens/LoginScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AppNavigator from './src/navigation/AppNavigator';

let LocalAuthentication: any = null;
try { LocalAuthentication = require('expo-local-authentication'); } catch {}

function AppContent() {
  const [session, setSession] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [biometricLocked, setBiometricLocked] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      // Check onboarding
      const done = await SecureStore.getItemAsync('onboarding_done');
      if (!done) {
        setShowOnboarding(true);
        setCheckingOnboarding(false);
        setLoading(false);
        return;
      }

      // Check biometric
      if (LocalAuthentication) {
        const biometricEnabled = await SecureStore.getItemAsync('biometric_enabled');
        if (biometricEnabled === 'true') {
          try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            if (hasHardware) {
              setBiometricLocked(true);
              setCheckingOnboarding(false);
              setLoading(false);
              const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Deverrouiller Loggic Business',
                cancelLabel: 'Annuler',
              });
              if (!result.success) return;
              setBiometricLocked(false);
              setLoading(true);
            }
          } catch {}
        }
      }

      setCheckingOnboarding(false);
    } catch {}

    // Load session
    loadSession();
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
    loadSession();
  };

  if (biometricLocked) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a', gap: 16 }}>
        <StatusBar style="light" />
        <View style={{ width: 80, height: 80, borderRadius: 20, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 32, fontWeight: '800', color: '#fff' }}>LB</Text>
        </View>
        <Text style={{ color: '#888', fontSize: 16 }}>Verrouille</Text>
      </View>
    );
  }

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
