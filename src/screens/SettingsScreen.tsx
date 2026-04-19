import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { updateBusinessSettings, signOut, getStaffMembers } from '../services/supabase';
import { supabase } from '../services/supabase';
import { useTheme } from '../utils/theme';
import { useI18n } from '../utils/i18n';
import * as SecureStore from 'expo-secure-store';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function SettingsScreen({ route, navigation }: any) {
  const { business, onSignOut } = route.params;
  const [ptsPerDollar, setPtsPerDollar] = useState(String(business.points_per_dollar || 10));
  const [referralBonus, setReferralBonus] = useState(String(business.referral_bonus || 75));
  const [visitBonus, setVisitBonus] = useState(String(business.visit_bonus || 25));
  const [saving, setSaving] = useState(false);

  const [rewards, setRewards] = useState<any[]>(business.rewards || []);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [editingRewardIndex, setEditingRewardIndex] = useState<number | null>(null);
  const [rewardName, setRewardName] = useState('');
  const [rewardPoints, setRewardPoints] = useState('');
  const [rewardImage, setRewardImage] = useState('');

  const [staff, setStaff] = useState<any[]>([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState('staff');
  const [addingStaff, setAddingStaff] = useState(false);

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const { isDark, toggle: toggleTheme } = useTheme();
  const { lang, setLang } = useI18n();

  const tiers = business.tiers || [];

  useFocusEffect(useCallback(() => {
    getStaffMembers(business.id).then(setStaff).catch(console.error);
    SecureStore.getItemAsync('biometric_enabled').then(v => setBiometricEnabled(v === 'true'));
  }, []));

  const toggleBiometric = async () => {
    const next = !biometricEnabled;
    setBiometricEnabled(next);
    await SecureStore.setItemAsync('biometric_enabled', next ? 'true' : 'false');
  };

  const generatePDFReport = async () => {
    const html = `
      <html><head><style>
        body { font-family: -apple-system, sans-serif; padding: 40px; color: #333; }
        h1 { color: #4f46e5; } h2 { color: #666; margin-top: 30px; }
        .stat { display: inline-block; width: 30%; text-align: center; padding: 20px; margin: 5px; background: #f5f5f7; border-radius: 12px; }
        .stat .value { font-size: 28px; font-weight: 800; color: #1c1c1e; }
        .stat .label { font-size: 12px; color: #888; }
      </style></head><body>
        <h1>Loggic Business - Rapport</h1>
        <p>${business.name} | ${new Date().toLocaleDateString('fr-CA')}</p>
        <h2>Statistiques</h2>
        <div class="stat"><div class="value">${ptsPerDollar}</div><div class="label">pts/dollar</div></div>
        <div class="stat"><div class="value">${referralBonus}</div><div class="label">bonus parrainage</div></div>
        <div class="stat"><div class="value">${visitBonus}</div><div class="label">bonus visite</div></div>
        <h2>Recompenses (${rewards.length})</h2>
        <ul>${rewards.map(r => `<li>${r.name} - ${r.points_required} pts</li>`).join('')}</ul>
        <h2>Employes (${staff.length})</h2>
        <ul>${staff.map(s => `<li>${s.user_id?.substring(0, 8)}... (${s.role})</li>`).join('')}</ul>
        <p style="margin-top: 40px; color: #aaa; font-size: 11px;">Genere par Loggic Business</p>
      </body></html>
    `;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
  };

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

  const pickImage = async (): Promise<string> => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled) return '';
    const uri = result.assets[0].uri;
    const ext = uri.split('.').pop() || 'jpg';
    const fileName = `reward-images/${Date.now()}.${ext}`;
    const formData = new FormData();
    formData.append('file', { uri, name: fileName, type: `image/${ext}` } as any);
    const { error } = await supabase.storage.from('loyalty').upload(fileName, formData, { upsert: true });
    if (error) { Alert.alert('Erreur upload', error.message); return ''; }
    const { data } = supabase.storage.from('loyalty').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const openAddReward = () => {
    setEditingRewardIndex(null);
    setRewardName('');
    setRewardPoints('');
    setRewardImage('');
    setShowRewardModal(true);
  };

  const openEditReward = (index: number) => {
    const r = rewards[index];
    setEditingRewardIndex(index);
    setRewardName(r.name || '');
    setRewardPoints(String(r.points_required || ''));
    setRewardImage(r.image_url || '');
    setShowRewardModal(true);
  };

  const handleSaveReward = async () => {
    if (!rewardName.trim() || !rewardPoints.trim()) {
      Alert.alert('Erreur', 'Nom et points requis');
      return;
    }
    const newReward: any = { name: rewardName.trim(), points_required: parseInt(rewardPoints) };
    if (rewardImage) newReward.image_url = rewardImage;
    let updated: any[];
    if (editingRewardIndex !== null) {
      updated = [...rewards];
      updated[editingRewardIndex] = newReward;
    } else {
      updated = [...rewards, newReward];
    }
    updated.sort((a, b) => a.points_required - b.points_required);

    try {
      await updateBusinessSettings(business.id, { rewards: updated });
      setRewards(updated);
      setShowRewardModal(false);
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    }
  };

  const handleDeleteReward = (index: number) => {
    Alert.alert('Supprimer', `Supprimer "${rewards[index].name}"?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          const updated = rewards.filter((_, i) => i !== index);
          try {
            await updateBusinessSettings(business.id, { rewards: updated });
            setRewards(updated);
          } catch (err: any) {
            Alert.alert('Erreur', err.message);
          }
        },
      },
    ]);
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

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recompenses</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openAddReward}>
            <Ionicons name="add-circle" size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>
        {rewards.length === 0 && (
          <Text style={styles.emptyText}>Aucune recompense. Appuyez sur + pour en ajouter.</Text>
        )}
        {rewards.map((r: any, i: number) => (
          <View key={i} style={styles.rewardRow}>
            <TouchableOpacity style={styles.rewardContent} onPress={() => openEditReward(i)}>
              {r.image_url ? (
                <Image source={{ uri: r.image_url }} style={styles.rewardImg} />
              ) : (
                <Ionicons name="gift" size={18} color="#f59e0b" />
              )}
              <Text style={styles.rewardName}>{r.name}</Text>
              <Text style={styles.rewardPts}>{r.points_required} pts</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteReward(i)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

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

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Employes</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowStaffModal(true)}>
            <Ionicons name="add-circle" size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>
        {staff.map((s, i) => (
          <View key={i} style={styles.rewardRow}>
            <Ionicons name="person" size={18} color="#4f46e5" />
            <Text style={styles.rewardName}>{s.user_id?.substring(0, 8)}...</Text>
            <Text style={[styles.rewardPts, { color: s.role === 'owner' ? '#f59e0b' : '#4f46e5' }]}>{s.role}</Text>
          </View>
        ))}
        {staff.length === 0 && <Text style={styles.emptyText}>Aucun employe</Text>}
      </View>

      <Modal visible={showStaffModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Ajouter un employe</Text>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.modalInput}
              value={staffEmail}
              onChangeText={setStaffEmail}
              placeholder="employe@email.com"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.label}>Role</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              {['staff', 'manager'].map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleBtn, staffRole === r && styles.roleBtnActive]}
                  onPress={() => setStaffRole(r)}
                >
                  <Text style={[styles.roleBtnText, staffRole === r && { color: '#fff' }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.modalSaveBtn, addingStaff && { opacity: 0.6 }]}
              onPress={async () => {
                if (!staffEmail.trim()) { Alert.alert('Erreur', 'Email requis'); return; }
                setAddingStaff(true);
                try {
                  const { data, error } = await supabase.auth.signUp({ email: staffEmail.trim(), password: 'Staff' + Math.random().toString(36).slice(2, 8) + '!' });
                  if (error) throw error;
                  if (data.user) {
                    await supabase.from('business_admins').insert({ user_id: data.user.id, business_id: business.id, role: staffRole });
                  }
                  setShowStaffModal(false);
                  setStaffEmail('');
                  getStaffMembers(business.id).then(setStaff);
                } catch (err: any) { Alert.alert('Erreur', err.message); }
                finally { setAddingStaff(false); }
              }}
              disabled={addingStaff}
            >
              {addingStaff ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveBtnText}>Ajouter</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowStaffModal(false)}>
              <Text style={styles.modalCancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Preferences</Text>
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Mode sombre</Text>
          <TouchableOpacity onPress={toggleTheme}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={24} color={isDark ? '#4f46e5' : '#f59e0b'} />
          </TouchableOpacity>
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Langue</Text>
          <TouchableOpacity onPress={() => setLang(lang === 'fr' ? 'en' : 'fr')}>
            <Text style={{ color: '#4f46e5', fontWeight: '700', fontSize: 15 }}>{lang === 'fr' ? 'FR' : 'EN'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Face ID / Touch ID</Text>
          <TouchableOpacity onPress={toggleBiometric}>
            <Ionicons name={biometricEnabled ? 'lock-closed' : 'lock-open-outline'} size={22} color={biometricEnabled ? '#10b981' : '#888'} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.auditBtn} onPress={generatePDFReport}>
        <Ionicons name="document-text" size={20} color="#4f46e5" />
        <Text style={styles.auditBtnText}>Rapport PDF mensuel</Text>
        <Ionicons name="share-outline" size={18} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.auditBtn}
        onPress={() => navigation.navigate('Audit', { business })}
      >
        <Ionicons name="shield-checkmark" size={20} color="#4f46e5" />
        <Text style={styles.auditBtnText}>Audit employes</Text>
        <Ionicons name="chevron-forward" size={18} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Se deconnecter</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Loggic Business v1.0.0</Text>

      <Modal visible={showRewardModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {editingRewardIndex !== null ? 'Modifier la recompense' : 'Nouvelle recompense'}
            </Text>

            <Text style={styles.label}>Nom</Text>
            <TextInput
              style={styles.modalInput}
              value={rewardName}
              onChangeText={setRewardName}
              placeholder="Ex: 10% de rabais"
              placeholderTextColor="#666"
            />

            <Text style={styles.label}>Points requis</Text>
            <TextInput
              style={styles.modalInput}
              value={rewardPoints}
              onChangeText={setRewardPoints}
              placeholder="Ex: 250"
              placeholderTextColor="#666"
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Photo (optionnel)</Text>
            <TouchableOpacity
              style={styles.photoPickerBtn}
              onPress={async () => {
                const url = await pickImage();
                if (url) setRewardImage(url);
              }}
            >
              {rewardImage ? (
                <Image source={{ uri: rewardImage }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="image-outline" size={24} color="#666" />
                  <Text style={styles.photoPlaceholderText}>Choisir une photo</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveReward}>
              <Text style={styles.modalSaveBtnText}>
                {editingRewardIndex !== null ? 'Modifier' : 'Ajouter'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowRewardModal(false)}>
              <Text style={styles.modalCancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content: { padding: 20, paddingBottom: 100 },
  section: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 0 },
  addBtn: { padding: 4 },
  emptyText: { color: '#666', fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  infoLabel: { color: '#888', fontSize: 14 },
  infoValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  inputLabel: { color: '#aaa', fontSize: 14 },
  numberInput: { backgroundColor: '#0f0f1a', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center', width: 80, borderWidth: 1, borderColor: '#2a2a4a' },
  saveBtn: { backgroundColor: '#4f46e5', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  rewardContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 20 },
  label: { color: '#aaa', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  modalInput: { backgroundColor: '#0f0f1a', borderRadius: 12, padding: 14, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#2a2a4a' },
  modalSaveBtn: { backgroundColor: '#4f46e5', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  modalSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalCancelBtn: { padding: 16, alignItems: 'center' },
  modalCancelBtnText: { color: '#888', fontSize: 15 },
  auditBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, marginBottom: 16 },
  auditBtnText: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600' },
  rewardImg: { width: 28, height: 28, borderRadius: 6 },
  photoPickerBtn: { marginTop: 4 },
  photoPreview: { width: 80, height: 80, borderRadius: 12 },
  photoPlaceholder: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0f0f1a', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2a2a4a' },
  photoPlaceholderText: { color: '#666', fontSize: 14 },
  roleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#0f0f1a', alignItems: 'center', borderWidth: 1, borderColor: '#2a2a4a' },
  roleBtnActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  roleBtnText: { color: '#888', fontWeight: '600', fontSize: 14 },
});
