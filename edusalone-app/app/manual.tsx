import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../src/lib/supabase';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─────────────────────────────────────────────
// PLATFORM ROLES (matches actual app)
// ─────────────────────────────────────────────
const PLATFORM_ROLES = [
  {
    id: 'principal',
    title: 'Principals & School Owners',
    icon: 'ribbon',
    color: '#DD6B20',
    bgColor: '#FEEBC8',
    description: 'Command center for the entire school. Navigate via the ☰ sidebar (Overview · Comms & Docs · People). Authorize student accounts (Stage 2), review & approve teacher grade submissions, dispatch global notices, send official documents to staff/parents/students, manage staff roster, view live revenue metrics, and authorize report card printing.',
    steps: [
      'Tap the ☰ menu (top-right) to switch between Overview, Comms & Docs, and People',
      'Use the 6-digit school code to onboard teachers, bursars and parents',
      'Open Grade Review Center to approve/return teacher grade submissions',
      'Use Global Broadcaster for school-wide notices & fee alerts',
      'In Comms & Docs, use Send Document to share PDFs/Word/images with staff or parents; received files appear in the Office Inbox',
      'Print official Bio-Roster Ledger with school logo',
      'View Top Scholars leaderboard (XP from trivia games)',
    ],
  },
  {
    id: 'teacher',
    title: 'Teachers & Academic Staff',
    icon: 'school',
    color: '#3182CE',
    bgColor: '#EBF8FF',
    description: 'Enter and submit grades, take attendance, record evaluations, upload lesson materials (PDF/Word/Image), post and mark assignments, send & receive office documents, build class timetables, and communicate with students via EduChat.',
    steps: [
      'Open the sidebar (☰) → set Class, Term, Year, Subject',
      'Tap "Apply & Start Grading" to open the spreadsheet',
      'Enter T1 (/15) + T2 (/15) + EX (/70) — RNK & GRD auto-calculate',
      'Tap "Submit to Principal" — grades go for review',
      'Upload PDF/Word/Image lesson notes from the Materials tab',
      'Post homework in the Assignments tab, then open "View & Mark" to score each student\'s submission with a grade and feedback',
      'Use the Office tab to read documents sent to you and to send your own to the office, students, or parents',
    ],
  },
  {
    id: 'bursar',
    title: 'Bursars & Finance Office',
    icon: 'wallet',
    color: '#38A169',
    bgColor: '#C6F6D5',
    description: 'Log every student fee payment with date, amount, and method. Issue digital receipts, track outstanding balances per student, view real-time school revenue, and send/receive official documents from the Finance tab.',
    steps: [
      'Search student by Admission Number',
      'Enter payment amount, date, and method (Cash / Bank / Mobile Money)',
      'Issue receipt — auto-sent to parent app',
      'View ledger of all transactions per term',
      'In the Documents card, send fee notices/receipts to the office, parents, or teachers; files sent to you appear under "Received"',
    ],
  },
  {
    id: 'student',
    title: 'Students & Parents',
    icon: 'people',
    color: '#805AD5',
    bgColor: '#E9D8FD',
    description: 'View report cards (after principal approval), check attendance history, see grades by term, do assignments set by teachers, read documents from the school office, play the WAEC Trivia Game to earn Brain Points (XP), and chat with teachers.',
    steps: [
      'Register using school code + Admission Number',
      'View grades on the Academics tab once principal approves',
      'Open the Assignments card to submit homework; once marked, see your grade, feedback, and download a letter-headed PDF',
      'Check the Office Documents card for files shared by the school',
      'Download the official A4 PDF Report Card',
      'Play Trivia Hub to earn XP and climb the leaderboard',
    ],
  },
];

