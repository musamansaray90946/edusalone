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
  const [userRole, setUserRole] = useState('');
  
  const [unreadCount, setUnreadCount] = useState(0); 
  const [profileId, setProfileId] = useState<string | null>(null);

  // 1. Initial Authentication Check
  useEffect(() => { checkSubscriptionStatus(); }, []);

  // 2. 🌟 FIXED: Safe Realtime Listener for the Unread Messages Badge
  useEffect(() => {
    if (!profileId) return;

    // Fetch initial count
    const fetchUnread = async () => {
      const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('receiver_id', profileId).eq('is_read', false);
      setUnreadCount(count || 0);
    };
    fetchUnread();

    // Safely setup the channel without chaining bugs
    const channel = supabase.channel('layout_unread');
    
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${profileId}` }, () => {
      setUnreadCount(prev => prev + 1);
    });
    
    channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${profileId}` }, () => {
      fetchUnread();
    });

    channel.subscribe();

    // Cleanup when leaving
    return () => { supabase.removeChannel(channel); };
  }, [profileId]);


  const checkSubscriptionStatus = async () => {
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) { router.replace('/'); return; }

      // Super Admin Bypass
      const SUPER_ADMIN_EMAIL = 'admin@palmtech.sl';
      if (user.email?.toLowerCase() === SUPER_ADMIN_EMAIL) {
        setIsLockedOut(false); setSchoolName('PalmTech Admin'); setUserRole('superadmin'); setLoading(false); return;
      }

      // Check Profile
      const { data: profile, error: profErr } = await supabase.from('users').select('id, school_id, role').eq('id', user.id).maybeSingle();
      if (profErr || !profile || !profile.school_id) { setIsLockedOut(true); setLoading(false); return; }

      setUserRole(profile.role?.toLowerCase().trim() || '');
      setProfileId(profile.id); // This triggers the safe Realtime listener above!

      // Check School Status
      const { data: school, error: schoolErr } = await supabase.from('schools').select('name, status').eq('id', profile.school_id).maybeSingle();
      if (schoolErr || !school) { setIsLockedOut(true); setLoading(false); return; }

      setSchoolName(school.name || 'School Portal');
      const isActive = school.status?.trim().toLowerCase() === 'active';
      setIsLockedOut(!isActive);

    } catch (err) { 
      console.error("Critical Layout Crash:", err);
      setIsLockedOut(true); 
    } finally { 
      setLoading(false); 
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1A365D" /></View>;

  if (isLockedOut) {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed" size={80} color="#E53E3E" />
        <Text style={styles.lockTitle}>Access Restricted</Text>
        <Text style={styles.lockMessage}>This school's subscription to EduSalone is suspended, or your profile setup is incomplete.</Text>
        <TouchableOpacity style={styles.button} onPress={async () => { await supabase.auth.signOut(); router.replace('/'); }}>
          <Text style={styles.buttonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isBursar = userRole === 'bursar';
  const isSecretary = userRole === 'secretary';

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#1A365D', tabBarInactiveTintColor: '#A0AEC0', headerShown: true, headerTitle: schoolName }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Overview', tabBarIcon: ({ color, size }) => <Ionicons name="business" size={size} color={color} /> }} />
      
      {/* 💬 CHAT TAB WITH UNREAD BADGE */}
      <Tabs.Screen 
        name="chat" 
        options={{ 
          title: 'Messages', 
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} /> 
        }} 
      />

      <Tabs.Screen name="students" options={{ title: 'Students', href: (isBursar ? null : undefined) as any, tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} /> }} />
      <Tabs.Screen name="teachers" options={{ title: 'Teachers', href: (isBursar ? null : undefined) as any, tabBarIcon: ({ color, size }) => <Ionicons name="briefcase" size={size} color={color} /> }} />
      <Tabs.Screen name="fees" options={{ title: 'Finance', href: (isSecretary ? null : undefined) as any, tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F7FAFC' },
  lockTitle: { fontSize: 24, fontWeight: '900', color: '#E53E3E', marginTop: 16, marginBottom: 8 },
  lockMessage: { fontSize: 16, color: '#718096', textAlign: 'center', marginBottom: 30, lineHeight: 24 },
  button: { backgroundColor: '#1A365D', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});