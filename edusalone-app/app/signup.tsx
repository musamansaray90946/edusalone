import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../src/lib/supabase';

export default function SignUpScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const[role, setRole] = useState<'Teacher' | 'Student' | 'Parent'>('Student');
  const[loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // NEW!

  async function handleSignUp() {
    if (!fullName || !email || !password || !schoolCode) { Alert.alert('Missing Info', 'Please fill out all fields.'); return; }
    setLoading(true);

    const { data: schoolData, error: schoolError } = await supabase.from('schools').select('id, name').eq('school_code', schoolCode.trim().toUpperCase()).single();
    if (schoolError || !schoolData) { Alert.alert('Invalid Code', 'The School Code you entered is incorrect. Please ask your Principal.'); setLoading(false); return; }

    const { data: authData, error: authError } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password: password });
    if (authError) { Alert.alert('Registration Failed', authError.message); setLoading(false); return; }

    const { error: profileError } = await supabase.from('users').insert([{ school_id: schoolData.id, role: role, full_name: fullName, email: email.trim().toLowerCase(), is_active: true }]);
    setLoading(false);

    if (profileError) { Alert.alert('Database Error', profileError.message); } 
    else { Alert.alert('Success!', `Welcome to ${schoolData.name}! Your account has been created.`); router.replace('/'); }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <TouchableOpacity onPress={() => router.replace('/login')} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#1A365D" />
        <Text style={{ color: '#1A365D', fontWeight: 'bold', marginLeft: 5 }}>Back to Login</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Parents & Students: Get your School Code from your Principal to link your account securely.</Text>

      <View style={styles.formContainer}>
        <Text style={styles.label}>I am a:</Text>
        <View style={styles.roleContainer}>
          {['Teacher', 'Student', 'Parent'].map((r: any) => (
            <TouchableOpacity key={r} style={[styles.roleChip, role === r && styles.roleChipActive]} onPress={() => setRole(r)}>
              <Text style={[styles.roleChipText, role === r && styles.roleChipTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>School Code (From Principal)</Text>
        <TextInput style={styles.input} placeholder="e.g. STE-2026" placeholderTextColor="#A0AEC0" value={schoolCode} onChangeText={setSchoolCode} autoCapitalize="characters" />
        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} placeholder="e.g. John Doe" placeholderTextColor="#A0AEC0" value={fullName} onChangeText={setFullName} />
        <Text style={styles.label}>Email Address</Text>
        <TextInput style={styles.input} placeholder="e.g. john@email.com" placeholderTextColor="#A0AEC0" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        
        <Text style={styles.label}>Create Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput 
            style={styles.passwordInput} 
            placeholder="Minimum 6 characters" 
            placeholderTextColor="#A0AEC0" 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry={!showPassword} 
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#718096" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.registerButton} onPress={handleSignUp} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.registerButtonText}>Register My Account</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC', justifyContent: 'center', padding: 24 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 20 },
  title: { fontSize: 32, fontWeight: '900', color: '#1A365D' },
  subtitle: { fontSize: 14, color: '#718096', marginTop: 4, marginBottom: 30, fontWeight: '600', lineHeight: 20 },
  formContainer: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 2 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#4A5568', marginBottom: 8, textTransform: 'uppercase' },
  roleContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  roleChip: { flex: 1, backgroundColor: '#EDF2F7', paddingVertical: 10, alignItems: 'center', borderRadius: 8, marginHorizontal: 3, borderWidth: 1, borderColor: '#E2E8F0' },
  roleChipActive: { backgroundColor: '#3182CE', borderColor: '#3182CE' },
  roleChipText: { fontWeight: 'bold', color: '#4A5568', fontSize: 12 },
  roleChipTextActive: { color: '#FFF' },
  input: { backgroundColor: '#F7FAFC', borderRadius: 10, padding: 14, fontSize: 16, color: '#2D3748', marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  passwordInput: { flex: 1, padding: 14, fontSize: 16, color: '#2D3748' },
  eyeIcon: { padding: 15 },
  registerButton: { backgroundColor: '#38A169', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 10 },
  registerButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});