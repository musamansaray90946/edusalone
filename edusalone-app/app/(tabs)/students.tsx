import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
      const { data: profile } = await supabase.from('users').select('school_id').eq('email', user.email).single();
      if (profile && profile.school_id) {
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
        user_id: userData.id, school_id: school.id, admission_number: admissionNumber.trim(), current_class: currentClass.toUpperCase().replace(/\s/g, ''), gender: gender, date_of_birth: dob, report_published: false
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

  async function deleteStudent(userId: string) {
    try {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;
      fetchStudents();
    } catch (err: any) { Alert.alert('Delete Error', err.message); }
  }
// 📚 PUBLISH BY CLASS LOGIC
  async function publishByClass(className: string, publish: boolean) {
    const classStudents = students.filter(s => s.current_class === className);
    const ids = classStudents.map(s => s.id);
    if (ids.length === 0) { Alert.alert('Notice', `No students found in ${className}.`); return; }
    Alert.alert(
      publish ? `📢 Publish All in ${className}?` : `🔒 Unpublish All in ${className}?`,
      `${publish ? 'Allow' : 'Remove'} report card access for ${ids.length} student${ids.length !== 1 ? 's' : ''} in ${className}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: publish ? 'Yes, Publish All' : 'Yes, Unpublish All', onPress: async () => {
            setPublishingClass(className);
            try {
              const { error } = await supabase.from('students').update({ report_published: publish }).in('id', ids);
              if (error) throw error;
              if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Done! ✅', `${ids.length} student${ids.length !== 1 ? 's' : ''} in ${className} ${publish ? 'can now access' : 'can no longer see'} their report cards.`);
              fetchStudents();
            } catch (e: any) { Alert.alert('Error', e.message); }
            setPublishingClass(null);
        }}
      ]
    );
  }
  // 🌟 NEW: PUBLISH REPORT CARD LOGIC
  async function togglePublishReport(studentId: string, currentStatus: boolean, studentName: string) {
    const newStatus = !currentStatus;
    Alert.alert(
      newStatus ? "Publish Report Card?" : "Hide Report Card?",
      newStatus ? `Allow ${studentName} and their parents to download this term's report card?` : `Hide the report card from ${studentName}'s dashboard?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: newStatus ? "Yes, Publish" : "Yes, Hide", onPress: async () => {
            setPublishingId(studentId);
            try {
              const { error } = await supabase.from('students').update({ report_published: newStatus }).eq('id', studentId);
              if (error) throw error;
              if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              fetchStudents(); // Refresh the list instantly
            } catch(e: any) { Alert.alert("Error", e.message); }
            setPublishingId(null);
        }}
      ]
    );
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
      const { data: grades } = await supabase.from('academic_records').select('*').eq('student_id', student.id);
      const { data: evalsData } = await supabase.from('student_evaluations').select('*').eq('student_id', student.id).order('term', { ascending: false }).limit(1);
      const { data: attendanceData } = await supabase.from('daily_attendance').select('status').eq('student_id', student.id);
      
      let presentCount = 0; let absentCount = 0; let lateCount = 0;
      if (attendanceData) {
        attendanceData.forEach((record: any) => { if (record.status === 'Present') presentCount++; else if (record.status === 'Absent') absentCount++; else if (record.status === 'Late') lateCount++; });
      }

      const ev = evalsData && evalsData.length > 0 ? evalsData[0] : null;
      const subjectMap: any = {};
      if (grades) {
        grades.forEach((g: any) => {
          if (!subjectMap[g.subject]) { subjectMap[g.subject] = { First: null, Second: null, Third: null }; }
          if (g.term.includes('First')) subjectMap[g.subject].First = g;
          if (g.term.includes('Second')) subjectMap[g.subject].Second = g;
          if (g.term.includes('Third')) subjectMap[g.subject].Third = g;
        });
      }

      let gradesHtml = ''; let grandTotalScore = 0; let maxPossibleGrandTotal = 0;
      const subjects = Object.keys(subjectMap);
      
      if (subjects.length > 0) {
        subjects.forEach((sub) => {
          const t1 = subjectMap[sub].First; const t2 = subjectMap[sub].Second; const t3 = subjectMap[sub].Third;

          const t1Test1 = t1 && t1.test_1 != null ? t1.test_1 : '-'; const t1Test2 = t1 && t1.test_2 != null ? t1.test_2 : '-'; const t1Exam  = t1 && t1.exam != null ? t1.exam : '-'; const t1Score = t1 && t1.score != null ? t1.score : '-';
          const t2Test1 = t2 && t2.test_1 != null ? t2.test_1 : '-'; const t2Test2 = t2 && t2.test_2 != null ? t2.test_2 : '-'; const t2Exam  = t2 && t2.exam != null ? t2.exam : '-'; const t2Score = t2 && t2.score != null ? t2.score : '-';
          const t3Test1 = t3 && t3.test_1 != null ? t3.test_1 : '-'; const t3Test2 = t3 && t3.test_2 != null ? t3.test_2 : '-'; const t3Exam  = t3 && t3.exam != null ? t3.exam : '-'; const t3Score = t3 && t3.score != null ? t3.score : '-';

          const t1ScoreNum = t1 && t1.score != null ? Number(t1.score) : 0; const t2ScoreNum = t2 && t2.score != null ? Number(t2.score) : 0; const t3ScoreNum = t3 && t3.score != null ? Number(t3.score) : 0;
          const yearlyTotal = t1ScoreNum + t2ScoreNum + t3ScoreNum;
          
          let termsTaken = 0; if (t1 && t1.score != null) termsTaken++; if (t2 && t2.score != null) termsTaken++; if (t3 && t3.score != null) termsTaken++;
          const meanNum = termsTaken > 0 ? (yearlyTotal / termsTaken) : 0;
          const meanStr = termsTaken > 0 ? meanNum.toFixed(1) : '-';
          grandTotalScore += yearlyTotal; maxPossibleGrandTotal += (termsTaken * 100); 

          const isJSSClass = (student.current_class || '').toUpperCase().includes('JSS');
          let finalGrade = isJSSClass ? '6' : 'F9';
          let finalRemark = 'FAIL'; let gClass = 'g-fail';
          if (isJSSClass) {
            if (meanNum >= 75) { finalGrade = '1'; finalRemark = 'EXCELLENT'; gClass = 'g-pass'; }
            else if (meanNum >= 65) { finalGrade = '2'; finalRemark = 'V. GOOD'; gClass = 'g-pass'; }
            else if (meanNum >= 55) { finalGrade = '3'; finalRemark = 'GOOD'; gClass = 'g-pass'; }
            else if (meanNum >= 45) { finalGrade = '4'; finalRemark = 'CREDIT'; gClass = 'g-pass'; }
            else if (meanNum >= 35) { finalGrade = '5'; finalRemark = 'PASS'; gClass = 'g-pass'; }
          } else {
            if (meanNum >= 75) { finalGrade = 'A1'; finalRemark = 'EXCELLENT'; gClass = 'g-pass'; }
            else if (meanNum >= 70) { finalGrade = 'B2'; finalRemark = 'VERY GOOD'; gClass = 'g-pass'; }
            else if (meanNum >= 65) { finalGrade = 'B3'; finalRemark = 'GOOD'; gClass = 'g-pass'; }
            else if (meanNum >= 60) { finalGrade = 'C4'; finalRemark = 'CREDIT'; gClass = 'g-pass'; }
            else if (meanNum >= 55) { finalGrade = 'C5'; finalRemark = 'CREDIT'; gClass = 'g-pass'; }
            else if (meanNum >= 50) { finalGrade = 'C6'; finalRemark = 'CREDIT'; gClass = 'g-pass'; }
            else if (meanNum >= 45) { finalGrade = 'D7'; finalRemark = 'PASS'; gClass = 'g-pass'; }
            else if (meanNum >= 40) { finalGrade = 'E8'; finalRemark = 'PASS'; gClass = 'g-pass'; }
          }

          gradesHtml += `
            <tr>
              <td class="subj-cell">${sub}</td><td>100</td>
              <td>${t1Test1}</td><td>${t1Test2}</td><td>${t1Exam}</td><td style="font-weight:bold;">${t1Score}</td><td>${t1?.mean||t1Score}</td><td>${t1?.rank||'-'}</td>
              <td>${t2Test1}</td><td>${t2Test2}</td><td>${t2Exam}</td><td style="font-weight:bold;">${t2Score}</td><td>${t2?.mean||t2Score}</td><td>${t2?.rank||'-'}</td>
              <td>${t3Test1}</td><td>${t3Test2}</td><td>${t3Exam}</td><td style="font-weight:bold;">${t3Score}</td><td>${t3?.mean||t3Score}</td><td>${t3?.rank||'-'}</td>
              <td style="font-weight:bold; background-color: #FFFAF0;">${termsTaken > 0 ? yearlyTotal : '-'}</td><td style="font-weight:bold; background-color: #FFFAF0;">${meanStr}</td><td>-</td> 
              <td class="${gClass}" style="font-weight:bold; font-size: 8px;">${termsTaken > 0 ? finalGrade : '-'}</td>
              <td class="${gClass}" style="font-size: 6px; font-weight: 900; letter-spacing: 0.5px; white-space: nowrap;">${termsTaken > 0 ? finalRemark : '-'}</td>
            </tr>
          `;
        });
      } else { gradesHtml = `<tr><td colspan="25" style="text-align:center; padding: 20px;">No academic records found for this student.</td></tr>`; }

      const overallPercentageNum = maxPossibleGrandTotal > 0 ? (grandTotalScore / maxPossibleGrandTotal) * 100 : 0;
      const overallPercentageStr = maxPossibleGrandTotal > 0 ? overallPercentageNum.toFixed(1) : '0';

      const themeColor = getSchoolThemeColor(school?.name);
      const goldColor = '#D4AF37';
      const logoHtml = school?.logo_url ? `<img src="${school.logo_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />` : `<span style="font-size:8px; font-weight:bold; color:${themeColor};">LOGO</span>`;
      
      const rawStudentName = student.users?.full_name || 'UNKNOWN';
      const studentNameObj = rawStudentName.toUpperCase();

      const verificationText = `EDUSALONE VERIFIED ACADEMIC RECORD\n----------------------------------\nSchool: ${school?.name || 'Unknown'}\nStudent: ${studentNameObj}\nAdmission No: ${student.admission_number || 'N/A'}\nClass: ${student.current_class}\nOverall Score: ${overallPercentageStr}%\n\nAuthenticity: VERIFIED ✅`;
      const encodedQrData = encodeURIComponent(verificationText);
      const hexColor = themeColor.replace('#', '');
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodedQrData}&color=${hexColor}&bgcolor=FFFFFF`;

      function getTraitRow(traitName: string, value: number | undefined) { 
        const v = value || 0; 
        const cMap: any = {1:"#cc2200", 2:"#dd6600", 3:"#ddaa00", 4:"#3182CE", 5:"#38A169"};
        let dots = "";
        for(let i=1; i<=5; i++){
          const active = v === i;
          dots += `<div class="dot" style="${active ? `background:${cMap[i]};border-color:${cMap[i]};` : ""}"><span style="color:#fff;font-size:7px;">${active?'✓':''}</span></div><span style="width:2px;display:inline-block;"></span>`;
        }
        return `<div class="trait-row"><span class="trait-name">${traitName}</span><div class="trait-rating">${dots}</div></div>`;
      }

      function getSkillRow(skillName: string, value: number | undefined) { 
        const v = value || 0; 
        const cMap: any = {1:"#E53E3E", 2:"#DD6B20", 3:"#D69E2E", 4:"#3182CE", 5:"#38A169"};
        let bars = "";
        for(let i=1; i<=5; i++){
          const active = v >= i && v > 0;
          bars += `<div class="bar-seg" style="${active ? `background:${cMap[v]};border-color:${cMap[v]};` : ''}"></div>`;
        }
        return `<div class="skill-row"><span class="skill-name">${skillName}</span><div class="skill-bars">${bars}</div><span class="skill-score" style="color:${themeColor}">${v>0?v:'—'}</span></div>`;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
        <style>
          @page { size: A4 portrait; margin: 10mm; } 
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 8px; background: #FFFCF5; padding: 0; width: 190mm; margin: auto; }
          
          .premium-wrapper { border: 5px solid ${themeColor}; padding: 15px; position: relative; background: #fff; box-shadow: inset 0 0 0 2px ${goldColor}; min-height: 270mm; overflow: hidden; }
          .watermark { position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); font-size: 80px; color: rgba(212, 175, 55, 0.05); font-weight: 900; z-index: 0; text-align: center; pointer-events: none; text-transform: uppercase; line-height: 1.2; }

          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double ${goldColor}; padding-bottom: 8px; margin-bottom: 10px; position: relative; z-index: 10; }
          .logo { width: 55px; height: 55px; border: 2px solid ${themeColor}; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; overflow:hidden; background: #fff; }
          .hdr-center { text-align: center; flex: 1; padding: 0 5px; }
          .hdr-center h1 { font-size: 16px; font-weight: 900; color: ${themeColor}; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 2px; }
          .hdr-center .addr { font-size: 8px; color: #4A5568; margin-top: 2px; font-weight: bold; }
          .report-title { background: linear-gradient(135deg, ${themeColor}, ${goldColor}); color: #fff; text-align: center; font-size: 11px; font-weight: 900; padding: 6px 0; margin-bottom: 8px; border-radius: 4px; letter-spacing: 1.5px; position: relative; z-index: 10; border: 1px solid ${themeColor}; }
          
          .top-info { display: grid; grid-template-columns: 1.3fr 1fr 1fr; border: 1.5px solid ${goldColor}; margin-bottom: 8px; border-radius: 4px; overflow: hidden; position: relative; z-index: 10; background: #fff; }
          .info-block { border-right: 1px solid ${goldColor}; }
          .info-block:last-child { border-right: none; }
          .blk-header { background: ${themeColor}; color: #fff; font-weight: bold; font-size: 8px; text-align: center; padding: 3px; border-bottom: 1px solid ${goldColor}; }
          .info-tbl { width: 100%; border-collapse: collapse; }
          .info-tbl td { padding: 3px 4px; border-bottom: 1px solid #edf2f7; font-size: 7.5px; }
          .info-tbl td:first-child { font-weight: bold; color: ${themeColor}; width: 40%; background: #FFFCF5; border-right: 1px solid #edf2f7; }
          .att-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center; height: 100%; align-content: center; }
          .att-grid .ah { font-weight: bold; font-size: 7px; color: ${themeColor}; background: #FFFCF5; border-bottom: 1px solid #edf2f7; padding: 3px; }
          .att-grid .av { font-size: 10px; font-weight: bold; padding: 4px; color: #2D3748; }
          
          .score-line { display: flex; justify-content: space-between; padding: 4px 6px; border-bottom: 1px solid #edf2f7; font-size: 8px; }
          .score-line .sl { font-weight: bold; color: #4a5568; }
          .score-line .sv { font-weight: 900; color: ${themeColor}; }
          
          .acad-tbl { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 8px; border: 1.5px solid ${goldColor}; border-radius: 4px; overflow: hidden; position: relative; z-index: 10; background: #fff; }
          .acad-tbl th, .acad-tbl td { border: 1px solid #cbd5e0; text-align: center; padding: 3px 1px; font-size: 7px; overflow: hidden; }
          .acad-tbl th { background: ${themeColor}; font-weight: bold; color: #FFF; border-bottom: 2px solid ${goldColor}; }
          .acad-tbl .subj-cell { text-align: left; padding-left: 4px; font-weight: 900; font-size: 6.5px; width: 14%; color: ${themeColor}; background: #FFFCF5; border-right: 1px solid ${goldColor}; }
          .acad-tbl tbody tr:nth-child(even) { background: #F7FAFC; }
          
          .g-pass { color: #3182CE; font-weight: 900; } 
          .g-fail { color: #E53E3E; font-weight: 900; }
          
          .keys-bar { display: grid; grid-template-columns: repeat(5, 1fr); border: 1.5px solid ${goldColor}; margin-bottom: 8px; border-radius: 4px; overflow: hidden; position: relative; z-index: 10; }
          .key-cell { text-align: center; padding: 4px; font-size: 6.5px; font-weight: bold; color: #fff; border-right: 1px solid rgba(255,255,255,0.3); }
          .k-exc { background: ${themeColor}; } .k-vg { background: #4A5568; } .k-g { background: #2b6cb0; } .k-sat { background: #4299e1; } .k-fai { background: #e53e3e; border:none; }
          
          .bottom-section { display: grid; grid-template-columns: 1fr 1fr; border: 1.5px solid ${goldColor}; border-radius: 4px; margin-bottom: 8px; overflow: hidden; position: relative; z-index: 10; background: #fff; }
          .bottom-panel { border-right: 1px solid ${goldColor}; }
          .panel-header { display: flex; align-items: center; gap: 4px; background: ${themeColor}; color: #fff; padding: 4px 6px; font-weight: bold; font-size: 8px; border-bottom: 1px solid ${goldColor}; }
          
          .trait-row, .skill-row { display: flex; align-items: center; padding: 3px 6px; border-bottom: 1px solid #e2e8f0; min-height: 16px; }
          .trait-row:nth-child(odd), .skill-row:nth-child(odd) { background: #FFFCF5; }
          .trait-name, .skill-name { flex: 1; font-size: 7.5px; font-weight: bold; color: #2d3748; }
          .trait-rating { display: flex; gap: 2px; }
          .dot { width: 11px; height: 11px; border-radius: 50%; border: 1px solid #a0aec0; background: #fff; display: flex; align-items: center; justify-content: center; }
          .skill-bars { display: flex; gap: 1px; align-items: center; }
          .bar-seg { width: 14px; height: 6px; border-radius: 1px; border: 1px solid #cbd5e0; background: #edf2f7; }
          .skill-score { font-size: 7.5px; font-weight: bold; min-width: 16px; text-align: right; margin-right: 4px; }
          
          .signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 10px; margin-bottom: 10px; position: relative; z-index: 10; }
          .sign-box { border: 1.5px solid ${goldColor}; padding: 12px; border-radius: 8px; background: #FFFCF5; }
          .cmt-label { font-weight: 900; font-size: 8.5px; color: ${themeColor}; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid ${goldColor}; padding-bottom: 4px; letter-spacing: 0.5px; }
          .cmt-value { font-size: 8.5px; font-weight: bold; font-style: italic; color: #2d3748; min-height: 35px; }
          .sign-line { margin-top: 30px; border-top: 1px dashed ${themeColor}; width: 85%; padding-top: 4px; font-size: 8px; font-weight: bold; color: #4a5568; }
          
          .footer-section { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; position: relative; z-index: 10; }
          .promotion-banner { border: 2px solid ${goldColor}; padding: 8px; text-align: center; font-weight: 900; font-size: 10px; color: #fff; background: ${themeColor}; flex: 1; margin-right: 15px; border-radius: 6px; letter-spacing: 1px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .qr-box { width: 60px; height: 60px; border: 2px solid ${goldColor}; padding: 2px; border-radius: 4px; background: #fff; }
        </style>
        </head>
        <body>
          <div class="premium-wrapper">
            <div class="watermark">${school?.name || 'EDUSALONE'}<br/>${school?.school_code || 'VERIFIED'}<br/>OFFICIAL</div>
            
            <div class="header">
              <div class="logo">${logoHtml}</div>
              <div class="hdr-center">
                <h1>${school?.name || 'School Name'}</h1>
                <p class="addr">Sierra Leone's Premier Institution</p>
                <p class="motto" style="color:${goldColor}; font-style:italic;">Knowledge, Courage & Excellence</p>
              </div>
              <div class="logo">${logoHtml}</div>
            </div>
            
            <div class="report-title">${(student.current_class || '').toUpperCase().includes('JSS') ? 'JUNIOR SECONDARY SCHOOL' : 'SENIOR SECONDARY SCHOOL'} — PROGRESS REPORT 2024/2025</div>
            
            <div class="top-info">
              <div class="info-block">
                <div class="blk-header">STUDENT'S PERSONAL DATA</div>
                <table class="info-tbl">
                  <tr><td>Name</td><td style="font-weight:900;">${student.users?.full_name?.toUpperCase() || 'UNKNOWN'}</td></tr>
                  <tr><td>Sex</td><td>${student.gender || '-'}</td></tr>
                  <tr><td>Date of Birth</td><td>${student.date_of_birth || '-'}</td></tr>
                  <tr><td>Form</td><td style="font-weight:bold;">${student.current_class}</td></tr>
                  <tr><td>Admission No.</td><td style="color:${themeColor}; font-weight:bold;">${student.admission_number}</td></tr>
                </table>
              </div>
              <div class="info-block">
                <div class="blk-header">ATTENDANCE</div>
                <div class="att-grid">
                  <div class="ah">Late</div><div class="ah">Present</div><div class="ah">Absent</div>
                  <div class="av">${lateCount}</div><div class="av" style="color:#38A169;">${presentCount}</div><div class="av" style="color:#E53E3E;">${absentCount}</div>
                </div>
              </div>
              <div class="info-block score-blk" style="border-right:none;">
                <div class="blk-header">SCORE SUMMARY</div>
                <div class="score-line"><span class="sl">Total Obtainable</span><span class="sv">${maxPossibleGrandTotal}</span></div>
                <div class="score-line"><span class="sl">Total Obtained</span><span class="sv">${grandTotalScore}</span></div>
                <div class="score-line"><span class="sl" style="color:${themeColor}; font-weight:900;">Average Pct</span><span class="sv" style="font-size:10px;">${overallPercentageStr}%</span></div>
                <div class="score-line"><span class="sl">Class Position</span><span class="sv">${student.overall_rank || 'N/A'}</span></div>
                <div class="score-line"><span class="sl">Exam Board</span><span class="sv">${(student.current_class||'').toUpperCase().includes('JSS') ? 'BECE/WAEC' : 'WASSCE/WAEC'}</span></div>
              </div>
            </div>
            
            <table class="acad-tbl">
              <colgroup>
                <col style="width:16%"><col style="width:3%">
                <col style="width:2.5%"><col style="width:2.5%"><col style="width:2.5%"><col style="width:3.5%"><col style="width:3.5%"><col style="width:2.5%">
                <col style="width:2.5%"><col style="width:2.5%"><col style="width:2.5%"><col style="width:3.5%"><col style="width:3.5%"><col style="width:2.5%">
                <col style="width:2.5%"><col style="width:2.5%"><col style="width:2.5%"><col style="width:3.5%"><col style="width:3.5%"><col style="width:2.5%">
                <col style="width:4%"><col style="width:4%"><col style="width:3%"><col style="width:4%"><col style="width:15%">
              </colgroup>
              <thead>
                <tr>
                  <th rowspan="2" class="subj-cell" style="color:#fff; background:${themeColor}; border-right:1px solid #fff;">SUBJECT</th><th rowspan="2">MAX</th>
                  <th colspan="6" style="border-left: 2px solid ${goldColor};">FIRST TERM</th><th colspan="6" style="border-left: 2px solid ${goldColor};">SECOND TERM</th><th colspan="6" style="border-left: 2px solid ${goldColor};">THIRD TERM</th><th colspan="5" style="border-left: 2px solid ${goldColor};">YEARLY SUMMARY</th>
                </tr>
                <tr>
                  <th style="border-left: 2px solid ${goldColor};">T1</th><th>T2</th><th>EX</th><th>TOT</th><th>MN</th><th>RNK</th>
                  <th style="border-left: 2px solid ${goldColor};">T3</th><th>T4</th><th>EX</th><th>TOT</th><th>MN</th><th>RNK</th>
                  <th style="border-left: 2px solid ${goldColor};">T5</th><th>T6</th><th>EX</th><th>TOT</th><th>MN</th><th>RNK</th>
                  <th style="border-left: 2px solid ${goldColor};">TOT</th><th>MEAN</th><th>RNK</th><th>GRD</th><th>REM</th>
                </tr>
              </thead>
              <tbody>${gradesHtml}</tbody>
            </table>
            
            <div class="keys-bar">
              ${(student.current_class || '').toUpperCase().includes('JSS') ? `
                <div class="key-cell k-exc">75–100: Grd 1 EXCELLENT</div>
                <div class="key-cell k-vg">65–74: Grd 2 V.GOOD</div>
                <div class="key-cell k-g">45–64: Grd 3/4 CREDIT</div>
                <div class="key-cell k-sat">35–44: Grd 5 PASS</div>
                <div class="key-cell k-fai">0–34: Grd 6 FAIL</div>
              ` : `
                <div class="key-cell k-exc">75–100: A1 EXCELLENT</div>
                <div class="key-cell k-vg">65–74: B2/B3 GOOD</div>
                <div class="key-cell k-g">50–64: C4–C6 CREDIT</div>
                <div class="key-cell k-sat">40–49: D7/E8 PASS</div>
                <div class="key-cell k-fai">0–39: F9 FAIL</div>
              `}
            </div>
            
            <div class="bottom-section">
              <div class="bottom-panel">
                <div class="panel-header">AFFECTIVE TRAITS</div>
                ${getTraitRow('Attentiveness', ev?.attentiveness)}${getTraitRow('Attitude to Work', ev?.attitude)}${getTraitRow('Cooperation', ev?.cooperation)}${getTraitRow('Neatness', ev?.neatness)}${getTraitRow('Politeness', ev?.politeness)}${getTraitRow('Punctuality', ev?.punctuality)}
              </div>
              <div class="bottom-panel" style="border-right:none;">
                <div class="panel-header">PSYCHOMOTOR SKILLS</div>
                ${getSkillRow('Drawing & Painting', ev?.drawing_painting)}
                ${getSkillRow('Handling of Tools', ev?.handling_tools)}
                ${getSkillRow('Games & Sports', ev?.games)}
                ${getSkillRow('Handwriting', ev?.handwriting)}
                ${getSkillRow('Music', ev?.music)}
                ${getSkillRow('Verbal Fluency', ev?.verbal_fluency)}
              </div>
            </div>
            
            <div class="signatures-grid">
              <div class="sign-box">
                <div class="cmt-label">Teacher's Remarks</div>
                <div class="cmt-value">${ev?.teacher_comment || 'No comments provided for this term.'}</div>
                <div class="sign-line">Sign & Date: _________________________</div>
              </div>
              <div class="sign-box">
                <div class="cmt-label">Principal's Remarks</div>
                <div class="cmt-value"></div>
                <div class="sign-line">Sign & Stamp: _________________________</div>
              </div>
            </div>
            
            <div class="footer-section">
              <div class="promotion-banner">PROMOTION STATUS: ${ev?.promotion_status || 'PENDING'}</div>
              <img src="${qrCodeUrl}" class="qr-box" />
            </div>
            
            <div style="text-align:center; font-size:7px; color:#A0AEC0; margin-top:8px; font-style:italic; border-top: 1px solid #E2E8F0; padding-top: 4px; z-index:10; position:relative;">
              Official Digital Document • Securely Generated by EduSalone on ${new Date().toLocaleString()} • Any physical or digital alteration invalidates this statement.
            </div>
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
        renderItem={({ item }) => (
          <View style={styles.studentItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.studentName}>{item.users?.full_name || 'Unknown Name'}</Text>
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

            <TouchableOpacity onPress={() => Alert.alert('Delete Student?', `Remove ${item.users?.full_name}?`,[{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteStudent(item.user_id) }])} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={22} color="#E53E3E" />
            </TouchableOpacity>
          </View>
        )}
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