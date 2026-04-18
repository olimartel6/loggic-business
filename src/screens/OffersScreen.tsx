import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, Modal, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getOffers, createOffer, updateBusinessSettings } from '../services/supabase';
import { supabase } from '../services/supabase';

export default function OffersScreen({ route }: any) {
  const { business } = route.params;
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maxClaims, setMaxClaims] = useState('');
  const [creating, setCreating] = useState(false);

  const loadOffers = async () => {
    try {
      const data = await getOffers(business.id);
      setOffers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadOffers(); }, []));

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Titre requis');
      return;
    }
    setCreating(true);
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);
      await createOffer(business.id, {
        title: title.trim(),
        description: description.trim(),
        valid_until: validUntil.toISOString(),
        max_claims: maxClaims ? parseInt(maxClaims) : undefined,
      });
      setShowModal(false);
      setTitle('');
      setDescription('');
      setMaxClaims('');
      loadOffers();
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleOffer = async (offerId: string, currentActive: boolean) => {
    await supabase.from('loyalty_offers').update({ active: !currentActive }).eq('id', offerId);
    loadOffers();
  };

  const renderOffer = ({ item }: { item: any }) => {
    const now = new Date();
    const validFrom = item.valid_from ? new Date(item.valid_from) : null;
    const validUntil = item.valid_until ? new Date(item.valid_until) : null;
    const isScheduled = validFrom && validFrom > now;
    const isExpired = validUntil && validUntil < now;
    const isActive = item.active && !isExpired && !isScheduled;

    return (
      <View style={styles.offerCard}>
        <View style={styles.offerHeader}>
          <TouchableOpacity onPress={() => toggleOffer(item.id, item.active)}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? '#10b981' : isScheduled ? '#f59e0b' : '#666' }]} />
          </TouchableOpacity>
          <Text style={styles.offerTitle}>{item.title}</Text>
          <TouchableOpacity onPress={() => toggleOffer(item.id, item.active)}>
            <Ionicons name={item.active ? 'toggle' : 'toggle-outline'} size={28} color={item.active ? '#10b981' : '#666'} />
          </TouchableOpacity>
        </View>
        {item.description && <Text style={styles.offerDesc}>{item.description}</Text>}
        <View style={styles.offerMeta}>
          <Text style={styles.offerMetaText}>
            {item.claims_count || 0}{item.max_claims ? `/${item.max_claims}` : ''} utilisations
          </Text>
          {isScheduled && <Text style={[styles.offerMetaText, { color: '#f59e0b' }]}>Debut: {validFrom!.toLocaleDateString('fr-CA')}</Text>}
          {validUntil && <Text style={[styles.offerMetaText, isExpired ? { color: '#ef4444' } : {}]}>
            {isExpired ? 'Expire' : 'Expire'}: {validUntil.toLocaleDateString('fr-CA')}
          </Text>}
        </View>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4f46e5" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={offers}
        keyExtractor={(item) => item.id}
        renderItem={renderOffer}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadOffers(); }} tintColor="#4f46e5" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="pricetag-outline" size={48} color="#444" />
            <Text style={styles.emptyText}>Aucune offre</Text>
            <Text style={styles.emptySubtext}>Creez des promos pour vos clients</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Nouvelle offre</Text>

            <Text style={styles.label}>Titre</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: 2 pour 1 ce weekend"
              placeholderTextColor="#666"
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Details de l'offre..."
              placeholderTextColor="#666"
              multiline
            />

            <Text style={styles.label}>Limite d'utilisations (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={maxClaims}
              onChangeText={setMaxClaims}
              placeholder="Ex: 50"
              placeholderTextColor="#666"
              keyboardType="number-pad"
            />

            <TouchableOpacity
              style={[styles.createBtn, creating && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.createBtnText}>Creer l'offre</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' },
  list: { padding: 16, paddingBottom: 100 },
  offerCard: { backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16, marginBottom: 10 },
  offerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  offerTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 },
  offerDesc: { color: '#aaa', fontSize: 14, marginTop: 6 },
  offerMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  offerMetaText: { color: '#666', fontSize: 12 },
  empty: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyText: { color: '#666', fontSize: 16 },
  emptySubtext: { color: '#555', fontSize: 13 },
  fab: {
    position: 'absolute', bottom: 100, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 20 },
  label: { color: '#aaa', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#0f0f1a', borderRadius: 12, padding: 14, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#2a2a4a' },
  createBtn: { backgroundColor: '#4f46e5', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { padding: 16, alignItems: 'center' },
  cancelBtnText: { color: '#888', fontSize: 15 },
});
