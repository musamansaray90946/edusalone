import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const StudentGradeRow = ({ student, initialGrade, onGradeUpdate }: any) => {
  const[t1, setT1] = useState(initialGrade?.test1 || '');
  const [t2, setT2] = useState(initialGrade?.test2 || '');
  const [ex, setEx] = useState(initialGrade?.exam || '');
  const[rnk, setRnk] = useState(initialGrade?.rank || '');

  const total = (Number(t1) || 0) + (Number(t2) || 0) + (Number(ex) || 0);
  const isError = total > 100; 
  
  let grade = 'F9'; let remark = 'FAIL';
  if (total >= 80) { grade = 'A1'; remark = 'EXCELLENT'; } else if (total >= 70) { grade = 'B2'; remark = 'V. GOOD'; } else if (total >= 65) { grade = 'B3'; remark = 'GOOD'; } else if (total >= 60) { grade = 'C4'; remark = 'CREDIT'; } else if (total >= 50) { grade = 'C6'; remark = 'CREDIT'; } else if (total >= 40) { grade = 'E8'; remark = 'PASS'; }

  useEffect(() => {
    onGradeUpdate(student.id, { test1: t1, test2: t2, exam: ex, rank: rnk, isError });
  },[t1, t2, ex, rnk]);

  return (
    <View style={[styles.studentRow, isError && { borderColor: '#E53E3E', borderWidth: 2 }]}>
      <View style={{ width: 140, paddingRight: 5 }}><Text style={styles.studentName} numberOfLines={1}>{student.users?.full_name}</Text></View>
      <TextInput style={styles.scoreInput} keyboardType="numeric" maxLength={3} placeholder="-" placeholderTextColor="#CBD5E0" value={t1} onChangeText={(val) => setT1(val.replace(/[^0-9]/g, ''))} />
      <TextInput style={styles.scoreInput} keyboardType="numeric" maxLength={3} placeholder="-" placeholderTextColor="#CBD5E0" value={t2} onChangeText={(val) => setT2(val.replace(/[^0-9]/g, ''))} />
      <TextInput style={styles.scoreInput} keyboardType="numeric" maxLength={3} placeholder="-" placeholderTextColor="#CBD5E0" value={ex} onChangeText={(val) => setEx(val.replace(/[^0-9]/g, ''))} />
      
      <View style={styles.autoBox}>
        {isError ? <Text style={{color:'#E53E3E', fontSize:12, fontWeight:'bold'}}>ERR</Text> : <Text style={styles.autoText}>{total > 0 ? total : '-'}</Text>}
      </View>
      <View style={styles.autoBox}>
        {isError ? <Text style={{color:'#E53E3E', fontSize:12, fontWeight:'bold'}}>>100</Text> : <Text style={styles.autoText}>{total > 0 ? total : '-'}</Text>}
      </View> 
      <TextInput style={styles.rankInput} placeholder="1st" placeholderTextColor="#CBD5E0" value={rnk} onChangeText={setRnk} />
      <View style={styles.autoBox}><Text style={[styles.autoText, { color: grade === 'F9' ? '#E53E3E' : '#38A169' }]}>{total > 0 ? grade : '-'}</Text></View>
      <View style={[styles.autoBox, { width: 90 }]}><Text style={[styles.autoText, { fontSize: 10 }]}>{total > 0 ? remark : '-'}</Text></View>
    </View>
  );
};

