import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';

let LocalAuthentication: any = null;
try { LocalAuthentication = require('expo-local-authentication'); } catch {}

let Linking: any = null;
try { Linking = require('expo-linking'); } catch {}
import { supabase, getAdminBusiness } from './src/services/supabase';
import LoginScreen from './src/screens/LoginScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/utils/theme';
import { I18nProvider } from './src/utils/i18n';

const linking = {
  prefixes: ['loggicbusiness://', ...(Linking ? [Linking.createURL('/')] : [])],
  config: {
    screens: {
      ClientsTab: {
        screens: {
          ClientDetail: 'client/:clientId',
        },
      },
      Dashboard: 'dashboard',
      Scanner: 'scanner',
    },
  },
};

function AppContent() {
  const [session, setSession] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [biometricLocked, setBiometricLocked] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const { theme, isDark } = useTheme();

  useEffect(() => {
    initApp();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [loading, showOnboarding, biometricLocked]);

  const initApp = async () => {
    try {
      // Check onboarding
      const onboardingDone = await SecureStore.getItemAsync('onboarding_done');
      if (!onboardingDone) {
        setShowOnboarding(true);
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

      // Load session
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) await loadBusiness(session.user.id);
      else setLoading(false);
    } catch (err) {
      console.error('Init error:', err);
      setLoading(false);
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadBusiness(session.user.id);
      } else {
        setBusiness(null);
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

  if (showOnboarding) {
    return (
      <>
        <StatusBar style="light" />
        <OnboardingScreen onComplete={() => { setShowOnboarding(false); initApp(); }} />
      </>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  if (biometricLocked) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg, gap: 16 }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={{ width: 80, height: 80, borderRadius: 20, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 32, fontWeight: '800', color: '#fff' }}>LB</Text>
        </View>
        <Text style={{ color: theme.textSecondary, fontSize: 16 }}>Verrouille</Text>
      </View>
    );
  }

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <NavigationContainer linking={linking}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {session && business ? (
          <AppNavigator business={business} onSignOut={handleSignOut} />
        ) : (
          <LoginScreen />
        )}
      </NavigationContainer>
    </Animated.View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AppContent />
      </I18nProvider>
    </ThemeProvider>
  );
}
