import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { getClientById, addPoints, searchClients, supabase } from '../services/supabase';
import { hapticSuccess, hapticMedium } from '../utils/haptics';

export default function ScannerScreen({ route }: any) {
  const { business } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [client, setClient] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [manualPoints, setManualPoints] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'scan' | 'manual' | 'result'>('scan');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [batchAmount, setBatchAmount] = useState('');
  const [batchLog, setBatchLog] = useState<string[]>([]);

  const ptsPerDollar = business.points_per_dollar || 10;

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setLoading(true);
    try {
      const c = await getClientById(data);
      if (c && c.business_id === business.id) {
        if (batchMode && batchAmount) {
          const pts = Math.round(parseFloat(batchAmount) * ptsPerDollar);
          await addPoints(business.id, c.id, pts, 'purchase', `Achat de $${batchAmount}`, parseFloat(batchAmount));
          hapticSuccess();
          setBatchLog(prev => [`${c.name}: +${pts} pts`, ...prev]);
          setTimeout(() => setScanned(false), 1500);
        } else {
          setClient(c);
          setMode('result');
        }
      } else {
        Alert.alert('Erreur', 'Client non trouve ou mauvais commerce');
        setScanned(false);
      }
    } catch {
      Alert.alert('Erreur', 'Code QR invalide');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const results = await searchClients(business.id, searchQuery.trim());
    setSearchResults(results);
  };

  const selectClient = (c: any) => {
    setClient(c);
    setMode('result');
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleAddPoints = async () => {
    if (!client) return;
    const pts = manualPoints ? parseInt(manualPoints) : Math.round(parseFloat(amount || '0') * ptsPerDollar);
    if (pts <= 0) {
      Alert.alert('Erreur', 'Montant invalide');
      return;
    }
    setLoading(true);
    try {
      const desc = manualPoints ? 'Ajout manuel' : `Achat de $${amount}`;
      const spent = manualPoints ? undefined : parseFloat(amount);
      await addPoints(business.id, client.id, pts, manualPoints ? 'manual' : 'purchase', desc, spent);
      hapticSuccess();
      Alert.alert('Succes', `${pts} points ajoutes a ${client.name}`, [
        { text: 'OK', onPress: resetScanner },
        ...(client.phone ? [{
          text: 'Envoyer SMS',
          onPress: async () => {
            try {
              await supabase.functions.invoke('send-sms', {
                body: { phone: client.phone, message: `Vous avez recu ${pts} points! Solde: ${(client.points_balance || 0) + pts} pts. Merci! - ${business.name}` },
              });
            } catch {}
            resetScanner();
          },
        }] : []),
      ]);
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setClient(null);
    setAmount('');
    setManualPoints('');
    setMode('scan');
  };

  if (!permission) return <View style={styles.center}><ActivityIndicator color="#4f46e5" /></View>;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={64} color="#666" />
        <Text style={styles.permText}>Permission camera requise</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Autoriser la camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (mode === 'result' && client) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.resultContainer}>
          <View style={styles.clientCard}>
            <View style={styles.clientAvatar}>
              <Text style={styles.avatarText}>{(client.name || '?')[0].toUpperCase()}</Text>
            </View>
            <Text style={styles.clientName}>{client.name}</Text>
            <Text style={styles.clientPhone}>{client.phone || client.email || ''}</Text>
            <View style={styles.pointsBadge}>
              <Ionicons name="star" size={16} color="#f59e0b" />
              <Text style={styles.pointsText}>{client.points_balance || 0} pts</Text>
            </View>
            <Text style={styles.visitText}>{client.visit_count || 0} visites</Text>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Montant de l'achat ($)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={(v) => { setAmount(v); setManualPoints(''); }}
              placeholder="Ex: 45.00"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
            />
            {amount ? (
              <Text style={styles.preview}>= {Math.round(parseFloat(amount || '0') * ptsPerDollar)} points</Text>
            ) : null}

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Ou points manuels</Text>
            <TextInput
              style={styles.input}
              value={manualPoints}
              onChangeText={(v) => { setManualPoints(v); setAmount(''); }}
              placeholder="Ex: 100"
              placeholderTextColor="#666"
              keyboardType="number-pad"
            />
          </View>

          <TouchableOpacity
            style={[styles.addBtn, loading && { opacity: 0.6 }]}
            onPress={handleAddPoints}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.addBtnText}>Ajouter les points</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={resetScanner}>
            <Text style={styles.cancelBtnText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, mode === 'scan' && styles.tabActive]}
          onPress={() => setMode('scan')}
        >
          <Ionicons name="qr-code" size={18} color={mode === 'scan' ? '#fff' : '#888'} />
          <Text style={[styles.tabText, mode === 'scan' && styles.tabTextActive]}>Scanner</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mode === 'manual' && styles.tabActive]}
          onPress={() => setMode('manual')}
        >
          <Ionicons name="search" size={18} color={mode === 'manual' ? '#fff' : '#888'} />
          <Text style={[styles.tabText, mode === 'manual' && styles.tabTextActive]}>Recherche</Text>
        </TouchableOpacity>
      </View>

      {mode === 'scan' && (
        <View style={styles.batchBar}>
          <TouchableOpacity
            style={[styles.batchToggle, batchMode && styles.batchToggleActive]}
            onPress={() => { setBatchMode(!batchMode); setBatchLog([]); }}
          >
            <Ionicons name="flash" size={16} color={batchMode ? '#fff' : '#888'} />
            <Text style={[styles.batchToggleText, batchMode && { color: '#fff' }]}>Batch</Text>
          </TouchableOpacity>
          {batchMode && (
            <TextInput
              style={styles.batchInput}
              value={batchAmount}
              onChangeText={setBatchAmount}
              placeholder="Montant $"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
            />
          )}
        </View>
      )}

      {mode === 'scan' ? (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.scanText}>Scannez le QR du client</Text>
          </View>
          {loading && <ActivityIndicator size="large" color="#4f46e5" style={styles.scanLoader} />}
          {batchMode && batchLog.length > 0 && (
            <View style={styles.batchLogOverlay}>
              {batchLog.slice(0, 5).map((log, i) => (
                <Text key={i} style={[styles.batchLogText, i === 0 && { color: '#10b981', fontWeight: '700' }]}>{log}</Text>
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Nom, telephone ou email..."
              placeholderTextColor="#666"
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
              <Ionicons name="search" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          {searchResults.map((c) => (
            <TouchableOpacity key={c.id} style={styles.searchResult} onPress={() => selectClient(c)}>
              <View style={styles.resultAvatar}>
                <Text style={styles.resultAvatarText}>{(c.name || '?')[0].toUpperCase()}</Text>
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{c.name}</Text>
                <Text style={styles.resultDetail}>{c.phone || c.email} | {c.points_balance || 0} pts</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a', gap: 16 },
  permText: { color: '#aaa', fontSize: 16 },
  permBtn: { backgroundColor: '#4f46e5', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  permBtnText: { color: '#fff', fontWeight: '600' },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 8, gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: '#1a1a2e' },
  tabActive: { backgroundColor: '#4f46e5' },
  tabText: { color: '#888', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  cameraContainer: { flex: 1, margin: 20, borderRadius: 20, overflow: 'hidden' },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 220, height: 220, borderWidth: 3, borderColor: '#4f46e5', borderRadius: 20 },
  scanText: { color: '#fff', marginTop: 20, fontSize: 16, fontWeight: '600' },
  scanLoader: { position: 'absolute', top: '50%', alignSelf: 'center' },
  searchContainer: { flex: 1, padding: 20 },
  searchBar: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  searchInput: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#2a2a4a' },
  searchBtn: { backgroundColor: '#4f46e5', borderRadius: 12, padding: 14, justifyContent: 'center' },
  searchResult: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14, marginBottom: 8, gap: 12 },
  resultAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' },
  resultAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  resultInfo: { flex: 1 },
  resultName: { color: '#fff', fontWeight: '600', fontSize: 15 },
  resultDetail: { color: '#888', fontSize: 13, marginTop: 2 },
  resultContainer: { flex: 1, padding: 24, justifyContent: 'center' },
  clientCard: { alignItems: 'center', marginBottom: 32 },
  clientAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  clientName: { color: '#fff', fontSize: 22, fontWeight: '700' },
  clientPhone: { color: '#888', fontSize: 14, marginTop: 4 },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f59e0b20', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
  pointsText: { color: '#f59e0b', fontWeight: '700', fontSize: 16 },
  visitText: { color: '#666', fontSize: 13, marginTop: 6 },
  inputSection: { marginBottom: 24 },
  inputLabel: { color: '#aaa', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, color: '#fff', fontSize: 18, borderWidth: 1, borderColor: '#2a2a4a' },
  preview: { color: '#4f46e5', fontSize: 14, fontWeight: '600', marginTop: 6 },
  addBtn: { backgroundColor: '#10b981', borderRadius: 12, padding: 16, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { padding: 16, alignItems: 'center', marginTop: 8 },
  cancelBtnText: { color: '#888', fontSize: 15 },
  batchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 8, marginTop: 8 },
  batchToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1a1a2e', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  batchToggleActive: { backgroundColor: '#f59e0b' },
  batchToggleText: { color: '#888', fontWeight: '600', fontSize: 13 },
  batchInput: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#2a2a4a' },
  batchLogOverlay: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 12, padding: 12 },
  batchLogText: { color: '#aaa', fontSize: 13, marginBottom: 2 },
});
