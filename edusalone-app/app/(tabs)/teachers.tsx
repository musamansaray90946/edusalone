import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';

// 🌟 ENTERPRISE: DYNAMIC SCHOOL THEME HASH FUNCTION
const getSchoolThemeColor = (schoolName: string) => {
  const premiumColors = ['#1A365D', '#742A2A', '#276749', '#553C9A', '#9B2C2C', '#285E61', '#9C4221', '#005b96', '#5F370E', '#4A5568'];
  if (!schoolName) return premiumColors[0];
  let hash = 0;
  for (let i = 0; i < schoolName.length; i++) {
    hash = schoolName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return premiumColors[Math.abs(hash) % premiumColors.length];
};

export default function TeachersScreen() {
  const [school, setSchool] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [printingRoster, setPrintingRoster] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => { 
    loadInitialData(); 
  }, []);

  async function loadInitialData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase.from('users').select('id, school_id').eq('email', user.email).single();
      
      if (profile && profile.school_id) {
        setCurrentUserId(profile.id);
        const { data: schoolData } = await supabase.from('schools').select('*').eq('id', profile.school_id).single();
        if (schoolData) {
          setSchool(schoolData);
          fetchStaff(schoolData.id);
        }
      }
    } catch (err: any) { 
      Alert.alert("Error", "Failed to load school data."); 
    }
  }

  async function fetchStaff(schoolId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('school_id', schoolId)
        .in('role', ['Teacher', 'Bursar', 'Secretary'])
        .order('full_name', { ascending: true });

      if (error) throw error;
      if (data) setStaff(data);
    } catch (err: any) { 
      Alert.alert("Error", "Failed to load staff directory."); 
    } finally {
      setLoading(false);
    }
  }

  async function toggleStaffActive(item: any) {
    const isActive = item.active !== false;
    const name = item.full_name || 'this staff member';
    const verb = isActive ? 'Deactivate' : 'Reactivate';

    const applyChange = async () => {
      try {
        const updates = isActive
          ? { active: false, deactivated_at: new Date().toISOString(), deactivated_by: currentUserId, deactivation_reason: 'Removed by admin' }
          : { active: true, deactivated_at: null, deactivated_by: null, deactivation_reason: null };

        const { error } = await supabase.from('users').update(updates).eq('id', item.id);
        if (error) throw error;
        fetchStaff(school.id);
      } catch (err: any) {
        Alert.alert('Update Error', err.message);
      }
    };

    const message = isActive
      ? `${name} will no longer be able to log in. Their records stay safe, and you can reactivate them anytime.`
      : `${name} will be able to log in and use the app again.`;

    if (Platform.OS === 'web') {
      if (window.confirm(`${verb} ${name}?\n\n${message}`)) applyChange();
    } else {
      Alert.alert(
        `${verb} staff member?`,
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: `Yes, ${verb}`, style: isActive ? 'destructive' : 'default', onPress: applyChange },
        ]
      );
    }
  }

  function openBioModal(staffMember: any) {
    setSelectedStaff(staffMember);
    setModalVisible(true);
  }

  // ==========================================
  // 🖨️ MASTER STAFF ROSTER PDF GENERATOR (NEW!)
  // ==========================================
  async function generateStaffRosterPDF() {
    if (!school || staff.length === 0) {
      Alert.alert('Notice', 'No active staff to print.');
      return;
    }
    setPrintingRoster(true);
    try {
      const themeColor = getSchoolThemeColor(school?.name);
      const logoHtml = school?.logo_url ? `<img src="${school.logo_url}" class="logo-img" />` : `<div class="logo-placeholder">LOGO</div>`;
      const currentDate = new Date().toLocaleString();

      let tableRows = '';
      staff.forEach((member, index) => {
        const title = member.prefix ? `${member.prefix} ` : '';
        const name = `${title}${member.full_name || 'Unknown'}`;
        const phone = member.phone || member.phone_number || 'N/A';
        const roleColor = member.role === 'Bursar' ? '#8B5CF6' : member.role === 'Secretary' ? '#E53E3E' : '#DD6B20';

        tableRows += `
          <tr>
            <td>${index + 1}</td>
            <td style="text-align: left; font-weight: bold; color: ${themeColor};">${name.toUpperCase()}</td>
            <td style="font-weight: bold; color: ${roleColor}; text-transform: uppercase;">${member.role || 'N/A'}</td>
            <td>${phone}</td>
            <td style="text-transform: lowercase;">${member.email || 'N/A'}</td>
            <td>${member.qualifications || 'N/A'}</td>
          </tr>
        `;
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @page { size: A4 landscape; margin: 15mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #333; background: #fff; }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double ${themeColor}; padding-bottom: 10px; margin-bottom: 15px; }
            .header-text { text-align: center; flex: 1; }
            h1 { color: ${themeColor}; margin: 0 0 5px 0; font-size: 24px; text-transform: uppercase; font-weight: 900; }
            .doc-title { font-weight: 900; font-size: 14px; letter-spacing: 1px; color: #4A5568; background: #EDF2F7; padding: 5px 15px; display: inline-block; border-radius: 4px; border: 1px solid #CBD5E0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #CBD5E0; padding: 10px 6px; text-align: center; }
            th { background-color: ${themeColor}; color: white; font-weight: bold; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
            tr:nth-child(even) { background-color: #F8FAFC; }
            .logo-img { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid ${themeColor}; }
            .logo-placeholder { width: 60px; height: 60px; border-radius: 50%; border: 2px solid ${themeColor}; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; color: ${themeColor}; font-size: 10px; }
            .footer { margin-top: 30px; font-size: 8px; color: #A0AEC0; text-align: center; border-top: 1px solid #E2E8F0; padding-top: 10px; font-style: italic; }
            .meta-info { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 10px; font-weight: bold; color: #4A5568; }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoHtml}
            <div class="header-text">
              <h1>${school.name}</h1>
              <div class="doc-title">MASTER ACTIVE STAFF LEDGER</div>
            </div>
            ${logoHtml}
          </div>
          
          <div class="meta-info">
            <span>Generated by: Office of the Principal / Admin</span>
            <span>Total Active Staff: <span style="color:${themeColor}; font-size: 12px;">${staff.length}</span></span>
            <span>Date: ${currentDate}</span>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%;">S/N</th>
                <th style="text-align: left; width: 25%;">FULL NAME</th>
                <th style="width: 15%;">DESIGNATION / ROLE</th>
                <th style="width: 15%;">TELEPHONE</th>
                <th style="width: 20%;">EMAIL ADDRESS</th>
                <th style="width: 20%;">QUALIFICATIONS</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <div class="footer">
            Official Internal Document • Securely Generated by EduSalone Management System • Do Not Alter
          </div>
        </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) { printWindow.document.write(htmlContent); printWindow.document.close(); setTimeout(() => printWindow.print(), 500); }
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (err: any) {
      Alert.alert('Error', 'Could not generate Staff Roster PDF.');
    }
    setPrintingRoster(false);
  }

  const renderBioRow = (icon: keyof typeof Ionicons.glyphMap, label: string, value: string) => (
    <View style={styles.bioRow}>
      <Ionicons name={icon} size={20} color="#3182CE" style={styles.bioIcon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.bioLabel}>{label}</Text>
        <Text style={styles.bioValue}>{value || 'Not provided'}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedStaff && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalName}>
                      {selectedStaff.prefix ? `${selectedStaff.prefix} ` : ''}{selectedStaff.full_name}
                    </Text>
                    <Text style={styles.modalRoleBadge}>{selectedStaff.role?.toUpperCase()}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#A0AEC0" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                  {renderBioRow("call", "Phone Number", selectedStaff.phone)}
                  {renderBioRow("mail", "Email Address", selectedStaff.email)}
                  {renderBioRow("home", "Physical Address", selectedStaff.address)}
                  {renderBioRow("calendar", "Date of Birth", selectedStaff.dob)}
                  {renderBioRow("location", "Place of Birth (POB)", selectedStaff.pob)}
                  {renderBioRow("school", "Qualifications", selectedStaff.qualifications)}
                  
                  <Text style={styles.sysText}>System ID: {selectedStaff.id.substring(0, 13)}...</Text>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      <FlatList
        data={staff}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <Text style={styles.headerTitle}>Staff Management</Text>
            
            <View style={styles.schoolSelectorContainer}>
              <Text style={styles.selectorLabel}>ACTIVE SCHOOL:</Text>
              <View style={styles.schoolChipActive}>
                <Text style={styles.schoolChipTextActive}>{school?.name || 'Loading...'}</Text>
              </View>
            </View>

            <View style={styles.inviteCard}>
              <Ionicons name="shield-checkmark" size={40} color="#38A169" style={{ marginBottom: 10 }} />
              <Text style={styles.inviteTitle}>Secure Staff Registration</Text>
              <Text style={styles.inviteDesc}>
                To add a new Teacher, Bursar, or Secretary, ask them to download EduSalone, click "Sign Up", select their Role, and enter your School Code:
              </Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{school?.school_code || '---'}</Text>
              </View>
            </View>

            {/* 🌟 ENTERPRISE: STAFF ROSTER PDF BUTTON INJECTED HERE */}
            <View style={styles.directoryHeader}>
              <Text style={styles.listTitle}>Staff Directory</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity 
                  style={{ backgroundColor: '#2B6CB0', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 10 }}
                  onPress={generateStaffRosterPDF}
                  disabled={printingRoster}
                >
                  {printingRoster ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="print" size={16} color="#FFF" />}
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12, marginLeft: 6 }}>Print Roster</Text>
                </TouchableOpacity>

                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{staff.length} Total</Text>
                </View>
              </View>
            </View>
            
            {loading && <ActivityIndicator size="large" color="#3182CE" style={{ marginTop: 20 }} />}
          </View>
        }
        renderItem={({ item }) => {
          const isActive = item.active !== false;
          return (
            <TouchableOpacity style={[styles.staffCard, !isActive && styles.staffCardInactive]} onPress={() => openBioModal(item)}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text style={styles.staffName}>
                    {item.prefix ? `${item.prefix} ` : ''}{item.full_name}
                  </Text>
                  {!isActive && (
                    <View style={styles.inactiveBadge}>
                      <Text style={styles.inactiveBadgeText}>DEACTIVATED</Text>
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Ionicons name="call" size={12} color="#718096" style={{ marginRight: 4 }} />
                  <Text style={styles.staffEmail}>{item.phone || item.email}</Text>
                </View>
              </View>

              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>{item.role}</Text>
              </View>

              <TouchableOpacity onPress={() => toggleStaffActive(item)} style={[styles.deleteBtn, !isActive && styles.reactivateBtn]}>
                <Ionicons name={isActive ? 'ban-outline' : 'refresh-outline'} size={20} color={isActive ? '#E53E3E' : '#38A169'} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No staff members registered yet.</Text> : null}
      />
    </SafeAreaView>
  );
}

// 🌟 COMPLETE STYLESHEET TO FIX ALL 9 VSCODE ERRORS
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#1A365D', marginBottom: 10 },
  schoolSelectorContainer: { marginBottom: 15 },
  selectorLabel: { fontSize: 12, fontWeight: 'bold', color: '#718096', marginBottom: 8, letterSpacing: 0.5 },
  schoolChipActive: { backgroundColor: '#1A365D', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, alignSelf: 'flex-start' },
  schoolChipTextActive: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  
  inviteCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2, borderWidth: 1, borderColor: '#E2E8F0' },
  inviteTitle: { fontSize: 18, fontWeight: '900', color: '#2D3748', marginBottom: 8 },
  inviteDesc: { fontSize: 13, color: '#718096', textAlign: 'center', marginBottom: 15, lineHeight: 20 },
  codeBox: { backgroundColor: '#EBF8FF', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#BEE3F8' },
  codeText: { fontSize: 22, fontWeight: '900', color: '#2B6CB0', letterSpacing: 2 },
  
  directoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A5568' },
  countBadge: { backgroundColor: '#E2E8F0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  countText: { fontSize: 12, fontWeight: 'bold', color: '#4A5568' },
  
  staffCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.02, elevation: 1, borderLeftWidth: 4, borderLeftColor: '#DD6B20' },
  staffName: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
  staffEmail: { fontSize: 12, color: '#718096', fontWeight: '600' },
  roleTag: { backgroundColor: '#FEEBC8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 10 },
  roleTagText: { color: '#DD6B20', fontSize: 11, fontWeight: '900' },
  deleteBtn: { padding: 8, backgroundColor: '#FFF5F5', borderRadius: 8 },
  reactivateBtn: { backgroundColor: '#F0FFF4' },
  staffCardInactive: { opacity: 0.55 },
  inactiveBadge: { backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FEB2B2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  inactiveBadgeText: { color: '#C53030', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  emptyText: { textAlign: 'center', color: '#A0AEC0', marginTop: 20, fontStyle: 'italic', fontSize: 15, fontWeight: 'bold' },

  // Modal & Bio Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 25, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#EDF2F7', paddingBottom: 15 },
  modalName: { fontSize: 22, fontWeight: '900', color: '#1A365D', marginBottom: 4 },
  modalRoleBadge: { color: '#DD6B20', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  closeBtn: { backgroundColor: '#EDF2F7', padding: 8, borderRadius: 20 },
  
  bioRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, backgroundColor: '#F7FAFC', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  bioIcon: { marginRight: 15, marginTop: 2 },
  bioLabel: { fontSize: 11, color: '#A0AEC0', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  bioValue: { fontSize: 15, color: '#2D3748', fontWeight: 'bold' },
  sysText: { textAlign: 'center', color: '#CBD5E0', fontSize: 10, marginTop: 20, fontStyle: 'italic' }
});