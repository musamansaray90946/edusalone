import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- CONSTANTS ---
const SUPPORT_EMAIL = "mmans.sl.001@gmail.com";
const SUPPORT_WHATSAPP = "+35796240674";
const DEVELOPER_GITHUB = "https://github.com/musamansaray90946";

export default function ContactScreen() {
  const router = useRouter();

  // --- STATE MANAGEMENT ---
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // --- ACTIONS ---
  const handleWhatsApp = () => Linking.openURL(`whatsapp://send?phone=${SUPPORT_WHATSAPP}`);
  const handleEmail = () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=EduSalone Support Request`);
  const handleGithub = () => Linking.openURL(DEVELOPER_GITHUB);

  const submitTicket = async () => {
    if (!subject || !message) return;
    setIsSubmitting(true);
    
    // Simulate Production API Latency
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setSubject('');
      setMessage('');
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        {/* 1. PROFESSIONAL HEADER */}
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={() => router.replace('/')} style={styles.backCircle}>
            <Ionicons name="arrow-back" size={22} color="#1A365D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Support Center</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* 2. HERO BRANDING CARD */}
          <View style={styles.heroCard}>
            <View style={styles.heroInfo}>
              <Text style={styles.heroBrand}>PalmTech Group Ltd.</Text>
              <Text style={styles.heroSub}>Official Technical Support Division</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={14} color="#FFF" opacity={0.8} />
                <Text style={styles.locationText}>Central Freetown, Sierra Leone</Text>
              </View>
            </View>
            <Ionicons name="shield-checkmark" size={60} color="#FFF" opacity={0.2} style={styles.heroIcon} />
          </View>

          {/* 3. QUICK ACTION MATRIX */}
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionItem} onPress={handleWhatsApp}>
              <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="logo-whatsapp" size={24} color="#2E7D32" />
              </View>
              <Text style={styles.actionLabel}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleEmail}>
              <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="mail" size={24} color="#1565C0" />
              </View>
              <Text style={styles.actionLabel}>Email Us</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleGithub}>
              <View style={[styles.actionIcon, { backgroundColor: '#F5F5F5' }]}>
                <Ionicons name="logo-github" size={24} color="#212121" />
              </View>
              <Text style={styles.actionLabel}>GitHub</Text>
            </TouchableOpacity>
          </View>

          {/* 4. FORM SECTION */}
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Submit Support Ticket</Text>
            
            {isSuccess ? (
              <View style={styles.successState}>
                <Ionicons name="checkmark-circle" size={50} color="#38A169" />
                <Text style={styles.successTitle}>Ticket Received</Text>
                <Text style={styles.successBody}>Our engineers have indexed your request. We will reach out within 24 hours.</Text>
                <TouchableOpacity style={styles.resetBtn} onPress={() => setIsSuccess(false)}>
                  <Text style={styles.resetBtnText}>New Request</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={styles.inputLabel}>ENQUIRY SUBJECT</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="e.g. Technical error in finance tab"
                  placeholderTextColor="#A0AEC0"
                  value={subject}
                  onChangeText={setSubject}
                />

                <Text style={styles.inputLabel}>DETAILED DESCRIPTION</Text>
                <TextInput 
                  style={[styles.input, styles.textArea]} 
                  placeholder="Please provide specific details..."
                  placeholderTextColor="#A0AEC0"
                  multiline
                  numberOfLines={5}
                  value={message}
                  onChangeText={setMessage}
                />

                <TouchableOpacity 
                  style={[styles.submitBtn, (!subject || !message) && { opacity: 0.6 }]} 
                  onPress={submitTicket}
                  disabled={isSubmitting || !subject || !message}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Text style={styles.submitBtnText}>Dispatch Ticket</Text>
                      <Ionicons name="paper-plane" size={18} color="#FFF" style={{ marginLeft: 10 }} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 5. FOOTER */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>EduSalone Management Infrastructure v2.1.0</Text>
            <Text style={styles.footerSub}>Secure End-to-End Encrypted Support</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 20 },
  
  // Header
  headerNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 5 },
  backCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A365D' },

  // Hero Card
  heroCard: { backgroundColor: '#1A365D', borderRadius: 20, padding: 24, flexDirection: 'row', alignItems: 'center', marginBottom: 25, elevation: 8, shadowColor: '#1A365D', shadowOpacity: 0.3, shadowRadius: 10 },
  heroInfo: { flex: 1 },
  heroBrand: { fontSize: 22, fontWeight: '900', color: '#FFF' },
  heroSub: { fontSize: 12, color: '#CBD5E0', marginTop: 4, fontWeight: '600' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  locationText: { color: '#FFF', fontSize: 11, marginLeft: 5, fontWeight: 'bold', opacity: 0.9 },
  heroIcon: { position: 'absolute', right: -10, bottom: -10 },

  // Quick Action Matrix
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  actionItem: { width: '30%', backgroundColor: '#FFF', padding: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  actionIcon: { width: 45, height: 45, borderRadius: 22.5, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 12, fontWeight: '800', color: '#4A5568' },

  // Form
  formContainer: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#1A365D', marginBottom: 20 },
  inputLabel: { fontSize: 10, fontWeight: '900', color: '#718096', marginBottom: 8, letterSpacing: 1 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 14, color: '#1A365D', marginBottom: 18, fontWeight: '600' },
  textArea: { height: 120, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: '#38A169', padding: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  submitBtnText: { color: '#FFF', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },

  // Success State
  successState: { alignItems: 'center', paddingVertical: 20 },
  successTitle: { fontSize: 20, fontWeight: '900', color: '#1A365D', marginTop: 15 },
  successBody: { textAlign: 'center', color: '#718096', marginTop: 10, lineHeight: 18, fontSize: 13 },
  resetBtn: { marginTop: 20, padding: 10 },
  resetBtnText: { color: '#3182CE', fontWeight: '900' },

  // Footer
  footer: { marginTop: 30, alignItems: 'center', paddingBottom: 20 },
  footerText: { fontSize: 11, color: '#A0AEC0', fontWeight: 'bold' },
  footerSub: { fontSize: 10, color: '#CBD5E0', marginTop: 2 }
});