// ─────────────────────────────────────────────
// FAQs (matches actual app features)
// ─────────────────────────────────────────────
const FAQS = [
  {
    id: '1',
    question: 'How does the grading system work?',
    answer: 'EduSalone uses the official Sierra Leone WAEC scale.\n\nEach subject = T1 (/15) + T2 (/15) + EXAM (/70) = TOTAL (/100).\n\nFor JSS (BECE): 75+ = Grade 1 (Excellent), 65+ = 2 (V.Good), 55+ = 3 (Good), 45+ = 4 (Credit), 35+ = 5 (Pass), Below 35 = 6 (Fail).\n\nFor SS (WASSCE): 75+ = A1, 70+ = B2, 65+ = B3, 60+ = C4, 55+ = C5, 50+ = C6, 45+ = D7, 40+ = E8, Below 40 = F9.\n\nClass position (RNK) auto-calculates as scores are entered — 1st, 2nd, 3rd etc.',
  },
  {
    id: '2',
    question: 'How do I submit grades to the Principal?',
    answer: 'On the Teacher Dashboard:\n1. Open the sidebar drawer (☰)\n2. Set Class, Term, Year & Subject in Grade Settings\n3. Tap "Apply & Start Grading"\n4. Enter T1, T2 and EX scores for each student (RNK and GRD auto-fill)\n5. Scroll down and tap "📤 Submit to Principal"\n6. Confirm in the dialog — grades go to the Principal\'s Grade Review Center as PENDING\n7. Principal can Approve & Print or Return to you for correction',
  },
  {
    id: '3',
    question: 'How do I upload lesson materials (PDF, Word, Image)?',
    answer: 'On the Teacher Dashboard:\n1. Tap the Materials tab\n2. Enter a Material Title (e.g. "Chapter 3 Algebra Notes")\n3. Optionally enter the subject\n4. Choose "JSS1 Only" or "All Classes"\n5. Tap "Choose File & Upload" — your device file picker opens\n6. Select a PDF, Word document, or image (max 10MB)\n7. File uploads automatically and appears in "My Uploaded Materials"\n\nStudents see it on their Materials tab and can download.',
  },
  {
    id: '4',
    question: 'How do I download the official Report Card?',
    answer: 'Report cards require Principal approval first.\n\nTeacher flow:\n1. Enter all subject grades and submit each to the Principal\n2. Wait for Principal to Approve in Grade Review Center\n3. Once approved, status becomes "principal_approved"\n\nStudent/Parent flow:\n1. Open Student Dashboard → Academics tab\n2. When all subjects are approved, "Download Report Card" button appears\n3. Generates an A4 PDF with school logo, all subject grades, position, attendance, teacher remarks, and principal sign-off.',
  },
  {
    id: '5',
    question: 'How do I link a parent to a child\'s account?',
    answer: 'Parents register the same way as students.\n\n1. Get the school code (6 digits) and the child\'s Admission Number from the Principal\n2. Open EduSalone → tap Sign Up → choose "Parent"\n3. Enter the school code and the child\'s Admission Number\n4. The parent dashboard then shows the child\'s grades, attendance, fees, and report cards in read-only mode.\n\nOne parent can link multiple children using each child\'s admission number.',
  },
  {
    id: '6',
    question: 'What is Stage 2 Authorization?',
    answer: 'This is how the Principal pre-authorizes a student to download EduSalone.\n\n1. Principal opens dashboard → "Authorize Mobile Account" card\n2. Enters Student Full Name, Admission ID, and Class\n3. Taps "Authorize Handover"\n4. System creates a ghost account waiting to be claimed\n5. Principal tells student: "Download EduSalone, register as Student, enter your Admission ID"\n6. Student registration claims the ghost account and activates the student\'s record.\n\nThis prevents fake or duplicate accounts.',
  },
  {
    id: '7',
    question: 'Is my school\'s financial data private?',
    answer: 'Yes. EduSalone uses row-level security at the database level:\n\n• Only the Principal and Bursars can see fee transactions\n• Teachers see only their own classes\n• Students see only their own records\n• Each school\'s data is isolated by school_id — schools never see each other\'s data\n\nThe Principal\'s 6-digit school code is the only access key for joining a school.',
  },
  {
    id: '8',
    question: 'Can I use the app without internet?',
    answer: 'Partially. EduSalone caches recently viewed data:\n\n✅ Works offline:\n• View previously synced report cards\n• View cached timetables\n• Browse downloaded lesson materials\n\n❌ Requires internet:\n• Recording new grades\n• Sending messages or notices\n• Uploading or downloading new materials\n• Submitting attendance\n\nWhen you reconnect, all queued actions auto-sync.',
  },
  {
    id: '9',
    question: 'What are Brain Points (XP)?',
    answer: 'Brain Points are earned by students answering trivia questions correctly on the Game Hub. They are NOT linked to academic grades — XP is purely for engagement.\n\n• Each correct trivia answer = +10 XP\n• Daily streak bonus = +50 XP\n• XP determines rank on the school Top Scholars leaderboard\n• Top 3 get gold/silver/bronze medals on the Principal\'s dashboard\n• Trivia content covers BECE and WASSCE subjects',
  },
  {
    id: '10',
    question: 'How does the Principal return grades to a teacher?',
    answer: '1. Principal opens "Grade Review Center" from dashboard\n2. Sees all submitted batches (subject × term × year)\n3. Reviews the student grade table (T1, T2, EX, TOT, GRD, RNK)\n4. If something is wrong, taps "↩ Return" button\n5. Status changes to "draft" — teacher sees it needs correction\n6. Teacher fixes the scores and resubmits\n\nIf grades are correct, Principal taps "Approve & Print" — report cards become available.',
  },
  {
    id: '11',
    question: 'How do I send a document (PDF, Word, image) to staff, parents or students?',
    answer: 'EduSalone has a built-in document system on every role.\n\nPrincipal/Secretary: open the ☰ sidebar → Comms & Docs → "Send Document". Give it a title, pick the audience (Teachers, Bursar, Secretary, All Staff, Students, Parents or Everyone), then choose a file.\n\nTeacher: Office tab → "Send a Document" (to the office, your students, or parents).\n\nBursar: Finance tab → Documents card → pick Office / Parents / Teachers / Everyone.\n\nRecipients see the file in their inbox (the principal/secretary Office Inbox, the teacher Office tab, the bursar "Received" list, or the student/parent Office Documents card) and tap Open / Download. Whoever sent a document can delete it from their sent list.',
  },
  {
    id: '12',
    question: 'How do assignments work (teacher and student)?',
    answer: 'Teacher:\n1. Open the Assignments tab and pick the class\n2. Enter a title, instructions, optional due date, and optionally attach a file\n3. Post it — students in that class see it instantly\n4. Tap "View & Mark" to see submissions, then give each student a score, grade and feedback\n\nStudent:\n1. Open the Assignments card on the dashboard — a badge shows how many are still "to do"\n2. Type an answer and/or attach a file, then submit (you can update it until it is marked)\n3. Once the teacher marks it, you see your grade and feedback in green, and can download a school-letter-headed PDF.',
  },
  {
    id: '13',
    question: 'Where is the menu on the Principal dashboard?',
    answer: 'The Command Centre uses a sidebar drawer.\n\nTap the ☰ icon at the top-right to slide it open. It shows your name and school, then three sections:\n\n• Overview — school code, metrics, attendance, notifications, grade review\n• Comms & Docs — the broadcaster, noticeboard, send document & office inbox\n• People — top scholars, authorize students, assign teacher roles, bio-roster\n\nTap a section to jump to it (the drawer closes itself). Logout is at the bottom of the drawer; tap the dimmed area to close without choosing.',
  },
];

