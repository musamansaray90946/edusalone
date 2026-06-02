import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../src/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Required Fields', 'Please provide your email and password to proceed.');
      return;
    }
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
          Alert.alert("Connection Error", "System cannot reach the server. Check your internet.");
        } else {
          Alert.alert('Authentication Failed', 'The credentials provided do not match our records.');
        }
        return;
      }

      if (!authData.user) {
        Alert.alert('Login Failed', 'User synchronization error.');
        setLoading(false);
        return;
      }

      const userEmail = authData.user.email || '';
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .ilike('email', userEmail)
        .single();

      if (profileError || !profile) {
        Alert.alert('Access Restricted', 'Your account is authenticated but not mapped to a verified role.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      const userRole = profile.role.toLowerCase().trim();

      // SMAR ROUTING ARCHITECTURE
      if (userRole === 'superadmin') router.replace('/super-admin');
      else if (['admin', 'principal', 'secretary', 'bursar'].includes(userRole)) {
        router.replace('/(tabs)/dashboard');
      } else if (userRole === 'teacher') router.replace('/teacher-dashboard');
      else if (['student', 'parent', 'public gamer'].includes(userRole)) {
        router.replace('/student-dashboard');
      } else {
        Alert.alert('Portal Pending', `The ${profile.role} environment is being optimized.`);
        await supabase.auth.signOut();
      }
    } catch (err: any) {
      Alert.alert('System Exception', 'A critical network error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* NAVIGATION */}
          <TouchableOpacity onPress={() => router.replace('/')} style={styles.backAction}>
            <Ionicons name="chevron-back" size={24} color="#1A365D" />
            <Text style={styles.backText}>Exit to Home</Text>
          </TouchableOpacity>

          {/* HERO SECTION */}
          <View style={styles.heroSection}>
            <Text style={styles.title}>Secure Login</Text>
            <Text style={styles.subtitle}>Enter your institutional credentials to authorize access.</Text>
          </View>

          {/* FORM CONTAINER */}
          <View style={styles.formCard}>
            
            {/* EMAIL INPUT */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>OFFICIAL EMAIL</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#718096" style={styles.innerIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="user@school.sl"
                  placeholderTextColor="#A0AEC0"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* PASSWORD INPUT */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>KEY PASSWORD</Text>
                <TouchableOpacity onPress={() => router.replace('/forgot-password')}>
                  <Text style={styles.forgotAction}>Forgot?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#718096" style={styles.innerIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="••••••••"
                  placeholderTextColor="#A0AEC0"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeAction}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#718096" />
                </TouchableOpacity>
              </View>
            </View>

            {/* PRIMARY ACTION */}
            <TouchableOpacity 
              style={[styles.primaryButton, loading && styles.buttonDisabled]} 
              onPress={handleLogin} 
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Authorize Session</Text>
                  <Ionicons name="shield-checkmark" size={18} color="#FFF" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>

            {/* SECONDARY ACTION */}
            <View style={styles.footerLinks}>
              <Text style={styles.footerNote}>New to EduSalone?</Text>
              <TouchableOpacity onPress={() => router.replace('/signup')}>
                <Text style={styles.signupAction}> Apply for Access</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* TRUST FOOTER */}
          <View style={styles.trustBanner}>
            <Ionicons name="lock-closed" size={12} color="#A0AEC0" />
            <Text style={styles.trustText}>256-bit AES End-to-End Encryption</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 10 },
  
  // Back Navigation
  backAction: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  backText: { color: '#1A365D', fontWeight: '800', marginLeft: 4, fontSize: 15 },

  // Hero section
  heroSection: { marginBottom: 35 },
  title: { fontSize: 32, fontWeight: '900', color: '#1A365D', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#64748B', marginTop: 6, lineHeight: 22, fontWeight: '500' },

  // Form Card
  formCard: { 
    backgroundColor: '#FFFFFF', 
    padding: 24, 
    borderRadius: 24, 
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 4 
  },
  inputGroup: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputLabel: { fontSize: 11, fontWeight: '900', color: '#718096', marginBottom: 8, letterSpacing: 1 },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8FAFC', 
    borderRadius: 14, 
    borderWidth: 1.5,
    borderColor: '#EDF2F7',
    paddingHorizontal: 16,
    height: 56
  },
  innerIcon: { marginRight: 12 },
  inputField: { flex: 1, fontSize: 16, color: '#1A365D', fontWeight: '600' },
  eyeAction: { padding: 8 },
  forgotAction: { color: '#3182CE', fontSize: 12, fontWeight: '800', marginBottom: 8 },

  // Primary Button
  primaryButton: { 
    backgroundColor: '#1A365D', 
    borderRadius: 16, 
    height: 58,
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 10,
    shadowColor: '#1A365D',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },

  // Footer Links
  footerLinks: { flexDirection: 'row', justifyContent: 'center', marginTop: 25, alignItems: 'center' },
  footerNote: { color: '#718096', fontSize: 14, fontWeight: '500' },
  signupAction: { color: '#1A365D', fontSize: 14, fontWeight: '900' },

  // Trust Banner
  trustBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  trustText: { fontSize: 11, color: '#A0AEC0', fontWeight: '700', marginLeft: 5, letterSpacing: 0.5 }
});