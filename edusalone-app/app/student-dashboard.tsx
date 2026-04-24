import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../src/lib/supabase';

export default function StudentDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [studentRecord, setStudentRecord] = useState<any>(null);
  const[loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  
  const [linkInput, setLinkInput] = useState('');
  const [linking, setLinking] = useState(false);

  useEffect(() => { fetchDashboardData(); },[]);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase.from('users').select('*, schools(name)').eq('email', user.email).single();
      
      if (profileData) {
        setProfile(profileData);
        let query = supabase.from('students').select('*, schools(*)');
        if (profileData.role === 'Student') { query = query.eq('user_id', profileData.id); } 
        else if (profileData.role === 'Parent') { query = query.eq('parent_user_id', profileData.id); }

        const { data: studentData } = await query.single();
        if (studentData) setStudentRecord(studentData);
      }
    } catch (err: any) { Alert.alert('Network Error', 'Could not load data.'); }
    setLoading(false);
  }

  async function linkChildAccount() {
    if (!linkInput.trim()) { Alert.alert('Error', 'Please enter an Admission Number.'); return; }
    setLinking(true);
    const { data: childData, error } = await supabase.from('students').select('id, users!user_id(full_name)').eq('school_id', profile.school_id).eq('admission_number', linkInput.trim()).single();

    if (error || !childData) { Alert.alert('Not Found', 'No student found with this Admission Number.'); setLinking(false); return; }

    const { error: updateError } = await supabase.from('students').update({ parent_user_id: profile.id }).eq('id', childData.id);
    setLinking(false);

    if (updateError) Alert.alert('Error', 'Could not link account.'); 
    else { Alert.alert('Success!', `Linked securely to ${childData.users.full_name}.`); fetchDashboardData(); }
  }

  function getTraitRow(traitName: string, value: number | undefined) {
    const v = value || 0;
    return `<tr><td class="text-left">${traitName}</td><td>${v === 1 ? '✓' : ''}</td><td>${v === 2 ? '✓' : ''}</td><td>${v === 3 ? '✓' : ''}</td><td>${v === 4 ? '✓' : ''}</td><td>${v === 5 ? '✓' : ''}</td></tr>`;
  }
  function getSkillRow(skillName: string, value: number | undefined) {
    const v = value || 0;
    return `<tr><td class="text-left">${skillName}</td><td>${v === 1 ? '✓' : ''}</td><td>${v === 2 ? '✓' : ''}</td><td>${v === 3 ? '✓' : ''}</td><td>${v === 4 ? '✓' : ''}</td><td>${v === 5 ? '✓' : ''}</td></tr>`;
  }

  async function downloadMyReportCard() {
    if (!studentRecord) { Alert.alert('Error', 'No academic records found.'); return; }
    setPrinting(true);
    
    try {
      const { data: grades } = await supabase.from('academic_records').select('*').eq('student_id', studentRecord.id);
      const { data: evalsData } = await supabase.from('student_evaluations').select('*').eq('student_id', studentRecord.id).order('term', { ascending: false }).limit(1);
      
      const { data: attendanceData } = await supabase.from('daily_attendance').select('status').eq('student_id', studentRecord.id);
      let presentCount = 0; let absentCount = 0; let lateCount = 0;
      if (attendanceData) { attendanceData.forEach(record => { if (record.status === 'Present') presentCount++; else if (record.status === 'Absent') absentCount++; else if (record.status === 'Late') lateCount++; }); }

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

          const t1ScoreNum = t1 && t1.score != null ? Number(t1.score) : 0; 
          const t2ScoreNum = t2 && t2.score != null ? Number(t2.score) : 0; 
          const t3ScoreNum = t3 && t3.score != null ? Number(t3.score) : 0;
          const yearlyTotal = t1ScoreNum + t2ScoreNum + t3ScoreNum;
          
          let termsTaken = 0; if (t1 && t1.score != null) termsTaken++; if (t2 && t2.score != null) termsTaken++; if (t3 && t3.score != null) termsTaken++;
          
          const meanNum = termsTaken > 0 ? (yearlyTotal / termsTaken) : 0;
          const meanStr = termsTaken > 0 ? meanNum.toFixed(1) : '-';
          
          grandTotalScore += yearlyTotal; maxPossibleGrandTotal += (termsTaken * 100); 

          let finalGrade = 'F9'; let finalRemark = 'FAIL';
          if (meanNum >= 75) { finalGrade = 'A1'; finalRemark = 'EXCELLENT'; } else if (meanNum >= 60) { finalGrade = 'C4'; finalRemark = 'CREDIT'; } else if (meanNum >= 40) { finalGrade = 'E8'; finalRemark = 'PASS'; }

          gradesHtml += `
            <tr>
              <td class="text-left font-bold" style="font-size:10px;">${sub}</td><td>100</td>
              <td class="bg-light">${t1Test1}</td><td class="bg-light">${t1Test2}</td><td class="bg-light">${t1Exam}</td><td class="bg-light font-bold">${t1Score}</td><td class="bg-light">${t1Score}</td><td class="bg-light">${t1?.rank||'-'}</td>
              <td>${t2Test1}</td><td>${t2Test2}</td><td>${t2Exam}</td><td class="font-bold">${t2Score}</td><td>${t2Score}</td><td>${t2?.rank||'-'}</td>
              <td class="bg-light">${t3Test1}</td><td class="bg-light">${t3Test2}</td><td class="bg-light">${t3Exam}</td><td class="bg-light font-bold">${t3Score}</td><td class="bg-light">${t3Score}</td><td class="bg-light">${t3?.rank||'-'}</td>
              <td class="font-bold">${termsTaken > 0 ? yearlyTotal : '-'}</td><td class="font-bold">${meanStr}</td><td>-</td> 
              <td class="font-bold">${termsTaken > 0 ? finalGrade : '-'}</td><td style="font-size:9px;">${termsTaken > 0 ? finalRemark : '-'}</td>
            </tr>
          `;
        });
      } else {
        gradesHtml = `<tr><td colspan="25" style="text-align:center; padding: 20px;">No academic records found for this student.</td></tr>`;
      }

      const overallPercentageNum = maxPossibleGrandTotal > 0 ? (grandTotalScore / maxPossibleGrandTotal) * 100 : 0;
      const overallPercentageStr = maxPossibleGrandTotal > 0 ? overallPercentageNum.toFixed(1) : '0';
      
      const school = studentRecord.schools;
      const logoHtml = school?.logo_url && school.logo_url.startsWith('http') ? `<img src="${school.logo_url}" style="height: 70px; margin-bottom: 5px;" />` : `<div style="height: 60px; width: 60px; border: 2px solid #000; display: inline-block; margin-bottom: 5px; text-align: center; line-height: 60px; font-weight: bold;">LOGO</div>`;

      const { data: studentProfile } = await supabase.from('users').select('full_name').eq('id', studentRecord.user_id).single();
      const actualStudentName = studentProfile?.full_name || 'UNKNOWN';

      const htmlContent = `
        <html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" /><style>@page { size: A4; margin: 10mm; } body { font-family: 'Times New Roman', serif; margin: 0 auto; width: 190mm; color: #000; font-size: 10px; } .header { text-align: center; margin-bottom: 10px; } .school-name { font-size: 24px; font-weight: 900; text-transform: uppercase; margin: 0; color: #800000; } table { width: 100%; border-collapse: collapse; margin-bottom: 10px; } th, td { border: 1px solid #000; padding: 3px; text-align: center; font-size: 10px; } .bg-dark { background-color: #e2e8f0; font-weight: bold;} .bg-gray { background-color: #f7fafc; } .text-left { text-align: left; padding-left: 5px; } </style></head><body>
          <div class="header">${logoHtml}<h1 class="school-name">${school?.name || 'School Name'}</h1><p style="font-size:10px; margin-top:2px;">Motto: Knowledge & Excellence | Sierra Leone<br/>Email: admin@school.sl | Tel: +232 77 000 000</p></div>
          <div style="text-align:center; font-weight:bold; background-color:#e2e8f0; padding:5px; border:1px solid #000; margin-bottom:10px;">2024/2025 ACADEMIC YEAR - STUDENT'S PROGRESS REPORT SHEET</div>
          <div style="display: table; width: 100%; margin-bottom: 10px;"><div style="display: table-cell; width: 48%; vertical-align: top;"><table><tr><td colspan="2" class="bg-dark" style="text-align:left;">STUDENT'S PERSONAL DATA</td></tr><tr><td style="text-align:left;" width="30%">Name</td><td style="text-align:left; font-weight:bold;">${actualStudentName.toUpperCase()}</td></tr><tr><td style="text-align:left;">Sex</td><td style="text-align:left; font-weight:bold;">${studentRecord?.gender || '-'}</td></tr><tr><td style="text-align:left;">Date Of Birth</td><td style="text-align:left;">${studentRecord?.date_of_birth || '-'}</td></tr><tr><td style="text-align:left;">Form</td><td style="text-align:left;">${studentRecord?.current_class}</td></tr><tr><td style="text-align:left;">Admission No.</td><td style="text-align:left;">${studentRecord?.admission_number}</td></tr><tr><td style="text-align:left;">Class Teacher</td><td style="text-align:left;">Assigned Staff</td></tr></table></div><div style="display: table-cell; width: 50%; vertical-align: top; padding-left: 2%;"><table><tr><td colspan="3" class="bg-dark">ATTENDANCE</td></tr><tr><td class="bg-gray">Late</td><td class="bg-gray">Present</td><td class="bg-gray">Absent</td></tr><tr><td style="font-weight:bold;">${lateCount}</td><td style="font-weight:bold;">${presentCount}</td><td style="font-weight:bold;">${absentCount}</td></tr></table><table style="margin-top: 5px;"><tr><td class="bg-gray" style="text-align:left;" colspan="2">TOTAL OBTAINABLE</td><td colspan="2" style="font-weight:bold;">${maxPossibleGrandTotal}</td></tr><tr><td class="bg-gray" style="text-align:left;" colspan="2">TOTAL OBTAINED</td><td colspan="2" style="font-weight:bold;">${grandTotalScore}</td></tr><tr><td class="bg-gray" style="text-align:left;" colspan="2">PERCENTAGE</td><td colspan="2" style="font-weight:bold;">${overallPercentageStr}%</td></tr><tr><td class="bg-gray" style="text-align:left;" width="25%">No. in Class</td><td style="font-weight:bold;" width="25%">40</td><td class="bg-gray" style="text-align:left;" width="25%">Position</td><td style="font-weight:bold;" width="25%">-</td></tr></table></div></div>
          <table><tr><td colspan="25" class="bg-dark">ACADEMIC PERFORMANCE</td></tr><tr><th rowspan="2" style="text-align:left;" width="15%">SUBJECT</th><th rowspan="2" width="4%">MAX</th><th colspan="6" class="bg-dark">FIRST TERM</th><th colspan="6" class="bg-dark">SECOND TERM</th><th colspan="6" class="bg-dark">THIRD TERM</th><th colspan="5" class="bg-dark">YEARLY</th></tr><tr><th>T1</th><th>T2</th><th>EX</th><th>TOT</th><th>MN</th><th>RNK</th><th>T3</th><th>T4</th><th>EX</th><th>TOT</th><th>MN</th><th>RNK</th><th>T5</th><th>T6</th><th>EX</th><th>TOT</th><th>MN</th><th>RNK</th><th>TOTAL</th><th>MEAN</th><th>RNK</th><th>GRADE</th><th>REMARKS</th></tr>${gradesHtml}</table>
          <table style="margin-bottom: 10px;"><tr><td colspan="5" class="bg-dark">KEYS TO RATING / GRADING SCALE</td></tr><tr class="bg-gray"><td>80-100 (EXCELLENT)</td><td>70-79 (V. GOOD)</td><td>60-69 (GOOD)</td><td>50-59 (SATISFACTORY)</td><td>0-49 (FAIL)</td></tr></table>
          <div style="display: table; width: 100%; margin-bottom: 10px;"><div style="display: table-cell; width: 49%; vertical-align: top;"><table><tr><td colspan="6" class="bg-dark">AFFECTIVE TRAITS</td></tr><tr class="bg-gray"><td style="text-align:left;">Traits</td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td></tr>${getTraitRow('Attentiveness', ev?.attentiveness)}${getTraitRow('Attitude to School work', ev?.attitude)}${getTraitRow('Cooperation with others', ev?.cooperation)}${getTraitRow('Neatness', ev?.neatness)}${getTraitRow('Politeness', ev?.politeness)}${getTraitRow('Punctuality', ev?.punctuality)}</table></div><div style="display: table-cell; width: 49%; vertical-align: top; padding-left: 2%;"><table><tr><td colspan="6" class="bg-dark">PSYCHOMOTOR SKILLS</td></tr><tr class="bg-gray"><td style="text-align:left;">Skills</td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td></tr>${getSkillRow('Handwriting', ev?.handwriting)}${getSkillRow('Verbal Fluency', ev?.verbal_fluency)}${getSkillRow('Games / Sports', ev?.games)}</table><table style="margin-top: 5px;"><tr><td colspan="2" class="bg-dark">KEYS TO RATING</td></tr><tr><td style="text-align:left;">1 - Very Poor<br/>2 - Poor<br/>3 - Fair</td><td style="text-align:left;">4 - Good<br/>5 - Excellent</td></tr></table></div></div>
          <div style="border: 1px solid #000; padding: 10px; margin-top: 10px;"><div style="float: left; width: 75%;"><p><strong>Teacher's Comments:</strong> <u>${ev?.teacher_comment || 'N/A'}</u> &nbsp; Sign: <span style="border-bottom:1px dotted #000; width:100px; display:inline-block;"></span></p><p><strong>Principal's Comments:</strong> <span style="border-bottom:1px dotted #000; width:150px; display:inline-block;"></span> &nbsp; Date: <u>${new Date().toLocaleDateString()}</u></p><p style="margin-top: 15px; font-size: 13px;"><strong>Promotion Status:</strong> <span style="border: 1px solid #000; padding: 4px 10px; font-weight:bold; text-transform:uppercase;">${ev?.promotion_status || 'PENDING'}</span></p></div><div style="float: right; width: 20%; text-align: center;"><div style="border: 2px dashed #000; height: 80px; width: 100%; display: inline-block; padding-top: 30px; color: #000; font-weight: bold;">OFFICIAL<br/>STAMP</div></div><div style="clear: both;"></div></div>
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
    setPrinting(false);
  }

  async function handleLogout() { await supabase.auth.signOut(); router.replace('/'); }

  if (loading) return <View style={{ flex: 1, backgroundColor: '#F0F4F8', justifyContent: 'center' }}><ActivityIndicator size="large" color="#3182CE" /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F4F8' }}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{profile?.role === 'Parent' ? 'Parent Portal' : 'Student Portal'}</Text>
            <Text style={styles.subText}>{profile?.schools?.name}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}><Ionicons name="log-out-outline" size={24} color="#E53E3E" /></TouchableOpacity>
        </View>

        {profile?.role === 'Parent' && !studentRecord ? (
          <View style={styles.linkCard}>
            <Ionicons name="link" size={50} color="#3182CE" style={{ marginBottom: 15 }} />
            <Text style={styles.linkTitle}>Link Your Child</Text>
            <Text style={styles.linkDesc}>Enter your child's Admission Number to view their records.</Text>
            <TextInput style={styles.input} placeholder="e.g. ADM-003" placeholderTextColor="#A0AEC0" value={linkInput} onChangeText={setLinkInput} autoCapitalize="characters" />
            <TouchableOpacity style={styles.linkButton} onPress={linkChildAccount} disabled={linking}>
              {linking ? <ActivityIndicator color="#FFF" /> : <Text style={styles.linkButtonText}>Securely Link Account</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.idCard}>
              <Ionicons name="person-circle" size={60} color="#3182CE" style={{ marginBottom: 10 }} />
              <Text style={styles.studentName}>{profile?.role === 'Parent' ? "My Child's Profile" : profile?.full_name}</Text>
              <Text style={styles.studentDetails}>Class: {studentRecord?.current_class || 'Pending'} | ADM: {studentRecord?.admission_number || 'Pending'}</Text>
            </View>

            <Text style={styles.sectionTitle}>Academic Actions</Text>
            <TouchableOpacity style={styles.actionCard} onPress={downloadMyReportCard} disabled={printing}>
              <View style={styles.actionIconContainer}>{printing ? <ActivityIndicator color="#DD6B20" /> : <Ionicons name="document-text" size={30} color="#DD6B20" />}</View>
              <View style={{ flex: 1 }}><Text style={styles.actionTitle}>Download Report Card</Text><Text style={styles.actionDesc}>View official academic progress.</Text></View>
              <Ionicons name="download-outline" size={24} color="#3182CE" />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 40, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  greeting: { fontSize: 24, fontWeight: '900', color: '#1A365D' },
  subText: { fontSize: 14, color: '#4A5568', marginTop: 4, fontWeight: 'bold' },
  logoutButton: { padding: 10, backgroundColor: '#FED7D7', borderRadius: 12 },
  idCard: { backgroundColor: '#1A365D', padding: 30, borderRadius: 20, alignItems: 'center', marginBottom: 30, shadowColor: '#1A365D', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  studentName: { fontSize: 22, fontWeight: 'bold', color: '#FFF', marginBottom: 5 },
  studentDetails: { fontSize: 14, color: '#E2E8F0', fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3748', marginBottom: 15 },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  actionIconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FEEBC8', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  actionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
  actionDesc: { fontSize: 12, color: '#718096', marginTop: 3 },
  linkCard: { backgroundColor: '#FFF', padding: 30, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  linkTitle: { fontSize: 22, fontWeight: '900', color: '#1A365D', marginBottom: 10 },
  linkDesc: { fontSize: 14, color: '#718096', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  input: { width: '100%', backgroundColor: '#F7FAFC', borderRadius: 10, padding: 15, fontSize: 16, color: '#2D3748', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
  linkButton: { width: '100%', backgroundColor: '#38A169', padding: 16, borderRadius: 10, alignItems: 'center' },
  linkButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});