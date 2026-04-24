import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/lib/supabase';

export default function DashboardScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [stats, setStats] = useState({ students: 0, teachers: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboardData(); },[]);

  async function loadDashboardData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Fetch Principal's Profile & Their Specific School
    const { data: profileData } = await supabase
      .from('users')
      .select('*, schools(*)')
      .eq('email', user.email)
      .single();

    if (profileData) {
      setProfile(profileData);
      setSchool(profileData.schools);

      // 2. Fetch Stats ONLY for this specific school!
      const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', profileData.school_id);
      const { count: teacherCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('school_id', profileData.school_id).eq('role', 'Teacher');
      const { data: fees } = await supabase.from('fee_transactions').select('amount_paid_sll').eq('school_id', profileData.school_id);
        
      const totalRevenue = fees?.reduce((sum, current) => sum + Number(current.amount_paid_sll), 0) || 0;

      setStats({ students: studentCount || 0, teachers: teacherCount || 0, revenue: totalRevenue });
    }
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  function formatCurrency(amount: number) {
    return "SLL " + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  if (loading) {
    return <View style={[styles.safeArea, { justifyContent: 'center' }]}><ActivityIndicator size="large" color="#1A365D" /></View>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Principal Dashboard</Text>
            <Text style={styles.adminName}>{profile?.full_name}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#E53E3E" />
          </TouchableOpacity>
        </View>

        {/* SCHOOL IDENTITY & SECURE CODE */}
        <View style={styles.schoolCard}>
          <Text style={styles.schoolName}>{school?.name}</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>SHARE THIS REGISTRATION CODE WITH STAFF & STUDENTS:</Text>
            <Text style={styles.codeHighlight}>{school?.school_code}</Text>
          </View>
        </View>

        {/* STATS GRID */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { borderTopColor: '#3182CE' }]}>
            <Ionicons name="people" size={32} color="#3182CE" style={styles.statIcon} />
            <Text style={styles.statValue}>{stats.students}</Text>
            <Text style={styles.statLabel}>Enrolled Students</Text>
          </View>

          <View style={[styles.statBox, { borderTopColor: '#DD6B20' }]}>
            <Ionicons name="briefcase" size={32} color="#DD6B20" style={styles.statIcon} />
            <Text style={styles.statValue}>{stats.teachers}</Text>
            <Text style={styles.statLabel}>Active Staff</Text>
          </View>
        </View>

        {/* REVENUE BOX */}
        <View style={[styles.statBox, styles.revenueBox, { borderTopColor: '#38A169' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="wallet" size={36} color="#38A169" style={styles.statIcon} />
            <View style={{ marginLeft: 15 }}>
              <Text style={styles.statValueLarge}>{formatCurrency(stats.revenue)}</Text>
              <Text style={styles.statLabel}>Total Fees Collected</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F0F4F8' },
  scrollContent: { padding: 20, paddingBottom: 60, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, backgroundColor: '#FFF', padding: 15, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 2 },
  greeting: { fontSize: 22, fontWeight: '900', color: '#1A365D' },
  adminName: { fontSize: 14, color: '#4A5568', marginTop: 4, fontWeight: '600' },
  logoutButton: { padding: 10, backgroundColor: '#FED7D7', borderRadius: 12 },
  
  schoolCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 20, elevation: 2 },
  schoolName: { fontSize: 24, fontWeight: '900', color: '#1A365D', marginBottom: 15, textAlign: 'center' },
  codeBox: { backgroundColor: '#EBF8FF', padding: 15, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#BEE3F8' },
  codeText: { color: '#2B6CB0', fontWeight: 'bold', fontSize: 10, marginBottom: 5 },
  codeHighlight: { fontSize: 28, letterSpacing: 2, fontWeight: '900', color: '#1A365D' },
  
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statBox: { backgroundColor: '#FFFFFF', width: '48%', minHeight: 120, padding: 20, borderRadius: 16, borderTopWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, justifyContent: 'center' },
  revenueBox: { width: '100%', minHeight: 100, marginBottom: 25 },
  statIcon: { marginBottom: 5 },
  statValue: { fontSize: 26, fontWeight: '900', color: '#2D3748' },
  statValueLarge: { fontSize: 28, fontWeight: '900', color: '#2D3748' },
  statLabel: { fontSize: 13, color: '#718096', fontWeight: '600', marginTop: 4 }
});