export default function TeacherDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [mode, setMode] = useState<'grades' | 'evaluations' | 'attendance'>('grades');

  const classOptions =['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];
  const termOptions =['First Term', 'Second Term', 'Third Term'];
  const ratingOptions =[1, 2, 3, 4, 5];

  const [selectedClass, setSelectedClass] = useState('JSS1');
  const[term, setTerm] = useState('First Term');
  const [students, setStudents] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const[subject, setSubject] = useState('');
  const [gradesMap, setGradesMap] = useState<any>({});

  const [evalStudent, setEvalStudent] = useState<any | null>(null);
  const[traits, setTraits] = useState({ attentiveness: 0, attitude: 0, cooperation: 0, neatness: 0, politeness: 0, punctuality: 0 });
  const [skills, setSkills] = useState({ handwriting: 0, verbal_fluency: 0, games: 0 });
  const [comments, setComments] = useState({ teacher: '', promotion: '' });

  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
  const todayDate = new Date().toISOString().split('T')[0];

  useEffect(() => { fetchTeacherData(); },[]);
  useEffect(() => { if (profile) { loadStudentsForClass(); } }, [selectedClass, profile]);
  useEffect(() => { if (evalStudent && mode === 'evaluations') loadExistingEvaluation(); },[evalStudent, term]);
  useEffect(() => { if (mode === 'attendance' && students.length > 0) loadTodayAttendance(); }, [mode, students]);

  async function fetchTeacherData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profileData } = await supabase.from('users').select('*, schools(name)').eq('email', user.email).single();
    if (profileData) setProfile(profileData);
    setLoading(false);
  }

  async function loadStudentsForClass() {
    setLoading(true);
    const { data } = await supabase.from('students').select('id, admission_number, current_class, users!user_id(full_name)').eq('school_id', profile.school_id).eq('current_class', selectedClass).order('admission_number', { ascending: true });
    if (data) { setStudents(data); setGradesMap({}); setEvalStudent(null); }
    setLoading(false);
  }

  // --- SMART PROMOTION LOGIC ---
  function getPromotionOptions(currentClass: string) {
    const cleanClass = currentClass?.replace(/\s/g, '').toUpperCase() || '';
    const map: Record<string, string> = { 'JSS1': 'JSS 2', 'JSS2': 'JSS 3', 'JSS3': 'SS 1', 'SS1': 'SS 2', 'SS2': 'SS 3', 'SS3': 'GRADUATED' };
    const nextClass = map[cleanClass] || 'NEXT CLASS';
    
    return[`PROMOTED TO ${nextClass}`, `PROMOTED ON TRIAL`, `REPEATED ${cleanClass}`, 'PENDING'];
  }

  // --- ATTENDANCE FUNCTIONS ---
  async function loadTodayAttendance() {
    const { data } = await supabase.from('daily_attendance').select('*').eq('school_id', profile.school_id).eq('date', todayDate);
    const attMap: any = {};
    students.forEach(s => attMap[s.id] = 'Present');
    if (data) { data.forEach(r => attMap[r.student_id] = r.status); }
    setAttendanceMap(attMap);
  }

  function handleAttendanceChange(studentId: string, status: string) { setAttendanceMap(prev => ({ ...prev,[studentId]: status })); }

  async function saveAttendance() {
    setSubmitting(true);
    const recordsToInsert = students.map(s => ({ school_id: profile.school_id, student_id: s.id, teacher_id: profile.id, date: todayDate, status: attendanceMap[s.id] || 'Present' }));
    const { error } = await supabase.from('daily_attendance').upsert(recordsToInsert, { onConflict: 'student_id, date' });
    setSubmitting(false);
    if (error) Alert.alert('Database Error', error.message); else Alert.alert('Success', `Attendance for ${selectedClass} saved for today!`);
  }

  // --- GRADING FUNCTIONS ---
  function handleGradeUpdate(studentId: string, gradeData: any) { setGradesMap((prev: any) => ({ ...prev, [studentId]: gradeData })); }

  async function saveBulkGrades() {
    if (!subject.trim()) { Alert.alert('Missing Subject', 'Please type the subject name (e.g. Mathematics).'); return; }
    const hasMathErrors = Object.values(gradesMap).some((g: any) => g.isError === true);
    if (hasMathErrors) { Alert.alert('Mathematical Error', 'A student has a total score over 100. Please fix the red rows before saving.'); return; }

    setSubmitting(true);
    const recordsToInsert =[];
    let gradesEntered = false;

    for (const student of students) {
      const g = gradesMap[student.id];
      if (g && (g.test1 !== '' || g.test2 !== '' || g.exam !== '')) {
        gradesEntered = true;
        const total = (Number(g.test1) || 0) + (Number(g.test2) || 0) + (Number(g.exam) || 0);
        let grade = 'F9'; let remark = 'FAIL';
        if (total >= 80) { grade = 'A1'; remark = 'EXCELLENT'; } else if (total >= 70) { grade = 'B2'; remark = 'V. GOOD'; } else if (total >= 60) { grade = 'C4'; remark = 'CREDIT'; } else if (total >= 50) { grade = 'C6'; remark = 'CREDIT'; } else if (total >= 40) { grade = 'E8'; remark = 'PASS'; }
        
        recordsToInsert.push({ school_id: profile.school_id, student_id: student.id, teacher_id: profile.id, subject: subject.trim().toUpperCase(), term: term, academic_year: '2024/2025', test_1: Number(g.test1) || 0, test_2: Number(g.test2) || 0, exam: Number(g.exam) || 0, score: total, grade: grade, remark: remark, rank: g.rank });
      }
    }

    if (!gradesEntered) { Alert.alert('No Data', 'You have not entered any grades yet.'); setSubmitting(false); return; }
    const { error } = await supabase.from('academic_records').upsert(recordsToInsert, { onConflict: 'student_id, term, academic_year, subject' });
    setSubmitting(false);
    if (error) Alert.alert('Database Error', error.message); else { Alert.alert('Sent for Approval!', `Grades for ${subject} have been saved.`); setSubject(''); loadStudentsForClass(); }
  }

  // --- EVALUATION FUNCTIONS ---
  async function loadExistingEvaluation() {
    setLoading(true);
    const { data } = await supabase.from('student_evaluations').select('*').eq('student_id', evalStudent.id).eq('term', term).eq('academic_year', '2024/2025').single();
    if (data) {
      setTraits({ attentiveness: data.attentiveness, attitude: data.attitude, cooperation: data.cooperation, neatness: data.neatness, politeness: data.politeness, punctuality: data.punctuality });
      setSkills({ handwriting: data.handwriting, verbal_fluency: data.verbal_fluency, games: data.games });
      setComments({ teacher: data.teacher_comment || '', promotion: data.promotion_status || '' });
    } else {
      setTraits({ attentiveness: 0, attitude: 0, cooperation: 0, neatness: 0, politeness: 0, punctuality: 0 });
      setSkills({ handwriting: 0, verbal_fluency: 0, games: 0 });
      setComments({ teacher: '', promotion: '' });
    }
    setLoading(false);
  }

  async function saveEvaluation() {
    if (!evalStudent) { Alert.alert('Error', 'Select a student first.'); return; }
    setSubmitting(true);
    const evalData = { school_id: profile.school_id, student_id: evalStudent.id, teacher_id: profile.id, academic_year: '2024/2025', term: term, ...traits, ...skills, teacher_comment: comments.teacher, promotion_status: comments.promotion };
    const { error } = await supabase.from('student_evaluations').upsert(evalData, { onConflict: 'student_id, academic_year, term' });
    setSubmitting(false);
    if (error) Alert.alert('Error', error.message); else Alert.alert('Sent for Approval', `Saved evaluation for ${evalStudent.users?.full_name}.`);
  }

  const renderRatingRow = (label: string, value: number, onChange: (val: number) => void) => (
    <View style={styles.ratingRow}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.ratingDots}>
        {ratingOptions.map(num => (
          <TouchableOpacity key={num} onPress={() => onChange(num)} style={[styles.ratingDot, value === num && styles.ratingDotActive]}>
            <Text style={[styles.ratingDotText, value === num && styles.ratingDotTextActive]}>{num}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  async function handleLogout() { await supabase.auth.signOut(); router.replace('/'); }

  if (loading && !profile) return <ActivityIndicator size="large" color="#DD6B20" style={{ marginTop: 100 }} />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.header}>
        <View><Text style={styles.greeting}>Teacher Portal</Text><Text style={styles.subText}>{profile?.full_name}</Text></View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}><Ionicons name="log-out-outline" size={24} color="#E53E3E" /></TouchableOpacity>
      </View>

      <View style={styles.modeToggle}>
        <TouchableOpacity style={[styles.modeButton, mode === 'grades' && styles.modeButtonActive]} onPress={() => setMode('grades')}><Ionicons name="book" size={14} color={mode === 'grades' ? '#FFF' : '#4A5568'} /><Text style={[styles.modeText, mode === 'grades' && styles.modeTextActive]}> Grades</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.modeButton, mode === 'evaluations' && styles.modeButtonActive]} onPress={() => setMode('evaluations')}><Ionicons name="clipboard" size={14} color={mode === 'evaluations' ? '#FFF' : '#4A5568'} /><Text style={[styles.modeText, mode === 'evaluations' && styles.modeTextActive]}> Evals</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.modeButton, mode === 'attendance' && styles.modeButtonActive]} onPress={() => setMode('attendance')}><Ionicons name="checkmark-circle" size={14} color={mode === 'attendance' ? '#FFF' : '#4A5568'} /><Text style={[styles.modeText, mode === 'attendance' && styles.modeTextActive]}> Roll Call</Text></TouchableOpacity>
      </View>

      <View style={styles.controlsCard}>
        <Text style={styles.label}>1. Select Class:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }} keyboardShouldPersistTaps="handled">
          {classOptions.map(c => (
            <TouchableOpacity key={c} style={[styles.chip, selectedClass === c && styles.chipActive]} onPress={() => setSelectedClass(c)}><Text style={[styles.chipText, selectedClass === c && styles.chipTextActive]}>{c}</Text></TouchableOpacity>
          ))}
        </ScrollView>
        
        {mode !== 'attendance' && (
          <>
            <Text style={styles.label}>2. Select Term:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: mode === 'grades' ? 15 : 0 }} keyboardShouldPersistTaps="handled">
              {termOptions.map(t => (
                <TouchableOpacity key={t} style={[styles.chip, term === t && styles.chipActive]} onPress={() => setTerm(t)}><Text style={[styles.chipText, term === t && styles.chipTextActive]}>{t}</Text></TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
        
        {mode === 'grades' && (
          <>
            <Text style={styles.label}>3. Subject Name:</Text>
            <TextInput style={[styles.input, { borderColor: subject ? '#38A169' : '#E53E3E', borderWidth: 2 }]} placeholder="Must type subject here..." placeholderTextColor="#A0AEC0" value={subject} onChangeText={setSubject} />
          </>
        )}
      </View>

      {/* MODE 1: GRADES */}
      {mode === 'grades' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <ScrollView style={styles.spreadsheetContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.spreadsheetHeader}>
              <Text style={[styles.columnHeader, { width: 140, textAlign: 'left' }]}>Student</Text><Text style={styles.columnHeader}>T1</Text><Text style={styles.columnHeader}>T2</Text><Text style={styles.columnHeader}>EX</Text><Text style={styles.columnHeader}>TOT</Text><Text style={styles.columnHeader}>MN</Text><Text style={styles.columnHeader}>RNK</Text><Text style={styles.columnHeader}>GRD</Text><Text style={[styles.columnHeader, { width: 90 }]}>REMARKS</Text>
            </View>
            {loading ? <ActivityIndicator color="#DD6B20" style={{ marginTop: 20 }} /> : students.length === 0 ? ( <Text style={styles.emptyText}>No students in class.</Text> ) : (
              students.map((student) => <StudentGradeRow key={student.id} student={student} initialGrade={gradesMap[student.id]} onGradeUpdate={handleGradeUpdate} />)
            )}
            <TouchableOpacity style={styles.saveButton} onPress={saveBulkGrades} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>💾 Send to Principal</Text>}
            </TouchableOpacity>
          </ScrollView>
        </ScrollView>
      )}

      {/* MODE 2: EVALUATIONS WITH SMART PROMOTION */}
      {mode === 'evaluations' && (
        <ScrollView style={{ flex: 1, paddingHorizontal: 15, paddingBottom: 50 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>3. Select Student to Evaluate:</Text>
          {students.length === 0 ? <Text style={styles.emptyText}>No students in class.</Text> : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {students.map((student) => (
                <TouchableOpacity key={student.id} style={[styles.chip, evalStudent?.id === student.id && styles.chipActive]} onPress={() => setEvalStudent(student)}><Text style={[styles.chipText, evalStudent?.id === student.id && styles.chipTextActive]}>{student.users?.full_name}</Text></TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {evalStudent && (
            <View style={{ backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 50 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A365D', marginBottom: 20, textAlign: 'center' }}>Evaluating: {evalStudent.users?.full_name}</Text>
              <Text style={styles.label}>Affective Traits</Text>
              {renderRatingRow('Attentiveness', traits.attentiveness, (v) => setTraits({...traits, attentiveness: v}))}
              {renderRatingRow('Attitude to Work', traits.attitude, (v) => setTraits({...traits, attitude: v}))}
              {renderRatingRow('Cooperation', traits.cooperation, (v) => setTraits({...traits, cooperation: v}))}
              {renderRatingRow('Neatness', traits.neatness, (v) => setTraits({...traits, neatness: v}))}
              {renderRatingRow('Politeness', traits.politeness, (v) => setTraits({...traits, politeness: v}))}
              {renderRatingRow('Punctuality', traits.punctuality, (v) => setTraits({...traits, punctuality: v}))}
              
              <Text style={[styles.label, { marginTop: 15 }]}>Psychomotor Skills</Text>
              {renderRatingRow('Handwriting', skills.handwriting, (v) => setSkills({...skills, handwriting: v}))}
              {renderRatingRow('Verbal Fluency', skills.verbal_fluency, (v) => setSkills({...skills, verbal_fluency: v}))}
              {renderRatingRow('Games & Sports', skills.games, (v) => setSkills({...skills, games: v}))}

              <Text style={[styles.label, { marginTop: 15 }]}>End of Term Comments</Text>
              <TextInput style={{ backgroundColor: '#F7FAFC', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', height: 80, textAlignVertical: 'top', marginBottom: 10 }} placeholder="Teacher's Comment..." multiline value={comments.teacher} onChangeText={(val) => setComments({...comments, teacher: val})} />
              
              {/* NEW SMART PROMOTION STATUS */}
              <Text style={[styles.label, { marginTop: 10 }]}>Promotion Status (Auto-Calculated)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 5, marginBottom: 15 }}>
                {getPromotionOptions(evalStudent.current_class).map(opt => (
                  <TouchableOpacity 
                    key={opt} 
                    style={[styles.chip, comments.promotion === opt && { backgroundColor: '#38A169', borderColor: '#38A169' }]} 
                    onPress={() => setComments({...comments, promotion: opt})}
                  >
                    <Text style={[styles.chipText, comments.promotion === opt && { color: '#FFF' }]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={saveEvaluation} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>💾 Send Eval to Principal</Text>}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* MODE 3: DAILY ATTENDANCE */}
      {mode === 'attendance' && (
        <ScrollView style={{ flex: 1, paddingHorizontal: 15 }} keyboardShouldPersistTaps="handled">
           <Text style={styles.label}>Date: {todayDate}</Text>
           {loading ? <ActivityIndicator color="#DD6B20" style={{ marginTop: 20 }} /> : students.length === 0 ? ( <Text style={styles.emptyText}>No students in class.</Text> ) : (
             students.map((student) => {
               const status = attendanceMap[student.id] || 'Present';
               return (
                 <View key={student.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 10, marginBottom: 10 }}>
                   <Text style={{ flex: 1, fontWeight: 'bold', color: '#2D3748' }}>{student.users?.full_name}</Text>
                   
                   <View style={{ flexDirection: 'row', gap: 5 }}>
                     <TouchableOpacity style={[styles.attBtn, status === 'Present' && { backgroundColor: '#38A169' }]} onPress={() => handleAttendanceChange(student.id, 'Present')}>
                       <Text style={[styles.attText, status === 'Present' && { color: '#FFF' }]}>P</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[styles.attBtn, status === 'Absent' && { backgroundColor: '#E53E3E' }]} onPress={() => handleAttendanceChange(student.id, 'Absent')}>
                       <Text style={[styles.attText, status === 'Absent' && { color: '#FFF' }]}>A</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[styles.attBtn, status === 'Late' && { backgroundColor: '#DD6B20' }]} onPress={() => handleAttendanceChange(student.id, 'Late')}>
                       <Text style={[styles.attText, status === 'Late' && { color: '#FFF' }]}>L</Text>
                     </TouchableOpacity>
                   </View>
                 </View>
               )
             })
           )}
           <TouchableOpacity style={styles.saveButton} onPress={saveAttendance} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>💾 Save Roll Call</Text>}
            </TouchableOpacity>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8', paddingTop: 50 }, 
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, backgroundColor: '#FFF', padding: 15, marginHorizontal: 15, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  greeting: { fontSize: 20, fontWeight: '900', color: '#DD6B20' }, 
  subText: { fontSize: 12, color: '#4A5568', marginTop: 2, fontWeight: '600' },
  logoutButton: { padding: 10, backgroundColor: '#FED7D7', borderRadius: 12 },
  modeToggle: { flexDirection: 'row', marginHorizontal: 15, marginBottom: 15, backgroundColor: '#E2E8F0', borderRadius: 12, padding: 4 },
  modeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8 },
  modeButtonActive: { backgroundColor: '#DD6B20' },
  modeText: { fontSize: 11, fontWeight: 'bold', color: '#4A5568' },
  modeTextActive: { color: '#FFFFFF' },
  controlsCard: { backgroundColor: '#FFFFFF', padding: 15, marginHorizontal: 15, borderRadius: 16, elevation: 2, marginBottom: 15 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#718096', marginBottom: 8, textTransform: 'uppercase' },
  chip: { backgroundColor: '#EDF2F7', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#DD6B20', borderColor: '#DD6B20' },
  chipText: { color: '#4A5568', fontWeight: 'bold', fontSize: 12 },
  chipTextActive: { color: '#FFFFFF' },
  input: { backgroundColor: '#F7FAFC', borderRadius: 8, padding: 12, fontSize: 14, color: '#2D3748', borderWidth: 1, borderColor: '#E2E8F0' },
  spreadsheetHeader: { flexDirection: 'row', paddingHorizontal: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#CBD5E0', width: 700 }, 
  columnHeader: { width: 50, fontSize: 11, fontWeight: 'bold', color: '#718096', textAlign: 'center' },
  spreadsheetContainer: { flex: 1, paddingHorizontal: 15, width: 700 }, 
  studentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingVertical: 12, paddingHorizontal: 10, marginBottom: 8, borderRadius: 8 },
  studentName: { fontSize: 13, fontWeight: 'bold', color: '#2D3748' },
  scoreInput: { width: 50, backgroundColor: '#EDF2F7', marginHorizontal: 2, borderRadius: 6, textAlign: 'center', fontWeight: 'bold', fontSize: 14, color: '#1A365D', paddingVertical: 8 },
  rankInput: { width: 50, backgroundColor: '#FEFCBF', marginHorizontal: 2, borderRadius: 6, textAlign: 'center', fontWeight: 'bold', fontSize: 14, color: '#DD6B20', paddingVertical: 8, borderWidth: 1, borderColor: '#FBD38D' },
  autoBox: { width: 50, alignItems: 'center', justifyContent: 'center' },
  autoText: { fontSize: 14, fontWeight: '900', color: '#718096' },
  gradeBadge: { fontSize: 12, fontWeight: 'bold' },
  saveButton: { backgroundColor: '#38A169', marginVertical: 20, padding: 18, borderRadius: 12, alignItems: 'center', width: 300, alignSelf: 'center' },
  saveButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
  emptyText: { textAlign: 'center', marginTop: 10, color: '#E53E3E', fontStyle: 'italic', fontSize: 15, fontWeight: 'bold' },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F7FAFC' },
  ratingLabel: { fontSize: 14, color: '#2D3748', fontWeight: '600', flex: 1 },
  ratingDots: { flexDirection: 'row', gap: 8 },
  ratingDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EDF2F7', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  ratingDotActive: { backgroundColor: '#DD6B20', borderColor: '#DD6B20' },
  ratingDotText: { fontSize: 14, fontWeight: 'bold', color: '#718096' },
  ratingDotTextActive: { color: '#FFF' },
  attBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#EDF2F7', borderRadius: 8 },
  attText: { fontWeight: 'bold', color: '#4A5568' }
});