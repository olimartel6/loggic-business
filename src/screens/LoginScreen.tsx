import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Animated, useWindowDimensions,
} from 'react-native';
import { signIn } from '../services/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (err: any) {
      Alert.alert('Erreur de connexion', err.message || 'Email ou mot de passe invalide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Animated.View style={[styles.inner, isTablet && { maxWidth: 440, alignSelf: 'center', width: '100%' }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.logoContainer}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>LB</Text>
          </View>
          <Text style={styles.title}>Loggic Business</Text>
          <Text style={styles.subtitle}>Gestion de programme de fidelite</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="admin@votrecommerce.com"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Votre mot de passe"
            placeholderTextColor="#666"
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Se connecter</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>LogicSupplies Inc.</Text>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logoBox: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  logoText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888' },
  form: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#aaa', marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16,
    fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#2a2a4a',
  },
  button: {
    backgroundColor: '#4f46e5', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { textAlign: 'center', color: '#444', marginTop: 48, fontSize: 12 },
});
