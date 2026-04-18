import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = 'https://kptphghxhexirezukarr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwdHBoZ2h4aGV4aXJlenVrYXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MjA1NzMsImV4cCI6MjA4OTA5NjU3M30.TW9IZlmUQ1H4dJfWRAJ8fXgqR3YKjin8WJZGVPmOjFg';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ---- Auth ----
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ---- Business Admin ----
export async function getAdminBusiness(userId: string) {
  const { data, error } = await supabase
    .from('business_admins')
    .select('*, loyalty_businesses(*)')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data;
}

// ---- Clients ----
export async function getClients(businessId: string) {
  const { data, error } = await supabase
    .from('loyalty_clients')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getClientById(clientId: string) {
  const { data, error } = await supabase
    .from('loyalty_clients')
    .select('*')
    .eq('id', clientId)
    .single();
  if (error) throw error;
  return data;
}

export async function searchClients(businessId: string, query: string) {
  const { data, error } = await supabase
    .from('loyalty_clients')
    .select('*')
    .eq('business_id', businessId)
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
    .order('name');
  if (error) throw error;
  return data || [];
}

// ---- Transactions ----
export async function addPoints(businessId: string, clientId: string, points: number, type: string, description: string, amountSpent?: number) {
  const { error: txError } = await supabase
    .from('loyalty_transactions')
    .insert({
      business_id: businessId,
      client_id: clientId,
      type,
      points,
      description,
      amount_spent: amountSpent || null,
    });
  if (txError) throw txError;

  const { error: updateError } = await supabase.rpc('add_client_points', {
    p_client_id: clientId,
    p_points: points,
  });
  // Fallback if RPC doesn't exist
  if (updateError) {
    const client = await getClientById(clientId);
    await supabase
      .from('loyalty_clients')
      .update({
        points_balance: (client.points_balance || 0) + points,
        total_points_earned: (client.total_points_earned || 0) + points,
        visit_count: (client.visit_count || 0) + 1,
        last_visit: new Date().toISOString(),
      })
      .eq('id', clientId);
  }
}

// ---- Redemptions ----
export async function getPendingRedemptions(businessId: string) {
  const { data, error } = await supabase
    .from('loyalty_redemptions')
    .select('*, loyalty_clients(name, phone, email)')
    .eq('business_id', businessId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function approveRedemption(redemptionId: string) {
  const { error } = await supabase
    .from('loyalty_redemptions')
    .update({ status: 'approved' })
    .eq('id', redemptionId);
  if (error) throw error;
}

export async function rejectRedemption(redemptionId: string) {
  const { error } = await supabase
    .from('loyalty_redemptions')
    .update({ status: 'rejected' })
    .eq('id', redemptionId);
  if (error) throw error;
}

// ---- Analytics ----
export async function getAnalytics(businessId: string) {
  const [clients, transactions, redemptions] = await Promise.all([
    supabase.from('loyalty_clients').select('id, points_balance, total_points_earned, visit_count, created_at').eq('business_id', businessId),
    supabase.from('loyalty_transactions').select('points, type, created_at, amount_spent').eq('business_id', businessId),
    supabase.from('loyalty_redemptions').select('status, points_spent, created_at').eq('business_id', businessId),
  ]);

  const clientList = clients.data || [];
  const txList = transactions.data || [];
  const redeemList = redemptions.data || [];

  const totalClients = clientList.length;
  const totalPointsDistributed = txList.reduce((sum, t) => sum + (t.points > 0 ? t.points : 0), 0);
  const totalRevenue = txList.reduce((sum, t) => sum + (Number(t.amount_spent) || 0), 0);
  const pendingRedemptions = redeemList.filter(r => r.status === 'pending').length;
  const approvedRedemptions = redeemList.filter(r => r.status === 'approved').length;

  // New clients this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const newClientsThisWeek = clientList.filter(c => new Date(c.created_at) > weekAgo).length;

  return {
    totalClients,
    totalPointsDistributed,
    totalRevenue,
    pendingRedemptions,
    approvedRedemptions,
    newClientsThisWeek,
  };
}

// ---- Offers ----
export async function getOffers(businessId: string) {
  const { data, error } = await supabase
    .from('loyalty_offers')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createOffer(businessId: string, offer: { title: string; description: string; valid_until: string; max_claims?: number }) {
  const { error } = await supabase
    .from('loyalty_offers')
    .insert({ ...offer, business_id: businessId });
  if (error) throw error;
}

// ---- Client Transactions ----
export async function getClientTransactions(clientId: string) {
  const { data, error } = await supabase
    .from('loyalty_transactions')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ---- Client Updates ----
export async function updateClient(clientId: string, updates: Record<string, any>) {
  const { error } = await supabase
    .from('loyalty_clients')
    .update(updates)
    .eq('id', clientId);
  if (error) throw error;
}

// ---- Weekly Stats ----
export async function getWeeklyStats(businessId: string) {
  const { data: transactions } = await supabase
    .from('loyalty_transactions')
    .select('points, created_at, type')
    .eq('business_id', businessId)
    .gte('created_at', new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at');

  const { data: clients } = await supabase
    .from('loyalty_clients')
    .select('created_at')
    .eq('business_id', businessId)
    .gte('created_at', new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString());

  const weeks: Record<string, { points: number; clients: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    weeks[key] = { points: 0, clients: 0 };
  }

  const weekKeys = Object.keys(weeks);
  (transactions || []).forEach(t => {
    const d = new Date(t.created_at);
    const weekIdx = Math.floor((Date.now() - d.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const key = weekKeys[Math.max(0, weekKeys.length - 1 - weekIdx)];
    if (key && weeks[key]) weeks[key].points += Math.max(0, t.points);
  });

  (clients || []).forEach(c => {
    const d = new Date(c.created_at);
    const weekIdx = Math.floor((Date.now() - d.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const key = weekKeys[Math.max(0, weekKeys.length - 1 - weekIdx)];
    if (key && weeks[key]) weeks[key].clients += 1;
  });

  return { labels: weekKeys, points: weekKeys.map(k => weeks[k].points), clients: weekKeys.map(k => weeks[k].clients) };
}

// ---- Staff ----
export async function getStaffMembers(businessId: string) {
  const { data, error } = await supabase
    .from('business_admins')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at');
  if (error) throw error;
  return data || [];
}

export async function addStaffMember(businessId: string, email: string, role: string) {
  // Create auth user first
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'Staff' + Math.random().toString(36).slice(2, 8) + '!',
  });
  if (authError) throw authError;
  if (!authData.user) throw new Error('Failed to create user');

  const { error } = await supabase
    .from('business_admins')
    .insert({ user_id: authData.user.id, business_id: businessId, role });
  if (error) throw error;
}

// ---- Business Settings ----
export async function updateBusinessSettings(businessId: string, updates: Record<string, any>) {
  const { error } = await supabase
    .from('loyalty_businesses')
    .update(updates)
    .eq('id', businessId);
  if (error) throw error;
}
