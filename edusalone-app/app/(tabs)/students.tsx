import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { buildReportCardHTML } from '../../src/lib/reportCard';
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

export default function StudentsScreen() {
  const [fullName, setFullName] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [currentClass, setCurrentClass] = useState('');
  const [gender, setGender] = useState('Male'); 
  const [dob, setDob] = useState('');           
  
  const [school, setSchool] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishingClass, setPublishingClass] = useState<string | null>(null); // State for the Publish button
  const [printingRoster, setPrintingRoster] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => { loadInitialData(); },[]);
  useEffect(() => { if (school) fetchStudents(); }, [school]);

  async function loadInitialData() {
    setFetching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('users').select('id, school_id').eq('email', user.email).single();
      if (profile && profile.school_id) {
        setCurrentUserId(profile.id);
        const { data: schoolData } = await supabase.from('schools').select('*').eq('id', profile.school_id).single();
        if (schoolData) setSchool(schoolData);
      }
    } catch (err: any) { Alert.alert("Error", "Failed to load school."); }
    setFetching(false);
  }

  async function fetchStudents() {
    if (!school) return;
    setFetching(true);
    try {
      const { data, error } = await supabase.from('students').select('*, users!user_id(*)').eq('school_id', school.id).order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setStudents(data);
    } catch (err: any) { Alert.alert("Error", "Failed to load students."); }
    setFetching(false);
  }

  async function registerStudent() {
    if (!school) { Alert.alert('Error', 'School not loaded.'); return; }
    if (!fullName || !admissionNumber || !currentClass) { Alert.alert('Missing Info', 'Please fill out all fields.'); return; }
    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.from('users').insert([{ 
        school_id: school.id, role: 'Student', full_name: fullName.trim(), email: `${admissionNumber.trim().toLowerCase()}@student.sl`, is_active: true 
      }]).select().single();
      if (userError) throw userError;
      
      const { error: studentError } = await supabase.from('students').insert([{ 
        user_id: userData.id, school_id: school.id, admission_number: admissionNumber.trim(), current_class: currentClass.trim(), gender: gender, date_of_birth: dob, report_published: false
      }]);
      if (studentError) throw studentError;
      
      Alert.alert('Success!', `${fullName} enrolled successfully!`);
      setFullName(''); setAdmissionNumber(''); setCurrentClass(''); setDob(''); setGender('Male');
      fetchStudents(); 
    } catch (err: any) { Alert.alert('Error', err.message); }
    setLoading(false);
  }

  async function handleBulkUpload() {
    if (!bulkText.trim() || !school) return;
    setBulkLoading(true);
    const lines = bulkText.split('\n').filter(l => l.trim().length > 0);
    let successCount = 0; let failCount = 0;
    
    for (const line of lines) {
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      if (parts.length < 3) { failCount++; continue; }
      const fName = parts[0]?.trim(); const adm = parts[1]?.trim(); const cClass = parts[2]?.trim().toUpperCase().replace(/\s/g, ''); const gen = parts[3]?.trim() || 'Male'; const dBirth = parts[4]?.trim() || '';
      try {
        const { data: userData, error: userError } = await supabase.from('users').insert([{ school_id: school.id, role: 'Student', full_name: fName, email: `${adm.toLowerCase()}@student.sl`, is_active: true }]).select().single();
        if (userError) throw userError;
        const { error: studentError } = await supabase.from('students').insert([{ user_id: userData.id, school_id: school.id, admission_number: adm, current_class: cClass, gender: gen, date_of_birth: dBirth, report_published: false }]);
        if (studentError) throw studentError;
        successCount++;
      } catch (err) { failCount++; }
    }
    setBulkLoading(false); setShowBulkModal(false); setBulkText('');
    Alert.alert('Upload Complete', `Successfully added: ${successCount}\nFailed/Duplicates: ${failCount}`);
    fetchStudents();
  }

  async function toggleStudentActive(item: any) {
    const isActive = item.users?.active !== false;
    const name = item.users?.full_name || 'this student';
    const verb = isActive ? 'Deactivate' : 'Reactivate';

    const applyChange = async () => {
      try {
        const updates = isActive
          ? { active: false, deactivated_at: new Date().toISOString(), deactivated_by: currentUserId, deactivation_reason: 'Removed by admin' }
          : { active: true, deactivated_at: null, deactivated_by: null, deactivation_reason: null };

        const { error } = await supabase.from('users').update(updates).eq('id', item.user_id);
        if (error) throw error;
        fetchStudents();
      } catch (err: any) {
        Alert.alert('Update Error', err.message);
      }
    };

    const message = isActive
      ? `${name} will no longer be able to log in. Their records and report cards stay safe, and you can reactivate them anytime.`
      : `${name} will be able to log in and use the app again.`;

    if (Platform.OS === 'web') {
      if (window.confirm(`${verb} ${name}?\n\n${message}`)) applyChange();
    } else {
      Alert.alert(
        `${verb} student?`,
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: `Yes, ${verb}`, style: isActive ? 'destructive' : 'default', onPress: applyChange },
        ]
      );
    }
  }
