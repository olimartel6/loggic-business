import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { supabase, getAdminBusiness } from './src/services/supabase';
import LoginScreen from './src/screens/LoginScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/utils/theme';
import { I18nProvider } from './src/utils/i18n';

SplashScreen.preventAutoHideAsync();

const linking = {
  prefixes: [Linking.createURL('/'), 'loggicbusiness://'],
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
  const [splashAnim] = useState(new Animated.Value(1));
  const [splashDone, setSplashDone] = useState(false);
  const { theme, isDark } = useTheme();

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    // Check onboarding
    const onboardingDone = await SecureStore.getItemAsync('onboarding_done');
    if (!onboardingDone) {
      setShowOnboarding(true);
      setLoading(false);
      animateSplash();
      return;
    }

    // Check biometric
    const biometricEnabled = await SecureStore.getItemAsync('biometric_enabled');
    if (biometricEnabled === 'true') {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (hasHardware) {
        setBiometricLocked(true);
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Deverrouiller Loggic Business',
          cancelLabel: 'Annuler',
        });
        if (!result.success) {
          setBiometricLocked(true);
          setLoading(false);
          animateSplash();
          return;
        }
        setBiometricLocked(false);
      }
    }

    // Load session
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    if (session) await loadBusiness(session.user.id);
    else setLoading(false);

    animateSplash();

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadBusiness(session.user.id);
      } else {
        setBusiness(null);
      }
    });
  };

  const animateSplash = () => {
    setTimeout(() => {
      SplashScreen.hideAsync();
      Animated.timing(splashAnim, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
        setSplashDone(true);
      });
    }, 800);
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

  // Animated splash overlay
  const splashOverlay = !splashDone ? (
    <Animated.View
      style={{
        ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 } as any),
        backgroundColor: '#0f0f1a',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: splashAnim,
      }}
      pointerEvents="none"
    >
      <View style={{ width: 80, height: 80, borderRadius: 20, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 32, fontWeight: '800', color: '#fff' }}>LB</Text>
      </View>
    </Animated.View>
  ) : null;

  if (showOnboarding) {
    return (
      <>
        <StatusBar style="light" />
        <OnboardingScreen onComplete={() => { setShowOnboarding(false); initApp(); }} />
        {splashOverlay}
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
    <NavigationContainer linking={linking}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {session && business ? (
        <AppNavigator business={business} onSignOut={handleSignOut} />
      ) : (
        <LoginScreen />
      )}
      {splashOverlay}
    </NavigationContainer>
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