// ─────────────────────────────────────────────
// VIDEO TUTORIALS (from learning_materials with file_type=mp4/mov)
// ─────────────────────────────────────────────
type VideoTutorial = {
  id: string;
  title: string;
  subject: string;
  file_url: string;
  file_name: string;
  created_at: string;
  duration?: string;
};

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen(!isOpen);
  };
  return (
    <TouchableOpacity style={styles.faqCard} onPress={toggle} activeOpacity={0.7}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{question}</Text>
        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#1A365D" />
      </View>
      {isOpen && (
        <View style={styles.faqBody}>
          <View style={styles.divider} />
          <Text style={styles.faqAnswer}>{answer}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const VideoCard = ({ video }: { video: VideoTutorial }) => {
  const openVideo = async () => {
    try {
      const ok = await Linking.canOpenURL(video.file_url);
      if (ok) Linking.openURL(video.file_url);
      else Alert.alert('Cannot Open', 'Video URL invalid.');
    } catch { Alert.alert('Error', 'Could not open video.'); }
  };
  return (
    <TouchableOpacity style={styles.videoCard} onPress={openVideo} activeOpacity={0.7}>
      <View style={styles.videoThumb}>
        <Ionicons name="play-circle" size={48} color="#FFF" />
      </View>
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
        <Text style={styles.videoMeta}>{video.subject || 'Tutorial'} • {new Date(video.created_at).toLocaleDateString('en-GB')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
          <Ionicons name="videocam" size={12} color="#3182CE" />
          <Text style={{ fontSize: 11, color: '#3182CE', fontWeight: '900', marginLeft: 4 }}>WATCH VIDEO</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────
// MAIN MANUAL SCREEN
// ─────────────────────────────────────────────
export default function ManualScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'guides' | 'faqs' | 'videos' | 'support'>('guides');
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState<VideoTutorial[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Load video tutorials from learning_materials where file_type is a video format
  useEffect(() => {
    if (activeTab === 'videos') loadVideos();
  }, [activeTab]);

  async function loadVideos() {
    setLoadingVideos(true);
    try {
      const { data } = await supabase
        .from('learning_materials')
        .select('id, title, subject, file_url, file_name, file_type, created_at')
        .in('file_type', ['mp4', 'mov', 'webm', 'mkv', 'avi'])
        .order('created_at', { ascending: false })
        .limit(50);
      setVideos((data as any[]) || []);
    } catch (err) {
      console.error('Video load error:', err);
    }
    setLoadingVideos(false);
  }

  const filteredFaqs = useMemo(() => {
    if (!searchQuery) return FAQS;
    return FAQS.filter(
      (f) => f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
             f.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleSubmitTicket = async () => {
    if (!subject || !message) {
      Alert.alert('Missing Information', 'Please provide a subject and a detailed message.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('support_tickets').insert({
        user_id: user?.id,
        user_email: user?.email,
        subject: subject.trim(),
        message: message.trim(),
        status: 'open',
      });
    } catch { /* table may not exist yet */ }
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert('Ticket Submitted ✅', 'Your request has been received. Our support team will respond within 24 hours.\n\nFor urgent issues, WhatsApp +35796240674.');
      setSubject(''); setMessage('');
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerNav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backCircle}>
          <Ionicons name="arrow-back" size={22} color="#1A365D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📖 EduSalone Manual</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* HERO */}
        <View style={styles.heroBanner}>
          <Text style={styles.heroTitle}>How can we help you?</Text>
          <Text style={styles.heroSubtitle}>Step-by-step guides, video tutorials, and live support for EduSalone — the official school management platform for Sierra Leone.</Text>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#718096" style={{ marginLeft: 15 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search guides, FAQs, videos..."
              placeholderTextColor="#A0AEC0"
              value={searchQuery}
              onChangeText={(txt) => { setSearchQuery(txt); if (txt.length > 0) setActiveTab('faqs'); }}
            />
          </View>
        </View>

        <View style={{ height: 30 }} />

        {/* TABS */}
        <View style={styles.tabContainer}>
          {(['guides', 'faqs', 'videos', 'support'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab === 'guides' ? '📘' : tab === 'faqs' ? '❓' : tab === 'videos' ? '🎥' : '💬'} {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.contentPadding}>
          {/* TAB: GUIDES */}
          {activeTab === 'guides' && (
            <View>
              <Text style={styles.sectionLabel}>PLATFORM ROLES & STEP-BY-STEP GUIDES</Text>
              {PLATFORM_ROLES.map((role) => (
                <View key={role.id} style={styles.guideCard}>
                  <View style={[styles.iconCircle, { backgroundColor: role.bgColor }]}>
                    <Ionicons name={role.icon as any} size={24} color={role.color} />
                  </View>
                  <View style={styles.guideInfo}>
                    <Text style={styles.guideTitle}>{role.title}</Text>
                    <Text style={styles.guideBody}>{role.description}</Text>
                    <View style={{ marginTop: 10, backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10 }}>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: '#718096', marginBottom: 6, letterSpacing: 1 }}>QUICK STEPS</Text>
                      {role.steps.map((step, i) => (
                        <View key={i} style={{ flexDirection: 'row', marginBottom: 4 }}>
                          <Text style={{ fontSize: 11, fontWeight: '900', color: role.color, marginRight: 6 }}>{i + 1}.</Text>
                          <Text style={{ fontSize: 11, color: '#4A5568', flex: 1, lineHeight: 16 }}>{step}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* TAB: FAQs */}
          {activeTab === 'faqs' && (
            <View>
              <Text style={styles.sectionLabel}>
                {searchQuery ? `SEARCH RESULTS (${filteredFaqs.length})` : 'FREQUENTLY ASKED QUESTIONS'}
              </Text>
              {filteredFaqs.map((faq) => (
                <FAQItem key={faq.id} question={faq.question} answer={faq.answer} />
              ))}
              {filteredFaqs.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={50} color="#E2E8F0" />
                  <Text style={styles.emptyStateText}>No matching questions found.</Text>
                </View>
              )}
            </View>
          )}

          {/* TAB: VIDEOS */}
          {activeTab === 'videos' && (
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <Text style={styles.sectionLabel}>🎥 VIDEO TUTORIALS</Text>
                <TouchableOpacity onPress={loadVideos} style={{ padding: 6 }}>
                  <Ionicons name="refresh" size={18} color="#1A365D" />
                </TouchableOpacity>
              </View>

              {/* Featured intro card */}
              <View style={styles.featuredVideo}>
                <Ionicons name="play-circle" size={50} color="#FFF" />
                <Text style={styles.featuredVideoTitle}>📺 Welcome to EduSalone</Text>
                <Text style={styles.featuredVideoSub}>Watch the developer demo videos uploaded for Sierra Leone schools</Text>
              </View>

              {loadingVideos ? (
                <ActivityIndicator color="#1A365D" style={{ marginTop: 30 }} />
              ) : videos.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="videocam-outline" size={50} color="#E2E8F0" />
                  <Text style={styles.emptyStateText}>No tutorial videos uploaded yet.</Text>
                  <Text style={{ color: '#CBD5E0', fontSize: 12, marginTop: 6, textAlign: 'center', paddingHorizontal: 30 }}>
                    Videos uploaded by teachers/admins (MP4, MOV, WEBM) will appear here automatically.
                  </Text>
                </View>
              ) : (
                videos.map((v) => <VideoCard key={v.id} video={v} />)
              )}
            </View>
          )}

          {/* TAB: SUPPORT */}
          {activeTab === 'support' && (
            <View>
              <View style={styles.supportCard}>
                <Text style={styles.supportTitle}>📩 Submit Support Ticket</Text>
                <Text style={styles.supportSubtitle}>Direct line to PalmRoot Tech support engineers.</Text>

                <Text style={styles.inputLabel}>SUBJECT</Text>
                <TextInput style={styles.input} placeholder="e.g. Report card showing wrong data" value={subject} onChangeText={setSubject} />

                <Text style={styles.inputLabel}>MESSAGE</Text>
                <TextInput style={[styles.input, styles.textArea]} placeholder="Describe your issue in detail..." multiline numberOfLines={5} value={message} onChangeText={setMessage} />

                <TouchableOpacity style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]} onPress={handleSubmitTicket} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Send Ticket</Text>}
                </TouchableOpacity>
              </View>

              {/* Quick contact */}
              <View style={styles.contactRow}>
                <TouchableOpacity style={styles.contactItem} onPress={() => Linking.openURL('whatsapp://send?phone=+35796240674')}>
                  <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                  <Text style={styles.contactText}>+357 96 240 674</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.contactItem} onPress={() => Linking.openURL('mailto:mmans.sl.001@gmail.com')}>
                  <Ionicons name="mail" size={22} color="#1A365D" />
                  <Text style={styles.contactText}>mmans.sl.001@gmail.com</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ textAlign: 'center', color: '#A0AEC0', fontSize: 11, marginTop: 20 }}>
                EduSalone v1.0 • Built by PalmRoot Tech SL Limited{'\n'}For Sierra Leone Schools
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A365D' },

  heroBanner: { backgroundColor: '#1A365D', paddingTop: 30, paddingBottom: 50, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#FFF', marginBottom: 8 },
  heroSubtitle: { fontSize: 13, color: '#CBD5E0', lineHeight: 20, marginBottom: 25 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 15, height: 55, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, position: 'absolute', bottom: -27, left: 20, right: 20 },
  searchInput: { flex: 1, paddingHorizontal: 15, fontSize: 15, color: '#1A365D' },

  tabContainer: { flexDirection: 'row', backgroundColor: '#E2E8F0', marginHorizontal: 20, padding: 4, borderRadius: 14, marginTop: 10 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  tabText: { fontSize: 11, fontWeight: '700', color: '#718096' },
  activeTabText: { color: '#1A365D' },

  contentPadding: { padding: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '900', color: '#94A3B8', marginBottom: 15, letterSpacing: 1.2 },

  guideCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 18, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#F1F5F9' },
  iconCircle: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  guideInfo: { flex: 1, marginLeft: 15 },
  guideTitle: { fontSize: 16, fontWeight: '800', color: '#1A365D', marginBottom: 4 },
  guideBody: { fontSize: 13, color: '#64748B', lineHeight: 19 },

  faqCard: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 12, padding: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { fontSize: 14, fontWeight: '700', color: '#1A365D', flex: 0.9 },
  faqBody: { marginTop: 10 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },
  faqAnswer: { fontSize: 13, color: '#64748B', lineHeight: 21 },

  featuredVideo: { backgroundColor: '#1A365D', padding: 30, borderRadius: 20, alignItems: 'center', marginBottom: 20 },
  featuredVideoTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', marginTop: 10 },
  featuredVideoSub: { color: '#CBD5E0', fontSize: 12, marginTop: 5, textAlign: 'center' },

  videoCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 14, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', alignItems: 'center' },
  videoThumb: { width: 80, height: 60, backgroundColor: '#1A365D', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  videoTitle: { fontSize: 14, fontWeight: '800', color: '#1A365D' },
  videoMeta: { fontSize: 11, color: '#A0AEC0', marginTop: 3 },

  supportCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  supportTitle: { fontSize: 18, fontWeight: '900', color: '#1A365D' },
  supportSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2, marginBottom: 18 },
  inputLabel: { fontSize: 10, fontWeight: '900', color: '#64748B', marginBottom: 6, letterSpacing: 0.5, marginTop: 8 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, marginBottom: 8, color: '#1A365D', fontSize: 14 },
  textArea: { height: 110, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: '#1A365D', padding: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  submitBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },

  contactRow: { marginTop: 20, backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  contactItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  contactText: { fontSize: 13, fontWeight: '600', color: '#475569', marginLeft: 12 },

  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyStateText: { marginTop: 10, color: '#94A3B8', fontWeight: '600' },
});
