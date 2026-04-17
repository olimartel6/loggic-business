import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updateBusinessSettings, signOut } from '../services/supabase';

export default function SettingsScreen({ route, navigation }: any) {
  const { business, onSignOut } = route.params;
  const [ptsPerDollar, setPtsPerDollar] = useState(String(business.points_per_dollar || 10));
  const [referralBonus, setReferralBonus] = useState(String(business.referral_bonus || 75));
  const [visitBonus, setVisitBonus] = useState(String(business.visit_bonus || 25));
  const [saving, setSaving] = useState(false);

  const rewards = business.rewards || [];
  const tiers = business.tiers || [];

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateBusinessSettings(business.id, {
        points_per_dollar: parseInt(ptsPerDollar) || 10,
        referral_bonus: parseInt(referralBonus) || 75,
        visit_bonus: parseInt(visitBonus) || 25,
      });
      Alert.alert('Sauvegarde', 'Parametres mis a jour');
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Deconnexion', 'Etes-vous sur?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se deconnecter', style: 'destructive',
        onPress: async () => {
          await signOut();
          onSignOut?.();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Commerce</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Nom</Text>
          <Text style={styles.infoValue}>{business.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Plan</Text>
          <Text style={[styles.infoValue, { color: '#4f46e5' }]}>{(business.plan || 'free').toUpperCase()}</Text>
        </View>
        {business.phone && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Telephone</Text>
            <Text style={styles.infoValue}>{business.phone}</Text>
          </View>
        )}
        {business.address && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Adresse</Text>
            <Text style={styles.infoValue}>{business.address}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Points</Text>
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Points par dollar</Text>
          <TextInput
            style={styles.numberInput}
            value={ptsPerDollar}
            onChangeText={setPtsPerDollar}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Bonus parrainage</Text>
          <TextInput
            style={styles.numberInput}
            value={referralBonus}
            onChangeText={setReferralBonus}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Bonus visite</Text>
          <TextInput
            style={styles.numberInput}
            value={visitBonus}
            onChangeText={setVisitBonus}
            keyboardType="number-pad"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.saveBtnText}>Sauvegarder</Text>
          )}
        </TouchableOpacity>
      </View>

      {rewards.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recompenses</Text>
          {rewards.map((r: any, i: number) => (
            <View key={i} style={styles.rewardRow}>
              <Ionicons name="gift" size={18} color="#f59e0b" />
              <Text style={styles.rewardName}>{r.name}</Text>
              <Text style={styles.rewardPts}>{r.points_required} pts</Text>
            </View>
          ))}
        </View>
      )}

      {tiers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Niveaux VIP</Text>
          {tiers.map((t: any, i: number) => (
            <View key={i} style={styles.tierRow}>
              <View style={[styles.tierDot, { backgroundColor: t.color }]} />
              <Text style={styles.tierName}>{t.name}</Text>
              <Text style={styles.tierMin}>{t.min_points}+ pts</Text>
              <Text style={styles.tierMult}>x{t.multiplier}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Se deconnecter</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Loggic Business v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content: { padding: 20, paddingBottom: 100 },
  section: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  infoLabel: { color: '#888', fontSize: 14 },
  infoValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  inputLabel: { color: '#aaa', fontSize: 14 },
  numberInput: { backgroundColor: '#0f0f1a', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center', width: 80, borderWidth: 1, borderColor: '#2a2a4a' },
  saveBtn: { backgroundColor: '#4f46e5', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  rewardName: { flex: 1, color: '#fff', fontSize: 14 },
  rewardPts: { color: '#f59e0b', fontWeight: '700', fontSize: 13 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  tierDot: { width: 12, height: 12, borderRadius: 6 },
  tierName: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
  tierMin: { color: '#888', fontSize: 12 },
  tierMult: { color: '#4f46e5', fontSize: 12, fontWeight: '700' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, marginTop: 8 },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  version: { textAlign: 'center', color: '#444', fontSize: 12, marginTop: 16 },
});
