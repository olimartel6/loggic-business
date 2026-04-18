import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getClientTransactions, updateClient, supabase } from '../services/supabase';

export default function ClientDetailScreen({ route, navigation }: any) {
  const { client: initialClient, business } = route.params;
  const [client, setClient] = useState(initialClient);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notes, setNotes] = useState(client.notes || '');
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  const loadData = async () => {
    try {
      const txs = await getClientTransactions(client.id);
      setTransactions(txs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await updateClient(client.id, { notes });
      setClient({ ...client, notes });
      setEditingNotes(false);
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  const getTierInfo = (points: number) => {
    const tiers = business.tiers || [
      { name: 'Bronze', color: '#CD7F32', min_points: 0 },
      { name: 'Argent', color: '#C0C0C0', min_points: 500 },
      { name: 'Or', color: '#FFD700', min_points: 2000 },
      { name: 'Platine', color: '#E5E4E2', min_points: 5000 },
    ];
    let tier = tiers[0];
    for (const t of tiers) if (points >= t.min_points) tier = t;
    return tier;
  };

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    const ext = uri.split('.').pop() || 'jpg';
    const fileName = `client-photos/${client.id}.${ext}`;
    const formData = new FormData();
    formData.append('file', { uri, name: fileName, type: `image/${ext}` } as any);
    const { error } = await supabase.storage.from('loyalty').upload(fileName, formData, { upsert: true });
    if (error) { Alert.alert('Erreur', error.message); return; }
    const { data: urlData } = supabase.storage.from('loyalty').getPublicUrl(fileName);
    await updateClient(client.id, { photo_url: urlData.publicUrl });
    setClient({ ...client, photo_url: urlData.publicUrl });
  };

  const tier = getTierInfo(client.total_points_earned || 0);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'purchase': return { icon: 'cart', color: '#10b981' };
      case 'visit': return { icon: 'footsteps', color: '#06b6d4' };
      case 'referral': return { icon: 'people', color: '#8b5cf6' };
      case 'redemption': return { icon: 'gift', color: '#ef4444' };
      case 'manual': return { icon: 'hand-left', color: '#f59e0b' };
      default: return { icon: 'ellipse', color: '#666' };
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4f46e5" /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#4f46e5" />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePickPhoto} style={[styles.avatar, { backgroundColor: tier.color + '30' }]}>
          {client.photo_url ? (
            <Image source={{ uri: client.photo_url }} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarText, { color: tier.color }]}>
              {(client.name || '?')[0].toUpperCase()}
            </Text>
          )}
          <View style={styles.cameraIcon}>
            <Ionicons name="camera" size={12} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.name}>{client.name}</Text>
        <Text style={styles.contact}>{client.phone || client.email || ''}</Text>
        <View style={[styles.tierBadge, { backgroundColor: tier.color + '20' }]}>
          <Text style={[styles.tierText, { color: tier.color }]}>{tier.name}</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{client.points_balance || 0}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{client.total_points_earned || 0}</Text>
            <Text style={styles.statLabel}>Total gagne</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{client.visit_count || 0}</Text>
            <Text style={styles.statLabel}>Visites</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Notes internes</Text>
          {!editingNotes ? (
            <TouchableOpacity onPress={() => setEditingNotes(true)}>
              <Ionicons name="create-outline" size={20} color="#4f46e5" />
            </TouchableOpacity>
          ) : null}
        </View>
        {editingNotes ? (
          <View>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Ajouter des notes..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
            />
            <View style={styles.notesActions}>
              <TouchableOpacity style={styles.notesCancelBtn} onPress={() => { setNotes(client.notes || ''); setEditingNotes(false); }}>
                <Text style={styles.notesCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.notesSaveBtn} onPress={handleSaveNotes} disabled={savingNotes}>
                {savingNotes ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.notesSaveText}>Sauvegarder</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.notesText}>{client.notes || 'Aucune note'}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Historique ({transactions.length})</Text>
        {transactions.length === 0 && (
          <Text style={styles.emptyText}>Aucune transaction</Text>
        )}
        {transactions.map((tx) => {
          const typeInfo = getTypeIcon(tx.type);
          return (
            <View key={tx.id} style={styles.txRow}>
              <View style={[styles.txIcon, { backgroundColor: typeInfo.color + '20' }]}>
                <Ionicons name={typeInfo.icon as any} size={16} color={typeInfo.color} />
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txDesc}>{tx.description || tx.type}</Text>
                <Text style={styles.txDate}>
                  {new Date(tx.created_at).toLocaleDateString('fr-CA')} {new Date(tx.created_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <Text style={[styles.txPoints, { color: tx.points >= 0 ? '#10b981' : '#ef4444' }]}>
                {tx.points >= 0 ? '+' : ''}{tx.points} pts
              </Text>
            </View>
          );
        })}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' },
  header: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12, overflow: 'hidden' },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { fontSize: 32, fontWeight: '800' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#4f46e5', borderRadius: 10, padding: 4 },
  name: { fontSize: 24, fontWeight: '700', color: '#fff' },
  contact: { fontSize: 14, color: '#888', marginTop: 4 },
  tierBadge: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12, marginTop: 10 },
  tierText: { fontSize: 13, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 24, marginTop: 20 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  section: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  notesInput: { backgroundColor: '#0f0f1a', borderRadius: 12, padding: 14, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#2a2a4a', minHeight: 80, textAlignVertical: 'top' },
  notesActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  notesCancelBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  notesCancelText: { color: '#888', fontWeight: '600' },
  notesSaveBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  notesSaveText: { color: '#fff', fontWeight: '600' },
  notesText: { color: '#aaa', fontSize: 14 },
  emptyText: { color: '#666', textAlign: 'center', paddingVertical: 16 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  txIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1 },
  txDesc: { color: '#fff', fontSize: 14 },
  txDate: { color: '#666', fontSize: 11, marginTop: 2 },
  txPoints: { fontWeight: '800', fontSize: 14 },
});
