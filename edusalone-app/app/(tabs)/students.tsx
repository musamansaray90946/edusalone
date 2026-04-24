import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/lib/supabase';

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
  const[printingId, setPrintingId] = useState<string | null>(null);

  // 📅 ATTENDANCE STATE
  const[attClass, setAttClass] = useState('JSS1');
  const [attMonth, setAttMonth] = useState(new Date().getMonth() + 1);
  const [generatingAtt, setGeneratingAtt] = useState(false);
  const classOptions =['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];
  const monthOptions =[
    { num: 1, name: 'Jan' }, { num: 2, name: 'Feb' }, { num: 3, name: 'Mar' },
    { num: 4, name: 'Apr' }, { num: 5, name: 'May' }, { num: 6, name: 'Jun' },
    { num: 7, name: 'Jul' }, { num: 8, name: 'Aug' }, { num: 9, name: 'Sep' },
    { num: 10, name: 'Oct' }, { num: 11, name: 'Nov' }, { num: 12, name: 'Dec' }
  ];

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
      const { data, error } = await supabase.from('students').select('*, users!user_id(full_name)').eq('school_id', school.id).order('created_at', { ascending: false });
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
      const { data: userData, error: userError } = await supabase.from('users').insert([{ school_id: school.id, role: 'Student', full_name: fullName, email: `${admissionNumber.toLowerCase()}@student.sl`, is_active: true }]).select().single();
      if (userError) throw userError;
      const { error: studentError } = await supabase.from('students').insert([{ user_id: userData.id, school_id: school.id, admission_number: admissionNumber, current_class: currentClass.toUpperCase().replace(/\s/g, ''), gender: gender, date_of_birth: dob }]);
      if (studentError) throw studentError;

      Alert.alert('Success!', `${fullName} enrolled successfully!`);
      setFullName(''); setAdmissionNumber(''); setCurrentClass(''); setDob(''); setGender('Male');
      fetchStudents(); 
    } catch (err: any) { Alert.alert('Enrollment Error', err.message); }
    setLoading(false);
  }

  async function deleteStudent(userId: string) {
    try {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;
      fetchStudents();
    } catch (err: any) { Alert.alert('Delete Error', err.message); }
  }

  // ==========================================
  // 📅 ATTENDANCE PDF GENERATOR
  // ==========================================
  async function generateAttendancePDF() {
    if (!school) return;
    setGeneratingAtt(true);
    try {
      const { data: classStudents } = await supabase.from('students').select('id, users!user_id(full_name)').eq('school_id', school.id).eq('current_class', attClass).order('created_at', { ascending: true });
      if (!classStudents || classStudents.length === 0) { Alert.alert('No Students', `No students found in ${attClass}.`); setGeneratingAtt(false); return; }

      const year = new Date().getFullYear();
      const monthStr = attMonth < 10 ? `0${attMonth}` : `${attMonth}`;
      const startDate = `${year}-${monthStr}-01`;
      const endDate = `${year}-${monthStr}-31`;

      const { data: attendanceData } = await supabase.from('daily_attendance').select('*').eq('school_id', school.id).gte('date', startDate).lte('date', endDate);

      let rowsHtml = '';
      classStudents.forEach((std, index) => {
        let daysHtml = ''; let p = 0; let a = 0; let l = 0;
        for (let i = 1; i <= 31; i++) {
          const dayStr = i < 10 ? `0${i}` : `${i}`;
          const targetDate = `${year}-${monthStr}-${dayStr}`;
          const record = attendanceData?.find(r => r.student_id === std.id && r.date === targetDate);
          let mark = '';
          if (record) {
            if (record.status === 'Present') { mark = 'P'; p++; }
            if (record.status === 'Absent') { mark = '<span style="color:red; font-weight:bold;">A</span>'; a++; }
            if (record.status === 'Late') { mark = '<span style="color:orange; font-weight:bold;">L</span>'; l++; }
          }
          daysHtml += `<td>${mark}</td>`;
        }
        rowsHtml += `<tr><td>${index + 1}</td><td style="text-align: left; padding-left: 5px;">${std.users?.full_name}</td>${daysHtml}<td style="font-weight: bold;">${p}</td><td style="font-weight: bold; color: red;">${a}</td><td style="font-weight: bold; color: orange;">${l}</td></tr>`;
      });

      let dayHeaders = '';
      for (let i=1; i<=31; i++) { dayHeaders += `<th>${i}</th>`; }
      const monthName = monthOptions.find(m => m.num === attMonth)?.name;
      const logoHtml = school?.logo_url && school.logo_url.startsWith('http') ? `<img src="${school.logo_url}" style="height: 60px; margin-bottom: 5px;" />` : '';

      const htmlContent = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" /><style>@page { size: A4 landscape; margin: 10mm; } body { font-family: Helvetica, Arial, sans-serif; font-size: 10px; } .header { text-align: center; margin-bottom: 15px; } table { width: 100%; border-collapse: collapse; text-align: center; } th, td { border: 1px solid #000; padding: 4px; } th { background-color: #E2E8F0; }</style></head><body><div class="header">${logoHtml}<h2 style="margin:0;">${school.name.toUpperCase()}</h2><h3 style="margin:5px 0;">OFFICIAL CLASS REGISTER: ${attClass} | ${monthName?.toUpperCase()} ${year}</h3></div><table><tr><th width="3%">No.</th><th width="15%">Student Name</th>${dayHeaders}<th width="3%">P</th><th width="3%">A</th><th width="3%">L</th></tr>${rowsHtml}</table><div style="margin-top: 15px; font-size: 11px;"><strong>Key:</strong> P = Present &nbsp;|&nbsp; <span style="color:red">A = Absent</span> &nbsp;|&nbsp; <span style="color:orange">L = Late</span></div><div style="margin-top: 40px; display: flex; justify-content: space-between;"><div style="border-top: 1px solid #000; width: 250px; text-align: center; padding-top: 5px;">Class Teacher's Signature</div><div style="border-top: 1px solid #000; width: 250px; text-align: center; padding-top: 5px;">Principal's Signature</div></div></body></html>`;

      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) { printWindow.document.write(htmlContent); printWindow.document.close(); setTimeout(() => { printWindow.print(); }, 500); }
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (error: any) { Alert.alert('Error', 'Could not generate Register: ' + error.message); }
    setGeneratingAtt(false);
  }

  // ==========================================
  // 🖨️ REPORT CARD PDF GENERATOR
  // ==========================================
  async function generatePDFReportCard(student: any) {
    setPrintingId(student.id);
    try {
      const { data: grades } = await supabase.from('academic_records').select('*').eq('student_id', student.id);
      const { data: evalsData } = await supabase.from('student_evaluations').select('*').eq('student_id', student.id).order('term', { ascending: false }).limit(1);
      
      const { data: attendanceData } = await supabase.from('daily_attendance').select('status').eq('student_id', student.id);
      let presentCount = 0; let absentCount = 0; let lateCount = 0;
      if (attendanceData) {
        attendanceData.forEach(record => { if (record.status === 'Present') presentCount++; else if (record.status === 'Absent') absentCount++; else if (record.status === 'Late') lateCount++; });
      }

      const ev = evalsData && evalsData.length > 0 ? evalsData[0] : null;

      const subjectMap: any = {};
      if (grades) {
        grades.forEach((g) => {
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

          let finalGrade = 'F9'; let finalRemark = 'FAIL';
          if (meanNum >= 75) { finalGrade = 'A1'; finalRemark = 'EXCELLENT'; } else if (meanNum >= 70) { finalGrade = 'B2'; finalRemark = 'V. GOOD'; } else if (meanNum >= 65) { finalGrade = 'B3'; finalRemark = 'GOOD'; } else if (meanNum >= 60) { finalGrade = 'C4'; finalRemark = 'CREDIT'; } else if (meanNum >= 50) { finalGrade = 'C6'; finalRemark = 'CREDIT'; } else if (meanNum >= 40) { finalGrade = 'E8'; finalRemark = 'PASS'; }

          gradesHtml += `
            <tr>
              <td class="text-left font-bold" style="font-size: 9px;">${sub}</td><td>100</td>
              <td class="bg-light">${t1Test1}</td><td class="bg-light">${t1Test2}</td><td class="bg-light">${t1Exam}</td><td class="bg-light font-bold">${t1Score}</td><td class="bg-light">${t1Score}</td><td class="bg-light">${t1?.rank||'-'}</td>
              <td>${t2Test1}</td><td>${t2Test2}</td><td>${t2Exam}</td><td class="font-bold">${t2Score}</td><td>${t2Score}</td><td>${t2?.rank||'-'}</td>
              <td class="bg-light">${t3Test1}</td><td class="bg-light">${t3Test2}</td><td class="bg-light">${t3Exam}</td><td class="bg-light font-bold">${t3Score}</td><td class="bg-light">${t3Score}</td><td class="bg-light">${t3?.rank||'-'}</td>
              <td class="font-bold">${termsTaken > 0 ? yearlyTotal : '-'}</td><td class="font-bold">${meanStr}</td><td>-</td> 
              <td class="font-bold">${termsTaken > 0 ? finalGrade : '-'}</td><td style="font-size: 8px; font-weight: bold;">${termsTaken > 0 ? finalRemark : '-'}</td>
            </tr>
          `;
        });
      } else { gradesHtml = `<tr><td colspan="25" style="text-align:center; padding: 20px;">No academic records found for this student.</td></tr>`; }

      const overallPercentageNum = maxPossibleGrandTotal > 0 ? (grandTotalScore / maxPossibleGrandTotal) * 100 : 0;
      const overallPercentageStr = maxPossibleGrandTotal > 0 ? overallPercentageNum.toFixed(1) : '0';

      const logoHtml = school?.logo_url && school.logo_url.startsWith('http') ? `<img src="${school.logo_url}" style="height: 60px; margin-bottom: 5px;" />` : `<div style="height: 60px; width: 60px; border: 2px solid #000; display: inline-block; margin-bottom: 5px; text-align: center; line-height: 60px; font-size: 10px; color: #4A5568; font-weight: bold;">LOGO</div>`;
      const studentName = student.users?.full_name ? student.users.full_name.toUpperCase() : 'UNKNOWN';

      function getTraitRow(traitName: string, value: number | undefined) { const v = value || 0; return `<tr><td class="text-left">${traitName}</td><td>${v===1?'✓':''}</td><td>${v===2?'✓':''}</td><td>${v===3?'✓':''}</td><td>${v===4?'✓':''}</td><td>${v===5?'✓':''}</td></tr>`; }
      function getSkillRow(skillName: string, value: number | undefined) { const v = value || 0; return `<tr><td class="text-left">${skillName}</td><td>${v===1?'✓':''}</td><td>${v===2?'✓':''}</td><td>${v===3?'✓':''}</td><td>${v===4?'✓':''}</td><td>${v===5?'✓':''}</td></tr>`; }

      const htmlContent = `
        <html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" /><style>@page { size: A4; margin: 10mm; } body { font-family: 'Times New Roman', serif; padding: 10px; color: #000; font-size: 9px; background: #FFF; } .header { text-align: center; margin-bottom: 10px; } .school-name { font-size: 24px; font-weight: 900; text-transform: uppercase; margin: 0; color: #800000; } .contact-info { font-size: 9px; margin-top: 2px; } .report-title { text-align: center; font-size: 11px; font-weight: bold; background-color: #e2e8f0; padding: 5px; border: 1px solid #000; margin-bottom: 10px; text-transform: uppercase; } table { width: 100%; border-collapse: collapse; margin-bottom: 10px; } th, td { border: 1px solid #000; padding: 2px; text-align: center; font-size: 9px; } .text-left { text-align: left; padding-left: 4px; } .font-bold { font-weight: bold; } .bg-gray { background-color: #f7fafc; } .bg-light { background-color: #fcfcfc; } .bg-dark { background-color: #e2e8f0; font-weight: bold; font-size: 9px;} .top-section { display: table; width: 100%; margin-bottom: 10px; } .top-left { display: table-cell; width: 48%; vertical-align: top; } .top-right { display: table-cell; width: 50%; vertical-align: top; padding-left: 2%; } .traits-section { display: table; width: 100%; margin-bottom: 10px; } .traits-left { display: table-cell; width: 49%; vertical-align: top; } .traits-right { display: table-cell; width: 49%; vertical-align: top; padding-left: 2%; } .comments-section { border: 1px solid #000; padding: 10px; margin-top: 10px; } .sign-line { border-bottom: 1px dotted #000; width: 150px; display: inline-block; margin-left: 5px; }</style></head>
        <body>
          <div class="header">${logoHtml}<h1 class="school-name">${school?.name || 'School Name'}</h1><p class="contact-info">Motto: Knowledge & Excellence | Sierra Leone<br/>Email: admin@school.sl | Tel: +232 77 000 000</p></div>
          <div class="report-title">2024/2025 ACADEMIC YEAR - STUDENT'S PROGRESS REPORT SHEET</div>
          <div class="top-section">
            <div class="top-left"><table><tr><td colspan="2" class="bg-dark text-left">STUDENT'S PERSONAL DATA</td></tr><tr><td class="text-left bg-gray" width="30%">Name</td><td class="text-left font-bold">${studentName}</td></tr><tr><td class="text-left bg-gray">Sex</td><td class="text-left font-bold">${student.gender || '-'}</td></tr><tr><td class="text-left bg-gray">Date Of Birth</td><td class="text-left">${student.date_of_birth || '-'}</td></tr><tr><td class="text-left bg-gray">Form</td><td class="text-left">${student.current_class}</td></tr><tr><td class="text-left bg-gray">Admission No.</td><td class="text-left">${student.admission_number}</td></tr><tr><td class="text-left bg-gray">Class Teacher</td><td class="text-left">Assigned Staff</td></tr></table></div>
            <div class="top-right"><table><tr><td colspan="3" class="bg-dark">ATTENDANCE</td></tr><tr><td class="bg-gray">Late</td><td class="bg-gray">Present</td><td class="bg-gray">Absent</td></tr><tr><td class="font-bold">${lateCount}</td><td class="font-bold">${presentCount}</td><td class="font-bold">${absentCount}</td></tr></table><table style="margin-top: 5px;"><tr><td class="bg-gray text-left" colspan="2">TOTAL SCORE OBTAINABLE</td><td colspan="2" class="font-bold">${maxPossibleGrandTotal}</td></tr><tr><td class="bg-gray text-left" colspan="2">TOTAL SCORE OBTAINED</td><td colspan="2" class="font-bold">${grandTotalScore}</td></tr><tr><td class="bg-gray text-left" colspan="2">AVERAGE PERCENTAGE</td><td colspan="2" class="font-bold">${overallPercentageStr}%</td></tr><tr><td class="bg-gray text-left" width="25%">No. in Class</td><td class="font-bold" width="25%">40</td><td class="bg-gray text-left" width="25%">Position</td><td class="font-bold" width="25%">-</td></tr></table></div>
          </div>
          <table><tr><td colspan="25" class="bg-dark">ACADEMIC PERFORMANCE</td></tr><tr><th rowspan="2" class="text-left" width="12%">SUBJECT</th><th rowspan="2" width="4%">MAX</th><th colspan="6" class="bg-dark">FIRST TERM</th><th colspan="6" class="bg-dark">SECOND TERM</th><th colspan="6" class="bg-dark">THIRD TERM</th><th colspan="5" class="bg-dark">YEARLY</th></tr><tr><th>T1</th><th>T2</th><th>EX</th><th>TOT</th><th>MN</th><th>RNK</th><th>T3</th><th>T4</th><th>EX</th><th>TOT</th><th>MN</th><th>RNK</th><th>T5</th><th>T6</th><th>EX</th><th>TOT</th><th>MN</th><th>RNK</th><th>TOTAL</th><th>MEAN</th><th>RNK</th><th>GRADE</th><th>REMARKS</th></tr>${gradesHtml}</table>
          <table style="margin-bottom: 10px;"><tr><td colspan="5" class="bg-dark">KEYS TO RATING / GRADING SCALE</td></tr><tr class="bg-gray"><td>80-100 (EXCELLENT)</td><td>70-79 (V. GOOD)</td><td>60-69 (GOOD)</td><td>50-59 (SATISFACTORY)</td><td>0-49 (FAIL)</td></tr></table>
          <div class="traits-section"><div class="traits-left"><table><tr><td colspan="6" class="bg-dark">AFFECTIVE TRAITS</td></tr><tr class="bg-gray"><td class="text-left">Traits</td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td></tr>${getTraitRow('Attentiveness', ev?.attentiveness)}${getTraitRow('Attitude to School work', ev?.attitude)}${getTraitRow('Cooperation with others', ev?.cooperation)}${getTraitRow('Neatness', ev?.neatness)}${getTraitRow('Politeness', ev?.politeness)}${getTraitRow('Punctuality', ev?.punctuality)}</table></div><div class="traits-right"><table><tr><td colspan="6" class="bg-dark">PSYCHOMOTOR SKILLS</td></tr><tr class="bg-gray"><td class="text-left">Skills</td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td></tr>${getSkillRow('Handwriting', ev?.handwriting)}${getSkillRow('Verbal Fluency', ev?.verbal_fluency)}${getSkillRow('Games / Sports', ev?.games)}</table><table style="margin-top: 5px;"><tr><td colspan="2" class="bg-dark">KEYS TO RATING</td></tr><tr><td class="text-left">1 - Very Poor<br/>2 - Poor<br/>3 - Fair</td><td class="text-left">4 - Good<br/>5 - Excellent</td></tr></table></div></div>
          <div class="comments-section"><div style="float: left; width: 75%;"><p><strong>Form Teacher's Comments:</strong> <u>${ev?.teacher_comment || 'No comment entered yet.'}</u> &nbsp; Sign: <span class="sign-line"></span></p><p><strong>Principal's Comments:</strong> <span class="sign-line"></span> &nbsp; Date: <u>${new Date().toLocaleDateString()}</u></p><p style="margin-top: 15px; font-size: 13px;"><strong>Promotion Status:</strong> <span style="border: 1px solid #000; padding: 4px 10px; font-weight:bold; text-transform:uppercase;">${ev?.promotion_status || 'PENDING'}</span></p></div><div style="float: right; width: 20%; text-align: center;"><div style="border: 2px dashed #000; height: 80px; width: 100%; display: inline-block; padding-top: 30px; color: #000; font-weight: bold;">OFFICIAL<br/>STAMP</div></div><div style="clear: both;"></div></div>
        </body></html>
      `;

      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) { printWindow.document.write(htmlContent); printWindow.document.close(); setTimeout(() => { printWindow.print(); }, 500); }
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (error: any) { Alert.alert('Error', 'Could not generate PDF: ' + error.message); }
    setPrintingId(null);
  }

  // --- RENDER UI ---
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
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

            {/* 📅 PRINT ATTENDANCE CARD */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Print Attendance Sheet</Text>
              <Text style={{ fontSize: 12, color: '#718096', marginBottom: 15 }}>Generate a printable A4 monthly register.</Text>
              
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Class</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {classOptions.map(c => (
                      <TouchableOpacity key={c} style={[styles.chip, attClass === c && styles.chipActive]} onPress={() => setAttClass(c)}>
                        <Text style={[styles.chipText, attClass === c && styles.chipTextActive]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={[styles.row, { marginTop: 15 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Month</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {monthOptions.map(m => (
                      <TouchableOpacity key={m.num} style={[styles.chip, attMonth === m.num && styles.chipActive]} onPress={() => setAttMonth(m.num)}>
                        <Text style={[styles.chipText, attMonth === m.num && styles.chipTextActive]}>{m.name.substring(0,3)}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#3182CE', marginTop: 15, flexDirection: 'row', justifyContent: 'center' }]} onPress={generateAttendancePDF} disabled={generatingAtt}>
                {generatingAtt ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="print" size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryButtonText}>Print Class Register</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Enroll New Student</Text>
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

            <Text style={styles.listTitle}>Enrolled Students ({students.length})</Text>
            {fetching && <ActivityIndicator size="large" color="#3182CE" style={{ marginTop: 20 }} />}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.studentItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.studentName}>{item.users?.full_name || 'Unknown Name'}</Text>
              <Text style={styles.studentDetails}>{item.current_class} | {item.admission_number}</Text>
            </View>
            <TouchableOpacity style={styles.printButton} onPress={() => generatePDFReportCard(item)} disabled={printingId === item.id}>
              {printingId === item.id ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.printButtonText}>PDF Report</Text>}
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
  chip: { backgroundColor: '#EDF2F7', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
  chipActive: { backgroundColor: '#3182CE' },
  chipText: { color: '#4A5568', fontWeight: 'bold', fontSize: 12 },
  chipTextActive: { color: '#FFFFFF' },
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
  printButton: { backgroundColor: '#DD6B20', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 8, marginRight: 5 },
  printButtonText: { color: '#FFF', fontWeight: '900', fontSize: 13, textTransform: 'uppercase' },
  deleteButton: { padding: 5 },
  emptyText: { textAlign: 'center', color: '#A0AEC0', marginTop: 20, fontStyle: 'italic', fontSize: 15, fontWeight: 'bold' }
});