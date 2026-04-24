import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../src/lib/supabase';

export default function SuperAdminScreen() {
  const router = useRouter();
  const [schools, setSchools] = useState<any[]>([]);
  const[newSchoolName, setNewSchoolName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSchools(); },[]);

  async function loadSchools() {
    setLoading(true);
    const { data } = await supabase.from('schools').select('*').order('created_at', { ascending: false });
    if (data) setSchools(data);
    setLoading(false);
  }

  async function handleRegisterSchool() {
    if (!newSchoolName.trim()) { Alert.alert('Error', 'Enter a school name.'); return; }
    const prefix = newSchoolName.substring(0,3).toUpperCase().replace(/[^A-Z]/g, 'S');
    const code = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { error } = await supabase.from('schools').insert([{ name: newSchoolName.trim(), status: 'Active', school_code: code }]);
    if (error) Alert.alert('Error', error.message); 
    else { Alert.alert('Success', `${newSchoolName} Registered! Code: ${code}`); setNewSchoolName(''); loadSchools(); }
  }

  // 🚨 NEW: DELETE SCHOOL FUNCTION
  async function deleteSchool(id: string, name: string) {
    Alert.alert('WARNING: Delete School', `Are you sure you want to permanently delete ${name}? This destroys all their data!`,[
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete Everything', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('schools').delete().eq('id', id);
        if (error) Alert.alert('Error', error.message); else loadSchools();
      }}
    ]);
  }

  // 🚨 NEW: SUSPEND / ACTIVATE SCHOOL
  async function toggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    await supabase.from('schools').update({ status: newStatus }).eq('id', id);
    loadSchools();
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>PalmTech Master Control</Text>
          <Text style={styles.subText}>CEO Dashboard: Musa Mansaray</Text>
        </View>
        <TouchableOpacity onPress={async () => { await supabase.auth.signOut(); router.replace('/'); }}>
          <Ionicons name="log-out-outline" size={28} color="#E53E3E" />
        </TouchableOpacity>
      </View>

      {/* 🚨 FIXED SCROLLVIEW */}
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Register a New Client School</Text>
          <TextInput style={styles.input} placeholder="e.g. Grammar School" value={newSchoolName} onChangeText={setNewSchoolName} />
          <TouchableOpacity style={styles.button} onPress={handleRegisterSchool}>
            <Text style={styles.buttonText}>Create School & Generate Code</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.listTitle}>Our Clients ({schools.length} Schools)</Text>
        {loading ? <ActivityIndicator size="large" color="#1A365D" /> : (
          schools.map(s => (
            <View key={s.id} style={styles.schoolRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.schoolName}>{s.name}</Text>
                <Text style={styles.schoolCode}>Code: {s.school_code}</Text>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {/* EDIT/SUSPEND BUTTON */}
                <TouchableOpacity 
                  onPress={() => toggleStatus(s.id, s.status)}
                  style={[styles.statusBadge, { backgroundColor: s.status === 'Active' ? '#C6F6D5' : '#FED7D7' }]}
                >
                  <Text style={{ color: s.status === 'Active' ? '#22543D' : '#822727', fontWeight: 'bold', fontSize: 10 }}>{s.status}</Text>
                </TouchableOpacity>

                {/* DELETE BUTTON */}
                <TouchableOpacity onPress={() => deleteSchool(s.id, s.name)}>
                  <Ionicons name="trash" size={24} color="#E53E3E" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8', paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#1A365D' },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
  subText: { color: '#A0AEC0', fontSize: 14 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, marginBottom: 20, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3748', marginBottom: 10 },
  input: { backgroundColor: '#EDF2F7', padding: 15, borderRadius: 8, marginBottom: 10 },
  button: { backgroundColor: '#38A169', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: 'bold' },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A5568', marginBottom: 10 },
  schoolRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 8, marginBottom: 10 },
  schoolName: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
  schoolCode: { fontSize: 14, color: '#E53E3E', fontWeight: 'bold', marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }
});