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
  View
} from 'react-native';
import { supabase } from '../src/lib/supabase';

// --- CUSTOM SELECTOR COMPONENT ---
const InstitutionalSelector = ({ label, options, current, onSelect, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <View style={styles.inputStack}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity 
        style={styles.selectorSurface} 
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <Text style={{ color: current ? '#1A365D' : '#94A3B8', fontSize: 16, fontWeight: '700' }}>
          {current || placeholder}
        </Text>
        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color="#1A365D" />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdownMenu}>
          {options.map((item: string) => (
            <TouchableOpacity key={item} style={styles.dropdownItem} onPress={() => { onSelect(item); setIsOpen(false); }}>
              <Text style={[styles.itemText, current === item && { color: '#3182CE', fontWeight: '900' }]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default function SignupScreen() {
  const router = useRouter();

  // -- Context States --
  const [userRole, setUserRole] = useState('');
  const [admissionKey, setAdmissionKey] = useState('');
  const [institutionCode, setInstitutionCode] = useState('');
  
  // -- Identity Profile --
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // -- UI Logic States --
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isPassVisible, setIsPassVisible] = useState(false);

  // -- Derived UI Logic (Fixes the UI error in your screenshot) --
  const isStudent = userRole === 'Student / Pupil';
  const isPublic = userRole === 'Public Gamer';
  const ROLES = ['Student / Pupil', 'Teacher', 'Parent', 'Bursar', 'Secretary', 'Principal', 'Proprietor', 'Public Gamer'];

  const handleAccountActivation = async () => {
    if (!userRole || !fullName || !email || !password) {
      Alert.alert('Incomplete Profile', 'All fields marked with an asterisk are required.');
      return;
    }
    setIsProvisioning(true);

    try {
      let activeSchoolId = null;
      let stagedStudentRecord: any = null;

      if (!isPublic) {
        if (isStudent) {
          // Verify against Stage 1 & 2
          // Stage 3: Find student record via admission number
          const { data: record, error: findErr } = await supabase
            .from('students')
            .select('*')
            .ilike('admission_number', admissionKey.trim())
            .maybeSingle();

          if (findErr) {
            Alert.alert('Connection Error ⚠️', 'Could not verify your ID. Please check your internet connection and try again.');
            setIsProvisioning(false); return;
          }
          if (!record) {
            Alert.alert(
              'ID Not Registered 🔍',
              `No student found with ID: "${admissionKey.trim()}"\n\nThis means:\n• You may have entered the wrong ID\n• Your Principal hasn't enrolled you yet\n\nAsk your Principal to:\n1️⃣ Enroll you in the Students tab\n2️⃣ Authorize your account in Command Center`
            );
            setIsProvisioning(false); return;
          }
          if (!record.user_id) {
            Alert.alert(
              'Awaiting Stage 2 ⏳',
              `You are enrolled but your Principal has NOT yet authorized your mobile access.\n\nTell your Principal:\n→ Open Command Center\n→ Tap "Authorize Mobile Account"\n→ Enter your ID: ${admissionKey.trim()}\n\nThen come back and register.`
            );
            setIsProvisioning(false); return;
          }

          // Verify ghost exists and is unclaimed
          const { data: ghost } = await supabase
            .from('users')
            .select('is_active')
            .eq('id', record.user_id)
            .maybeSingle();

          if (!ghost) {
            Alert.alert('System Error', 'Provisioning record not found. Ask your Principal to re-run Stage 2 for your ID.');
            setIsProvisioning(false); return;
          }
          if (ghost.is_active === true) {
            Alert.alert('Already Claimed', 'This ID has already been activated. Use your registered email to log in, or contact your Principal.');
            setIsProvisioning(false); return;
          }

          stagedStudentRecord = record;
          activeSchoolId = record.school_id;
        } else {
          // Verify School Access Code
          const { data: schoolData, error: schoolErr } = await supabase.from('schools').select('id').ilike('school_code', institutionCode.trim()).single();
          if (schoolErr || !schoolData) {
            Alert.alert('Verification Failed', 'Invalid School Access Code.');
            setIsProvisioning(false); return;
          }
          activeSchoolId = schoolData.id;
        }
      }

      // Signup to Auth
      const { data: authResult, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (authError) throw authError;
      const internalUid = authResult.user!.id;

      // ATOMIC BINDING (STAGE 3)
      if (isStudent && stagedStudentRecord) {
        // STEP 1: Create real user FIRST (safest order)
        const { error: insertErr } = await supabase.from('users').insert([{
          id: internalUid,
          school_id: activeSchoolId,
          role: 'Student',
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          is_active: true
        }]);
        if (insertErr) throw insertErr;

        // STEP 2: Link student record to real user
        const { error: linkErr } = await supabase.from('students')
          .update({ user_id: internalUid })
          .eq('id', stagedStudentRecord.id);
        if (linkErr) throw linkErr;

        // STEP 3: Delete ghost ONLY after real user is safely linked
        await supabase.from('users')
          .delete()
          .eq('id', stagedStudentRecord.user_id);
      } else {
        await supabase.from('users').insert([{
          id: internalUid, school_id: activeSchoolId, role: userRole,
          full_name: fullName.trim(), phone: phone.trim(), email: email.trim().toLowerCase(), is_active: true
        }]);
      }

      Alert.alert('Success', 'Account Provisioned. Please check your email for the verification link.');
      router.replace('/login');
    } catch (err: any) {
      Alert.alert('System Error', err.message);
    } finally {
      setIsProvisioning(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <TouchableOpacity onPress={() => router.replace('/login')} style={styles.backAction}>
        <Ionicons name="arrow-back-circle" size={28} color="#1A365D" />
        <Text style={styles.backText}>Return to Login</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
        <View style={styles.heroSection}>
          <Text style={styles.title}>Account Setup</Text>
          <Text style={styles.subtitle}>Finalize your digital identity for portal access.</Text>
        </View>

        <View style={styles.cardForm}>
          <InstitutionalSelector 
            label="ONBOARDING ROLE *" 
            options={ROLES} 
            current={userRole} 
            onSelect={setUserRole} 
            placeholder="Select your position" 
          />

          {/* DYNAMIC FIELD: STUDENT ID */}
          {isStudent && (
            <View style={styles.inputStack}>
              <Text style={styles.fieldLabel}>ADMISSION ID (STAGE 1 & 2 KEY) *</Text>
              <TextInput 
                style={styles.textInput} 
                placeholder="Unique ID e.g. 124531" 
                placeholderTextColor="#A0AEC0" 
                value={admissionKey} 
                onChangeText={setAdmissionKey} 
                autoCapitalize="characters" 
              />
            </View>
          )}

          {/* DYNAMIC FIELD: SCHOOL CODE (FIXES THE ERROR IN YOUR SCREENSHOT) */}
          {!isStudent && !isPublic && userRole !== '' && (
            <View style={styles.inputStack}>
              <Text style={styles.fieldLabel}>SCHOOL AUTHORIZATION CODE *</Text>
              <TextInput 
                style={styles.textInput} 
                placeholder="6-Digit Secure Code" 
                placeholderTextColor="#A0AEC0" 
                value={institutionCode} 
                onChangeText={setInstitutionCode} 
                autoCapitalize="characters" 
              />
            </View>
          )}

          <View style={styles.inputStack}>
            <Text style={styles.fieldLabel}>LEGAL FULL NAME *</Text>
            <TextInput style={styles.textInput} placeholder="Full Legal Name" placeholderTextColor="#A0AEC0" value={fullName} onChangeText={setFullName} />
          </View>

          <View style={styles.inputStack}>
            <Text style={styles.fieldLabel}>AUTHENTICATION EMAIL *</Text>
            <TextInput style={styles.textInput} placeholder="institutional@email.sl" placeholderTextColor="#A0AEC0" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          </View>

          <View style={styles.inputStack}>
            <Text style={styles.fieldLabel}>SECURITY PASSWORD *</Text>
            <View style={styles.passWrapper}>
              <TextInput 
                style={styles.passInput} 
                placeholder="Min. 6 characters" 
                placeholderTextColor="#A0AEC0" 
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry={!isPassVisible} 
              />
              <TouchableOpacity onPress={() => setIsPassVisible(!isPassVisible)} style={{ padding: 12 }}>
                <Ionicons name={isPassVisible ? "eye-off" : "eye"} size={20} color="#718096" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleAccountActivation} disabled={isProvisioning}>
            {isProvisioning ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Verify & Provision</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC', paddingHorizontal: 25, paddingTop: Platform.OS === 'android' ? 50 : 20 },
  backAction: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  backText: { fontSize: 16, fontWeight: '800', color: '#1A365D', marginLeft: 8 },
  heroSection: { marginBottom: 30 },
  title: { fontSize: 32, fontWeight: '900', color: '#1A365D' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 6, fontWeight: '600' },
  cardForm: { backgroundColor: '#FFF', borderRadius: 28, padding: 24, elevation: 4, borderWidth: 1, borderColor: '#EDF2F7' },
  inputStack: { marginBottom: 20 },
  fieldLabel: { fontSize: 10, fontWeight: '900', color: '#718096', marginBottom: 8, letterSpacing: 1.5, textTransform: 'uppercase' },
  selectorSurface: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: '#E2E8F0' },
  dropdownMenu: { backgroundColor: '#FFF', borderRadius: 16, marginTop: 10, elevation: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  dropdownItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  itemText: { fontSize: 15, color: '#4A5568', fontWeight: '600' },
  textInput: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, fontSize: 16, color: '#1A365D', fontWeight: '700', borderWidth: 1.5, borderColor: '#E2E8F0' },
  passWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1.5, borderColor: '#E2E8F0' },
  passInput: { flex: 1, padding: 16, fontSize: 16, color: '#1A365D', fontWeight: '700' },
  submitBtn: { backgroundColor: '#1A365D', borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 10, elevation: 6 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 }
});