import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../src/lib/supabase';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!email) { Alert.alert('Error', 'Please enter your email.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    setLoading(false);
    
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Check your Email', 'We have sent you a secure link to reset your password.');
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.replace('/login')} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
        <Ionicons name="arrow-back" size={24} color="#1A365D" />
        <Text style={{ color: '#1A365D', fontWeight: 'bold', marginLeft: 5 }}>Back to Login</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 32, fontWeight: '900', color: '#1A365D', marginBottom: 10 }}>Reset Password</Text>
      <Text style={{ fontSize: 14, color: '#718096', marginBottom: 30 }}>Enter your email address and we will send you a recovery link.</Text>
      <TextInput style={styles.input} placeholder="e.g. john@email.com" placeholderTextColor="#A0AEC0" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Send Recovery Email</Text>}
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC', padding: 24, justifyContent: 'center' },
  input: { backgroundColor: '#FFF', borderRadius: 10, padding: 16, fontSize: 16, color: '#2D3748', marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  button: { backgroundColor: '#38A169', borderRadius: 10, padding: 16, alignItems: 'center' }
});