// 📚 PUBLISH BY CLASS LOGIC
  async function publishByClass(className: string, publish: boolean) {
    const classStudents = students.filter(s => s.current_class === className);
    const ids = classStudents.map(s => s.id);
    if (ids.length === 0) { Alert.alert('Notice', `No students found in ${className}.`); return; }
    const title = publish ? `📢 Publish All in ${className}?` : `🔒 Unpublish All in ${className}?`;
    const msg = `${publish ? 'Allow' : 'Remove'} report card access for ${ids.length} student${ids.length !== 1 ? 's' : ''} in ${className}.`;
    const doPublish = async () => {
      setPublishingClass(className);
      try {
        const { error } = await supabase.from('students').update({ report_published: publish }).in('id', ids);
        if (error) throw error;
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Done! ✅', `${ids.length} student${ids.length !== 1 ? 's' : ''} in ${className} ${publish ? 'can now access' : 'can no longer see'} their report cards.`);
        fetchStudents();
      } catch (e: any) { Alert.alert('Error', e.message); }
      setPublishingClass(null);
    };
    if (Platform.OS === 'web') { if (window.confirm(`${title}\n\n${msg}`)) doPublish(); return; }
    Alert.alert(title, msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: publish ? 'Yes, Publish All' : 'Yes, Unpublish All', onPress: () => doPublish() },
    ]);
  }
  // 🌟 NEW: PUBLISH REPORT CARD LOGIC
  async function togglePublishReport(studentId: string, currentStatus: boolean, studentName: string) {
    const newStatus = !currentStatus;
    const title = newStatus ? "Publish Report Card?" : "Hide Report Card?";
    const msg = newStatus ? `Allow ${studentName} and their parents to download this term's report card?` : `Hide the report card from ${studentName}'s dashboard?`;
    const doToggle = async () => {
      setPublishingId(studentId);
      try {
        const { error } = await supabase.from('students').update({ report_published: newStatus }).eq('id', studentId);
        if (error) throw error;
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        fetchStudents();
      } catch(e: any) { Alert.alert("Error", e.message); }
      setPublishingId(null);
    };
    if (Platform.OS === 'web') { if (window.confirm(`${title}\n\n${msg}`)) doToggle(); return; }
    Alert.alert(title, msg, [
      { text: "Cancel", style: "cancel" },
      { text: newStatus ? "Yes, Publish" : "Yes, Hide", onPress: () => doToggle() },
    ]);
  }

  async function generateMasterRosterPDF() {
    if (!school || students.length === 0) {
      Alert.alert('Notice', 'No students enrolled to print.');
      return;
    }
    setPrintingRoster(true);
    try {
      const themeColor = getSchoolThemeColor(school?.name);
      const logoHtml = school?.logo_url ? `<img src="${school.logo_url}" class="logo-img" />` : `<div class="logo-placeholder">LOGO</div>`;
      const currentDate = new Date().toLocaleString();

      let tableRows = '';
      students.forEach((std, index) => {
        const name = std.users?.full_name || 'Unknown';
        const phone = std.users?.phone || std.users?.phone_number || 'N/A'; 
        const yearEnrolled = new Date(std.created_at).getFullYear();

        tableRows += `
          <tr>
            <td>${index + 1}</td>
            <td style="font-weight: bold; color: #2D3748;">${std.admission_number || 'N/A'}</td>
            <td style="text-align: left; font-weight: bold; color: ${themeColor};">${name.toUpperCase()}</td>
            <td>${std.gender || 'N/A'}</td>
            <td>${std.date_of_birth || 'N/A'}</td>
            <td style="font-weight: bold;">${std.current_class || 'N/A'}</td>
            <td>${yearEnrolled}</td>
            <td>${phone}</td>
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
            th, td { border: 1px solid #CBD5E0; padding: 8px 6px; text-align: center; }
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
              <div class="doc-title">MASTER STUDENT BIO & ROSTER LEDGER</div>
            </div>
            ${logoHtml}
          </div>
          
          <div class="meta-info">
            <span>Generated by: Office of the Principal / Admin</span>
            <span>Total Enrolled: <span style="color:${themeColor}; font-size: 12px;">${students.length}</span></span>
            <span>Date: ${currentDate}</span>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%;">S/N</th>
                <th style="width: 12%;">ADM NO.</th>
                <th style="text-align: left; width: 25%;">FULL NAME</th>
                <th style="width: 10%;">GENDER</th>
                <th style="width: 12%;">D.O.B</th>
                <th style="width: 10%;">CLASS</th>
                <th style="width: 10%;">ENROLLED</th>
                <th style="width: 16%;">TELEPHONE</th>
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
      Alert.alert('Error', 'Could not generate Roster PDF.');
    }
    setPrintingRoster(false);
  }

async function generatePDFReportCard(student: any) {
    setPrintingId(student.id);
    try {
      const [{ data: classRecords }, { data: classSize }, { data: evalsData }, { data: attendanceData }] = await Promise.all([
        supabase.rpc('get_class_records_for_ranking', { _student_id: student.id }),
        supabase.rpc('get_class_size', { _student_id: student.id }),
        supabase.from('student_evaluations').select('*').eq('student_id', student.id).order('term', { ascending: false }).limit(1),
        supabase.from('daily_attendance').select('status').eq('student_id', student.id),
      ]);

      let present = 0, absent = 0, late = 0;
      (attendanceData || []).forEach((r: any) => { if (r.status === 'Present') present++; else if (r.status === 'Absent') absent++; else if (r.status === 'Late') late++; });

      const recs = (classRecords || []) as any[];
      const mine = recs.filter(r => r.student_id === student.id);
      const reportYear = (mine.find(r => r.academic_year)?.academic_year) || '2025/2026';

      const htmlContent = buildReportCardHTML({
        school: { name: school?.name, logo_url: school?.logo_url, school_code: school?.school_code, motto: school?.motto, address: school?.address, phone: school?.phone, email: school?.email, leadership_title: school?.leadership_title },
        student: { id: student.id, full_name: student.users?.full_name, gender: student.gender, date_of_birth: student.date_of_birth, admission_number: student.admission_number, current_class: student.current_class },
        academicYear: reportYear,
        classRecords: recs,
        classSize: (typeof classSize === 'number' ? classSize : Number(classSize)) || new Set(recs.map(r => r.student_id)).size,
        attendance: { present, absent, late },
        ev: evalsData && evalsData.length > 0 ? evalsData[0] : null,
      });

      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) { printWindow.document.write(htmlContent); printWindow.document.close(); setTimeout(() => printWindow.print(), 500); }
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (err: any) {
      Alert.alert('Error', 'Could not generate Report Card.');
    }
    setPrintingId(null);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <Modal visible={showBulkModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A365D', marginBottom: 5 }}>Bulk Upload via Excel</Text>
            <Text style={{ fontSize: 12, color: '#718096', marginBottom: 15 }}>Copy rows from Excel and Paste below. Format MUST be:</Text>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#E53E3E', marginBottom: 10 }}>Name | ADM_NO | Class | Gender | DOB</Text>
            
            <TextInput 
              multiline 
              style={styles.bulkInput} 
              value={bulkText} 
              onChangeText={setBulkText} 
              placeholder="John Doe&#9;ADM001&#9;JSS1&#9;Male&#9;12/05/2010&#10;Jane Smith&#9;ADM002&#9;JSS1&#9;Female&#9;10/02/2011" 
            />
            
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowBulkModal(false)}>
                <Text style={{ fontWeight: 'bold', color: '#4A5568' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadBtn} onPress={handleBulkUpload} disabled={bulkLoading}>
                {bulkLoading ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Start Upload</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <Text style={styles.headerTitle}>Student Management</Text>
            <View style={styles.schoolSelectorContainer}>
              <Text style={styles.selectorLabel}>ACTIVE SCHOOL:</Text>
              <View style={styles.schoolChipActive}>
                <Text style={styles.schoolChipTextActive}>{school?.name || 'Loading...'}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.sectionTitle}>Enroll New Student</Text>
                <TouchableOpacity style={{ backgroundColor: '#EBF8FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }} onPress={() => setShowBulkModal(true)}>
                  <Text style={{ color: '#3182CE', fontWeight: 'bold', fontSize: 12 }}>+ Bulk Upload</Text>
                </TouchableOpacity>
              </View>
              
              <TextInput style={styles.input} placeholder="Student Full Name" placeholderTextColor="#A0AEC0" value={fullName} onChangeText={setFullName} />
              <View style={styles.row}>
                <TextInput style={[styles.input, styles.halfInput]} placeholder="Admission #" placeholderTextColor="#A0AEC0" value={admissionNumber} onChangeText={setAdmissionNumber} autoCapitalize="none" />
                <TextInput style={[styles.input, styles.halfInput]} placeholder="Class (e.g. JSS1)" placeholderTextColor="#A0AEC0" value={currentClass} onChangeText={setCurrentClass} autoCapitalize="characters" />
              </View>
              <View style={[styles.row, { marginBottom: 12 }]}>
                <View style={[styles.halfInput, { flexDirection: 'row', gap: 5 }]}>
                  <TouchableOpacity style={[styles.genderBtn, gender === 'Male' && styles.genderBtnActive]} onPress={() => setGender('Male')}><Text style={[styles.genderText, gender === 'Male' && styles.genderTextActive]}>Male</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.genderBtn, gender === 'Female' && styles.genderBtnActive]} onPress={() => setGender('Female')}><Text style={[styles.genderText, gender === 'Female' && styles.genderTextActive]}>Female</Text></TouchableOpacity>
                </View>
                <TextInput style={[styles.input, styles.halfInput, { marginBottom: 0 }]} placeholder="DOB (DD/MM/YYYY)" placeholderTextColor="#A0AEC0" value={dob} onChangeText={setDob} />
              </View>
              <TouchableOpacity style={styles.primaryButton} onPress={registerStudent} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>Complete Enrollment</Text>}
              </TouchableOpacity>
            </View>

            {/* 📚 PUBLISH BY CLASS SECTION */}
            {students.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Ionicons name="school-outline" size={18} color="#1A365D" />
                  <Text style={[styles.sectionTitle, { marginLeft: 8, marginBottom: 0, fontSize: 15, color: '#1A365D' }]}>
                    Publish Report Cards by Class
                  </Text>
                </View>
                {[...new Set(students.map((s: any) => s.current_class).filter(Boolean))].sort().map((cls: any) => {
                  const clsStudents = students.filter((s: any) => s.current_class === cls);
                  const publishedCount = clsStudents.filter((s: any) => s.report_published).length;
                  const allPublished = publishedCount === clsStudents.length && clsStudents.length > 0;
                  const nonePublished = publishedCount === 0;
                  return (
                    <View key={cls} style={styles.classPublishRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.classPublishName}>{cls}</Text>
                        <Text style={styles.classPublishSub}>{publishedCount} of {clsStudents.length} published</Text>
                      </View>
                      <View style={[styles.classStatusDot, {
                        backgroundColor: allPublished ? '#C6F6D5' : nonePublished ? '#FED7D7' : '#FEEBC8'
                      }]}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: allPublished ? '#22543D' : nonePublished ? '#C53030' : '#744210' }}>
                          {allPublished ? 'ALL ✅' : nonePublished ? 'NONE 🔒' : 'PARTIAL 🟡'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.classPublishBtn, { backgroundColor: allPublished ? '#E53E3E' : '#1A365D' }]}
                        onPress={() => publishByClass(cls, !allPublished)}
                        disabled={publishingClass === cls}
                      >
                        {publishingClass === cls
                          ? <ActivityIndicator size="small" color="#FFF" />
                          : <Text style={styles.classPublishBtnText}>{allPublished ? 'UNPUBLISH ALL' : 'PUBLISH ALL'}</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginLeft: 4 }}>
              <Text style={styles.listTitle}>Enrolled Students ({students.length})</Text>
              <TouchableOpacity 
                style={{ backgroundColor: '#2B6CB0', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                onPress={generateMasterRosterPDF}
                disabled={printingRoster}
              >
                {printingRoster ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="print" size={16} color="#FFF" />}
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12, marginLeft: 6 }}>Print Roster</Text>
              </TouchableOpacity>
            </View>

            {fetching && <ActivityIndicator size="large" color="#3182CE" style={{ marginTop: 20 }} />}
          </View>
        }
        renderItem={({ item }) => {
          const isActive = item.users?.active !== false;
          return (
          <View style={[styles.studentItem, !isActive && styles.studentItemInactive]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <Text style={styles.studentName}>{item.users?.full_name || 'Unknown Name'}</Text>
                {!isActive && (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveBadgeText}>DEACTIVATED</Text>
                  </View>
                )}
              </View>
              <Text style={styles.studentDetails}>{item.current_class} | {item.admission_number}</Text>
            </View>

            {/* 🌟 NEW: PUBLISH REPORT CARD TOGGLE */}
            <TouchableOpacity 
              style={[styles.publishBtn, { backgroundColor: item.report_published ? '#38A169' : '#718096' }]} 
              onPress={() => togglePublishReport(item.id, item.report_published, item.users?.full_name)}
              disabled={publishingId === item.id}
            >
              {publishingId === item.id ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.publishBtnText}>{item.report_published ? 'PUBLISHED ✅' : 'PUBLISH'}</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.printButton} onPress={() => generatePDFReportCard(item)} disabled={printingId === item.id}>
              {printingId === item.id ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.printButtonText}>PDF</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => toggleStudentActive(item)} style={styles.deleteButton}>
              <Ionicons name={isActive ? 'ban-outline' : 'refresh-outline'} size={22} color={isActive ? '#E53E3E' : '#38A169'} />
            </TouchableOpacity>
          </View>
          );
        }}
        ListEmptyComponent={!fetching ? <Text style={styles.emptyText}>No students in this school yet.</Text> : null}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC', paddingTop: Platform.OS === 'android' ? 40 : 50, paddingHorizontal: 20 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#1A365D', marginBottom: 10 },
  schoolSelectorContainer: { marginBottom: 15 },
  selectorLabel: { fontSize: 14, fontWeight: 'bold', color: '#4A5568', marginBottom: 8 },
  schoolChipActive: { backgroundColor: '#1A365D', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, alignSelf: 'flex-start' },
  schoolChipTextActive: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  card: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3748', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#718096', marginBottom: 8, textTransform: 'uppercase' },
  input: { backgroundColor: '#EDF2F7', borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 12, color: '#2D3748' },
  row: { flexDirection: 'row', gap: 10 },
  halfInput: { flex: 1 },
  genderBtn: { flex: 1, backgroundColor: '#EDF2F7', borderRadius: 8, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center' },
  genderBtnActive: { backgroundColor: '#3182CE', borderColor: '#3182CE' },
  genderText: { color: '#4A5568', fontWeight: 'bold', fontSize: 14 },
  genderTextActive: { color: '#FFF' },
  primaryButton: { backgroundColor: '#38A169', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A5568', marginBottom: 10, marginLeft: 4 },
  studentItem: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#3182CE' },
  studentName: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
  studentDetails: { fontSize: 12, color: '#718096', marginTop: 4, fontWeight: 'bold' },
  publishBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, marginRight: 5, justifyContent: 'center', alignItems: 'center' },
  publishBtnText: { color: '#FFF', fontWeight: '900', fontSize: 10, textTransform: 'uppercase' },
  printButton: { backgroundColor: '#DD6B20', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, marginRight: 5, justifyContent: 'center', alignItems: 'center' },
  printButtonText: { color: '#FFF', fontWeight: '900', fontSize: 10, textTransform: 'uppercase' },
  deleteButton: { padding: 5 },
  studentItemInactive: { opacity: 0.55 },
  inactiveBadge: { backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FEB2B2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  inactiveBadgeText: { color: '#C53030', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  classPublishRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  classPublishName: { fontSize: 14, fontWeight: '900', color: '#1A365D' },
  classPublishSub: { fontSize: 11, color: '#718096', marginTop: 2 },
  classStatusDot: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 8 },
  classPublishBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, minWidth: 112, alignItems: 'center' },
  classPublishBtnText: { color: '#FFF', fontWeight: '900', fontSize: 10, textTransform: 'uppercase' },
  emptyText: { textAlign: 'center', color: '#A0AEC0', marginTop: 20, fontStyle: 'italic', fontSize: 15, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, shadowColor: '#000', elevation: 5 },
  bulkInput: { height: 180, backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', padding: 15, textAlignVertical: 'top', borderRadius: 8, fontSize: 13 },
  cancelBtn: { flex: 1, padding: 15, backgroundColor: '#E2E8F0', borderRadius: 8, alignItems: 'center' },
  uploadBtn: { flex: 1, padding: 15, backgroundColor: '#38A169', borderRadius: 8, alignItems: 'center' }
});