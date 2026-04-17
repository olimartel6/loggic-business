import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAnalytics, getPendingRedemptions, approveRedemption, rejectRedemption } from '../services/supabase';

export default function DashboardScreen({ route }: any) {
  const { business } = route.params;
  const [analytics, setAnalytics] = useState<any>(null);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [stats, pending] = await Promise.all([
        getAnalytics(business.id),
        getPendingRedemptions(business.id),
      ]);
      setAnalytics(stats);
      setRedemptions(pending);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const handleApprove = async (id: string) => {
    await approveRedemption(id);
    loadData();
  };

  const handleReject = async (id: string) => {
    await rejectRedemption(id);
    loadData();
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4f46e5" /></View>;
  }

  const stats = [
    { label: 'Clients', value: analytics?.totalClients || 0, icon: 'people', color: '#4f46e5' },
    { label: 'Nouveaux (7j)', value: analytics?.newClientsThisWeek || 0, icon: 'trending-up', color: '#10b981' },
    { label: 'Points distribues', value: analytics?.totalPointsDistributed || 0, icon: 'star', color: '#f59e0b' },
    { label: 'Revenus ($)', value: `$${(analytics?.totalRevenue || 0).toFixed(0)}`, icon: 'cash', color: '#06b6d4' },
    { label: 'Echanges en attente', value: analytics?.pendingRedemptions || 0, icon: 'time', color: '#ef4444' },
    { label: 'Echanges approuves', value: analytics?.approvedRedemptions || 0, icon: 'checkmark-circle', color: '#10b981' },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#4f46e5" />}
    >
      <View style={styles.header}>
        <Text style={styles.businessName}>{business.name}</Text>
        <Text style={styles.plan}>{(business.plan || 'free').toUpperCase()}</Text>
      </View>

      <View style={styles.grid}>
        {stats.map((s, i) => (
          <View key={i} style={styles.card}>
            <Ionicons name={s.icon as any} size={24} color={s.color} />
            <Text style={styles.cardValue}>{s.value}</Text>
            <Text style={styles.cardLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {redemptions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Echanges en attente</Text>
          {redemptions.map((r) => (
            <View key={r.id} style={styles.redemptionCard}>
              <View style={styles.redemptionInfo}>
                <Text style={styles.redemptionName}>{r.loyalty_clients?.name || 'Client'}</Text>
                <Text style={styles.redemptionReward}>{r.reward_name}</Text>
                <Text style={styles.redemptionPoints}>{r.points_spent} pts</Text>
              </View>
              <View style={styles.redemptionActions}>
                <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(r.id)}>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(r.id)}>
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  businessName: { fontSize: 22, fontWeight: '700', color: '#fff' },
  plan: { fontSize: 12, fontWeight: '700', color: '#4f46e5', backgroundColor: '#4f46e520', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginTop: 8 },
  card: {
    backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16,
    width: '48%', gap: 6,
  },
  cardValue: { fontSize: 24, fontWeight: '800', color: '#fff' },
  cardLabel: { fontSize: 12, color: '#888' },
  section: { padding: 20, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 12 },
  redemptionCard: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  redemptionInfo: { flex: 1 },
  redemptionName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  redemptionReward: { fontSize: 14, color: '#aaa', marginTop: 2 },
  redemptionPoints: { fontSize: 12, color: '#f59e0b', marginTop: 2 },
  redemptionActions: { flexDirection: 'row', gap: 8 },
  approveBtn: { backgroundColor: '#10b981', borderRadius: 10, padding: 10 },
  rejectBtn: { backgroundColor: '#ef4444', borderRadius: 10, padding: 10 },
});
