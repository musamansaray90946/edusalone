import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../src/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const[password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const[showPassword, setShowPassword] = useState(false); 
  const router = useRouter();

  async function handleLogin() {
    if (!email || !password) { Alert.alert('Error', 'Please enter both email and password.'); return; }
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (authError) {
        setLoading(false);
        const errMsg = authError.message.toLowerCase();
        if (errMsg.includes('network') || errMsg.includes('fetch failed')) {
          Alert.alert("You're currently offline 📶", "This page couldn't load. Please check your internet connection.",[{ text: "Cancel", style: "cancel" }, { text: "Open Network Settings", onPress: () => Platform.OS !== 'web' ? Linking.openSettings() : null }]);
        } else {
          Alert.alert('Login Failed', 'Invalid email or password.');
        }
        return;
      }

      if (!authData.user) { Alert.alert('Login Failed', 'User not found.'); setLoading(false); return; }

      const userEmail = authData.user.email;
      const { data: profile, error: profileError } = await supabase.from('users').select('role').ilike('email', userEmail).single();

      if (profileError || !profile) { Alert.alert('Access Denied', 'Your account is not mapped to a school role.'); await supabase.auth.signOut(); setLoading(false); return; }

      const userRole = profile.role.toLowerCase(); // Ignore case sensitivity!

      // ROUTING ENGINE
      if (userRole === 'superadmin') router.replace('/super-admin');
      else if (userRole === 'admin') router.replace('/(tabs)/dashboard');
      else if (userRole === 'teacher') router.replace('/teacher-dashboard'); 
      else if (userRole === 'student' || userRole === 'parent') router.replace('/student-dashboard'); 
      else { Alert.alert('Coming Soon', `The ${profile.role} portal is currently under construction.`); await supabase.auth.signOut(); }

    } catch (err: any) {
      Alert.alert('System Error 📶', 'A network error occurred. Please ensure you have a stable internet connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      {/* 🚨 WEB FIX: Use router.replace('/') so it never gets stuck! */}
      <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#1A365D" />
        <Text style={{ color: '#1A365D', fontWeight: 'bold', marginLeft: 5 }}>Back to Home</Text>
      </TouchableOpacity>

      <View style={styles.headerContainer}>
        <Text style={styles.title}>Secure Login</Text>
        <Text style={styles.subtitle}>Enter your credentials to access your portal.</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Email Address</Text>
        <TextInput style={styles.input} placeholder="e.g. user@school.sl" placeholderTextColor="#A0AEC0" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput style={styles.passwordInput} placeholder="••••••••" placeholderTextColor="#A0AEC0" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#718096" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.loginButtonText}>Login to Dashboard</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={{ alignItems: 'center', marginTop: 20 }} onPress={() => router.replace('/forgot-password')}>
          <Text style={{ color: '#718096', fontSize: 14, fontWeight: '600' }}>Forgot Password?</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ alignItems: 'center', marginTop: 15 }} onPress={() => router.replace('/signup')}>
          <Text style={{ color: '#3182CE', fontSize: 14, fontWeight: 'bold' }}>Don't have an account? Sign Up Here</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8', justifyContent: 'center', padding: 24 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 20 },
  headerContainer: { marginBottom: 30 },
  title: { fontSize: 32, fontWeight: '900', color: '#1A365D' },
  subtitle: { fontSize: 14, color: '#718096', marginTop: 4, fontWeight: '600', letterSpacing: 1 },
  formContainer: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 2 },
  label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8 },
  input: { backgroundColor: '#EDF2F7', borderRadius: 10, padding: 16, fontSize: 16, color: '#2D3748', marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDF2F7', borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  passwordInput: { flex: 1, padding: 16, fontSize: 16, color: '#2D3748' },
  eyeIcon: { padding: 15 },
  loginButton: { backgroundColor: '#1A365D', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 10 },
  loginButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }
});