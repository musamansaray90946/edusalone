import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Dimensions,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AskAI from '../../components/AskAI';
import { registerForPush } from '../../src/lib/registerPush';
import { supabase } from '../../src/lib/supabase';
import ChatTab from './chat';

const { width } = Dimensions.get('window');

const PRIMARY_NAVY = '#1A365D';
const SECONDARY_BLUE = '#2B6CB0';
const ACCENT_GOLD = '#D69E2E';
const SUCCESS_GREEN = '#38A169';
const DANGER_RED = '#E53E3E';

function NoticeBoardManager({ schoolId }: { schoolId: string }) {
  const [notices, setNotices] = useState<any[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => { if (schoolId) fetchNotices(); }, [schoolId]);

  async function fetchNotices() {
    setLoadingNotices(true);
    const { data } = await supabase.from('school_news')
      .select('*').eq('school_id', schoolId)
      .order('created_at', { ascending: false }).limit(20);
    if (data) setNotices(data);
    setLoadingNotices(false);
  }

  async function deleteNotice(id: string) {
    Alert.alert('Delete Notice?', 'This will remove it from all feeds permanently.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setDeletingId(id);
        await supabase.from('school_news').delete().eq('id', id);
        setNotices(prev => prev.filter(n => n.id !== id));
        setDeletingId(null);
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }}
    ]);
  }

  const displayed = showAll ? notices : notices.slice(0, 3);

  return (
    <View style={{ backgroundColor: '#FFF', margin: 20, marginTop: 0, padding: 22, borderRadius: 24, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <Text style={{ fontSize: 17, fontWeight: '900', color: PRIMARY_NAVY }}>📢 Noticeboard</Text>
        <TouchableOpacity onPress={fetchNotices}>
          <Ionicons name="refresh" size={18} color={PRIMARY_NAVY} />
        </TouchableOpacity>
      </View>
      {loadingNotices ? <ActivityIndicator color={PRIMARY_NAVY} /> :
       notices.length === 0 ? <Text style={{ color: '#CBD5E0', textAlign: 'center', fontSize: 12 }}>No notices sent yet.</Text> :
       displayed.map(n => (
        <View key={n.id} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: '900', color: PRIMARY_NAVY }}>{n.author_name}</Text>
            <Text style={{ fontSize: 13, color: '#4A5568', marginTop: 3, lineHeight: 18 }}>{n.content}</Text>
            <Text style={{ fontSize: 10, color: '#A0AEC0', marginTop: 4 }}>{new Date(n.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <TouchableOpacity
            onPress={() => deleteNotice(n.id)}
            disabled={deletingId === n.id}
            style={{ backgroundColor: '#FEE2E2', borderRadius: 8, padding: 8, alignItems: 'center', justifyContent: 'center' }}>
            {deletingId === n.id ? <ActivityIndicator size="small" color={DANGER_RED} /> : <Ionicons name="trash-outline" size={16} color={DANGER_RED} />}
          </TouchableOpacity>
        </View>
       ))
      }
      {notices.length > 3 && (
        <TouchableOpacity onPress={() => setShowAll(!showAll)} style={{ alignItems: 'center', paddingTop: 12 }}>
          <Text style={{ color: SECONDARY_BLUE, fontWeight: '900', fontSize: 13 }}>{showAll ? '▲ Show Less' : `▼ Show All (${notices.length})`}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function PrincipalDashboard() {
  const router = useRouter();
  
  const [profile, setProfile] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [topScholars, setTopScholars] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ students: 0, staff: 0, revenue: 0 });
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showReportReview, setShowReportReview] = useState(false);
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMessengerOpen, setIsMessengerOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingRoster, setIsGeneratingRoster] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');

  // Top Scholars dropdown toggle
  const [showTopScholars, setShowTopScholars] = useState(false);

  // Delete student state
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [runningAlerts, setRunningAlerts] = useState(false);

  // Teacher role assignment state
  const [staff, setStaff] = useState<any[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [showStaffRoles, setShowStaffRoles] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');

  const [studentForm, setStudentForm] = useState({ 
    fullName: '', admissionId: '', assignedClass: '', gender: 'Male', birthDate: '' 
  });
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [dispatchType, setDispatchType] = useState<'Notice' | 'Fee Alert'>('Notice');
  const [isDispatching, setIsDispatching] = useState(false);

  // Send Document state
  const [docTitle, setDocTitle] = useState('');
  const [docNote, setDocNote] = useState('');
  const [docAudience, setDocAudience] = useState('teachers');
  const [docTargetClass, setDocTargetClass] = useState('');
  const [sendingDoc, setSendingDoc] = useState(false);
  const [myDocs, setMyDocs] = useState<any[]>([]);
  const [showDocs, setShowDocs] = useState(false);
  const [officeInbox, setOfficeInbox] = useState<any[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [section, setSection] = useState<'overview' | 'comms' | 'people'>('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { initializeCommandCenter(); }, []);
  useEffect(() => { if (profile?.school_id) { loadMyDocs(); loadOfficeInbox(); } }, [profile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initializeCommandCenter();
    setRefreshing(false);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  async function initializeCommandCenter() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      const { data: profileData, error: pErr } = await supabase
        .from('users').select('*, schools(*)').eq('email', user.email).single();

      if (pErr || !profileData) throw new Error("Auth Failure");

      setProfile(profileData);
      setSchool(profileData.schools);
      registerForPush(profileData.id);

      const { data: rosterData } = await supabase
        .from('students')
        .select('*, users!user_id(full_name, phone, is_active)')
        .eq('school_id', profileData.school_id)
        .order('created_at', { ascending: false });

      const { data: staffData } = await supabase
        .from('users')
        .select('id, full_name, email, role, teacher_type, assigned_class')
        .eq('school_id', profileData.school_id)
        .eq('role', 'Teacher')
        .order('full_name', { ascending: true });

      const { data: leaderboardData } = await supabase
        .from('students')
        .select('id, brain_points, admission_number, current_class, users!user_id(full_name)')
        .eq('school_id', profileData.school_id)
        .order('brain_points', { ascending: false })
        .limit(10);

      const { count: sCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', profileData.school_id);
      const { count: tCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('school_id', profileData.school_id).in('role', ['Teacher', 'Bursar', 'Secretary']);
      const { data: revenueData } = await supabase.from('fee_transactions').select('amount_paid_sll').eq('school_id', profileData.school_id);
      const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', profileData.id).eq('is_read', false);
      
      const { data: notifData } = await supabase.from('principal_notifications')
        .select('*').eq('school_id', profileData.school_id)
        .eq('is_read', false).order('created_at', { ascending: false });
      if (notifData && notifData.length > 0) setNotifications(notifData);

      const totalRevenue = revenueData?.reduce((s, c) => s + (Number(c.amount_paid_sll) || 0), 0) || 0;

      setRoster(rosterData || []);
      setStaff(staffData || []);
      setTopScholars(leaderboardData || []);
      setUnreadCount(msgCount || 0);
      setMetrics({ students: sCount || 0, staff: tCount || 0, revenue: totalRevenue });

    } catch (err) { console.error("Initialize Error:", err); }
    setLoading(false);
  }

  // ── GRADE REVIEW: Fixed query with correct join syntax ──
  async function fetchPendingReports() {
    if (!profile?.school_id) return;
    setLoadingReports(true);
    try {
      // Step 1: Get academic records with pending/published status
      const { data: records, error } = await supabase
        .from('academic_records')
        .select(`
          id, subject, submission_status, term, academic_year,
          student_id, teacher_id, reviewed_by,
          test_1, test_2, exam,
          score, grade, remark, rank,
          teacher:users!teacher_id(full_name),
          reviewer:users!reviewed_by(full_name)
        `)
        .eq('school_id', profile.school_id)
        .eq('submission_status', 'published')
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Grade fetch error:', error);
        setLoadingReports(false);
        return;
      }

      if (!records || records.length === 0) {
        setPendingReports([]);
        setLoadingReports(false);
        return;
      }

      // Step 2: Get student details separately to avoid join issues
      const studentIds = [...new Set(records.map((r: any) => r.student_id))];
      const { data: studentData } = await supabase
        .from('students')
        .select('id, admission_number, current_class, users!user_id(full_name)')
        .in('id', studentIds);

      const studentMap: any = {};
      (studentData || []).forEach((s: any) => {
        studentMap[s.id] = {
          name: s.users?.full_name || 'Unknown',
          admission: s.admission_number || '',
          class: s.current_class || ''
        };
      });

      // Step 3: Group by subject + term + year
      const grouped: any = {};
      records.forEach((r: any) => {
        const key = `${r.subject}__${r.term}__${r.academic_year}`;
        if (!grouped[key]) {
          grouped[key] = {
            subject: r.subject,
            term: r.term,
            academic_year: r.academic_year,
            teacher_name: (r.teacher as any)?.full_name || 'Unknown Teacher',
            reviewer_name: (r.reviewer as any)?.full_name || 'Form Teacher',
            status: r.submission_status,
            count: 0,
            students: [],
            records: []
          };
        }
        grouped[key].count++;
        grouped[key].records.push(r);
        const studentInfo = studentMap[r.student_id];
        if (studentInfo) {
          // Always update/add student with their scores
          const existing = grouped[key].students.find((s: any) => s.admission === studentInfo.admission);
          const studentWithScore = {
            ...studentInfo,
            score: r.score,
            grade: r.grade,
            remark: r.remark,
            rank: r.rank,
            test1: r.test_1,
            test2: r.test_2,
            exam: r.exam,
          };
          if (!existing) {
            grouped[key].students.push(studentWithScore);
          }
        }
        // If any record is pending_review, mark whole batch as pending
        if (r.submission_status === 'pending_review') {
          grouped[key].status = 'pending_review';
        }
      });

      setPendingReports(Object.values(grouped));
    } catch (err: any) {
      console.error('fetchPendingReports error:', err);
    }
    setLoadingReports(false);
  }

  async function approveAllGrades(subject: string, term: string, year: string) {
    // Web: window.confirm (Alert.alert buttons don't fire on web)
    if (Platform.OS === 'web') {
      const ok = window.confirm(`APPROVE ${subject} GRADES?\n\nTerm: ${term} (${year})\n\nThis will mark them as Principal-Approved.\nTeachers will be able to print report cards.\n\nClick OK to approve.`);
      if (!ok) return;
      const { error } = await supabase.from('academic_records')
        .update({ submission_status: 'principal_approved' })
        .eq('school_id', profile?.school_id)
        .eq('subject', subject).eq('term', term).eq('academic_year', year)
        .eq('submission_status', 'published');
      if (error) { window.alert('Error: ' + error.message); return; }
      window.alert(`✅ Approved!\n${subject} grades cleared for report card printing.`);
      fetchPendingReports();
      return;
    }
    Alert.alert('Approve & Clear for Printing?', `Mark all ${subject} grades for ${term} as Principal-Approved?\n\nTeachers will be able to print report cards.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve ✅', onPress: async () => {
        const { error } = await supabase.from('academic_records')
          .update({ submission_status: 'principal_approved' })
          .eq('school_id', profile?.school_id)
          .eq('subject', subject).eq('term', term).eq('academic_year', year)
          .eq('submission_status', 'published');
        if (error) { Alert.alert('Error', error.message); return; }
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('✅ Approved', `${subject} grades cleared for report card printing.`);
        fetchPendingReports();
      }}
    ]);
  }

  async function returnGradesToFormTeacher(subject: string, term: string, year: string) {
    // Web: window.confirm
    if (Platform.OS === 'web') {
      const ok = window.confirm(`RETURN ${subject} GRADES TO TEACHER?\n\nTerm: ${term} (${year})\n\nThis sends them back as DRAFT.\nTeacher will need to fix and resubmit.\n\nClick OK to return.`);
      if (!ok) return;
      await supabase.from('academic_records')
        .update({ submission_status: 'draft' })
        .eq('school_id', profile?.school_id)
        .eq('subject', subject).eq('term', term).eq('academic_year', year);
      window.alert(`↩️ Returned!\n${subject} sent back to Form Teacher for correction.`);
      fetchPendingReports();
      return;
    }
    Alert.alert('Return to Form Teacher?', `Send ${subject} grades back to the Form Teacher for correction?\n\nThey will need to resubmit.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Return ↩️', style: 'destructive', onPress: async () => {
        await supabase.from('academic_records')
          .update({ submission_status: 'draft' })
          .eq('school_id', profile?.school_id)
          .eq('subject', subject).eq('term', term).eq('academic_year', year);
        Alert.alert('↩️ Returned', `${subject} has been sent back to the Form Teacher for correction.`);
        fetchPendingReports();
      }}
    ]);
  }

  // ── DELETE STUDENT ──
  async function deleteStudent(studentId: string, studentName: string, userId: string | null) {
    Alert.alert(
      '🗑️ Delete Student Record?',
      `Remove ${studentName} from the roster?\n\nThis will delete:\n• Admission record\n• All grades\n• User account (if any)\n\nThis cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Permanently', style: 'destructive', onPress: async () => {
          setDeletingStudentId(studentId);
          try {
            // Delete grades first
            await supabase.from('academic_records').delete().eq('student_id', studentId);
            await supabase.from('student_evaluations').delete().eq('student_id', studentId);
            await supabase.from('daily_attendance').delete().eq('student_id', studentId);
            // Delete student record
            await supabase.from('students').delete().eq('id', studentId);
            // Delete user account if exists
            if (userId) await supabase.from('users').delete().eq('id', userId);
            setRoster(prev => prev.filter(s => s.id !== studentId));
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('✅ Deleted', `${studentName} has been removed from the system.`);
          } catch (err: any) {
            Alert.alert('Delete Error', err.message);
          }
          setDeletingStudentId(null);
        }}
      ]
    );
  }

  async function assignTeacherRole(teacherId: string, type: 'class' | 'subject', className: string | null) {
    setAssigningId(teacherId);
    try {
      if (type === 'class' && className) {
        // One Form Teacher per class: demote whoever currently holds this class.
        await supabase.from('users')
          .update({ teacher_type: 'subject', assigned_class: null })
          .eq('school_id', profile.school_id).eq('assigned_class', className).eq('teacher_type', 'class').neq('id', teacherId);
      }
      const update = type === 'class'
        ? { teacher_type: 'class', assigned_class: className }
        : { teacher_type: 'subject', assigned_class: null };
      const { error } = await supabase.from('users').update(update).eq('id', teacherId);
      if (error) throw error;
      setStaff(prev => prev.map(t => {
        if (t.id === teacherId) return { ...t, ...update };
        if (type === 'class' && t.teacher_type === 'class' && t.assigned_class === className) {
          return { ...t, teacher_type: 'subject', assigned_class: null };
        }
        return t;
      }));
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      const m = e.message || 'Could not update role.';
      if (Platform.OS === 'web') window.alert('Error: ' + m); else Alert.alert('Error', m);
    }
    setAssigningId(null);
  }

  async function handleAuthorizeAccess() {
    if (!studentForm.fullName || !studentForm.admissionId) {
      Alert.alert('Incomplete Entry', 'Full name and Admission ID are required.');
      return;
    }
    setIsProvisioning(true);
    try {
      const cleanId = studentForm.admissionId.trim().toUpperCase();
      const { data: existing } = await supabase.from('students')
        .select('id, user_id').eq('school_id', profile.school_id)
        .eq('admission_number', cleanId).maybeSingle();

      if (existing?.user_id) {
        const { data: u } = await supabase.from('users').select('is_active').eq('id', existing.user_id).maybeSingle();
        if (u?.is_active === true) {
          Alert.alert('✅ Already Claimed', `${studentForm.fullName} has already activated their account. Reset to allow re-registration?`, [
            { text: 'Cancel', style: 'cancel', onPress: () => setIsProvisioning(false) },
            { text: 'Reset Account', style: 'destructive', onPress: async () => {
              try {
                await supabase.from('students').update({ user_id: null }).eq('id', existing.id);
                await supabase.from('users').delete().eq('id', existing.user_id);
                Alert.alert('Reset Complete ✅', `Re-run Stage 2 for ${studentForm.fullName} now.`);
                initializeCommandCenter();
              } catch (e: any) { Alert.alert('Reset Error', e.message); }
              setIsProvisioning(false);
            }}
          ]);
          return;
        }
        if (!u) {
          await supabase.from('students').update({ user_id: null }).eq('id', existing.id);
        } else {
          await supabase.from('users').update({ full_name: studentForm.fullName.trim() }).eq('id', existing.user_id);
          await supabase.from('students').update({ current_class: studentForm.assignedClass }).eq('id', existing.id);
          Alert.alert('Stage 2 Confirmed ✅', `${studentForm.fullName} (ID: ${cleanId}) is ready.\n\nTell the student:\n1. Download EduSalone\n2. Register as "Student / Pupil"\n3. Enter Admission ID: ${cleanId}`);
          setStudentForm({ fullName: '', admissionId: '', assignedClass: '', gender: 'Male', birthDate: '' });
          initializeCommandCenter(); setIsProvisioning(false); return;
        }
      }

      const ghostMail = `ghost_${cleanId}_${Date.now()}@edusalone.internal`;
      const { data: ghost, error: ghostErr } = await supabase.from('users').insert({
        full_name: studentForm.fullName.trim(), email: ghostMail, role: 'Student',
        school_id: profile.school_id, is_active: false
      }).select().single();
      if (ghostErr) throw ghostErr;

      if (existing) {
        await supabase.from('students').update({ user_id: ghost.id, current_class: studentForm.assignedClass }).eq('id', existing.id);
      } else {
        await supabase.from('students').insert({
          user_id: ghost.id, school_id: profile.school_id, admission_number: cleanId,
          current_class: studentForm.assignedClass, report_published: false
        });
      }

      Alert.alert('Stage 2 Complete ✅', `${studentForm.fullName} (ID: ${cleanId}) is authorized.\n\nTell the student:\n1. Download EduSalone\n2. Register as "Student / Pupil"\n3. Enter Admission ID: ${cleanId}`);
      setStudentForm({ fullName: '', admissionId: '', assignedClass: '', gender: 'Male', birthDate: '' });
      initializeCommandCenter();
    } catch (e: any) { Alert.alert('Provisioning Error', e.message); }
    setIsProvisioning(false);
  }

  function audienceLabel(a: string) {
    return ({ teachers: 'all Teachers', secretary: 'the Secretary', bursar: 'the Bursar', staff: 'all Staff', students: 'all Students', parents: 'all Parents', all: 'Everyone' } as any)[a] || a;
  }

  function openDoc(url: string) {
    if (!url) return;
    if (Platform.OS === 'web') window.open(url, '_blank'); else Linking.openURL(url);
  }

  async function loadOfficeInbox() {
    if (!profile?.school_id) return;
    setLoadingInbox(true);
    const { data } = await supabase.from('school_documents')
      .select('*').eq('school_id', profile.school_id)
      .in('audience', ['all', 'staff', 'secretary', 'office'])
      .order('created_at', { ascending: false }).limit(40);
    setOfficeInbox(data || []);
    setLoadingInbox(false);
  }

  async function deleteInboxDoc(id: string) {
    const go = async () => { await supabase.from('school_documents').delete().eq('id', id); setOfficeInbox(prev => prev.filter((d: any) => d.id !== id)); setMyDocs(prev => prev.filter((d: any) => d.id !== id)); };
    if (Platform.OS === 'web') { if (window.confirm('Delete this document permanently?')) go(); return; }
    Alert.alert('Delete document?', 'This removes it permanently.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: go }]);
  }

  async function loadMyDocs() {
    if (!profile?.school_id) return;
    const { data } = await supabase.from('school_documents')
      .select('*').eq('school_id', profile.school_id)
      .order('created_at', { ascending: false }).limit(30);
    setMyDocs(data || []);
  }

  async function sendDocument() {
    const title = docTitle.trim();
    if (!title) { if (Platform.OS === 'web') window.alert('Add a document title first.'); else Alert.alert('Missing title', 'Add a document title first.'); return; }
    if (Platform.OS !== 'web') { Alert.alert('Use the web portal', 'Sending documents is available on the web app for now.'); return; }
    const aud = docAudience;
    const note = docNote.trim();
    const tClass = (aud === 'students' || aud === 'parents') && docTargetClass.trim() ? docTargetClass.trim() : null;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*';
    input.onchange = async () => {
      const file: any = input.files && input.files[0];
      if (!file) return;
      setSendingDoc(true);
      try {
        const safeName = String(file.name).replace(/[^\w.\-]/g, '_');
        const path = `${profile.school_id}/documents/${Date.now()}_${safeName}`;
        const { error: upErr } = await supabase.storage.from('school-materials').upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('school-materials').getPublicUrl(path);
        const ext = (String(file.name).split('.').pop() || '').toLowerCase();
        const ftype = ext === 'pdf' ? 'pdf' : ['doc', 'docx'].includes(ext) ? 'doc' : ['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic'].includes(ext) ? 'image' : 'other';
        const { error: insErr } = await supabase.from('school_documents').insert({
          school_id: profile.school_id, sender_id: profile.id,
          sender_name: profile.full_name || 'School Office', sender_role: profile.role || 'Principal',
          title, note: note || null, file_url: pub.publicUrl, file_name: file.name, file_type: ftype,
          audience: aud, target_class: tClass,
        });
        if (insErr) throw insErr;
        window.alert(`✅ Sent\n"${title}" delivered to ${audienceLabel(aud)}${tClass ? ' (' + tClass + ')' : ''}.`);
        setDocTitle(''); setDocNote(''); setDocTargetClass('');
        loadMyDocs();
      } catch (e: any) { window.alert('Upload failed: ' + (e?.message || e)); }
      setSendingDoc(false);
    };
    input.click();
  }

  async function deleteDocument(id: string) {
    const go = async () => { await supabase.from('school_documents').delete().eq('id', id); setMyDocs(prev => prev.filter(d => d.id !== id)); };
    if (Platform.OS === 'web') { if (window.confirm('Delete this document for all recipients?')) go(); return; }
    Alert.alert('Delete document?', 'Removes it from all recipients.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: go }]);
  }

  async function dispatchAnnouncement() {
    if (!announcement.trim()) return;
    setIsDispatching(true);
    try {
      const prefix = dispatchType === 'Fee Alert' ? 'URGENT FEE REMINDER: ' : 'SCHOOL NOTICE: ';
      const { error } = await supabase.from('school_news').insert({
        school_id: profile.school_id,
        author_name: profile?.full_name ? `Principal ${profile.full_name}` : 'Office of the Principal',
        content: `${prefix}${announcement.trim()}`
      });
      if (error) throw error;
      Alert.alert('Dispatch Successful ✅', 'The announcement is now live for all staff and students.');
      setAnnouncement('');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) { Alert.alert('System Error', 'Transmission failed.'); }
    setIsDispatching(false);
  }

  // ── OFFICIAL LEDGER PDF with school logo ──
  async function generateOfficialLedger() {
    setIsGeneratingRoster(true);
    try {
      const logoHtml = school?.logo_url 
        ? `<img src="${school.logo_url}" style="width:70px; height:70px; border-radius:35px; object-fit:cover;" />`
        : `<div style="width:70px;height:70px;background:${PRIMARY_NAVY};color:white;display:flex;align-items:center;justify-content:center;border-radius:35px;font-size:10px;font-weight:bold;">LOGO</div>`;

      let tableBody = '';
      roster.forEach((s, i) => {
        tableBody += `<tr>
          <td>${i + 1}</td>
          <td style="font-weight:bold;">${s.admission_number || 'N/A'}</td>
          <td style="text-align:left;">${s.users?.full_name?.toUpperCase() || 'STAGED PROFILE'}</td>
          <td>${s.current_class || 'N/A'}</td>
          <td>${s.gender || 'N/A'}</td>
          <td>${s.date_of_birth || 'N/A'}</td>
          <td>${s.users?.phone || 'N/A'}</td>
          <td style="color:${s.users?.is_active ? SUCCESS_GREEN : ACCENT_GOLD};font-weight:bold;">${s.users?.is_active ? 'ACTIVE' : 'PENDING'}</td>
        </tr>`;
      });

      const html = `<html><head><style>
        @page { size: A4; margin: 15mm; }
        body { font-family: Arial, sans-serif; padding: 0; color: #2D3748; }
        .hdr { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid ${PRIMARY_NAVY}; padding-bottom: 20px; margin-bottom: 20px; }
        .school-info { text-align: right; }
        h1 { margin: 0; color: ${PRIMARY_NAVY}; font-size: 20px; text-transform: uppercase; }
        .subtitle { color: #718096; font-size: 12px; margin: 4px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: ${PRIMARY_NAVY}; color: white; padding: 10px 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { border: 1px solid #E2E8F0; padding: 8px; text-align: center; font-size: 10px; }
        tr:nth-child(even) { background: #F7FAFC; }
        .footer { margin-top: 30px; text-align: center; font-size: 9px; color: #A0AEC0; border-top: 1px solid #E2E8F0; padding-top: 10px; }
      </style></head>
      <body>
        <div class="hdr">
          ${logoHtml}
          <div class="school-info">
            <h1>${school?.name || 'School Name'}</h1>
            <p class="subtitle">Official Institutional Bio-Roster Ledger</p>
            <p class="subtitle">Total Students: ${roster.length} | Print Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        <table>
          <thead><tr>
            <th>S/N</th><th>ADMISSION ID</th><th>LEGAL NAME</th><th>CLASS</th>
            <th>GENDER</th><th>D.O.B</th><th>CONTACT</th><th>STATUS</th>
          </tr></thead>
          <tbody>${tableBody}</tbody>
        </table>
        <div class="footer">
          Official Document • Securely Generated by EduSalone on ${new Date().toLocaleString()} • ${school?.name}
        </div>
      </body></html>`;

      if (Platform.OS === 'web') {
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (e) { Alert.alert('Print Error', 'Template rendering failed.'); }
    setIsGeneratingRoster(false);
  }

  async function runAttendanceAlerts() {
    setRunningAlerts(true);
    try {
      const { data, error } = await supabase.rpc('check_attendance_alerts');
      if (error) throw error;
      const { data: notifData } = await supabase.from('principal_notifications')
        .select('*').eq('school_id', profile.school_id)
        .eq('is_read', false).order('created_at', { ascending: false });
      setNotifications(notifData || []);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const msg = `${data ?? 0} alert(s) generated. Scroll up to view them.`;
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Attendance Check Complete', msg);
    } catch (e: any) {
      const m = e.message || 'Could not run attendance check.';
      if (Platform.OS === 'web') window.alert('Error: ' + m); else Alert.alert('Error', m);
    }
    setRunningAlerts(false);
  }
  const handleSecureLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) router.replace('/login');
  };

  const copyInstitutionCode = () => {
    Clipboard.setString(school?.school_code);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Access Key Copied', 'The 6-digit registration code is ready to be shared.');
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY_NAVY} /></View>;

  // ── ROLE GATE: bursar & secretary share this screen but must NOT get principal-only powers ──
  const roleKey = (profile?.role || '').toLowerCase();
  const isRestrictedAdmin = roleKey === 'bursar' || roleKey === 'secretary';
  const canSeePrincipalTools = !isRestrictedAdmin; // principal keeps everything even if role is null/'Principal'

  // Count pending grades for badge
  const pendingCount = pendingReports.filter((r: any) => r.status === 'pending_review').length;

  // Distinct class names (from enrolled students) — used to assign Form Teachers
  const classList = [...new Set(roster.map((s: any) => s.current_class).filter(Boolean))].sort();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY_NAVY} />}
      >
        
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.roleTag}>COMMAND CENTER</Text>
            <Text style={styles.principalName}>{profile?.full_name} 👋</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity style={styles.menuBtn} onPress={() => setDrawerOpen(true)}>
              <Ionicons name="menu" size={24} color={PRIMARY_NAVY} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleSecureLogout}>
              <Ionicons name="power-outline" size={20} color={DANGER_RED} />
            </TouchableOpacity>
          </View>
        </View>

        {section === 'overview' && (<>
        <View style={styles.vaultCard}>
          <View style={styles.row}>
            <Ionicons name="business" size={24} color="#FFF" />
            <Text style={styles.schoolName}>{school?.name}</Text>
          </View>
          <TouchableOpacity style={styles.codeRow} onPress={copyInstitutionCode}>
            <View>
              <Text style={styles.codeLabel}>ACCESS AUTHORIZATION KEY</Text>
              <Text style={styles.codeValue}>{school?.school_code}</Text>
            </View>
            <Ionicons name="copy-outline" size={22} color="#FFF" opacity={0.6} />
          </TouchableOpacity>
          <Text style={styles.vaultHint}>Share this code to link staff and parents to this institution.</Text>
        </View>

        {/* METRICS */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { borderLeftColor: SECONDARY_BLUE }]}>
            <Text style={styles.statVal}>{metrics.students}</Text>
            <Text style={styles.statLab}>Students</Text>
          </View>
          <View style={[styles.statBox, { borderLeftColor: ACCENT_GOLD }]}>
            <Text style={styles.statVal}>{metrics.staff}</Text>
            <Text style={styles.statLab}>Total Staff</Text>
          </View>
          <View style={[styles.statBox, { width: '100%', marginTop: 12, borderLeftColor: SUCCESS_GREEN }]}>
            <Text style={[styles.statVal, { color: SUCCESS_GREEN }]}>SLL {metrics.revenue.toLocaleString()}</Text>
            <Text style={styles.statLab}>Institutional Revenue</Text>
          </View>
        </View>

        {/* ATTENDANCE CHECK RUNNER */}
        <View style={[styles.card, { marginTop: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.cardTitle}>📋 Attendance Check</Text>
            <Text style={{ fontSize: 12, color: '#718096', marginTop: 3 }}>Scan attendance and flag students at risk.</Text>
          </View>
          <TouchableOpacity style={{ backgroundColor: SECONDARY_BLUE, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, minWidth: 110, alignItems: 'center' }} onPress={runAttendanceAlerts} disabled={runningAlerts}>
            {runningAlerts ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 13 }}>Run Check ▶</Text>}
          </TouchableOpacity>
        </View>

        {/* NOTIFICATIONS BANNER */}
        {notifications.length > 0 && (
          <View style={{ margin: 20, marginTop: 0 }}>
            {notifications.map(n => (
              <View key={n.id} style={{ backgroundColor: n.type === 'account_suspended' ? '#FED7D7' : n.type === 'suspension_warning' ? '#FEEBC8' : '#EBF8FF', borderRadius: 14, padding: 16, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: n.type === 'account_suspended' ? '#E53E3E' : n.type === 'suspension_warning' ? '#DD6B20' : '#3182CE', flexDirection: 'row', alignItems: 'flex-start' }}>
                <Ionicons name={n.type === 'account_suspended' ? 'alert-circle' : 'information-circle'} size={20} color={n.type === 'account_suspended' ? '#E53E3E' : '#3182CE'} style={{ marginRight: 10, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '900', fontSize: 13, color: '#1A365D', marginBottom: 3 }}>{n.title}</Text>
                  <Text style={{ fontSize: 12, color: '#4A5568', lineHeight: 18 }}>{n.message}</Text>
                </View>
                <TouchableOpacity onPress={async () => {
                  await supabase.from('principal_notifications').update({ is_read: true }).eq('id', n.id);
                  setNotifications(prev => prev.filter(x => x.id !== n.id));
                }}>
                  <Ionicons name="close-circle" size={20} color="#A0AEC0" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── GRADE REVIEW CENTER ── */}
        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#6B46C1' }]}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>📋 Grade Review Center</Text>
              <Text style={{ fontSize: 12, color: '#718096', marginTop: 3 }}>Review, approve or return grades before printing</Text>
            </View>
            <TouchableOpacity
              style={{ backgroundColor: '#6B46C1', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, position: 'relative' }}
              onPress={() => { setShowReportReview(true); fetchPendingReports(); }}>
              <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 13 }}>Open ▶</Text>
              {pendingCount > 0 && (
                <View style={{ position: 'absolute', top: -6, right: -6, backgroundColor: DANGER_RED, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' }}>
                  <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900' }}>{pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          {pendingReports.length > 0 && (
            <View style={{ backgroundColor: '#FAF5FF', borderRadius: 10, padding: 12, marginTop: 10, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="alert-circle" size={16} color="#6B46C1" style={{ marginRight: 8 }} />
              <Text style={{ color: '#6B46C1', fontWeight: '900', fontSize: 13 }}>
                {pendingReports.length} subject batch{pendingReports.length !== 1 ? 'es' : ''} awaiting your review
              </Text>
            </View>
          )}
        </View>
        </>)}

        {section === 'comms' && (<>
        {/* BROADCASTER — principal only */}
        {canSeePrincipalTools && (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Global Broadcaster</Text>
            <Ionicons name="radio-outline" size={20} color={PRIMARY_NAVY} />
          </View>
          <View style={styles.tabRow}>
            <TouchableOpacity onPress={() => setDispatchType('Notice')} style={[styles.tab, dispatchType === 'Notice' && styles.tabActiveNotice, { marginRight: 10 }]}>
              <Text style={styles.tabTxt}>NOTICE</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDispatchType('Fee Alert')} style={[styles.tab, dispatchType === 'Fee Alert' && styles.tabActiveFees]}>
              <Text style={styles.tabTxt}>FEE ALERT</Text>
            </TouchableOpacity>
          </View>
          <TextInput style={styles.textArea} placeholder="Enter dispatch content for students and staff..." multiline value={announcement} onChangeText={setAnnouncement} />
          <TouchableOpacity style={[styles.mainBtn, { backgroundColor: PRIMARY_NAVY }]} onPress={dispatchAnnouncement} disabled={isDispatching}>
            {isDispatching ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnTxt}>Dispatch Signal</Text>}
          </TouchableOpacity>
        </View>
        )}

        <NoticeBoardManager schoolId={profile?.school_id} />

        {/* ── SEND DOCUMENT (PDF / Word / Image) ── */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>📎 Send Document</Text>
              <Text style={{ fontSize: 12, color: '#718096', marginTop: 3 }}>PDF, Word or image — to staff, students or parents</Text>
            </View>
            <Ionicons name="cloud-upload-outline" size={22} color={PRIMARY_NAVY} />
          </View>

          <TextInput style={styles.input} placeholder="Document title (e.g. Term 2 Fee Structure)" value={docTitle} onChangeText={setDocTitle} />
          <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} placeholder="Short note (optional)" multiline value={docNote} onChangeText={setDocNote} />

          <Text style={{ fontSize: 10, color: '#718096', fontWeight: '900', marginBottom: 8, letterSpacing: 0.5 }}>SEND TO</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 }}>
            {[
              { key: 'teachers', label: 'Teachers' },
              { key: 'secretary', label: 'Secretary' },
              { key: 'bursar', label: 'Bursar' },
              { key: 'staff', label: 'All Staff' },
              { key: 'students', label: 'Students' },
              { key: 'parents', label: 'Parents' },
              { key: 'all', label: 'Everyone' },
            ].map((opt) => {
              const active = docAudience === opt.key;
              return (
                <TouchableOpacity key={opt.key} onPress={() => setDocAudience(opt.key)}
                  style={{ backgroundColor: active ? PRIMARY_NAVY : '#EDF2F7', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8 }}>
                  <Text style={{ color: active ? '#FFF' : '#4A5568', fontWeight: '900', fontSize: 12 }}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {(docAudience === 'students' || docAudience === 'parents') && (
            <TextInput style={styles.input} placeholder="Limit to one class e.g. JSS1 (blank = all classes)" value={docTargetClass} onChangeText={setDocTargetClass} />
          )}

          <TouchableOpacity style={[styles.mainBtn, { backgroundColor: SECONDARY_BLUE, marginTop: 6 }]} onPress={sendDocument} disabled={sendingDoc}>
            {sendingDoc ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnTxt}>📎 Choose File & Send</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowDocs(!showDocs)} style={{ alignItems: 'center', paddingTop: 14 }}>
            <Text style={{ color: SECONDARY_BLUE, fontWeight: '900', fontSize: 13 }}>{showDocs ? '▲ Hide sent documents' : `▼ Sent documents (${myDocs.length})`}</Text>
          </TouchableOpacity>

          {showDocs && (
            <View style={{ marginTop: 12 }}>
              {myDocs.length === 0 ? <Text style={styles.emptyTxt}>No documents sent yet.</Text> :
                myDocs.map((d: any) => (
                  <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                    <Ionicons name={d.file_type === 'image' ? 'image' : d.file_type === 'pdf' ? 'document-text' : 'document'} size={20} color={SECONDARY_BLUE} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: PRIMARY_NAVY }} numberOfLines={1}>{d.title}</Text>
                      <Text style={{ fontSize: 10, color: '#A0AEC0', marginTop: 2 }}>To {audienceLabel(d.audience)}{d.target_class ? ` · ${d.target_class}` : ''} · {new Date(d.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</Text>
                    </View>
                    <TouchableOpacity onPress={() => openDoc(d.file_url)} style={{ backgroundColor: '#EBF8FF', borderRadius: 8, padding: 8 }}>
                      <Ionicons name="open-outline" size={15} color={SECONDARY_BLUE} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteDocument(d.id)} style={{ backgroundColor: '#FEE2E2', borderRadius: 8, padding: 8, marginLeft: 8 }}>
                      <Ionicons name="trash-outline" size={15} color={DANGER_RED} />
                    </TouchableOpacity>
                  </View>
                ))}
            </View>
          )}
        </View>

        {/* ── OFFICE INBOX (received documents) ── */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>📥 Office Inbox</Text>
              <Text style={{ fontSize: 12, color: '#718096', marginTop: 3 }}>Documents sent to the office by staff &amp; parents</Text>
            </View>
            <TouchableOpacity onPress={loadOfficeInbox}><Ionicons name="refresh" size={18} color={PRIMARY_NAVY} /></TouchableOpacity>
          </View>
          {loadingInbox ? <ActivityIndicator color={PRIMARY_NAVY} style={{ marginTop: 12 }} /> :
            officeInbox.length === 0 ? <Text style={styles.emptyTxt}>No documents received yet.</Text> :
            officeInbox.map((d: any) => (
              <View key={d.id} style={{ borderWidth: 1, borderColor: '#EDF2F7', borderRadius: 12, padding: 12, marginTop: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={d.file_type === 'image' ? 'image' : d.file_type === 'pdf' ? 'document-text' : 'document'} size={22} color={SECONDARY_BLUE} style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: PRIMARY_NAVY }} numberOfLines={1}>{d.title}</Text>
                    <Text style={{ fontSize: 10, color: '#A0AEC0', marginTop: 2 }}>{d.sender_name || 'Unknown'}{d.sender_role ? ` (${d.sender_role})` : ''} · To {audienceLabel(d.audience)} · {new Date(d.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                  </View>
                </View>
                {d.note ? <Text style={{ fontSize: 12, color: '#4A5568', marginTop: 6 }}>{d.note}</Text> : null}
                <View style={{ flexDirection: 'row', marginTop: 10 }}>
                  <TouchableOpacity onPress={() => openDoc(d.file_url)} style={{ flex: 1, backgroundColor: SECONDARY_BLUE, borderRadius: 10, padding: 11, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginRight: 8 }}>
                    <Ionicons name="download-outline" size={15} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 13 }}>Open / Download</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteInboxDoc(d.id)} style={{ backgroundColor: '#FEE2E2', borderRadius: 10, padding: 11 }}>
                    <Ionicons name="trash-outline" size={16} color={DANGER_RED} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
        </View>
        </>)}

        {section === 'people' && canSeePrincipalTools && (<>
        {/* ── TOP SCHOLARS (COLLAPSIBLE DROPDOWN) ── */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.rowBetween} onPress={() => setShowTopScholars(!showTopScholars)} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="trophy" size={20} color={ACCENT_GOLD} style={{ marginRight: 10 }} />
              <View>
                <Text style={styles.cardTitle}>Top Scholars · Game Hub</Text>
                <Text style={{ fontSize: 11, color: '#A0AEC0', marginTop: 2 }}>Brain Points Leaderboard</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {topScholars.length > 0 && (
                <View style={{ backgroundColor: ACCENT_GOLD + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginRight: 8 }}>
                  <Text style={{ color: ACCENT_GOLD, fontWeight: '900', fontSize: 11 }}>{topScholars.length} scholars</Text>
                </View>
              )}
              <Ionicons name={showTopScholars ? 'chevron-up' : 'chevron-down'} size={20} color={PRIMARY_NAVY} />
            </View>
          </TouchableOpacity>

          {showTopScholars && (
            <View style={{ marginTop: 12 }}>
              {topScholars.length === 0 ? (
                <Text style={styles.emptyTxt}>Waiting for scores to sync...</Text>
              ) : (
                topScholars.map((s, i) => {
                  let medalColor = '#A0AEC0';
                  if (i === 0) medalColor = '#D69E2E';
                  else if (i === 1) medalColor = '#718096';
                  else if (i === 2) medalColor = '#975A16';
                  return (
                    <View key={s.id} style={styles.leaderRow}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: i < 3 ? medalColor + '25' : '#EDF2F7', borderWidth: i < 3 ? 1.5 : 0, borderColor: medalColor }}>
                        <Text style={{ fontSize: 12, fontWeight: '900', color: i < 3 ? medalColor : '#718096' }}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.leaderName} numberOfLines={1}>{s.users?.full_name}</Text>
                        <Text style={{ fontSize: 10, color: '#A0AEC0', fontWeight: 'bold', marginTop: 1 }}>{s.admission_number || 'No ID'} • {s.current_class || 'N/A'}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.xpText}>{(s.brain_points || 0).toLocaleString()} XP</Text>
                        {i === 0 && <Text style={{ fontSize: 10, color: '#D69E2E' }}>🥇 Top Scholar</Text>}
                        {i === 1 && <Text style={{ fontSize: 10, color: '#718096' }}>🥈 Runner Up</Text>}
                        {i === 2 && <Text style={{ fontSize: 10, color: '#975A16' }}>🥉 Third Place</Text>}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </View>

        {/* STAGE 2 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Authorize Mobile Account</Text>
          <Text style={styles.cardSub}>Stage 2: Provision a digital key for an enrolled student.</Text>
          <TextInput style={styles.input} placeholder="Student Official Full Name" value={studentForm.fullName} onChangeText={(t) => setStudentForm({...studentForm, fullName: t})} />
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1, marginRight: 10 }]} placeholder="ID Number" value={studentForm.admissionId} onChangeText={(t) => setStudentForm({...studentForm, admissionId: t})} />
            <TextInput style={[styles.input, { flex: 0.8 }]} placeholder="Form/Class" value={studentForm.assignedClass} onChangeText={(t) => setStudentForm({...studentForm, assignedClass: t})} />
          </View>
          <TouchableOpacity style={[styles.mainBtn, { backgroundColor: SUCCESS_GREEN }]} onPress={handleAuthorizeAccess} disabled={isProvisioning}>
            {isProvisioning ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnTxt}>Authorize Handover</Text>}
          </TouchableOpacity>
        </View>

        {/* ── ASSIGN TEACHER ROLES: collapsible + searchable ── */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.rowBetween} onPress={() => setShowStaffRoles(!showStaffRoles)} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="people" size={20} color="#6B46C1" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Assign Teacher Roles</Text>
                <Text style={{ fontSize: 11, color: '#A0AEC0', marginTop: 2 }}>Form Teachers verify &amp; approve · Subject Teachers submit</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {staff.length > 0 && (
                <View style={{ backgroundColor: '#EDE9FE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginRight: 8 }}>
                  <Text style={{ color: '#6B46C1', fontWeight: '900', fontSize: 11 }}>{staff.length}</Text>
                </View>
              )}
              <Ionicons name={showStaffRoles ? 'chevron-up' : 'chevron-down'} size={20} color={PRIMARY_NAVY} />
            </View>
          </TouchableOpacity>

          {showStaffRoles && (
            <View style={{ marginTop: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1.5, borderColor: '#EDF2F7', paddingHorizontal: 12, marginBottom: 12 }}>
                <Ionicons name="search" size={16} color="#A0AEC0" />
                <TextInput
                  style={{ flex: 1, paddingVertical: 11, paddingHorizontal: 8, fontSize: 14, color: PRIMARY_NAVY }}
                  placeholder="Search teacher by name..."
                  placeholderTextColor="#A0AEC0"
                  value={staffSearch}
                  onChangeText={setStaffSearch}
                />
                {staffSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setStaffSearch('')}>
                    <Ionicons name="close-circle" size={18} color="#A0AEC0" />
                  </TouchableOpacity>
                )}
              </View>

              {(() => {
                const q = staffSearch.trim().toLowerCase();
                const list = q ? staff.filter((t: any) => (t.full_name || '').toLowerCase().includes(q)) : staff;
                if (staff.length === 0) return <Text style={styles.emptyTxt}>No teachers registered yet.</Text>;
                if (list.length === 0) return <Text style={styles.emptyTxt}>No teacher matches "{staffSearch}".</Text>;
                return (
                  <ScrollView style={{ maxHeight: 420 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {list.map((t: any) => {
                      const isForm = t.teacher_type === 'class' && !!t.assigned_class;
                      const isSubject = t.teacher_type === 'subject';
                      const busy = assigningId === t.id;
                      return (
                        <View key={t.id} style={{ borderWidth: 1, borderColor: '#EDF2F7', borderRadius: 14, padding: 12, marginBottom: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text style={{ fontSize: 14, fontWeight: '800', color: PRIMARY_NAVY }}>{t.full_name || 'Unnamed Teacher'}</Text>
                              <View style={{ alignSelf: 'flex-start', marginTop: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: isForm ? '#F0FFF4' : isSubject ? '#EBF8FF' : '#F7FAFC' }}>
                                <Text style={{ fontSize: 10, fontWeight: '900', color: isForm ? '#276749' : isSubject ? SECONDARY_BLUE : '#A0AEC0' }}>
                                  {isForm ? `★ FORM TEACHER · ${t.assigned_class}` : isSubject ? 'SUBJECT TEACHER' : 'NOT ASSIGNED'}
                                </Text>
                              </View>
                            </View>
                            {busy && <ActivityIndicator size="small" color="#6B46C1" />}
                          </View>

                          <Text style={{ fontSize: 10, color: '#718096', fontWeight: '900', marginTop: 12, marginBottom: 6 }}>SET ROLE:</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                            <TouchableOpacity
                              onPress={() => assignTeacherRole(t.id, 'subject', null)}
                              disabled={busy || isSubject}
                              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isSubject ? SECONDARY_BLUE : '#EBF8FF', borderWidth: 1, borderColor: SECONDARY_BLUE, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 6, marginBottom: 6, opacity: busy ? 0.5 : 1 }}>
                              {isSubject && <Ionicons name="checkmark" size={13} color="#FFF" style={{ marginRight: 4 }} />}
                              <Text style={{ fontSize: 11, fontWeight: '900', color: isSubject ? '#FFF' : SECONDARY_BLUE }}>Subject</Text>
                            </TouchableOpacity>

                            {classList.length === 0 ? (
                              <Text style={{ fontSize: 11, color: '#CBD5E0', fontStyle: 'italic', marginLeft: 4 }}>Form Teacher: enroll students into a class first.</Text>
                            ) : classList.map((cls: any) => {
                              const active = isForm && t.assigned_class === cls;
                              return (
                                <TouchableOpacity
                                  key={cls}
                                  onPress={() => assignTeacherRole(t.id, 'class', cls)}
                                  disabled={busy || active}
                                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: active ? SUCCESS_GREEN : '#F0FFF4', borderWidth: 1, borderColor: active ? SUCCESS_GREEN : '#C6F6D5', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 6, marginBottom: 6, opacity: busy ? 0.5 : 1 }}>
                                  {active && <Ionicons name="checkmark" size={13} color="#FFF" style={{ marginRight: 4 }} />}
                                  <Text style={{ fontSize: 11, fontWeight: '900', color: active ? '#FFF' : '#276749' }}>Form · {cls}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                );
              })()}
            </View>
          )}
        </View>

        {/* ── BIO-ROSTER LEDGER: collapsible + searchable ── */}
        <View style={styles.card}>
          <TouchableOpacity onPress={() => setShowRoster(!showRoster)} activeOpacity={0.7} style={{ alignItems: 'center' }}>
            <Text style={[styles.cardTitle, { textAlign: 'center' }]}>Bio-Roster Ledger</Text>
            <Text style={{ fontSize: 11, color: '#A0AEC0', marginTop: 2 }}>{roster.length} students enrolled · tap to {showRoster ? 'close' : 'open'}</Text>
            <Ionicons name={showRoster ? 'chevron-up' : 'chevron-down'} size={20} color={PRIMARY_NAVY} style={{ marginTop: 4 }} />
          </TouchableOpacity>

          {showRoster && (
            <View style={{ marginTop: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1.5, borderColor: '#EDF2F7', paddingHorizontal: 12, marginRight: 10 }}>
                  <Ionicons name="search" size={16} color="#A0AEC0" />
                  <TextInput
                    style={{ flex: 1, paddingVertical: 11, paddingHorizontal: 8, fontSize: 14, color: PRIMARY_NAVY }}
                    placeholder="Search name, admission ID, or class..."
                    placeholderTextColor="#A0AEC0"
                    value={rosterSearch}
                    onChangeText={setRosterSearch}
                  />
                  {rosterSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setRosterSearch('')}>
                      <Ionicons name="close-circle" size={18} color="#A0AEC0" />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity style={styles.pdfBtn} onPress={generateOfficialLedger} disabled={isGeneratingRoster}>
                  {isGeneratingRoster ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="print" size={16} color="#FFF" />}
                  <Text style={styles.pdfBtnTxt}>PRINT</Text>
                </TouchableOpacity>
              </View>

              {(() => {
                const q = rosterSearch.trim().toLowerCase();
                const filtered = q
                  ? roster.filter((s: any) =>
                      (s.users?.full_name || '').toLowerCase().includes(q) ||
                      (s.admission_number || '').toLowerCase().includes(q) ||
                      (s.current_class || '').toLowerCase().includes(q))
                  : roster;
                if (roster.length === 0) return <Text style={styles.emptyTxt}>No students enrolled yet.</Text>;
                if (filtered.length === 0) return <Text style={styles.emptyTxt}>No match for "{rosterSearch}".</Text>;
                return (
                  <View>
                    <Text style={{ fontSize: 10, color: '#A0AEC0', fontWeight: '900', marginBottom: 8 }}>SHOWING {filtered.length} OF {roster.length}</Text>
                    <ScrollView style={{ maxHeight: 360 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      {filtered.map((std: any) => (
                        <View key={std.id} style={[styles.rosterRow, { flexDirection: 'row', alignItems: 'center' }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.rosterName}>{std.users?.full_name || 'PENDING ACCOUNT'}</Text>
                            <Text style={styles.rosterSub}>{std.admission_number} | {std.current_class} | {std.gender}</Text>
                            <Text style={[styles.statusTag, { color: std.users?.is_active ? SUCCESS_GREEN : ACCENT_GOLD }]}>
                              {std.users?.is_active ? 'CLAIMED ✅' : 'STAGED / WAITING ⏳'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => deleteStudent(std.id, std.users?.full_name || std.admission_number, std.user_id)}
                            disabled={deletingStudentId === std.id}
                            style={{ backgroundColor: '#FEE2E2', borderRadius: 10, padding: 10, marginLeft: 10, alignItems: 'center', justifyContent: 'center' }}>
                            {deletingStudentId === std.id
                              ? <ActivityIndicator size="small" color={DANGER_RED} />
                              : <Ionicons name="trash-outline" size={18} color={DANGER_RED} />}
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                );
              })()}
            </View>
          )}
        </View>
        </>)}

      </ScrollView>

      {/* ── SIDE DRAWER ── */}
      <Modal visible={drawerOpen} animationType="slide" transparent onRequestClose={() => setDrawerOpen(false)}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={styles.drawerPanel}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.drawerProfile}>
                <View style={styles.drawerAvatar}><Ionicons name="business" size={28} color="#FFF" /></View>
                <Text style={styles.drawerName}>{profile?.full_name}</Text>
                <Text style={styles.drawerRole}>{profile?.role || 'Principal'} • {school?.name}</Text>
              </View>
              <ScrollView style={{ flex: 1 }}>
                {([
                  { key: 'overview', label: 'Overview', icon: 'grid' },
                  { key: 'comms', label: 'Comms & Docs', icon: 'megaphone' },
                  { key: 'people', label: 'People', icon: 'people' },
                ] as any[]).filter((s: any) => canSeePrincipalTools || s.key !== 'people').map((s: any) => {
                  const active = section === s.key;
                  return (
                    <TouchableOpacity key={s.key} onPress={() => { setSection(s.key); setDrawerOpen(false); }} style={[styles.drawerItem, active && { backgroundColor: '#EBF2FB' }]}>
                      <Ionicons name={s.icon} size={20} color={active ? PRIMARY_NAVY : '#718096'} style={{ marginRight: 12 }} />
                      <Text style={[styles.drawerItemTxt, active && { color: PRIMARY_NAVY }]}>{s.label}</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity onPress={handleSecureLogout} style={[styles.drawerItem, { marginTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
                  <Ionicons name="power-outline" size={20} color={DANGER_RED} style={{ marginRight: 12 }} />
                  <Text style={[styles.drawerItemTxt, { color: DANGER_RED }]}>Logout</Text>
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          </View>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={() => setDrawerOpen(false)} />
        </View>
      </Modal>

      {/* FAB MESSENGER */}
      {profile && (
        <TouchableOpacity style={[styles.fab, { backgroundColor: PRIMARY_NAVY }]} onPress={() => setIsMessengerOpen(true)}>
          <Ionicons name="chatbubbles" size={30} color="#FFF" />
          {unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>}
        </TouchableOpacity>
      )}

      {/* FAB ASK-AI */}
      {profile && (
        <TouchableOpacity
          style={{ position: 'absolute', bottom: 104, right: 25, width: 56, height: 56, borderRadius: 28, backgroundColor: '#6B46C1', justifyContent: 'center', alignItems: 'center', elevation: 8 }}
          onPress={() => setIsAIOpen(true)}>
          <Ionicons name="sparkles" size={28} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* ASK-AI MODAL */}
      <Modal visible={isAIOpen} animationType="slide" onRequestClose={() => setIsAIOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          <TouchableOpacity onPress={() => setIsAIOpen(false)} style={{ padding: 14, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={24} color={PRIMARY_NAVY} />
            <Text style={{ color: PRIMARY_NAVY, fontWeight: '900', fontSize: 16, marginLeft: 8 }}>Back</Text>
          </TouchableOpacity>
          <AskAI themeColor={PRIMARY_NAVY} />
        </SafeAreaView>
      </Modal>

      {/* MESSENGER MODAL */}
      <Modal visible={isMessengerOpen} animationType="slide">
        <View style={{ flex: 1 }}>
          <View style={[styles.modalHead, { backgroundColor: PRIMARY_NAVY }]}>
            <TouchableOpacity onPress={() => setIsMessengerOpen(false)} style={styles.row}>
              <Ionicons name="chevron-down" size={32} color="#FFF" />
              <Text style={styles.modalTitle}>Institutional Messenger</Text>
            </TouchableOpacity>
          </View>
          <ChatTab />
        </View>
      </Modal>

      {/* ── GRADE REVIEW MODAL ── */}
      <Modal visible={showReportReview} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          <View style={{ backgroundColor: PRIMARY_NAVY, padding: 20, flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setShowReportReview(false)} style={{ marginRight: 15 }}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900' }}>Grade Review Center</Text>
              <Text style={{ color: '#90CDF4', fontSize: 12, marginTop: 2 }}>{school?.name}</Text>
            </View>
            <TouchableOpacity onPress={fetchPendingReports} style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="refresh" size={14} color="#FBD38D" style={{ marginRight: 4 }} />
              <Text style={{ color: '#FBD38D', fontWeight: '900', fontSize: 12 }}>{pendingReports.length} batches</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: 20 }} showsVerticalScrollIndicator={false}>
            {loadingReports ? (
              <View style={{ alignItems: 'center', marginTop: 80 }}>
                <ActivityIndicator size="large" color={PRIMARY_NAVY} />
                <Text style={{ color: '#A0AEC0', marginTop: 12 }}>Loading submitted grades...</Text>
              </View>
            ) : pendingReports.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 80 }}>
                <Ionicons name="checkmark-done-circle" size={70} color="#CBD5E0" />
                <Text style={{ color: '#A0AEC0', fontSize: 16, fontWeight: 'bold', marginTop: 15, textAlign: 'center' }}>All grades reviewed</Text>
                <Text style={{ color: '#CBD5E0', fontSize: 13, marginTop: 6, textAlign: 'center' }}>No pending submissions from Form Teachers</Text>
                <TouchableOpacity onPress={fetchPendingReports} style={{ marginTop: 20, backgroundColor: PRIMARY_NAVY, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 }}>
                  <Text style={{ color: '#FFF', fontWeight: '900' }}>🔄 Refresh</Text>
                </TouchableOpacity>
              </View>
            ) : (
              pendingReports.map((batch: any, idx: number) => (
                <View key={idx} style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginBottom: 14, borderLeftWidth: 4, borderLeftColor: batch.status === 'pending_review' ? '#6B46C1' : '#38A169', elevation: 2 }}>
                  {/* Status badge */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: '900', color: PRIMARY_NAVY }}>{batch.subject}</Text>
                      <Text style={{ color: '#718096', fontSize: 13, marginTop: 2 }}>{batch.term} • {batch.academic_year}</Text>
                      <Text style={{ color: '#A0AEC0', fontSize: 11, marginTop: 2 }}>
                        Teacher: {batch.teacher_name} • Reviewed by: {batch.reviewer_name}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: batch.status === 'pending_review' ? '#FAF5FF' : '#F0FFF4', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' }}>
                      <Text style={{ color: batch.status === 'pending_review' ? '#6B46C1' : '#38A169', fontWeight: '900', fontSize: 11 }}>
                        {batch.status === 'pending_review' ? '⏳ PENDING' : '✅ REVIEWED'}
                      </Text>
                      <Text style={{ color: '#A0AEC0', fontSize: 10, marginTop: 2 }}>{batch.count} students</Text>
                    </View>
                  </View>

                  {/* Student grades table */}
                  <View style={{ backgroundColor: '#F7FAFC', borderRadius: 10, padding: 10, marginBottom: 14 }}>
                    {/* Table Header */}
                    <View style={{ flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 4, backgroundColor: '#1A365D', borderRadius: 8, marginBottom: 6 }}>
                      <Text style={{ width: 24, fontSize: 9, color: '#FFF', fontWeight: '900' }}>#</Text>
                      <Text style={{ flex: 2, fontSize: 9, color: '#FFF', fontWeight: '900' }}>STUDENT</Text>
                      <Text style={{ width: 28, fontSize: 9, color: '#FBD38D', fontWeight: '900', textAlign: 'center' }}>T1</Text>
                      <Text style={{ width: 28, fontSize: 9, color: '#FBD38D', fontWeight: '900', textAlign: 'center' }}>T2</Text>
                      <Text style={{ width: 28, fontSize: 9, color: '#FBD38D', fontWeight: '900', textAlign: 'center' }}>EX</Text>
                      <Text style={{ width: 32, fontSize: 9, color: '#90CDF4', fontWeight: '900', textAlign: 'center' }}>TOT</Text>
                      <Text style={{ width: 28, fontSize: 9, color: '#68D391', fontWeight: '900', textAlign: 'center' }}>GRD</Text>
                      <Text style={{ width: 28, fontSize: 9, color: '#F6AD55', fontWeight: '900', textAlign: 'center' }}>RNK</Text>
                    </View>
                    {batch.students.map((s: any, i: number) => {
                      const isFail = s.grade === 'F9' || s.grade === '6';
                      return (
                        <View key={i} style={{ flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: '#EDF2F7', backgroundColor: i % 2 === 0 ? '#FFF' : '#F7FAFC', borderRadius: 4 }}>
                          <Text style={{ width: 24, fontSize: 10, color: '#A0AEC0', fontWeight: 'bold' }}>{i + 1}</Text>
                          <View style={{ flex: 2 }}>
                            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#2D3748' }} numberOfLines={1}>{s.name}</Text>
                            <Text style={{ fontSize: 9, color: '#A0AEC0' }}>{s.admission}</Text>
                          </View>
                          <Text style={{ width: 28, fontSize: 11, color: '#4A5568', fontWeight: 'bold', textAlign: 'center' }}>{s.test1 ?? '-'}</Text>
                          <Text style={{ width: 28, fontSize: 11, color: '#4A5568', fontWeight: 'bold', textAlign: 'center' }}>{s.test2 ?? '-'}</Text>
                          <Text style={{ width: 28, fontSize: 11, color: '#4A5568', fontWeight: 'bold', textAlign: 'center' }}>{s.exam ?? '-'}</Text>
                          <Text style={{ width: 36, fontSize: 15, color: isFail ? '#E53E3E' : '#1A365D', fontWeight: '900', textAlign: 'center' }}>{s.score ?? '-'}</Text>
                          <View style={{ width: 28, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 10, fontWeight: '900', color: isFail ? '#E53E3E' : '#718096' }}>{s.grade ?? '-'}</Text>
                          </View>
                          <Text style={{ width: 28, fontSize: 10, color: '#DD6B20', fontWeight: '900', textAlign: 'center' }}>{s.rank ?? '-'}</Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity
                      style={{ flex: 2, backgroundColor: SUCCESS_GREEN, borderRadius: 12, padding: 14, alignItems: 'center', marginRight: 10, flexDirection: 'row', justifyContent: 'center' }}
                      onPress={() => approveAllGrades(batch.subject, batch.term, batch.academic_year)}>
                      <Ionicons name="checkmark-circle" size={18} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 14 }}>Approve & Print</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: DANGER_RED, borderRadius: 12, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
                      onPress={() => returnGradesToFormTeacher(batch.subject, batch.term, batch.academic_year)}>
                      <Ionicons name="arrow-undo" size={18} color="#FFF" style={{ marginRight: 4 }} />
                      <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 13 }}>Return</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25 },
  roleTag: { fontSize: 10, fontWeight: '900', color: '#718096', letterSpacing: 2 },
  principalName: { fontSize: 20, fontWeight: '900', color: PRIMARY_NAVY },
  logoutBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  vaultCard: { backgroundColor: PRIMARY_NAVY, margin: 20, padding: 25, borderRadius: 28, elevation: 12 },
  schoolName: { color: '#FFF', fontSize: 18, fontWeight: '900', marginLeft: 12 },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 15, backgroundColor: 'rgba(255,255,255,0.1)', padding: 15, borderRadius: 18 },
  codeLabel: { color: '#FFF', fontSize: 9, fontWeight: '900', opacity: 0.6, letterSpacing: 1 },
  codeValue: { color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: 5 },
  vaultHint: { color: '#FFF', fontSize: 11, opacity: 0.7, fontStyle: 'italic' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 25 },
  statBox: { backgroundColor: '#FFF', width: '48%', padding: 20, borderRadius: 20, borderLeftWidth: 5, elevation: 3 },
  statVal: { fontSize: 22, fontWeight: '900', color: '#1E293B' },
  statLab: { fontSize: 11, color: '#64748B', fontWeight: 'bold', marginTop: 2 },
  card: { backgroundColor: '#FFF', margin: 20, marginTop: 0, padding: 22, borderRadius: 24, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  cardTitle: { fontSize: 17, fontWeight: '900', color: PRIMARY_NAVY },
  cardSub: { fontSize: 12, color: '#64748B', marginVertical: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  tabRow: { flexDirection: 'row', marginVertical: 12 },
  tab: { flex: 1, padding: 10, borderRadius: 10, backgroundColor: '#F8FAFC', alignItems: 'center' },
  tabActiveNotice: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: DANGER_RED },
  tabActiveFees: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: ACCENT_GOLD },
  tabTxt: { color: PRIMARY_NAVY, fontWeight: '900', fontSize: 10 },
  textArea: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 15, height: 100, textAlignVertical: 'top', fontSize: 15, fontWeight: '600', color: PRIMARY_NAVY },
  mainBtn: { padding: 18, borderRadius: 18, alignItems: 'center', marginTop: 15 },
  btnTxt: { color: '#FFF', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
  leaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  leaderName: { fontWeight: '700', color: '#4A5568', fontSize: 14 },
  xpText: { fontWeight: '900', color: ACCENT_GOLD, fontSize: 13 },
  input: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, fontSize: 16, fontWeight: '700', color: PRIMARY_NAVY, borderWidth: 1.5, borderColor: '#EDF2F7', marginBottom: 12 },
  pdfBtn: { backgroundColor: SECONDARY_BLUE, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  pdfBtnTxt: { color: '#FFF', fontSize: 10, fontWeight: '900', marginLeft: 8 },
  rosterRow: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rosterName: { fontSize: 15, fontWeight: '800', color: PRIMARY_NAVY },
  rosterSub: { fontSize: 12, color: '#64748B', marginTop: 3 },
  statusTag: { fontSize: 9, fontWeight: '900', marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center' },
  fab: { position: 'absolute', bottom: 30, right: 25, width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: DANGER_RED, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  modalHead: { padding: 20, paddingTop: 50 },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginLeft: 15 },
  emptyTxt: { textAlign: 'center', color: '#CBD5E0', fontSize: 12, marginVertical: 15 },
  sectionNav: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginBottom: 16, gap: 8 },
  sectionTab: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  sectionTabActive: { backgroundColor: PRIMARY_NAVY, borderColor: PRIMARY_NAVY },
  sectionTabTxt: { fontSize: 13, fontWeight: '900', color: PRIMARY_NAVY },
  menuBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EDF2F7', alignItems: 'center', justifyContent: 'center' },
  drawerPanel: { width: 280, backgroundColor: '#FFF' },
  drawerProfile: { backgroundColor: PRIMARY_NAVY, padding: 20, paddingTop: 40 },
  drawerAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  drawerName: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  drawerRole: { color: '#90CDF4', fontSize: 12, marginTop: 2 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
  drawerItemTxt: { fontSize: 15, fontWeight: '900', color: '#4A5568' },
});
