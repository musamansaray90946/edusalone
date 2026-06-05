import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../src/lib/supabase';

export default function SuperAdminScreen() {
  const router = useRouter();
  const [schools, setSchools] = useState<any[]>([]);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [paymentDueInput, setPaymentDueInput] = useState('');
  const [trialDaysInput, setTrialDaysInput] = useState('30');
  const [trialStartInput, setTrialStartInput] = useState('');
  const [trialEndInput, setTrialEndInput] = useState('');
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [mottoInput, setMottoInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => { loadSchools(); },[]);

  async function loadSchools() {
    setLoading(true);
    const { data, error } = await supabase.from('schools').select('*').order('created_at', { ascending: false });
    if (data) {
      setSchools(data);
      await checkAndSendReminders(data);
    }
    if (error) console.log("Fetch Error:", error.message);
    setLoading(false);
  }

  async function checkAndSendReminders(schoolList: any[]) {
    const now = new Date();
    for (const school of schoolList) {
      const trialEnd = school.trial_end_date ? new Date(school.trial_end_date) : null;
      const paymentDue = school.payment_due_date ? new Date(school.payment_due_date) : null;
      const daysUntilTrial = trialEnd ? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
      const daysUntilPayment = paymentDue ? Math.ceil((paymentDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

      // Trial expiring in 3 days
      if (daysUntilTrial !== null && daysUntilTrial <= 3 && daysUntilTrial > 0 && school.subscription_status === 'trial') {
        await supabase.from('principal_notifications').upsert({
          school_id: school.id, type: 'trial_expiring',
          title: '⏰ Trial Period Expiring Soon',
          message: `Your ${daysUntilTrial}-day trial expires on ${trialEnd?.toLocaleDateString()}. Contact PalmTech Education to continue uninterrupted access.`,
          is_read: false
        }, { onConflict: 'school_id,type' });
      }

      // Trial expired — auto move to grace
      if (trialEnd && now > trialEnd && school.subscription_status === 'trial') {
        await supabase.from('schools').update({ subscription_status: 'grace' }).eq('id', school.id);
        await supabase.from('principal_notifications').insert({
          school_id: school.id, type: 'suspension_warning',
          title: '🚨 Trial Expired — Grace Period Active',
          message: `Your trial has expired. You have ${school.grace_period_days || 7} days before automatic suspension. Please contact PalmTech Education immediately.`,
        });
      }

      // Payment overdue warning
      if (daysUntilPayment !== null && daysUntilPayment <= 7 && daysUntilPayment > 0) {
        await supabase.from('principal_notifications').upsert({
          school_id: school.id, type: 'payment_due',
          title: '💳 Payment Due Soon',
          message: `Your subscription payment of SLL ${(school.monthly_fee || 500000).toLocaleString()} is due in ${daysUntilPayment} day${daysUntilPayment !== 1 ? 's' : ''}. Avoid service interruption.`,
          is_read: false
        }, { onConflict: 'school_id,type' });
      }

      // Auto-suspend after grace period
      if (school.subscription_status === 'grace') {
        const graceDays = school.grace_period_days || 7;
        const graceEnd = trialEnd ? new Date(trialEnd.getTime() + graceDays * 24 * 60 * 60 * 1000) : null;
        if (graceEnd && now > graceEnd) {
          await supabase.from('schools').update({ subscription_status: 'suspended', status: 'Suspended' }).eq('id', school.id);
          await supabase.from('principal_notifications').insert({
            school_id: school.id, type: 'account_suspended',
            title: 'Account Suspended',
            message: 'Your EduSalone account has been automatically suspended due to non-payment. Contact PalmTech Education at admin@palmtech.sl to restore access.',
          });
        }
      }
    }
    // No loadSchools() here — avoids infinite loop
  }

  async function handleRegisterSchool() {
    if (!newSchoolName.trim()) { Alert.alert('Error', 'Please enter a school name.'); return; }
    
    const prefix = newSchoolName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'S');
    const code = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Start every new school on a 30-day trial (stage 1). CEO can adjust per school in ⚙.
    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);
    const { error } = await supabase.from('schools').insert([{
      name: newSchoolName.trim(),
      status: 'Active',
      school_code: code,
      subscription_status: 'trial',
      trial_start_date: trialStart.toISOString(),
      trial_end_date: trialEnd.toISOString(),
    }]);

    if (error) { Alert.alert('Database Error', error.message); } 
    else { 
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', `${newSchoolName} Registered!\n\nAccess Code: ${code}`); 
      setNewSchoolName(''); 
      loadSchools(); 
    }
  }

  async function uploadSchoolLogo(schoolId: string, schoolName: string) {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true 
    });

    if (!result.canceled && result.assets[0].base64) {
      setProcessingId(schoolId);
      const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const { error } = await supabase.from('schools').update({ logo_url: base64Img }).eq('id', schoolId);
      setProcessingId(null);

      if (error) Alert.alert("Upload Failed", error.message);
      else {
        if(Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', `Logo updated for ${schoolName}!`);
        setSchools(prev => prev.map(s => s.id === schoolId ? { ...s, logo_url: base64Img } : s));
        setSelectedSchool((prev: any) => (prev && prev.id === schoolId ? { ...prev, logo_url: base64Img } : prev));
        loadSchools(); 
      }
    }
  }

  async function removeSchoolLogo(schoolId: string, schoolName: string) {
    const go = async () => {
      setProcessingId(schoolId);
      const { error } = await supabase.from('schools').update({ logo_url: null }).eq('id', schoolId);
      setProcessingId(null);
      if (error) { Alert.alert('Failed', error.message); return; }
      setSchools(prev => prev.map(s => s.id === schoolId ? { ...s, logo_url: null } : s));
      setSelectedSchool((prev: any) => (prev && prev.id === schoolId ? { ...prev, logo_url: null } : prev));
    };
    if (Platform.OS === 'web') { if (window.confirm(`Remove the logo for ${schoolName}?`)) go(); return; }
    Alert.alert('Remove Logo?', `Delete the logo for ${schoolName}?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: go }]);
  }

  function confirmToggleStatus(id: string, name: string, currentStatus: string) {
    const isSuspending = currentStatus?.trim() === 'Active';
    const actionWord = isSuspending ? 'Suspend' : 'Activate';
    const newStatus = isSuspending ? 'Suspended' : 'Active';

    Alert.alert(`${actionWord} School?`, `Are you sure you want to ${actionWord.toLowerCase()} ${name}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: `Yes, ${actionWord}`, style: isSuspending ? 'destructive' : 'default', onPress: () => executeToggleStatus(id, newStatus) }
      ]
    );
  }

  async function executeToggleStatus(id: string, newStatus: string) {
    setProcessingId(id);
    // 🛡️ FIX: We update 'status' perfectly.
    const { data, error } = await supabase.from('schools').update({ status: newStatus }).eq('id', id).select();
    setProcessingId(null);

    if (error || !data || data.length === 0) Alert.alert('Update Failed', 'Database rejected the update.');
    else {
      setSchools(prevSchools => prevSchools.map(school => school.id === id ? { ...school, status: newStatus } : school));
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  function confirmDeleteSchool(id: string, name: string) {
    Alert.alert('CRITICAL WARNING', `Permanently delete ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          setProcessingId(id);
          await supabase.from('schools').delete().eq('id', id);
          setProcessingId(null);
          loadSchools();
        }
      }
    ]);
  }

  function parseDDMMYYYY(input: string): Date | null {
    if (!input || !input.includes('/')) return null;
    const parts = input.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

async function updateSchoolSubscription() {
    if (!selectedSchool) return;
    setProcessingId(selectedSchool.id);
    try {
      const updates: any = {
        motto: mottoInput.trim() || null,
        address: addressInput.trim() || null,
        phone: phoneInput.trim() || null,
        email: emailInput.trim() || null,
      };

      // Parse payment due date
      if (paymentDueInput && paymentDueInput.length >= 8) {
        const parsed = parseDDMMYYYY(paymentDueInput);
        if (parsed) {
          updates.payment_due_date = parsed.toISOString();
        } else {
          Alert.alert('Invalid Payment Date', 'Use format DD/MM/YYYY e.g. 30/06/2026');
          setProcessingId(null);
          return;
        }
      }

      // Parse trial START date
      if (trialStartInput && trialStartInput.length >= 8) {
        const parsed = parseDDMMYYYY(trialStartInput);
        if (parsed) {
          updates.trial_start_date = parsed.toISOString();
        } else {
          Alert.alert('Invalid Trial Start Date', 'Use format DD/MM/YYYY e.g. 01/06/2026');
          setProcessingId(null);
          return;
        }
      }

      // Parse trial END date (direct input — overrides days calculation)
      if (trialEndInput && trialEndInput.length >= 8) {
        const parsed = parseDDMMYYYY(trialEndInput);
        if (parsed) {
          updates.trial_end_date = parsed.toISOString();
        } else {
          Alert.alert('Invalid Trial End Date', 'Use format DD/MM/YYYY e.g. 30/06/2026');
          setProcessingId(null);
          return;
        }
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from('schools').update(updates).eq('id', selectedSchool.id);
        if (error) throw error;
      }

      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '✅ Saved',
        `Settings updated for ${selectedSchool.name}.\n\n` +
        (updates.trial_end_date ? `Trial ends: ${new Date(updates.trial_end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}\n` : '') +
        (updates.payment_due_date ? `Payment due: ${new Date(updates.payment_due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}` : '')
      );
      setShowSchoolModal(false);
      setPaymentDueInput('');
      loadSchools();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save settings.');
    }
    setProcessingId(null);
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* SCHOOL MANAGEMENT MODAL */}
      {showSchoolModal && selectedSchool && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 999, justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#FFF', borderRadius: 20, maxHeight: '88%', overflow: 'hidden' }}>
            {/* Fixed header with close (X) */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#EDF2F7' }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A365D' }}>{selectedSchool.name}</Text>
                <Text style={{ fontSize: 12, color: '#718096', marginTop: 3 }}>School Settings & Subscription</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSchoolModal(false)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#EDF2F7', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={20} color="#4A5568" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flexShrink: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingTop: 18, paddingBottom: 18 }} showsVerticalScrollIndicator={true}>

            {/* TRIAL START DATE */}
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#718096', marginBottom: 6, textTransform: 'uppercase' as any }}>Trial Start Date (DD/MM/YYYY)</Text>
            <TextInput
              style={[styles.input, { marginBottom: 16 }]}
              value={trialStartInput}
              onChangeText={(text) => {
                const clean = text.replace(/\D/g, '');
                let formatted = clean;
                if (clean.length >= 3 && clean.length <= 4) formatted = clean.slice(0,2) + '/' + clean.slice(2);
                else if (clean.length >= 5) formatted = clean.slice(0,2) + '/' + clean.slice(2,4) + '/' + clean.slice(4,8);
                setTrialStartInput(formatted);
              }}
              placeholder="e.g. 01/06/2026"
              keyboardType="numeric"
              maxLength={10}
            />

            {/* TRIAL END DATE */}
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#718096', marginBottom: 6, textTransform: 'uppercase' as any }}>Trial End Date (DD/MM/YYYY)</Text>
            <TextInput
              style={[styles.input, { marginBottom: 16 }]}
              value={trialEndInput}
              onChangeText={(text) => {
                const clean = text.replace(/\D/g, '');
                let formatted = clean;
                if (clean.length >= 3 && clean.length <= 4) formatted = clean.slice(0,2) + '/' + clean.slice(2);
                else if (clean.length >= 5) formatted = clean.slice(0,2) + '/' + clean.slice(2,4) + '/' + clean.slice(4,8);
                setTrialEndInput(formatted);
              }}
              placeholder="e.g. 30/06/2026"
              keyboardType="numeric"
              maxLength={10}
            />

            {/* PAYMENT DUE DATE */}
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#718096', marginBottom: 6, textTransform: 'uppercase' as any }}>Payment Due Date (DD/MM/YYYY)</Text>
            <TextInput
              style={[styles.input, { marginBottom: 16 }]}
              value={paymentDueInput}
              onChangeText={(text) => {
                // Auto-format as DD/MM/YYYY
                const clean = text.replace(/\D/g, '');
                let formatted = clean;
                if (clean.length >= 3 && clean.length <= 4) formatted = clean.slice(0,2) + '/' + clean.slice(2);
                else if (clean.length >= 5) formatted = clean.slice(0,2) + '/' + clean.slice(2,4) + '/' + clean.slice(4,8);
                setPaymentDueInput(formatted);
              }}
              placeholder="e.g. 30/06/2026"
              keyboardType="numeric"
              maxLength={10}
            />

            {/* Current status info */}
            <View style={{ backgroundColor: '#F7FAFC', borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <Text style={{ fontSize: 12, color: '#4A5568', fontWeight: 'bold' }}>Status: <Text style={{ color: '#1A365D' }}>{selectedSchool.subscription_status?.toUpperCase()}</Text></Text>
              <Text style={{ fontSize: 12, color: '#4A5568', fontWeight: 'bold', marginTop: 4 }}>Trial Started: <Text style={{ color: '#38A169' }}>{selectedSchool.trial_start_date ? new Date(selectedSchool.trial_start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Not set'}</Text></Text>
              <Text style={{ fontSize: 12, color: '#4A5568', fontWeight: 'bold', marginTop: 4 }}>Trial Ends: <Text style={{ color: '#E53E3E' }}>{selectedSchool.trial_end_date ? new Date(selectedSchool.trial_end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Not set'}</Text></Text>
              <Text style={{ fontSize: 12, color: '#4A5568', fontWeight: 'bold', marginTop: 4 }}>Payment Due: <Text style={{ color: '#DD6B20' }}>{selectedSchool.payment_due_date ? new Date(selectedSchool.payment_due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Not set'}</Text></Text>
            </View>

            {/* Quick status buttons — each one saves immediately and gives feedback */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#718096', marginBottom: 8, textTransform: 'uppercase' as any }}>Quick Status Change</Text>
              <View style={{ flexDirection: 'row' }}>
                {[
                  { key: 'trial', label: 'TRIAL', color: '#2B6CB0', bg: '#EBF8FF' },
                  { key: 'active', label: 'ACTIVE', color: '#22543D', bg: '#C6F6D5' },
                  { key: 'grace', label: 'GRACE', color: '#744210', bg: '#FEEBC8' },
                  { key: 'suspended', label: 'SUSPEND', color: '#822727', bg: '#FED7D7' },
                ].map(item => {
                  const isSelected = selectedSchool.subscription_status === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={async () => {
                        const newStatus = item.key === 'suspended' ? 'Suspended' : 'Active';
                        const { error } = await supabase.from('schools')
                          .update({ subscription_status: item.key, status: newStatus })
                          .eq('id', selectedSchool.id);
                        if (!error) {
                          const updated = { ...selectedSchool, subscription_status: item.key, status: newStatus };
                          setSelectedSchool(updated);
                          setSchools(prev => prev.map(sc => sc.id === selectedSchool.id ? { ...sc, subscription_status: item.key, status: newStatus } : sc));
                          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          Alert.alert('Status Updated', `${selectedSchool.name} is now ${item.label}.`);
                        } else {
                          Alert.alert('Error', error.message);
                        }
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: isSelected ? item.color : item.bg,
                        borderRadius: 10,
                        paddingVertical: 12,
                        alignItems: 'center',
                        marginRight: 4,
                        borderWidth: 2,
                        borderColor: isSelected ? item.color : 'transparent'
                      }}>
                      <Text style={{
                        fontSize: 9,
                        fontWeight: '900' as any,
                        color: isSelected ? '#FFF' : item.color,
                        textTransform: 'uppercase' as any
                      }}>{item.label}</Text>
                      {isSelected && <Text style={{ fontSize: 8, color: '#FFF', marginTop: 2 }}>✓ Current</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── SCHOOL LOGO ── */}
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#718096', marginBottom: 6, marginTop: 4, textTransform: 'uppercase' as any }}>School Logo</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#EDF2F7', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', marginRight: 12 }}>
                {selectedSchool.logo_url ? <Image source={{ uri: selectedSchool.logo_url }} style={{ width: '100%', height: '100%' }} /> : <Ionicons name="image-outline" size={26} color="#A0AEC0" />}
              </View>
              <TouchableOpacity onPress={() => uploadSchoolLogo(selectedSchool.id, selectedSchool.name)} style={{ flex: 1, backgroundColor: '#EBF8FF', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginRight: 8 }}>
                <Text style={{ color: '#2B6CB0', fontWeight: '900', fontSize: 12 }}>{selectedSchool.logo_url ? 'Change Logo' : 'Upload Logo'}</Text>
              </TouchableOpacity>
              {selectedSchool.logo_url ? (
                <TouchableOpacity onPress={() => removeSchoolLogo(selectedSchool.id, selectedSchool.name)} style={{ backgroundColor: '#FED7D7', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center' }}>
                  <Text style={{ color: '#822727', fontWeight: '900', fontSize: 12 }}>Remove</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* ── LETTERHEAD DETAILS ── */}
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#718096', marginBottom: 6, textTransform: 'uppercase' as any }}>School Motto / Slogan</Text>
            <TextInput style={[styles.input, { marginBottom: 16 }]} value={mottoInput} onChangeText={setMottoInput} placeholder="e.g. Knowledge is Light" placeholderTextColor="#A0AEC0" />

            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#718096', marginBottom: 6, textTransform: 'uppercase' as any }}>Address</Text>
            <TextInput style={[styles.input, { marginBottom: 16 }]} value={addressInput} onChangeText={setAddressInput} placeholder="e.g. 12 Circular Road, Freetown" placeholderTextColor="#A0AEC0" />

            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#718096', marginBottom: 6, textTransform: 'uppercase' as any }}>Phone</Text>
            <TextInput style={[styles.input, { marginBottom: 16 }]} value={phoneInput} onChangeText={setPhoneInput} placeholder="e.g. +232 76 123456" placeholderTextColor="#A0AEC0" keyboardType="phone-pad" />

            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#718096', marginBottom: 6, textTransform: 'uppercase' as any }}>Email</Text>
            <TextInput style={[styles.input, { marginBottom: 16 }]} value={emailInput} onChangeText={setEmailInput} placeholder="e.g. info@school.edu.sl" placeholderTextColor="#A0AEC0" keyboardType="email-address" autoCapitalize="none" />

            </ScrollView>

            {/* Fixed footer */}
            <View style={{ flexDirection: 'row', padding: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#EDF2F7' }}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: '#EDF2F7', borderRadius: 12, padding: 14, alignItems: 'center', marginRight: 10 }} onPress={() => setShowSchoolModal(false)}>
                <Text style={{ fontWeight: 'bold', color: '#4A5568' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 2, backgroundColor: '#38A169', borderRadius: 12, padding: 14, alignItems: 'center' }} onPress={updateSchoolSubscription} disabled={processingId === selectedSchool.id}>
                {processingId === selectedSchool.id ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: '900' }}>Save Settings</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>PalmTech Master Control</Text>
          <Text style={styles.subText}>CEO Dashboard: Musa Mansaray</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={async () => { await supabase.auth.signOut(); router.replace('/'); }}>
          <Ionicons name="log-out-outline" size={24} color="#E53E3E" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Register a New Client School</Text>
          <TextInput style={styles.input} placeholder="e.g. Grammar School" placeholderTextColor="#A0AEC0" value={newSchoolName} onChangeText={setNewSchoolName} />
          <TouchableOpacity style={styles.button} onPress={handleRegisterSchool}>
            <Text style={styles.buttonText}>Create School & Generate Code</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.listTitle}>Our Clients ({schools.length} Schools)</Text>
        
        {loading ? <ActivityIndicator size="large" color="#1A365D" style={{ marginTop: 20 }} /> : (
          schools.map(school => {
            const isActive = school.status?.trim() === 'Active';

            return (
              <View key={school.id} style={styles.schoolRow}>
                <View style={styles.schoolTopRow}>
                <TouchableOpacity onPress={() => uploadSchoolLogo(school.id, school.name)} style={styles.logoContainer}>
                  {school.logo_url ? <Image source={{ uri: school.logo_url }} style={styles.logoImg} /> : <Ionicons name="image-outline" size={24} color="#A0AEC0" />}
                  <View style={styles.editIconBadge}><Ionicons name="pencil" size={10} color="#FFF" /></View>
                </TouchableOpacity>

                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.schoolName} numberOfLines={2}>{school.name}</Text>
                  <Text style={styles.schoolCode}>Code: {school.school_code}</Text>
                  {school.trial_start_date && (
                    <Text style={{ fontSize: 10, color: '#38A169', fontWeight: 'bold', marginTop: 2 }}>
                      Trial started: {new Date(school.trial_start_date).toLocaleDateString('en-GB')}
                    </Text>
                  )}
                  {school.trial_end_date && (
                    <Text style={{ fontSize: 10, color: '#DD6B20', fontWeight: 'bold', marginTop: 2 }}>
                      Trial ends: {new Date(school.trial_end_date).toLocaleDateString('en-GB')}
                    </Text>
                  )}
                  {school.payment_due_date && (
                    <Text style={{ fontSize: 10, color: '#E53E3E', fontWeight: 'bold', marginTop: 2 }}>
                      Payment due: {new Date(school.payment_due_date).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                </View>
                
                <View style={styles.actionsContainer}>
                  {/* Subscription status badge */}
                  <View style={[styles.statusBadge, {
                    backgroundColor: school.subscription_status === 'active' ? '#C6F6D5' :
                    school.subscription_status === 'trial' ? '#EBF8FF' :
                    school.subscription_status === 'grace' ? '#FEEBC8' : '#FED7D7'
                  }]}>
                    <Text style={{ fontWeight: '900', fontSize: 9, color:
                      school.subscription_status === 'active' ? '#22543D' :
                      school.subscription_status === 'trial' ? '#2B6CB0' :
                      school.subscription_status === 'grace' ? '#744210' : '#822727'
                    }}>
                      {school.subscription_status?.toUpperCase() || school.status}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => {
                    setSelectedSchool(school);
                    setShowSchoolModal(true);
                    setTrialDaysInput('30');
                    setPaymentDueInput(school.payment_due_date ? new Date(school.payment_due_date).toLocaleDateString('en-GB').split('/').join('/') : '');
                    // Pre-fill trial start date from DB
                    if (school.trial_start_date) {
                      const d = new Date(school.trial_start_date);
                      setTrialStartInput(`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`);
                    } else {
                      setTrialStartInput('');
                    }
                    // Pre-fill trial end date from DB
                    if (school.trial_end_date) {
                      const d = new Date(school.trial_end_date);
                      setTrialEndInput(`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`);
                    } else {
                      setTrialEndInput('');
                    }
                    // Pre-fill letterhead details from DB
                    setMottoInput(school.motto || '');
                    setAddressInput(school.address || '');
                    setPhoneInput(school.phone || '');
                    setEmailInput(school.email || '');
                  }} style={[styles.deleteBtn, { backgroundColor: '#EBF8FF', marginRight: 6 }]}>
                    <Ionicons name="settings-outline" size={18} color="#2B6CB0" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmToggleStatus(school.id, school.name, school.status)} disabled={processingId === school.id} style={[styles.deleteBtn, { backgroundColor: isActive ? '#FED7D7' : '#C6F6D5', marginRight: 6 }]}>
                    {processingId === school.id ? <ActivityIndicator size="small" color="#E53E3E" /> : <Ionicons name={isActive ? 'pause-circle' : 'play-circle'} size={18} color={isActive ? '#E53E3E' : '#38A169'} />}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDeleteSchool(school.id, school.name)} disabled={processingId === school.id} style={styles.deleteBtn}>
                    <Ionicons name="trash" size={18} color="#E53E3E" />
                  </TouchableOpacity>
                </View>
              </View>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8', paddingTop: Platform.OS === 'android' ? 40 : 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#1A365D', shadowColor: '#000', shadowOpacity: 0.1, elevation: 4 },
  greeting: { fontSize: 20, fontWeight: '900', color: '#FFF' },
  subText: { color: '#CBD5E0', fontSize: 13, marginTop: 4, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: 10, borderRadius: 12 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: '#2D3748', marginBottom: 15 },
  input: { backgroundColor: '#F7FAFC', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 15, fontWeight: 'bold', color: '#2D3748' },
  button: { backgroundColor: '#38A169', padding: 16, borderRadius: 10, alignItems: 'center', shadowColor: '#38A169', shadowOpacity: 0.3, shadowRadius: 4, elevation: 2 },
  buttonText: { color: '#FFF', fontWeight: '900', fontSize: 15 },
  listTitle: { fontSize: 18, fontWeight: '900', color: '#4A5568', marginBottom: 15 },
  schoolRow: { flexDirection: 'column', backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.03, elevation: 1 },
  schoolTopRow: { flexDirection: 'row', alignItems: 'center' },
  logoContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EDF2F7', alignItems: 'center', justifyContent: 'center', marginRight: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  logoImg: { width: '100%', height: '100%', borderRadius: 25 },
  editIconBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#3182CE', borderRadius: 10, padding: 4, borderWidth: 1, borderColor: '#FFF' },
  schoolName: { fontSize: 15, fontWeight: '900', color: '#1A365D' },
  schoolCode: { fontSize: 13, color: '#E53E3E', fontWeight: 'bold', marginTop: 4 },
  actionsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, minWidth: 80, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { padding: 8, backgroundColor: '#FFF5F5', borderRadius: 8 }
});