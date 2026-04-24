import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/lib/supabase';

export default function TeachersScreen() {
  const [fullName, setFullName] = useState('');
  const[email, setEmail] = useState('');
  
  // 🚨 SECURITY FIX: Locked to Principal's School
  const[school, setSchool] = useState<any>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const[fetching, setFetching] = useState(true);

  useEffect(() => { loadInitialData(); },[]);
  useEffect(() => { if (school) { fetchTeachers(); } }, [school]);

  async function loadInitialData() {
    setFetching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('users').select('school_id').eq('email', user.email).single();
      if (profile && profile.school_id) {
        const { data: schoolData } = await supabase.from('schools').select('*').eq('id', profile.school_id).single();
        if (schoolData) setSchool(schoolData);
      }
    } catch (err: any) { Alert.alert("Error", "Failed to load school data."); }
    setFetching(false);
  }

  async function fetchTeachers() {
    if (!school) return;
    setFetching(true);
    const { data } = await supabase.from('users').select('*').eq('school_id', school.id).eq('role', 'Teacher').order('created_at', { ascending: false });
    if (data) setTeachers(data);
    setFetching(false);
  }

  async function registerTeacher() {
    if (!school) { Alert.alert('Error', 'School not loaded.'); return; }
    if (!fullName || !email) { Alert.alert('Missing Info', 'Please enter Name and Email.'); return; }
    
    setLoading(true);
    const { error } = await supabase.from('users').insert([{ school_id: school.id, role: 'Teacher', full_name: fullName, email: email.toLowerCase().trim(), is_active: true }]);
    setLoading(false);
    
    if (error) Alert.alert('Error', error.message);
    else { Alert.alert('Success', `Teacher ${fullName} created!`); setFullName(''); setEmail(''); fetchTeachers(); }
  }

  async function deleteTeacher(userId: string) {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) Alert.alert('Error', error.message); else fetchTeachers();
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.headerTitle}>Teacher Management</Text>

        <View style={styles.schoolSelectorContainer}>
          <Text style={styles.selectorLabel}>ACTIVE SCHOOL:</Text>
          <View style={styles.schoolChipActive}>
            <Text style={styles.schoolChipTextActive}>{school?.name || 'Loading...'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Add New Teacher</Text>
          <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#A0AEC0" value={fullName} onChangeText={setFullName} />
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#A0AEC0" value={email} onChangeText={setEmail} autoCapitalize="none" />
          <TouchableOpacity style={styles.primaryButton} onPress={registerTeacher} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>Create Profile</Text>}
          </TouchableOpacity>
        </View>

        <Text style={styles.listTitle}>Staff Directory ({teachers.length})</Text>
        {fetching ? <ActivityIndicator size="large" color="#DD6B20" /> : teachers.length === 0 ? (
          <Text style={styles.emptyText}>No teachers in this school yet.</Text>
        ) : (
          teachers.map(item => (
            <View key={item.id} style={styles.teacherItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.teacherName}>{item.full_name}</Text>
                <Text style={styles.teacherDetails}>{item.email}</Text>
              </View>
              <Text style={styles.roleBadge}>Teacher</Text>
              <TouchableOpacity onPress={() => Alert.alert("Remove Teacher?", "Are you sure?",[{ text: "Cancel", style: "cancel" },{ text: "Delete", style: "destructive", onPress: () => deleteTeacher(item.id) }])} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={22} color="#E53E3E" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8', paddingTop: 50, paddingHorizontal: 20 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#1A365D', marginBottom: 10 },
  schoolSelectorContainer: { marginBottom: 15 },
  selectorLabel: { fontSize: 14, fontWeight: 'bold', color: '#4A5568', marginBottom: 8 },
  schoolChipActive: { backgroundColor: '#1A365D', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, alignSelf: 'flex-start' },
  schoolChipTextActive: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  card: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3748', marginBottom: 12 },
  input: { backgroundColor: '#EDF2F7', borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 12, color: '#2D3748' },
  primaryButton: { backgroundColor: '#DD6B20', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A5568', marginBottom: 10, marginLeft: 4 },
  teacherItem: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#DD6B20' },
  teacherName: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
  teacherDetails: { fontSize: 12, color: '#718096', marginTop: 4 },
  roleBadge: { backgroundColor: '#FEEBC8', color: '#DD6B20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontWeight: 'bold', fontSize: 12, marginRight: 10 },
  deleteButton: { padding: 5 },
  emptyText: { textAlign: 'center', color: '#A0AEC0', marginTop: 20, fontStyle: 'italic' }
});