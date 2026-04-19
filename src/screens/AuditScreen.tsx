import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getStaffAuditLog, getStaffSummary, checkFraudAlerts } from '../services/supabase';

export default function AuditScreen({ route }: any) {
  const { business } = route.params;
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<Record<string, { total_points: number; tx_count: number }>>({});
  const [alerts, setAlerts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [l, s, a] = await Promise.all([
        getStaffAuditLog(business.id),
        getStaffSummary(business.id),
        checkFraudAlerts(business.id),
      ]);
      setLogs(l);
      setSummary(s);
      setAlerts(a);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4f46e5" /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#4f46e5" />}
    >
      {alerts.length > 0 && (
        <View style={styles.alertSection}>
          <View style={styles.alertHeader}>
            <Ionicons name="warning" size={20} color="#ef4444" />
            <Text style={styles.alertTitle}>Alertes ({alerts.length})</Text>
          </View>
          {alerts.map((a, i) => (
            <View key={i} style={styles.alertRow}>
              <Ionicons name="alert-circle" size={16} color="#f59e0b" />
              <Text style={styles.alertText}>{a}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Employes (7 derniers jours)</Text>
        {Object.keys(summary).length === 0 && (
          <Text style={styles.emptyText}>Aucune activite</Text>
        )}
        {Object.entries(summary).map(([email, data]) => (
          <View key={email} style={styles.staffRow}>
            <View style={styles.staffAvatar}>
              <Ionicons name="person" size={18} color="#4f46e5" />
            </View>
            <View style={styles.staffInfo}>
              <Text style={styles.staffEmail}>{email}</Text>
              <Text style={styles.staffMeta}>{data.tx_count} transactions</Text>
            </View>
            <View style={styles.staffPoints}>
              <Text style={styles.staffPointsValue}>{data.total_points}</Text>
              <Text style={styles.staffPointsLabel}>pts donnes</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historique recent</Text>
        {logs.length === 0 && (
          <Text style={styles.emptyText}>Aucun log</Text>
        )}
        {logs.map((log, i) => (
          <View key={i} style={styles.logRow}>
            <View style={styles.logDot} />
            <View style={styles.logInfo}>
              <Text style={styles.logDesc}>
                <Text style={styles.logStaff}>{log.staff_email?.split('@')[0] || '?'}</Text>
                {' → '}
                <Text style={styles.logClient}>{(log as any).loyalty_clients?.name || '?'}</Text>
              </Text>
              <Text style={styles.logMeta}>
                {log.description || log.type} | {new Date(log.created_at).toLocaleDateString('fr-CA')} {new Date(log.created_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <Text style={[styles.logPoints, { color: log.points >= 0 ? '#10b981' : '#ef4444' }]}>
              {log.points >= 0 ? '+' : ''}{log.points}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' },
  alertSection: { backgroundColor: '#2a1a1a', borderRadius: 16, padding: 16, margin: 16, borderWidth: 1, borderColor: '#ef444440' },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  alertTitle: { fontSize: 16, fontWeight: '700', color: '#ef4444' },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  alertText: { color: '#f59e0b', fontSize: 14, flex: 1 },
  section: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 },
  emptyText: { color: '#666', textAlign: 'center', paddingVertical: 16 },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  staffAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4f46e520', justifyContent: 'center', alignItems: 'center' },
  staffInfo: { flex: 1 },
  staffEmail: { color: '#fff', fontSize: 14, fontWeight: '600' },
  staffMeta: { color: '#888', fontSize: 12, marginTop: 2 },
  staffPoints: { alignItems: 'flex-end' },
  staffPointsValue: { color: '#f59e0b', fontSize: 18, fontWeight: '800' },
  staffPointsLabel: { color: '#888', fontSize: 10 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  logDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4f46e5' },
  logInfo: { flex: 1 },
  logDesc: { color: '#ccc', fontSize: 13 },
  logStaff: { color: '#4f46e5', fontWeight: '600' },
  logClient: { color: '#f59e0b' },
  logMeta: { color: '#666', fontSize: 11, marginTop: 2 },
  logPoints: { fontWeight: '800', fontSize: 14 },
});
