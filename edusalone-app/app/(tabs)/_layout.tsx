import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/lib/supabase';

export default function TabLayout() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [schoolName, setSchoolName] = useState('');

  useEffect(() => {
    checkSubscriptionStatus();
  },[]);

  const checkSubscriptionStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/'); return; }

      // 1. Super Admin Bypass
      const SUPER_ADMIN_EMAIL = 'admin@palmtech.sl';
      if (user.email === SUPER_ADMIN_EMAIL) {
        setIsLockedOut(false);
        setSchoolName('PalmTech Admin');
        setLoading(false);
        return;
      }

      // 2. Fetch the user's school_id
      const { data: profile } = await supabase.from('users').select('school_id').eq('email', user.email).single();
      if (!profile || !profile.school_id) { setIsLockedOut(true); setLoading(false); return; }

      // 3. Check the school's SaaS Subscription
      const { data: school } = await supabase.from('schools').select('name, subscription_status, trial_expires_at').eq('id', profile.school_id).single();
      if (!school) { setIsLockedOut(true); setLoading(false); return; }

      setSchoolName(school.name || 'School Portal');

      // 4. Lockout Logic (Checks if Trial Expired)
      const isExpired = school.subscription_status !== 'Active' && new Date(school.trial_expires_at) < new Date();
      setIsLockedOut(isExpired);
    } catch (err) {
      setIsLockedOut(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1A365D" />
        <Text style={styles.loadingText}>Verifying Subscription...</Text>
      </View>
    );
  }

  if (isLockedOut) {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed" size={80} color="#E53E3E" />
        <Text style={styles.lockTitle}>Access Restricted</Text>
        <Text style={styles.lockMessage}>This school's subscription to EduSalone has expired. Please ask the Principal to contact PalmTech to renew access.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
          <Text style={styles.buttonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#1A365D', tabBarInactiveTintColor: '#A0AEC0', headerShown: true, headerTitle: schoolName }}>
      {/* HIDES THE DEFAULT EXPO TABS COMPLETELY */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="signup" options={{ href: null }} />

      {/* YOUR REAL ADMIN TABS */}
      <Tabs.Screen name="dashboard" options={{ title: 'Schools', tabBarIcon: ({ color, size }) => <Ionicons name="business" size={size} color={color} /> }} />
      <Tabs.Screen name="students" options={{ title: 'Students', tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} /> }} />
      <Tabs.Screen name="teachers" options={{ title: 'Teachers', tabBarIcon: ({ color, size }) => <Ionicons name="briefcase" size={size} color={color} /> }} />
      <Tabs.Screen name="fees" options={{ title: 'Finance', tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F7FAFC' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#4A5568', fontWeight: 'bold' },
  lockTitle: { fontSize: 24, fontWeight: '900', color: '#E53E3E', marginTop: 16, marginBottom: 8 },
  lockMessage: { fontSize: 16, color: '#718096', textAlign: 'center', marginBottom: 30, lineHeight: 24 },
  button: { backgroundColor: '#1A365D', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});