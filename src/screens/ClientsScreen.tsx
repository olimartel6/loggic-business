import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getClients, searchClients } from '../services/supabase';

export default function ClientsScreen({ route }: any) {
  const { business } = route.params;
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadClients = async () => {
    try {
      const data = search.trim()
        ? await searchClients(business.id, search.trim())
        : await getClients(business.id);
      setClients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadClients(); }, [search]));

  const getTierInfo = (points: number) => {
    const tiers = business.tiers || [
      { name: 'Bronze', color: '#CD7F32', min_points: 0 },
      { name: 'Argent', color: '#C0C0C0', min_points: 500 },
      { name: 'Or', color: '#FFD700', min_points: 2000 },
      { name: 'Platine', color: '#E5E4E2', min_points: 5000 },
    ];
    let tier = tiers[0];
    for (const t of tiers) {
      if (points >= t.min_points) tier = t;
    }
    return tier;
  };

  const renderClient = ({ item }: { item: any }) => {
    const tier = getTierInfo(item.total_points_earned || 0);
    return (
      <View style={styles.clientCard}>
        <View style={[styles.avatar, { backgroundColor: tier.color + '30' }]}>
          <Text style={[styles.avatarText, { color: tier.color }]}>
            {(item.name || '?')[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{item.name || 'Sans nom'}</Text>
          <Text style={styles.clientDetail}>
            {item.phone || item.email || 'Pas de contact'}
          </Text>
          <View style={styles.clientMeta}>
            <View style={[styles.tierBadge, { backgroundColor: tier.color + '20' }]}>
              <Text style={[styles.tierText, { color: tier.color }]}>{tier.name}</Text>
            </View>
            <Text style={styles.metaText}>{item.visit_count || 0} visites</Text>
          </View>
        </View>
        <View style={styles.pointsCol}>
          <Text style={styles.pointsValue}>{item.points_balance || 0}</Text>
          <Text style={styles.pointsLabel}>pts</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4f46e5" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#666" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un client..."
          placeholderTextColor="#666"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        renderItem={renderClient}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadClients(); }} tintColor="#4f46e5" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color="#444" />
            <Text style={styles.emptyText}>Aucun client</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1a1a2e', margin: 16, borderRadius: 12,
    paddingHorizontal: 14, borderWidth: 1, borderColor: '#2a2a4a',
  },
  searchInput: { flex: 1, paddingVertical: 14, color: '#fff', fontSize: 15 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  clientCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a2e', borderRadius: 14, padding: 14,
    marginBottom: 8, gap: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  clientInfo: { flex: 1 },
  clientName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  clientDetail: { color: '#888', fontSize: 13, marginTop: 2 },
  clientMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  tierBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tierText: { fontSize: 11, fontWeight: '700' },
  metaText: { color: '#666', fontSize: 11 },
  pointsCol: { alignItems: 'center' },
  pointsValue: { color: '#f59e0b', fontSize: 20, fontWeight: '800' },
  pointsLabel: { color: '#888', fontSize: 11 },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { color: '#666', fontSize: 16 },
});
