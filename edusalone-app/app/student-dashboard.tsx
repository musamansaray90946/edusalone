import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
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
import { supabase } from '../src/lib/supabase';
import ChatTab from './(tabs)/chat';

// ==========================================
// 💡 AUTOMATIC DAILY QUOTES
// ==========================================
const dailyQuotes = [
  "Education is the most powerful weapon which you can use to change the world. 🌍",
  "Success is the sum of small efforts, repeated day in and day out. 💡",
  "Don't stop until you're proud. Your WASSCE/BECE is your stepping stone. 🎓",
  "Failure is simply the opportunity to begin again, this time more intelligently. 🧠",
  "Hard work beats talent when talent doesn't work hard. 💪",
  "The beautiful thing about learning is that no one can take it away from you. 🛡️",
  "Your future is created by what you do today, not tomorrow. ⏳"
];

const praisePhrases = [
  "Genius! You are doing a great job!",
  "Incredible! Keep it up!",
  "Fantastic! You are so smart!",
  "Unbelievable! Wow, amazing work!",
  "Congratulations! That is absolutely correct!",
  "Marvellous! You are truly gifted!",
  "Unimaginable! Your brain is on fire!",
  "Amazing! You are a true scholar!",
  "Brilliant! Nothing can stop you now!",
  "Outstanding! You make Sierra Leone proud!"
];

// ==========================================
// 🧠 INFINITE TRIVIA BANK
// ==========================================
type DifficultyLevel = 'Basic' | 'Hard' | 'Harder' | 'Super Harder';

const triviaBank = [
  { difficulty: 'Basic', subject: "History", question: "In what year did Sierra Leone gain independence?", options: ["1960", "1961", "1962", "1963"], answer: "1961" },
  { difficulty: 'Basic', subject: "Geography", question: "What is the capital city of Sierra Leone?", options: ["Bo", "Kenema", "Makeni", "Freetown"], answer: "Freetown" },
  { difficulty: 'Basic', subject: "Science", question: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], answer: "Mars" },
  { difficulty: 'Basic', subject: "English", question: "Identify the noun: 'The fast dog ran.'", options: ["The", "fast", "dog", "ran"], answer: "dog" },
  { difficulty: 'Basic', subject: "Math", question: "What is 15 + 27?", options: ["32", "42", "45", "35"], answer: "42" },
  { difficulty: 'Basic', subject: "Biology", question: "How many bones are in the adult human body?", options: ["206", "208", "210", "196"], answer: "206" },
  
  { difficulty: 'Hard', subject: "History", question: "Who was the first Prime Minister of Sierra Leone?", options: ["Siaka Stevens", "Milton Margai", "Joseph Momoh", "Tejan Kabbah"], answer: "Milton Margai" },
  { difficulty: 'Hard', subject: "Biology", question: "What is the powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondria", "Chloroplast"], answer: "Mitochondria" },
  { difficulty: 'Hard', subject: "Physics", question: "What is the SI unit of Force?", options: ["Joule", "Newton", "Watt", "Pascal"], answer: "Newton" },
  { difficulty: 'Hard', subject: "Literature", question: "Who wrote 'Romeo and Juliet'?", options: ["Charles Dickens", "William Shakespeare", "Wole Soyinka", "Chinua Achebe"], answer: "William Shakespeare" },
  { difficulty: 'Hard', subject: "Math", question: "What is the square root of 144?", options: ["10", "12", "14", "16"], answer: "12" },

  { difficulty: 'Harder', subject: "ICT", question: "What does HTML stand for?", options: ["Hyper Text Markup Language", "High Tech Modern Language", "Hyperlink Text", "Home Tool Language"], answer: "Hyper Text Markup Language" },
  { difficulty: 'Harder', subject: "Chemistry", question: "What is the chemical symbol for Gold?", options: ["Ag", "Au", "Pb", "Fe"], answer: "Au" },
  { difficulty: 'Harder', subject: "English", question: "What is the synonym for 'Ubiquitous'?", options: ["Rare", "Omnipresent", "Expensive", "Fragile"], answer: "Omnipresent" },
  { difficulty: 'Harder', subject: "Geography", question: "What is the highest peak in Sierra Leone?", options: ["Mount Bintumani", "Mount Kilimanjaro", "Loma Mountains", "Sula Mountains"], answer: "Mount Bintumani" },

  { difficulty: 'Super Harder', subject: "ICT", question: "In public-key cryptography, what is used to encrypt a message that only the recipient can decrypt?", options: ["The sender's private key", "The recipient's private key", "The recipient's public key", "A shared symmetric key"], answer: "The recipient's public key" },
  { difficulty: 'Super Harder', subject: "ICT", question: "What is a SQL injection attack?", options: ["A method to speed up queries", "An attack inserting malicious SQL code", "A way to back up databases", "A virus that corrupts SQL files"], answer: "An attack inserting malicious SQL code" },
  { difficulty: 'Super Harder', subject: "Physics", question: "What is the speed of light in a vacuum?", options: ["300,000 km/s", "150,000 km/s", "1,000,000 km/s", "500,000 km/s"], answer: "300,000 km/s" },
  { difficulty: 'Super Harder', subject: "Biology", question: "What is the rarest blood type among humans?", options: ["O Positive", "A Negative", "B Negative", "AB Negative"], answer: "AB Negative" },
];

const WORD_SCRAMBLE_BANK = ["PHOTOSYNTHESIS", "EQUATION", "GEOGRAPHY", "LITERATURE", "CHEMISTRY", "GRAVITY", "DEMOCRACY", "VOCABULARY", "SYLLABLE", "BIOLOGY", "ACCELERATION"];

const BOSSES = [
  { id: 1, name: 'The Gatekeeper', title: 'Watcher of Fundamentals', maxHP: 50, emoji: '👹', color: '#4299E1', attack: 15, taunts: ['Is that all you got?', 'Too slow!'] },
  { id: 2, name: 'The Spellweaver', title: 'Master of English & Arts', maxHP: 75, emoji: '🧙‍♀️', color: '#9F7AEA', attack: 20, taunts: ['Your vocabulary is weak!', 'Read more!'] },
  { id: 3, name: 'The Calculator', title: 'Lord of Mathematics', maxHP: 100, emoji: '🤖', color: '#ECC94B', attack: 25, taunts: ['Numbers do not lie.', 'Error 404: Intellect not found.'] },
  { id: 4, name: 'The Headmaster', title: 'Supreme Academic Entity', maxHP: 150, emoji: '👾', color: '#F56565', attack: 35, taunts: ['I will expel you!', 'This is the final exam!'] }
];

const getSchoolThemeColor = (schoolName?: string) => {
  const premiumColors = ['#1A365D', '#742A2A', '#276749', '#553C9A', '#9B2C2C', '#285E61', '#9C4221', '#005b96', '#5F370E', '#4A5568'];
  if (!schoolName) return premiumColors[0];
  let hash = 0;
  for (let i = 0; i < schoolName.length; i++) { hash = schoolName.charCodeAt(i) + ((hash << 5) - hash); }
  return premiumColors[Math.abs(hash) % premiumColors.length];
};

function AcademicSummaryCard({ studentId, themeColor }: { studentId: string; themeColor: string }) {
  const [grades, setGrades] = useState<any[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [showGrades, setShowGrades] = useState(false);

  async function loadGrades() {
    if (!studentId) return;
    setLoadingGrades(true);
    const { data } = await supabase.from('academic_records')
      .select('subject, term, academic_year, score, grade, rank, submission_status')
      .eq('student_id', studentId)
      .in('submission_status', ['approved', 'published'])
      .order('subject', { ascending: true });
    if (data) setGrades(data);
    setLoadingGrades(false);
  }

  useEffect(() => { if (studentId) loadGrades(); }, [studentId]);

  const groupedBySubject: any = {};
  grades.forEach(g => {
    if (!groupedBySubject[g.subject]) groupedBySubject[g.subject] = [];
    groupedBySubject[g.subject].push(g);
  });

  return (
    <View style={{ backgroundColor: '#FFF', borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', elevation: 2 }}>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: themeColor }}
        onPress={() => setShowGrades(!showGrades)}>
        <Ionicons name="school" size={20} color="#FFF" style={{ marginRight: 10 }} />
        <Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 15, flex: 1 }}>My Academic Record</Text>
        <Text style={{ color: '#FFF', fontSize: 12, marginRight: 6 }}>{grades.length} entries</Text>
        <Ionicons name={showGrades ? 'chevron-up' : 'chevron-down'} size={18} color="#FFF" />
      </TouchableOpacity>

      {showGrades && (
        loadingGrades ? <ActivityIndicator color={themeColor} style={{ padding: 20 }} /> :
        grades.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Ionicons name="document-outline" size={40} color="#CBD5E0" />
            <Text style={{ color: '#A0AEC0', marginTop: 8, fontStyle: 'italic', textAlign: 'center' }}>No approved grades yet. Check back after your teacher submits.</Text>
          </View>
        ) : (
          <View style={{ padding: 12 }}>
            {Object.keys(groupedBySubject).map(subject => (
              <View key={subject} style={{ marginBottom: 10, backgroundColor: '#F7FAFC', borderRadius: 10, overflow: 'hidden' }}>
                <View style={{ backgroundColor: themeColor + '20', padding: 8, borderLeftWidth: 3, borderLeftColor: themeColor }}>
                  <Text style={{ fontWeight: '900' as any, color: themeColor, fontSize: 13 }}>{subject}</Text>
                </View>
                {groupedBySubject[subject].map((g: any, idx: number) => {
                  const isFail = g.grade === 'F9' || g.grade === '6';
                  return (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', padding: 8, borderBottomWidth: 0.5, borderBottomColor: '#EDF2F7' }}>
                      <Text style={{ flex: 2, fontSize: 11, color: '#718096', fontWeight: 'bold' as any }}>{g.term}</Text>
                      <Text style={{ flex: 1, fontSize: 11, color: '#718096' }}>{g.academic_year}</Text>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, fontWeight: '900' as any, color: isFail ? '#E53E3E' : '#1A365D' }}>{g.score}</Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <View style={{ backgroundColor: isFail ? '#FED7D7' : '#C6F6D5', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 11, fontWeight: '900' as any, color: isFail ? '#E53E3E' : '#276749' }}>{g.grade}</Text>
                        </View>
                      </View>
                      <Text style={{ flex: 1, fontSize: 11, color: '#DD6B20', fontWeight: 'bold' as any, textAlign: 'center' }}>{g.rank || '-'}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )
      )}
    </View>
  );
}

export default function StudentDashboard() {
  const router = useRouter();
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [studentRecord, setStudentRecord] = useState<any>(null);
  const [childName, setChildName] = useState<string>('Loading...');
  const [dailyQuote, setDailyQuote] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [linking, setLinking] = useState(false);
  const [unreadMsgs, setUnreadMsgs] = useState(0); 

  const [news, setNews] = useState<any[]>([]);
  const [worldNews, setWorldNews] = useState<any[]>([]); 
  const [timetable, setTimetable] = useState<any[]>([]); 
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [feesData, setFeesData] = useState<any>({ totalBilled: 0, totalPaid: 0, balance: 0 });
  
  const [activeTab, setActiveTab] = useState<'academics' | 'feed' | 'game' | 'rank' | 'materials'>('academics');
  const [newsTab, setNewsTab] = useState<'school' | 'global'>('school'); 
  const [isMuted, setIsMuted] = useState(false);
  const [brainPoints, setBrainPoints] = useState(0);

  const [activeGame, setActiveGame] = useState<'hub'|'trivia'|'mathblitz'|'bossbattle'|'wordscramble'>('hub');
  const [quizIndex, setQuizIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [streak, setStreak] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [mathActive, setMathActive] = useState(false);
  const [mathGameOver, setMathGameOver] = useState(false);
  const [mathTimeLeft, setMathTimeLeft] = useState(0);
  const [mathScore, setMathScore] = useState(0);
  const [mathInput, setMathInput] = useState('');
  const [mathFeedback, setMathFeedback] = useState('');
  const [mathQ, setMathQ] = useState<any>(null);
  const mathTimerRef = useRef<any>(null);
  const mathInputRef = useRef<TextInput | null>(null);
  const mathScrollRef = useRef<any>(null);

  const [wordActive, setWordActive] = useState(false);
  const [wordGameOver, setWordGameOver] = useState(false);
  const [wordTimeLeft, setWordTimeLeft] = useState(0);
  const [wordScore, setWordScore] = useState(0);
  const [wordInput, setWordInput] = useState('');
  const [wordFeedback, setWordFeedback] = useState('');
  const [currentWord, setCurrentWord] = useState({ original: '', scrambled: '' });
  const wordTimerRef = useRef<any>(null);
  const wordInputRef = useRef<TextInput | null>(null);
  const wordScrollRef = useRef<any>(null);

  const [bossIdx, setBossIdx] = useState(0);
  const [bossHP, setBossHP] = useState(0);
  const [playerHP, setPlayerHP] = useState(100);
  const [bossStarted, setBossStarted] = useState(false);
  const [bossGameOver, setBossGameOver] = useState(false);
  const [totalVictory, setTotalVictory] = useState(false);
  const [bossAnswered, setBossAnswered] = useState(false);
  const [bossQ, setBossQ] = useState<any>(null);
  const [damageFlash, setDamageFlash] = useState('');

  const progressAnimWidth = useRef(new Animated.Value(0)).current;

  const userRole = profile?.role?.toLowerCase().trim() || '';
  const isGamer = userRole === 'public gamer';
  const isParent = userRole === 'parent';

  const activeBoss = BOSSES[bossIdx] || BOSSES[0];
  const themeColor = getSchoolThemeColor(profile?.schools?.name);

  const firstName = profile?.full_name?.split(' ')[0] || 'Student';
  const initials = profile?.full_name ? profile.full_name.substring(0, 2).toUpperCase() : '👤';

  useFocusEffect(
    useCallback(() => {
      setDailyQuote(dailyQuotes[Math.floor(Math.random() * dailyQuotes.length)]);
      fetchDashboardData(); 
      fetchLiveWorldNews(); 
      return () => { 
        if (mathTimerRef.current) clearInterval(mathTimerRef.current); 
        if (wordTimerRef.current) clearInterval(wordTimerRef.current); 
      };
    }, [])
  );

  useEffect(() => {
    if (!profile?.school_id || !studentRecord?.current_class) return;
    const channel = supabase.channel('realtime-timetable')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timetables', filter: `school_id=eq.${profile.school_id}` }, () => {
        fetchTimetable(profile.school_id, studentRecord.current_class);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.school_id, studentRecord?.current_class]);
// ✅ REAL-TIME: Fees + Report Card updates
useEffect(() => {
  if (!studentRecord?.id) return;
  const feeChannel = supabase.channel('realtime-fees-reports')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'fee_transactions',
      filter: `student_id=eq.${studentRecord.id}`
    }, () => { fetchDashboardData(); })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'students',
      filter: `id=eq.${studentRecord.id}`
    }, () => { fetchDashboardData(); })
    .subscribe();
  return () => { supabase.removeChannel(feeChannel); };
}, [studentRecord?.id]);

// ✅ REAL-TIME: Lesson materials updates
useEffect(() => {
  const schoolId = studentRecord?.school_id || profile?.school_id;
  const className = studentRecord?.current_class || 'General';
  if (!schoolId) return;
  const matChannel = supabase.channel('realtime-materials')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'learning_materials',
      filter: `school_id=eq.${schoolId}`
    }, () => { fetchMaterials(schoolId, className); })
    .subscribe();
  return () => { supabase.removeChannel(matChannel); };
}, [profile?.school_id, studentRecord?.school_id, studentRecord?.current_class]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    const medal = getRankDetails(brainPoints);
    Animated.timing(progressAnimWidth, { toValue: medal.progress, duration: 800, useNativeDriver: false }).start();
  }, [brainPoints]);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      const { data: profileData } = await supabase.from('users').select('*, schools(name, logo_url)').eq('email', user.email).single();
      
      if (profileData) {
        setProfile(profileData);
        let query = supabase.from('students').select('*, schools(*)');
        if (profileData.role === 'Student') { query = query.eq('user_id', profileData.id); } 
        else if (profileData.role === 'Parent') { query = query.eq('parent_user_id', profileData.id); }

        const { data: studentData } = await query.maybeSingle();
        const activeSchoolId = studentData?.school_id || profileData.school_id;

        if (studentData) {
          setStudentRecord(studentData);
          setBrainPoints(studentData.brain_points || 0); 
          
          if (profileData.role === 'Parent') {
            const { data: childUser } = await supabase.from('users').select('full_name').eq('id', studentData.user_id).single();
            setChildName(childUser?.full_name || 'Your Child');
          } else { setChildName(profileData.full_name); }

          const expectedFee = Number(studentData.expected_fee) || 0;
          const { data: feeTxs } = await supabase.from('fee_transactions')
            .select('amount_paid_sll, receipt_number, payment_date, payment_method')
            .eq('student_id', studentData.id)
            .order('payment_date', { ascending: false });
          const totalPaid = feeTxs?.reduce((sum, t) => sum + (Number(t.amount_paid_sll) || 0), 0) || 0;
          
          setFeesData({ 
            totalBilled: expectedFee, 
            totalPaid: totalPaid, 
            balance: expectedFee - totalPaid,
            history: feeTxs || []
          });
        } else {
          setChildName(profileData.full_name);
          setBrainPoints(0); 
        }

        const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', profileData.id).eq('is_read', false);
        setUnreadMsgs(msgCount || 0);

        if (activeSchoolId) {
          fetchNews(activeSchoolId);
          fetchLeaderboard(activeSchoolId);
          fetchTimetable(activeSchoolId, studentData?.current_class || 'General');
          fetchMaterials(activeSchoolId, studentData?.current_class || 'General');
        } else if (profileData.role === 'Public Gamer') {
          fetchGlobalLeaderboard();
        }
      }
    } catch (err: any) { console.log('Fetch error caught', err); }
    setLoading(false);
  }

  async function handleLinkChild() {
    if (!linkInput.trim()) { Alert.alert("Input Required", "Please enter your child's Admission Number."); return; }
    setLinking(true);
    try {
      const { data: stdMatch, error: searchError } = await supabase.from('students').select('*').ilike('admission_number', linkInput.trim()).eq('school_id', profile.school_id).maybeSingle();
      if (searchError || !stdMatch) { Alert.alert("Not Found", "No student found with that Admission Number in your school."); } 
      else if (stdMatch.parent_user_id && stdMatch.parent_user_id !== profile.id) { Alert.alert("Already Linked", "This student is already linked to another parent."); } 
      else {
        const { error: updateError } = await supabase.from('students').update({ parent_user_id: profile.id }).eq('id', stdMatch.id);
        if (updateError) throw updateError;
        Alert.alert("Success!", "You have securely linked your child's account."); setLinkInput(''); fetchDashboardData(); 
      }
    } catch (err: any) { Alert.alert("Error", "Could not securely link account at this time."); }
    setLinking(false);
  }

  async function syncXPToDatabase(newXP: number) {
    setBrainPoints(newXP);
    if (studentRecord) {
      await supabase.from('students').update({ brain_points: newXP }).eq('id', studentRecord.id);
      fetchLeaderboard(studentRecord.school_id);
    } else if (isGamer && profile) {
      await supabase.from('users').update({ brain_points: newXP }).eq('id', profile.id);
      fetchGlobalLeaderboard();
    }
  }

  async function fetchLeaderboard(schoolId: string) { 
    const { data: studentsData } = await supabase.from('students').select('user_id, brain_points, users(full_name)').eq('school_id', schoolId).order('brain_points', { ascending: false }).limit(10); 
    if (studentsData) setLeaderboard(studentsData.map((s: any) => ({ user_id: s.user_id, full_name: s.users?.full_name || 'Unknown Student', brain_points: s.brain_points || 0 }))); 
  }
  async function fetchGlobalLeaderboard() { 
    const { data: usersData } = await supabase.from('users').select('id, full_name, brain_points').eq('role', 'Public Gamer').order('brain_points', { ascending: false }).limit(10); 
    if (usersData) setLeaderboard(usersData.map((u: any) => ({ user_id: u.id, full_name: u.full_name, brain_points: u.brain_points || 0 }))); 
  }
  async function fetchTimetable(schoolId: string, className: string) { 
    const { data } = await supabase.from('timetables').select('*').eq('school_id', schoolId).eq('class_name', className).order('created_at', { ascending: true }); 
    if (data) setTimetable(data); 
  }
  async function fetchNews(schoolId: string) { 
    const { data } = await supabase.from('school_news').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(10); 
    if (data) setNews(data); 
  }
  async function fetchMaterials(schoolId: string, className: string) {
    setLoadingMaterials(true);
    const { data } = await supabase.from('learning_materials')
      .select('*')
      .eq('school_id', schoolId)
      .or(`class_name.eq.${className},target.eq.all`)
      .order('created_at', { ascending: false });
    if (data) setMaterials(data);
    setLoadingMaterials(false);
  }

  async function openMaterial(fileUrl: string, fileName: string) {
    if (!fileUrl) { Alert.alert('No File', 'This material has no file link.'); return; }
    try {
      if (Platform.OS === 'web') {
        window.open(fileUrl, '_blank');
      } else {
        const supported = await Linking.canOpenURL(fileUrl);
        if (supported) await Linking.openURL(fileUrl);
        else Alert.alert('Cannot Open', `Unable to open ${fileName}. The file link may be invalid.`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not open the file.');
    }
  }
  async function fetchLiveWorldNews() { 
    try { 
        const response = await fetch('https://api.spaceflightnewsapi.net/v4/articles?limit=5'); const json = await response.json(); 
        if (json.results) setWorldNews(json.results.map((a: any) => ({ id: a.id.toString(), source: a.news_site, title: a.title, date: new Date(a.published_at).toLocaleDateString() }))); 
    } catch (error) { setWorldNews([{ id: '1', source: 'Global News', title: 'Connect to internet to see news.', date: 'Today' }]); } 
  }

  function getRankDetails(points: number) {
    if (points >= 5000) return { rank: "Grandmaster", color: "#805AD5", icon: "diamond", nextTarget: 5000, progress: 100 };
    if (points >= 2500) return { rank: "WASSCE Master", color: "#B794F4", icon: "diamond", nextTarget: 5000, progress: ((points - 2500) / 2500) * 100 };
    if (points >= 1000) return { rank: "Gold Scholar", color: "#D69E2E", icon: "medal", nextTarget: 2500, progress: ((points - 1000) / 1500) * 100 };
    if (points >= 500) return { rank: "Silver Achiever", color: "#A0AEC0", icon: "medal", nextTarget: 1000, progress: ((points - 500) / 500) * 100 };
    if (points >= 100) return { rank: "Bronze Learner", color: "#975A16", icon: "medal", nextTarget: 500, progress: ((points - 100) / 400) * 100 };
    return { rank: "Novice", color: "#718096", icon: "school", nextTarget: 100, progress: (points / 100) * 100 }; 
  }

  function loadNextTrivia() {
    setAnswered(false); setSelectedOption(''); setFeedbackMsg('');
    let targetDiff: DifficultyLevel = 'Basic';
    if (streak >= 10) targetDiff = 'Super Harder'; else if (streak >= 6) targetDiff = 'Harder'; else if (streak >= 3) targetDiff = 'Hard';
    let available = triviaBank.filter(q => q.difficulty === targetDiff);
    if (available.length === 0) available = triviaBank; 
    const randomQ = available[Math.floor(Math.random() * available.length)];
    setQuizIndex(triviaBank.indexOf(randomQ)); 
  }

  async function handleTriviaAnswer(option: string) {
    if (answered || isSpeaking) return; 
    setSelectedOption(option); setAnswered(true); setIsSpeaking(true); 

    const currentQ = triviaBank[quizIndex];
    if (option === currentQ.answer) {
      const newStreak = streak + 1; setStreak(newStreak);
      let multiplier = 1; if (currentQ.difficulty === 'Hard') multiplier = 2; if (currentQ.difficulty === 'Harder') multiplier = 3; if (currentQ.difficulty === 'Super Harder') multiplier = 5;
      const xpGained = 10 * multiplier;
      syncXPToDatabase(brainPoints + xpGained);
      
      const praise = praisePhrases[Math.floor(Math.random() * praisePhrases.length)];
      setFeedbackMsg(`✅ Correct! +${xpGained} XP`);
      if (Platform.OS !== 'web' && !isMuted) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Speech.speak(`Correct, ${firstName}! ${praise}`, { rate: 0.9, onDone: () => setIsSpeaking(false) });
      } else setIsSpeaking(false);
    } else {
      setStreak(0); setFeedbackMsg(`❌ Wrong. Answer: ${currentQ.answer}`);
      if (Platform.OS !== 'web' && !isMuted) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Speech.speak(`Wrong, ${firstName}. The correct answer is ${currentQ.answer}. Try the next one.`, { rate: 0.9, onDone: () => setIsSpeaking(false) });
      } else setIsSpeaking(false);
    }
  }

  function generateMathQuestion() {
    const num1 = Math.floor(Math.random() * 20) + 2; const num2 = Math.floor(Math.random() * 15) + 2;
    if (Math.random() > 0.5) return { question: `${num1} + ${num2}`, answer: num1 + num2 };
    return { question: `${num1} × ${num2}`, answer: num1 * num2 };
  }

  function startMathBlitz() {
    setActiveGame('mathblitz'); if (mathTimerRef.current) clearInterval(mathTimerRef.current);
    setMathActive(true); setMathGameOver(false); setMathTimeLeft(30); setMathScore(0); setMathInput(''); setMathQ(generateMathQuestion());
    setTimeout(() => { if(mathInputRef.current) mathInputRef.current.focus(); }, 300);
    mathTimerRef.current = setInterval(() => {
      setMathTimeLeft(prev => { 
        if (prev <= 1) { clearInterval(mathTimerRef.current!); setMathActive(false); setMathGameOver(true); return 0; } 
        return prev - 1; 
      });
    }, 1000);
  }

  function handleMathSubmit() {
    if (!mathQ || !mathActive) return;
    if (parseInt(mathInput) === mathQ.answer) {
     setMathScore(p => p + 10); setMathFeedback(`✅ +10, Great ${firstName}!`);
      if (Platform.OS !== 'web' && !isMuted) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const praise = praisePhrases[Math.floor(Math.random() * praisePhrases.length)];
        Speech.speak(`${praise}`, { rate: 1.0 });
      }
    } else {
      setMathFeedback(`❌ Was ${mathQ.answer}`);
      if (Platform.OS !== 'web' && !isMuted) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setTimeout(() => { setMathFeedback(''); setMathInput(''); setMathQ(generateMathQuestion()); }, 400);
  }

  const finishMathBlitz = async () => {
    if (mathTimerRef.current) clearInterval(mathTimerRef.current);
    setMathActive(false); setMathGameOver(true);
    if (mathScore > 0) syncXPToDatabase(brainPoints + mathScore);
  }

  function generateWord() {
    const word = WORD_SCRAMBLE_BANK[Math.floor(Math.random() * WORD_SCRAMBLE_BANK.length)];
    const scrambled = word.split('').sort(() => 0.5 - Math.random()).join('');
    return { original: word, scrambled: scrambled };
  }

  function startWordScramble() {
    setActiveGame('wordscramble'); if (wordTimerRef.current) clearInterval(wordTimerRef.current);
    setWordActive(true); setWordGameOver(false); setWordTimeLeft(45); setWordScore(0); setWordInput(''); setCurrentWord(generateWord());
    setTimeout(() => { if(wordInputRef.current) wordInputRef.current.focus(); }, 300);
    wordTimerRef.current = setInterval(() => {
      setWordTimeLeft(prev => { 
        if (prev <= 1) { clearInterval(wordTimerRef.current!); setWordActive(false); setWordGameOver(true); return 0; } 
        return prev - 1; 
      });
    }, 1000);
  }

  function handleWordSubmit() {
    if (!currentWord || !wordActive) return;
    if (wordInput.trim().toUpperCase() === currentWord.original) {
     setWordScore(p => p + 20); setWordFeedback(`✅ +20 XP!`);
      if (Platform.OS !== 'web' && !isMuted) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const praise = praisePhrases[Math.floor(Math.random() * praisePhrases.length)];
        Speech.speak(`${praise} Well done ${firstName}!`, { rate: 0.9 });
      }
    } else {
      setWordFeedback(`❌ It was ${currentWord.original}`);
      if (Platform.OS !== 'web' && !isMuted) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setTimeout(() => { setWordFeedback(''); setWordInput(''); setCurrentWord(generateWord()); }, 600);
  }

  const finishWordScramble = async () => {
    if (wordTimerRef.current) clearInterval(wordTimerRef.current);
    setWordActive(false); setWordGameOver(true);
    if (wordScore > 0) syncXPToDatabase(brainPoints + wordScore);
  }

  function startBossBattle() {
    setActiveGame('bossbattle'); setBossIdx(0); setBossHP(BOSSES[0].maxHP); setPlayerHP(100); setBossStarted(true); setBossGameOver(false); setTotalVictory(false);
    setBossQ(triviaBank[Math.floor(Math.random() * triviaBank.length)]);
  }

  async function handleBossAnswer(option: string) {
    if (bossAnswered) return;
    setBossAnswered(true);
    if (option === bossQ.answer) {
      setBossHP(Math.max(0, bossHP - 25)); setDamageFlash('boss');
      if (Platform.OS !== 'web' && !isMuted) Speech.speak(`Direct hit!`, { rate: 1.1 });
      setTimeout(() => {
        setDamageFlash('');
        if (bossHP - 25 <= 0) {
          if (bossIdx >= BOSSES.length - 1) { setTotalVictory(true); syncXPToDatabase(brainPoints + 500); } 
          else { setBossIdx(bossIdx + 1); setBossHP(BOSSES[bossIdx + 1].maxHP); setPlayerHP(100); setBossAnswered(false); setBossQ(triviaBank[Math.floor(Math.random() * triviaBank.length)]); }
        } else { setBossAnswered(false); setBossQ(triviaBank[Math.floor(Math.random() * triviaBank.length)]); }
      }, 1000);
    } else {
      setPlayerHP(Math.max(0, playerHP - activeBoss.attack)); setDamageFlash('player');
      if (Platform.OS !== 'web' && !isMuted) Speech.speak(`Boss attacks!`, { rate: 1.1 });
      setTimeout(() => {
        setDamageFlash('');
        if (playerHP - activeBoss.attack <= 0) setBossGameOver(true);
        else { setBossAnswered(false); setBossQ(triviaBank[Math.floor(Math.random() * triviaBank.length)]); }
      }, 1000);
    }
  }
async function generateStudentReceipt(transaction: any) {
    if (!profile) return;
    try {
      const schoolInfo = profile?.schools;
      const logoHtml = schoolInfo?.logo_url
        ? `<img src="${schoolInfo.logo_url}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;border:3px solid #1A365D;" />`
        : `<div style="width:70px;height:70px;border-radius:50%;background:#1A365D;color:#FFF;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;text-align:center;line-height:1.3;">EDU<br/>SALONE</div>`;
      const amountStr = "SLL " + Number(transaction.amount_paid_sll).toLocaleString();
      const dateStr = new Date(transaction.payment_date).toLocaleDateString('en-GB');
      const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
      <style>
        *{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;}
        .page{border:3px solid #1A365D;border-radius:12px;overflow:hidden;max-width:480px;margin:15px auto;}
        .stripe{height:7px;background:#1A365D;}
        .hdr{background:linear-gradient(135deg,#1A365D,#2B6CB0);padding:18px;display:flex;align-items:center;}
        .si{padding-left:13px;}.sn{color:#FFF;font-size:15px;font-weight:900;text-transform:uppercase;}
        .badge{display:inline-block;background:#D69E2E;color:#FFF;font-size:9px;font-weight:900;padding:3px 9px;border-radius:20px;margin-top:4px;letter-spacing:1px;}
        .idbar{background:#EBF8FF;border-top:1px solid #BEE3F8;border-bottom:1px solid #BEE3F8;padding:9px 18px;display:flex;justify-content:space-between;}
        .rn{font-size:13px;font-weight:900;color:#2B6CB0;}.rd{font-size:11px;color:#4A5568;font-weight:bold;}
        .body{padding:18px;}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;}
        .ib{background:#F7FAFC;border-radius:7px;padding:9px;border-left:3px solid #2B6CB0;}
        .il{font-size:8px;font-weight:900;color:#718096;text-transform:uppercase;margin-bottom:3px;}
        .iv{font-size:12px;font-weight:900;color:#1A365D;}
        .amt{background:linear-gradient(135deg,#F0FFF4,#E6FFFA);border:2px solid #38A169;border-radius:9px;padding:16px;text-align:center;margin-bottom:15px;}
        .al{font-size:9px;font-weight:900;color:#276749;text-transform:uppercase;letter-spacing:2px;margin-bottom:5px;}
        .av{font-size:30px;font-weight:900;color:#22543D;}
        .mt{display:inline-block;background:#C6F6D5;color:#22543D;font-size:9px;font-weight:900;padding:3px 9px;border-radius:20px;margin-top:5px;}
        .sigs{display:flex;justify-content:space-between;padding-top:13px;border-top:1px dashed #CBD5E0;margin-top:13px;}
        .sb{text-align:center;width:45%;}.sl{border-top:1.5px solid #4A5568;margin-bottom:4px;}
        .slb{font-size:8px;font-weight:bold;color:#718096;text-transform:uppercase;}
        .ftr{background:#1A365D;padding:7px;text-align:center;}
        .ft{color:rgba(255,255,255,0.6);font-size:8px;}
      </style></head><body>
      <div class="page">
        <div class="stripe"></div>
        <div class="hdr">${logoHtml}<div class="si"><div class="sn">${schoolInfo?.name || 'School'}</div><div class="badge">OFFICIAL FEE RECEIPT</div></div></div>
        <div class="idbar"><div class="rn">🧾 ${transaction.receipt_number}</div><div class="rd">📅 ${dateStr}</div></div>
        <div class="body">
          <div class="grid">
            <div class="ib" style="grid-column:span 2;"><div class="il">Student Name</div><div class="iv">${(profile?.full_name || 'UNKNOWN').toUpperCase()}</div></div>
            <div class="ib"><div class="il">Class</div><div class="iv">${studentRecord?.current_class || 'N/A'}</div></div>
            <div class="ib"><div class="il">Admission No.</div><div class="iv">${studentRecord?.admission_number || 'N/A'}</div></div>
          </div>
          <div class="amt"><div class="al">Amount Paid</div><div class="av">${amountStr}</div><div class="mt">💳 ${transaction.payment_method}</div></div>
          <div class="sigs"><div class="sb"><div class="sl"></div><div class="slb">Authorized Signature</div></div><div class="sb"><div class="sl"></div><div class="slb">Official Stamp</div></div></div>
        </div>
        <div class="ftr"><div class="ft">Official document • EduSalone • ${new Date().toLocaleString()}</div></div>
      </div></body></html>`;
      if (Platform.OS === 'web') {
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (e: any) { Alert.alert('Error', 'Could not generate receipt.'); }
  }
  async function downloadMyReportCard() {
    if (!profile || !studentRecord) { Alert.alert('Notice', 'Profile missing.'); return; }
    
    // 🌟 SECURITY LOCK
    if (!studentRecord.report_published) {
      Alert.alert('Report Card Locked', 'The Principal has not published your report card for this term yet. Please check back later.');
      return;
    }

    setPrinting(true);
    const isJSSStudent = (studentRecord.current_class || '').toUpperCase().includes('JSS');
    try {
      const { data: grades } = await supabase.from('academic_records').select('*').eq('student_id', studentRecord.id);
      const { data: evalsData } = await supabase.from('student_evaluations').select('*').eq('student_id', studentRecord.id).order('term', { ascending: false }).limit(1);
      const { data: attendanceData } = await supabase.from('daily_attendance').select('status').eq('student_id', studentRecord.id);
      
      let presentCount = 0; let absentCount = 0; let lateCount = 0;
      if (attendanceData) {
        attendanceData.forEach(r => { if (r.status === 'Present') presentCount++; else if (r.status === 'Absent') absentCount++; else if (r.status === 'Late') lateCount++; });
      }

      const ev = evalsData && evalsData.length > 0 ? evalsData[0] : null;
      const subjectMap: any = {};

      if (grades) {
        grades.forEach((g) => {
          if (!subjectMap[g.subject]) subjectMap[g.subject] = { First: null, Second: null, Third: null };
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

          const t1Test1 = t1?.test_1 ?? '-'; const t1Test2 = t1?.test_2 ?? '-'; const t1Exam = t1?.exam ?? '-'; const t1Score = t1?.score ?? '-'; const t1Mn = t1?.mean ?? t1?.score ?? '-';
          const t2Test1 = t2?.test_1 ?? '-'; const t2Test2 = t2?.test_2 ?? '-'; const t2Exam = t2?.exam ?? '-'; const t2Score = t2?.score ?? '-'; const t2Mn = t2?.mean ?? t2?.score ?? '-';
          const t3Test1 = t3?.test_1 ?? '-'; const t3Test2 = t3?.test_2 ?? '-'; const t3Exam = t3?.exam ?? '-'; const t3Score = t3?.score ?? '-'; const t3Mn = t3?.mean ?? t3?.score ?? '-';

          const yearlyTotal = (Number(t1?.score)||0) + (Number(t2?.score)||0) + (Number(t3?.score)||0);
          let termsTaken = 0; if (t1?.score!=null) termsTaken++; if (t2?.score!=null) termsTaken++; if (t3?.score!=null) termsTaken++;
          const meanNum = termsTaken > 0 ? (yearlyTotal / termsTaken) : 0;
          
          grandTotalScore += yearlyTotal; maxPossibleGrandTotal += (termsTaken * 100); 

          let finalGrade = 'F9'; let finalRemark = 'FAIL'; let gClass = 'g-fail';
          const isJSSStudent = (studentRecord.current_class || '').toUpperCase().includes('JSS');
          if (isJSSStudent) {
            if (meanNum >= 75) { finalGrade = '1'; finalRemark = 'EXCELLENT'; gClass = 'g-pass'; }
            else if (meanNum >= 65) { finalGrade = '2'; finalRemark = 'V. GOOD'; gClass = 'g-pass'; }
            else if (meanNum >= 55) { finalGrade = '3'; finalRemark = 'GOOD'; gClass = 'g-pass'; }
            else if (meanNum >= 45) { finalGrade = '4'; finalRemark = 'CREDIT'; gClass = 'g-pass'; }
            else if (meanNum >= 35) { finalGrade = '5'; finalRemark = 'PASS'; gClass = 'g-pass'; }
            else { finalGrade = '6'; finalRemark = 'FAIL'; gClass = 'g-fail'; }
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
              <td>${t1Test1}</td><td>${t1Test2}</td><td>${t1Exam}</td><td style="font-weight:bold; color:#1A365D;">${t1Score}</td><td>${t1Mn}</td><td>${t1?.rank||'-'}</td>
              <td>${t2Test1}</td><td>${t2Test2}</td><td>${t2Exam}</td><td style="font-weight:bold; color:#1A365D;">${t2Score}</td><td>${t2Mn}</td><td>${t2?.rank||'-'}</td>
              <td>${t3Test1}</td><td>${t3Test2}</td><td>${t3Exam}</td><td style="font-weight:bold; color:#1A365D;">${t3Score}</td><td>${t3Mn}</td><td>${t3?.rank||'-'}</td>
              <td style="font-weight:bold; background-color:#FFFAF0;">${termsTaken > 0 ? yearlyTotal : '-'}</td>
              <td style="font-weight:bold; background-color:#FFFAF0;">${meanNum.toFixed(1)}</td><td>-</td> 
              <td class="${gClass}" style="font-weight:900; font-size: 8px;">${termsTaken > 0 ? finalGrade : '-'}</td>
              <td class="${gClass}" style="font-size: 6.5px; font-weight: 900; letter-spacing: 0.5px; white-space: nowrap;">${termsTaken > 0 ? finalRemark : '-'}</td>
            </tr>`;
        });
      } else { gradesHtml = `<tr><td colspan="25" style="text-align:center; padding: 30px; font-weight:bold; color:#718096; font-style:italic;">No academic records found for this student.</td></tr>`; }

      const overallPercentageStr = maxPossibleGrandTotal > 0 ? ((grandTotalScore / maxPossibleGrandTotal) * 100).toFixed(1) : '0';
      const schoolInfo = profile?.schools;
      const themeColor = getSchoolThemeColor(schoolInfo?.name);
      const goldColor = '#D4AF37'; 
      const logoHtml = schoolInfo?.logo_url ? `<img src="${schoolInfo.logo_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />` : `<span style="font-size:8px; font-weight:bold; color:${themeColor};">LOGO</span>`;
      
      let studentNameObj = childName.toUpperCase();
      
      const verificationText = `EDUSALONE VERIFIED ACADEMIC RECORD\n----------------------------------\nSchool: ${schoolInfo?.name || 'Unknown'}\nStudent: ${studentNameObj}\nAdmission No: ${studentRecord.admission_number || 'N/A'}\nClass: ${studentRecord.current_class}\nOverall Score: ${overallPercentageStr}%\n\nAuthenticity: VERIFIED ✅`;
      const encodedQrData = encodeURIComponent(verificationText);
      const hexColor = themeColor.replace('#', '');
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodedQrData}&color=${hexColor}&bgcolor=FFFFFF`;

      function getTraitRow(name: string, val: number | undefined) { 
        let d=""; for(let i=1;i<=5;i++){ const a = (val||0)===i; d+=`<div class="dot" style="${a?`background:${themeColor};border-color:${themeColor};`:""}"><span style="color:#fff;font-size:7px;">${a?'✓':''}</span></div><span style="width:2px;display:inline-block;"></span>`; }
        return `<div class="trait-row"><span class="trait-name">${name}</span><div class="trait-rating">${d}</div></div>`;
      }
      function getSkillRow(name: string, val: number | undefined) { 
        let b=""; const v = val||0; for(let i=1;i<=5;i++){ b+=`<div class="bar-seg" style="${(v>=i&&v>0)?`background:${themeColor};border-color:${themeColor};`:''}"></div>`; }
        return `<div class="skill-row"><span class="skill-name">${name}</span><div class="skill-bars">${b}</div><span class="skill-score" style="color:${themeColor}">${v>0?v:'—'}</span></div>`;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
        <style>
          @page { size: A4 portrait; margin: 8mm; }
          html { zoom: 0.85; } * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 7.5px; background: #FFFCF5; padding: 0; width: 185mm; margin: auto; }
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
          .g-pass { color: #3182CE; font-weight: 900; } .g-fail { color: #E53E3E; font-weight: 900; }
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
            <div class="watermark">${schoolInfo?.name || 'EDUSALONE'}<br/>${profile?.schools?.school_code || 'VERIFIED'}<br/>OFFICIAL</div>
            <div class="header">
              <div class="logo">${logoHtml}</div>
              <div class="hdr-center">
                <h1>${schoolInfo?.name || 'School Name'}</h1>
                <p class="addr">Sierra Leone's Premier Institution</p>
                <p class="motto" style="color:${goldColor}; font-style:italic;">Knowledge, Courage & Excellence</p>
              </div>
              <div class="logo">${logoHtml}</div>
            </div>
            <div class="report-title">${isJSSStudent ? 'JUNIOR SECONDARY SCHOOL' : 'SENIOR SECONDARY SCHOOL'} — STUDENT PROGRESS REPORT 2024/2025</div>
            <div class="top-info">
              <div class="info-block">
                <div class="blk-header">STUDENT'S PERSONAL DATA</div>
                <table class="info-tbl">
                  <tr><td>Name</td><td style="font-weight:900;">${studentNameObj}</td></tr>
                  <tr><td>Sex</td><td>${studentRecord.gender || '-'}</td></tr>
                  <tr><td>Date of Birth</td><td>${studentRecord.date_of_birth || '-'}</td></tr>
                  <tr><td>Form</td><td style="font-weight:bold;">${studentRecord.current_class}</td></tr>
                  <tr><td>Admission No.</td><td style="color:${themeColor}; font-weight:bold;">${studentRecord.admission_number}</td></tr>
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
                <div class="score-line"><span class="sl" style="color:${themeColor}; font-weight:900;">Overall Rank</span><span class="sv" style="font-size:10px;">${studentRecord.overall_rank || 'N/A'}</span></div>
                <div class="score-line"><span class="sl">Exam Type</span><span class="sv">${isJSSStudent ? 'BECE' : 'WASSCE'}</span></div>
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
              ${(studentRecord.current_class || '').toUpperCase().includes('JSS') ? `
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
        if (printWindow) { printWindow.document.write(htmlContent); printWindow.document.close(); setTimeout(() => { printWindow.print(); }, 500); }
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (error: any) { Alert.alert('Error', 'Could not generate PDF.'); }
    setPrinting(false);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F8' }}>
        <ActivityIndicator size="large" color="#1A365D" />
      </View>
    );
  }

  const currentMedal = getRankDetails(brainPoints);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: '#F0F4F8', paddingTop: Platform.OS === 'android' ? 40 : 20 }}>
        
        {/* 🌟 DYNAMIC THEMED TOP NAVIGATION & FIXED LOGOUT POS */}
        <View style={styles.topNav}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.greeting, { color: themeColor }]} numberOfLines={1}>Hi, {firstName} 👋</Text>
                <TouchableOpacity onPress={onRefresh} style={{ marginLeft: 10 }}>
                  <Ionicons name="refresh-circle" size={20} color={themeColor} />
                </TouchableOpacity>
              </View>
              <Text style={styles.subText} numberOfLines={1}>
                {isParent ? 'Parent Portal' : 'Student Portal'} • {profile?.schools?.name || 'EduSalone'}
              </Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={async () => { await supabase.auth.signOut(); router.replace('/login'); }}>
              <Ionicons name="log-out-outline" size={24} color="#E53E3E" />
            </TouchableOpacity>
          </View>

          {(!isParent || studentRecord) ? (
            <View style={styles.tabContainer}>
              {!isGamer ? (
                <>
                  <TouchableOpacity style={[styles.tabBtn, activeTab === 'academics' ? { backgroundColor: themeColor, elevation: 2 } : null]} onPress={() => setActiveTab('academics')}>
                    <Ionicons name="book" size={16} color={activeTab === 'academics' ? '#FFF' : '#718096'} />
                    <Text style={[styles.tabText, activeTab === 'academics' ? styles.tabTextActive : null]}> Book</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={[styles.tabBtn, activeTab === 'materials' ? { backgroundColor: themeColor, elevation: 2 } : null]} onPress={() => setActiveTab('materials')}>
                    <Ionicons name="folder" size={16} color={activeTab === 'materials' ? '#FFF' : '#718096'} />
                    <Text style={[styles.tabText, activeTab === 'materials' ? styles.tabTextActive : null]}> Files</Text>
                  </TouchableOpacity>
                </>
              ) : null}
              <TouchableOpacity style={[styles.tabBtn, activeTab === 'game' ? { backgroundColor: themeColor, elevation: 2 } : null]} onPress={() => { setActiveTab('game'); setActiveGame('hub'); }}>
                <Ionicons name="game-controller" size={16} color={activeTab === 'game' ? '#FFF' : '#718096'} />
                <Text style={[styles.tabText, activeTab === 'game' ? styles.tabTextActive : null]}> Play</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tabBtn, activeTab === 'rank' ? { backgroundColor: themeColor, elevation: 2 } : null]} onPress={() => setActiveTab('rank')}>
                <Ionicons name="podium" size={16} color={activeTab === 'rank' ? '#FFF' : '#718096'} />
                <Text style={[styles.tabText, activeTab === 'rank' ? styles.tabTextActive : null]}> Rank</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />}
        >

          {/* 🔗 LINK CHILD (PARENTS ONLY) */}
          {isParent && !studentRecord ? (
            <View style={styles.linkCard}>
              <Ionicons name="link" size={50} color={themeColor} style={{ marginBottom: 15 }} />
              <Text style={[styles.linkTitle, { color: themeColor }]}>Link Your Child</Text>
              <Text style={styles.linkDesc}>Enter your child's Admission Number to view their records.</Text>
              <TextInput style={styles.input} placeholder="e.g. ADM-003" placeholderTextColor="#A0AEC0" value={linkInput} onChangeText={setLinkInput} autoCapitalize="characters" />
              <TouchableOpacity style={styles.linkButton} onPress={handleLinkChild} disabled={linking}>
                {linking ? <ActivityIndicator color="#FFF" /> : <Text style={styles.linkButtonText}>Securely Link Account</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ paddingBottom: 40 }}>
              {/* 🆔 ID CARD */}
              <View style={styles.idCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.avatarBubble, { borderColor: themeColor }]}>
                      <Text style={[styles.avatarText, { color: themeColor }]}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.studentName, { color: themeColor }]} numberOfLines={1}>{profile?.full_name || 'Loading...'}</Text>
                      <Text style={styles.studentDetails}>
                        {isGamer ? 'Global Competitor 🌍' : `Class: ${studentRecord?.current_class || 'Pending Setup'}`}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                    <View style={[styles.pointsBadge, { borderColor: currentMedal.color }]}>
                      <Ionicons name={currentMedal.icon as any} size={14} color={currentMedal.color} />
                      <Text style={[styles.pointsText, { color: currentMedal.color }]}>{currentMedal.rank}</Text>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#2D3748', marginTop: 4 }}>{brainPoints} XP</Text>
                  </View>
                </View>

                <View style={{ marginTop: 15 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Text style={{ fontSize: 11, color: '#718096', fontWeight: 'bold' }}>Progress to next rank</Text>
                    <Text style={{ fontSize: 11, color: '#718096', fontWeight: 'bold' }}>{currentMedal.nextTarget} XP</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <Animated.View style={[styles.progressBarFill, { 
                        backgroundColor: currentMedal.color,
                        width: progressAnimWidth.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) 
                      }]} 
                    />
                  </View>
                </View>
              </View>

              {/* 📚 ACADEMICS TAB */}
              {activeTab === 'academics' && !isGamer ? (
                 <View>
                   <View style={styles.quoteCard}>
                      <Ionicons name="bulb" size={24} color="#D69E2E" style={{ marginBottom: 5 }} />
                      <Text style={styles.quoteText}>{dailyQuote || 'Keep learning!'}</Text>
                   </View>

                  {/* 💰 FINANCE & FEES PORTAL (UPDATED WITH RECEIPT SYSTEM) */}
                    <View style={[styles.financeCard, { borderLeftColor: themeColor }]}>
                      <Text style={[styles.financeTitle, { color: themeColor }]}>Term Fees & Invoices</Text>
                      
                      <View style={styles.financeRow}>
                        <Text style={styles.financeLabel}>Total Billed:</Text>
                        <Text style={styles.financeValue}>SLL {Number(feesData.totalBilled).toLocaleString()}</Text>
                      </View>

                      <View style={styles.financeRow}>
                        <Text style={styles.financeLabel}>Total Paid:</Text>
                        <Text style={[styles.financeValue, { color: '#38A169' }]}>SLL {Number(feesData.totalPaid).toLocaleString()}</Text>
                      </View>

                      <View style={[styles.financeRow, { borderBottomWidth: 0, marginTop: 5, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EDF2F7' }]}>
                        <Text style={[styles.financeLabel, { fontWeight: '900' }]}>Balance Remaining:</Text>
                        <Text style={[styles.financeValue, { color: feesData.balance > 0 ? '#E53E3E' : '#38A169', fontSize: 18 }]}>
                          SLL {Number(feesData.balance).toLocaleString()}
                        </Text>
                      </View>

                      {/* 🧾 NEW: CLICKABLE PAYMENT BREAKDOWN */}
                      {feesData.history && feesData.history.length > 0 && (
                        <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: '#EDF2F7', paddingTop: 15 }}>
                          <Text style={{ fontSize: 11, fontWeight: '900', color: '#A0AEC0', marginBottom: 10, letterSpacing: 1 }}>
                            PAYMENT LOG (INSTALLMENTS)
                          </Text>
                          {feesData.history.map((item: any, index: number) => (
                            <View key={index} style={{ 
                              flexDirection: 'row', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              backgroundColor: '#F8FAFC', 
                              padding: 12, 
                              borderRadius: 12,
                              marginBottom: 8,
                              borderWidth: 1,
                              borderColor: '#E2E8F0'
                            }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '900', color: '#1A365D' }}>{item.receipt_number}</Text>
                                <Text style={{ fontSize: 11, color: '#A0AEC0', fontWeight: 'bold' }}>
                                  {new Date(item.payment_date).toLocaleDateString('en-GB')}
                                </Text>
                              </View>
                              
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontSize: 14, fontWeight: '900', color: '#38A169', marginBottom: 4 }}>
                                  SLL {Number(item.amount_paid_sll).toLocaleString()}
                                </Text>
                                
                                <TouchableOpacity 
                                  onPress={() => generateStudentReceipt(item)}
                                  activeOpacity={0.7}
                                  style={{ 
                                    backgroundColor: '#EBF8FF', 
                                    paddingHorizontal: 10, 
                                    paddingVertical: 5, 
                                    borderRadius: 6, 
                                    flexDirection: 'row', 
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderColor: '#3182CE'
                                  }}
                                >
                                  <Ionicons name="document-text" size={12} color="#2B6CB0" />
                                  <Text style={{ fontSize: 10, color: '#2B6CB0', fontWeight: '900', marginLeft: 4 }}>RECEIPT</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                   
                   {/* 🌟 ENTERPRISE FIX: SECURE REPORT CARD LOCK */}
                   {studentRecord?.report_published ? (
                      <TouchableOpacity style={styles.actionCard} onPress={downloadMyReportCard} disabled={printing}>
                        <View style={styles.actionIconContainer}>
                          {printing ? <ActivityIndicator color="#DD6B20" /> : <Ionicons name="document-text" size={30} color="#DD6B20" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.actionTitle}>Download Report Card</Text>
                          <Text style={styles.actionDesc}>View and print official academic progress.</Text>
                        </View>
                        <Ionicons name="download-outline" size={24} color={themeColor} />
                      </TouchableOpacity>
                   ) : (
                      <View style={[styles.actionCard, { opacity: 0.7, backgroundColor: '#F7FAFC' }]}>
                        <View style={[styles.actionIconContainer, { backgroundColor: '#EDF2F7' }]}>
                          <Ionicons name="lock-closed" size={24} color="#A0AEC0" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.actionTitle, { color: '#718096' }]}>Report Card Locked</Text>
                          <Text style={styles.actionDesc}>Pending release by the Principal.</Text>
                        </View>
                      </View>
                   )}

                   {/* 📊 MY GRADES SUMMARY */}
                   <AcademicSummaryCard studentId={studentRecord?.id} themeColor={themeColor} />

                   <Text style={[styles.sectionTitle, { marginTop: 10, color: themeColor }]}>Class Timetable</Text>
                   <View style={styles.timetableContainer}>
                     {timetable.length > 0 ? (
                       timetable.map((tt: any, i: number) => (
                         <View key={i} style={styles.ttRow}>
                           <Text style={[styles.ttDay, { color: themeColor }]}>{tt.day_of_week}</Text>
                           <Text style={styles.ttSubjects}>{tt.subjects}</Text>
                         </View>
                       ))
                     ) : (
                       <View style={{ padding: 20, alignItems: 'center' }}>
                          <Ionicons name="time" size={40} color="#CBD5E0" style={{ marginBottom: 10 }} />
                          <Text style={{ color: '#718096', fontWeight: 'bold', textAlign: 'center' }}>
                            Timetable pending upload from your Class Teacher.
                          </Text>
                       </View>
                     )}
                   </View>
                 </View>
              ) : null}

              {/* 📰 FEED TAB */}
              {activeTab === 'feed' && !isGamer ? (
                <View>
                  <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                    <TouchableOpacity style={[styles.newsToggleBtn, newsTab === 'school' ? { borderBottomColor: themeColor } : null]} onPress={() => setNewsTab('school')}>
                      <Text style={[styles.newsToggleText, newsTab === 'school' ? { color: themeColor } : null]}>School Noticeboard</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.newsToggleBtn, newsTab === 'global' ? { borderBottomColor: themeColor } : null]} onPress={() => setNewsTab('global')}>
                      <Text style={[styles.newsToggleText, newsTab === 'global' ? { color: themeColor } : null]}>World Daily News</Text>
                    </TouchableOpacity>
                  </View>

                  {newsTab === 'school' ? (
                    news.map(n => (
                      <View key={n.id} style={styles.newsCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                          <Ionicons name="megaphone" size={20} color="#38A169" />
                          <Text style={[styles.newsAuthor, { marginLeft: 8, flex: 1 }]}>{n.author_name}</Text>
                          <Text style={styles.newsDate}>{new Date(n.created_at).toLocaleDateString()}</Text>
                        </View>
                        <Text style={styles.newsContent}>{n.content}</Text>
                      </View>
                    ))
                  ) : (
                    worldNews.map(w => (
                      <View key={w.id} style={[styles.newsCard, { borderLeftColor: themeColor }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                          <Ionicons name="globe" size={20} color={themeColor} />
                          <Text style={styles.newsAuthor}>{w.source}</Text>
                          <Text style={styles.newsDate}>{w.date}</Text>
                        </View>
                        <Text style={styles.newsContent}>{w.title}</Text>
                      </View>
                    ))
                  )}
                </View>
              ) : null}
{/* 📁 MATERIALS TAB */}
              {activeTab === 'materials' && !isGamer ? (
                <View>
                  <View style={{ alignItems: 'center', marginBottom: 15 }}>
                    <Ionicons name="folder-open" size={50} color={themeColor} />
                    <Text style={[styles.sectionTitle, { color: themeColor, marginTop: 8, marginBottom: 4 }]}>Lesson Materials</Text>
                    <Text style={{ color: '#718096', fontSize: 13, textAlign: 'center' }}>Notes & resources shared by your teachers</Text>
                  </View>

                  {loadingMaterials ? (
                    <ActivityIndicator color={themeColor} style={{ marginTop: 30 }} />
                  ) : materials.length === 0 ? (
                    <View style={{ alignItems: 'center', marginTop: 30, padding: 20 }}>
                      <Ionicons name="folder-open-outline" size={50} color="#CBD5E0" />
                      <Text style={{ color: '#A0AEC0', marginTop: 10, fontSize: 14, fontStyle: 'italic', textAlign: 'center' }}>
                        No materials shared yet. Check back after your teacher uploads.
                      </Text>
                    </View>
                  ) : (
                    materials.map((m: any) => {
                      const ft = (m.file_type || '').toLowerCase();
                      const isPdf = ft === 'pdf';
                      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ft);
                      const iconName = isPdf ? 'document-text' : isImage ? 'image' : 'document';
                      const iconColor = isPdf ? '#E53E3E' : isImage ? '#38A169' : themeColor;
                      const iconBg = isPdf ? '#FED7D7' : isImage ? '#C6F6D5' : '#EBF8FF';
                      return (
                        <View key={m.id} style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 1, borderWidth: 1, borderColor: '#E2E8F0', borderLeftWidth: 3, borderLeftColor: iconColor }}>
                          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                            <Ionicons name={iconName as any} size={22} color={iconColor} />
                          </View>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={{ fontWeight: '900' as any, color: '#1A365D', fontSize: 14 }} numberOfLines={2}>{m.title}</Text>
                            <Text style={{ color: '#718096', fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                              {(m.subject || 'General')} • {m.class_name} • {new Date(m.created_at).toLocaleDateString('en-GB')}
                            </Text>
                            <Text style={{ color: '#A0AEC0', fontSize: 10, marginTop: 1 }} numberOfLines={1}>{m.file_name}</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => openMaterial(m.file_url, m.file_name)}
                            activeOpacity={0.8}
                            style={{ backgroundColor: themeColor, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="download-outline" size={16} color="#FFF" />
                            <Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 12, marginLeft: 4 }}>Open</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
                  <View style={{ height: 20 }} />
                </View>
              ) : null}
              {/* 🎮 GAME TAB */}
              {activeTab === 'game' ? (
                <View>
                  {/* 🎮 GAME HUB MENU */}
                  {activeGame === 'hub' ? (
                    <View style={{ alignItems: 'center', paddingTop: 8 }}>
                      <Text style={[styles.sectionTitle, { color: themeColor }]}>🎮 Game Zone</Text>
                      <Text style={{ color: '#718096', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>
                        Choose your challenge. Every correct answer earns Brain Points!
                      </Text>

                      <TouchableOpacity onPress={() => { loadNextTrivia(); setActiveGame('trivia'); }} style={[styles.gameHubCard, { backgroundColor: themeColor }]}>
                        <Text style={{ fontSize: 40, marginRight: 16 }}>🧠</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 18 }}>Daily Trivia</Text>
                          <Text style={{ color: '#EBF8FF', fontSize: 12, marginTop: 3 }}>WASSCE & BECE questions across all subjects</Text>
                          <Text style={{ color: '#D69E2E', fontSize: 11, fontWeight: 'bold', marginTop: 4 }}>+10 pts per correct answer</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={22} color="#EBF8FF" />
                      </TouchableOpacity>

                      <TouchableOpacity onPress={startMathBlitz} style={[styles.gameHubCard, { backgroundColor: '#1A237E', borderWidth: 1.5, borderColor: '#FFD700' }]}>
                        <Text style={{ fontSize: 40, marginRight: 16 }}>⚡</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: 18 }}>Speed Math Blitz</Text>
                          <Text style={{ color: '#90CAF9', fontSize: 12, marginTop: 3 }}>60 seconds. How many can you solve?</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={22} color="#FFD700" />
                      </TouchableOpacity>

                      {/* 🌟 NEW GAME: WORD SCRAMBLE */}
                      <TouchableOpacity onPress={startWordScramble} style={[styles.gameHubCard, { backgroundColor: '#805AD5', borderWidth: 1.5, borderColor: '#D6BCFA' }]}>
                        <Text style={{ fontSize: 40, marginRight: 16 }}>🔠</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 18 }}>Word Scramble</Text>
                          <Text style={{ color: '#E9D8FD', fontSize: 12, marginTop: 3 }}>Unscramble the academic word!</Text>
                          <Text style={{ color: '#D6BCFA', fontSize: 11, fontWeight: 'bold', marginTop: 4 }}>+20 pts for each word</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={22} color="#E9D8FD" />
                      </TouchableOpacity>

                      <TouchableOpacity onPress={startBossBattle} style={[styles.gameHubCard, { backgroundColor: '#1C0F2E', borderWidth: 1.5, borderColor: '#E53E3E' }]}>
                        <Text style={{ fontSize: 40, marginRight: 16 }}>👾</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#FC8181', fontWeight: '900', fontSize: 18 }}>Boss Battle</Text>
                          <Text style={{ color: '#E9D8FD', fontSize: 12, marginTop: 3 }}>Defeat 4 bosses to prove BECE readiness</Text>
                          <Text style={{ color: '#FC8181', fontSize: 11, fontWeight: 'bold', marginTop: 4 }}>+150 pts for full victory</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={22} color="#FC8181" />
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => syncXPToDatabase(0)} style={{ backgroundColor: '#FED7D7', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10, width: '100%' }}>
                        <Text style={{ color: '#E53E3E', fontWeight: 'bold' }}>🔄 Reset My XP to 0</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {/* 🕹️ TRIVIA ACTIVE SCREEN */}
                  {activeGame === 'trivia' ? (
                    <View style={[styles.gameContainer, streak > 2 ? styles.gameContainerOnFire : null]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 15 }}>
                        <TouchableOpacity onPress={() => setActiveGame('hub')} style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="arrow-back" size={20} color={themeColor} />
                          <Text style={{ color: themeColor, fontWeight: 'bold', marginLeft: 6 }}>Game Hub</Text>
                        </TouchableOpacity>
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={[styles.streakBadge, { backgroundColor: '#EBF8FF', marginRight: 10 }]}>
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: themeColor }}>LVL {triviaBank[quizIndex]?.difficulty || 'Basic'}</Text>
                          </View>
                          
                          {/* 🌟 RESTART TRIVIA BUTTON ADDED */}
                          <TouchableOpacity onPress={loadNextTrivia} style={[styles.restartBtn, { backgroundColor: '#EBF8FF' }]}>
                            <Ionicons name="refresh" size={16} color={themeColor} />
                          </TouchableOpacity>

                          <TouchableOpacity onPress={() => setIsMuted(!isMuted)} style={[styles.restartBtn, { backgroundColor: isMuted ? '#FED7D7' : '#EBF8FF' }]}>
                            <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={16} color={isMuted ? "#E53E3E" : themeColor} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      <Text style={[styles.sectionTitle, { alignSelf: 'flex-start', color: themeColor }]}>Daily Trivia Challenge</Text>
                      <Text style={{ color: '#718096', marginBottom: 20, alignSelf: 'flex-start' }}>
                        Subject: <Text style={{ fontWeight: 'bold', color: themeColor }}>{triviaBank[quizIndex]?.subject || 'Trivia'}</Text>
                      </Text>
                      
                      <View style={styles.questionCard}>
                        <Text style={[styles.questionText, { color: themeColor }]}>{triviaBank[quizIndex]?.question || 'Loading...'}</Text>
                        {triviaBank[quizIndex]?.options.map((opt: string) => {
                          let btnStyle: any = styles.optBtn; let txtStyle: any = styles.optText;
                          if (answered) {
                            if (opt === triviaBank[quizIndex].answer) { btnStyle = [styles.optBtn, { backgroundColor: '#C6F6D5', borderColor: '#38A169', transform: [{scale: 1.02}] }]; txtStyle = [styles.optText, { color: '#22543D' }]; } 
                            else if (opt === selectedOption) { btnStyle = [styles.optBtn, { backgroundColor: '#FED7D7', borderColor: '#E53E3E' }]; txtStyle = [styles.optText, { color: '#822727' }]; }
                          }
                          return (
                            <TouchableOpacity key={opt} style={btnStyle} onPress={() => handleTriviaAnswer(opt)} disabled={answered || isSpeaking}>
                              <Text style={txtStyle}>{opt}</Text>
                            </TouchableOpacity>
                          )
                        })}
                      </View>
                      
                      {answered ? (
                        <View style={{ width: '100%', alignItems: 'center', marginTop: 20 }}>
                          <Text style={{ fontWeight: '900', fontSize: 18, color: selectedOption === triviaBank[quizIndex].answer ? '#38A169' : '#E53E3E', marginBottom: 15, textAlign: 'center' }}>{feedbackMsg}</Text>
                          {isSpeaking ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 15 }}><ActivityIndicator color={themeColor} style={{ marginRight: 10 }} /><Text style={{ color: '#718096', fontWeight: 'bold' }}>🔊 Listen to the answer...</Text></View>
                          ) : (
                            <TouchableOpacity style={[styles.nextButton, selectedOption === triviaBank[quizIndex].answer ? { backgroundColor: '#38A169' } : { backgroundColor: themeColor }]} onPress={loadNextTrivia}>
                              <Text style={styles.nextButtonText}>Next Question ➡️</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {/* ⚡ MATH BLITZ ACTIVE SCREEN (Wrapped in ScrollView for Keyboard visibility) */}
                  {activeGame === 'mathblitz' ? (
                    <ScrollView
  ref={mathScrollRef}         
  style={{ backgroundColor: '#0D1B4B', borderRadius: 20, minHeight: 420 }}
  contentContainerStyle={{ padding: 20, paddingBottom: 350 }}
  keyboardShouldPersistTaps="handled"
>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <TouchableOpacity
  onPress={() => {
    if (mathTimerRef.current) clearInterval(mathTimerRef.current);
    setMathActive(false);
    setMathGameOver(false);
    setActiveGame('hub');
  }}
  style={{ flexDirection: 'row', alignItems: 'center' }}
>
                          <Ionicons name="arrow-back" size={20} color="#FFD700" />
                          <Text style={{ color: '#FFD700', fontWeight: 'bold', marginLeft: 4 }}>Exit</Text>
                        </TouchableOpacity>
                        <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: 16, letterSpacing: 2 }}>⚡ MATH BLITZ</Text>
                      </View>

                      {mathActive && mathQ ? (
                        <View style={{ alignItems: 'center' }}>
                          <View style={styles.mathTimerBar}>
                            <View style={{ height: '100%', borderRadius: 6, width: `${(mathTimeLeft/60)*100}%`, backgroundColor: mathTimeLeft > 30 ? '#38A169' : mathTimeLeft > 15 ? '#D69E2E' : '#E53E3E' }} />
                          </View>

                          <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 16 }}>
                            <View style={{ alignItems: 'center' }}>
                              <Text style={{ color: mathTimeLeft <= 10 ? '#FC8181' : '#FFD700', fontSize: 28, fontWeight: '900' }}>{mathTimeLeft}s</Text>
                              <Text style={{ color: '#90CAF9', fontSize: 10 }}>TIME LEFT</Text>
                            </View>
                            <View style={{ alignItems: 'center' }}>
                              <Text style={{ color: '#68D391', fontSize: 28, fontWeight: '900' }}>{mathScore}</Text>
                              <Text style={{ color: '#90CAF9', fontSize: 10 }}>SCORE</Text>
                            </View>
                          </View>

                          <View style={{ backgroundColor: '#1A237E', borderRadius: 16, padding: 24, width: '100%', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: '#FFD700' }}>
                            <Text style={{ color: '#90CAF9', fontSize: 12, letterSpacing: 2, marginBottom: 8 }}>SOLVE THIS</Text>
                            <Text style={{ color: '#FFD700', fontSize: 40, fontWeight: '900' }}>{mathQ.question} = ?</Text>
                          </View>

                          {mathFeedback !== '' ? (
                            <View style={{ backgroundColor: mathFeedback.startsWith('✅') ? '#276749' : '#9B2C2C', padding: 10, borderRadius: 10, marginBottom: 12, width: '100%', alignItems: 'center' }}>
                              <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 15 }}>{mathFeedback}</Text>
                            </View>
                          ) : null}

                          <View style={{ flexDirection: 'row', width: '100%', gap: 10 }}>
                            <TextInput ref={mathInputRef} style={styles.mathInput} value={mathInput} onChangeText={setMathInput} keyboardType="numeric" returnKeyType="done" onSubmitEditing={handleMathSubmit} placeholder="?" placeholderTextColor="#4A5568" editable={mathActive} onFocus={() => setTimeout(() => mathScrollRef.current?.scrollToEnd({ animated: true }), 200)}/>
                            <TouchableOpacity onPress={handleMathSubmit} style={{ backgroundColor: '#FFD700', paddingHorizontal: 24, borderRadius: 12, justifyContent: 'center' }}>
                              <Ionicons name="checkmark" size={28} color="#0D1B4B" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : null}

                      {mathGameOver ? (
                        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                          <Text style={{ fontSize: 60 }}>{mathScore >= 200 ? '🏅' : mathScore >= 100 ? '🥇' : mathScore >= 50 ? '🥈' : '📚'}</Text>
                          <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: 26, marginTop: 12 }}>{mathScore >= 200 ? 'GENIUS!' : mathScore >= 100 ? 'EXCELLENT!' : mathScore >= 50 ? 'GOOD EFFORT!' : 'KEEP PRACTISING!'}</Text>
                          
                          <View style={{ backgroundColor: '#1A237E', borderRadius: 16, padding: 20, width: '100%', marginTop: 20, marginBottom: 20 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                              <View style={{ alignItems: 'center' }}><Text style={{ color: '#FFD700', fontSize: 32, fontWeight: '900' }}>{mathScore}</Text><Text style={{ color: '#90CAF9', fontSize: 11 }}>SCORE</Text></View>
                            </View>
                            <Text style={{ color: '#90CAF9', textAlign: 'center', marginTop: 10, fontSize: 12 }}>Brain Points earned: +{Math.floor(mathScore)} pts</Text>
                          </View>

                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={startMathBlitz} style={{ backgroundColor: '#FFD700', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 25 }}><Text style={{ color: '#0D1B4B', fontWeight: '900', fontSize: 15 }}>Play Again ⚡</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => setActiveGame('hub')} style={{ backgroundColor: '#2D3748', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 25 }}><Text style={{ color: '#FFF', fontWeight: '900', fontSize: 15 }}>Hub 🎮</Text></TouchableOpacity>
                          </View>
                        </View>
                      ) : null}
                    </ScrollView>
                  ) : null}


                 {/* 🔠 WORD SCRAMBLE SCREEN */}
{activeGame === 'wordscramble' ? (
  <ScrollView
    ref={wordScrollRef}
    style={{ backgroundColor: '#44337A', borderRadius: 20, minHeight: 420 }}
    contentContainerStyle={{ padding: 20, paddingBottom: 350 }}
    keyboardShouldPersistTaps="handled"
  >
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      {/* ✅ FIX 1: Exit goes directly back to hub */}
      <TouchableOpacity
  onPress={() => {
    if (wordTimerRef.current) clearInterval(wordTimerRef.current);
setWordActive(false);
setWordGameOver(false);
    setActiveGame('hub');
  }}
  style={{ flexDirection: 'row', alignItems: 'center' }}
>
  <Ionicons name="arrow-back" size={20} color="#FFD700" />
  <Text style={{ color: '#FFD700', fontWeight: 'bold', marginLeft: 4 }}>Exit</Text>
</TouchableOpacity>
      <Text style={{ color: '#E9D8FD', fontWeight: '900', fontSize: 16, letterSpacing: 2 }}>🔠 SCRAMBLE</Text>
    </View>

    {wordActive && currentWord ? (
      <View style={{ alignItems: 'center' }}>
        <View style={styles.mathTimerBar}>
          <View style={{ height: '100%', borderRadius: 6, width: `${(wordTimeLeft/45)*100}%`, backgroundColor: wordTimeLeft > 20 ? '#9F7AEA' : wordTimeLeft > 10 ? '#D69E2E' : '#E53E3E' }} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 16 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: wordTimeLeft <= 10 ? '#FC8181' : '#E9D8FD', fontSize: 28, fontWeight: '900' }}>{wordTimeLeft}s</Text>
            <Text style={{ color: '#D6BCFA', fontSize: 10 }}>TIME LEFT</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: '#9AE6B4', fontSize: 28, fontWeight: '900' }}>{wordScore}</Text>
            <Text style={{ color: '#D6BCFA', fontSize: 10 }}>SCORE</Text>
          </View>
        </View>

        <View style={{ backgroundColor: '#2D3748', borderRadius: 16, padding: 24, width: '100%', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: '#9F7AEA' }}>
          <Text style={{ color: '#D6BCFA', fontSize: 12, letterSpacing: 2, marginBottom: 8 }}>UNSCRAMBLE THIS</Text>
          <Text style={{ color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: 4 }}>{currentWord.scrambled}</Text>
        </View>

        {wordFeedback !== '' ? (
          <View style={{ backgroundColor: wordFeedback.startsWith('✅') ? '#276749' : '#9B2C2C', padding: 10, borderRadius: 10, marginBottom: 12, width: '100%', alignItems: 'center' }}>
            <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 15 }}>{wordFeedback}</Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', width: '100%', gap: 10 }}>
          <TextInput
            ref={wordInputRef}
            style={[styles.mathInput, { backgroundColor: '#2D3748', color: '#FFF', borderColor: '#9F7AEA' }]}
            value={wordInput}
            onChangeText={setWordInput}
            autoCapitalize="characters"
            returnKeyType="done"
            onSubmitEditing={handleWordSubmit}
            placeholder="Type word here..."
            placeholderTextColor="#4A5568"
            editable={wordActive}
            onFocus={() => {
              setTimeout(() => {
                wordScrollRef.current?.scrollToEnd({ animated: true });
              }, 300);
            }}
          />
          <TouchableOpacity onPress={handleWordSubmit} style={{ backgroundColor: '#9F7AEA', paddingHorizontal: 24, borderRadius: 12, justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    ) : null}

    {wordGameOver ? (
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <Text style={{ fontSize: 60 }}>{wordScore >= 200 ? '🏅' : wordScore >= 100 ? '🥇' : wordScore >= 50 ? '🥈' : '📚'}</Text>
        <Text style={{ color: '#E9D8FD', fontWeight: '900', fontSize: 26, marginTop: 12 }}>{wordScore >= 200 ? 'WORDSMITH!' : wordScore >= 100 ? 'EXCELLENT!' : wordScore >= 50 ? 'GOOD EFFORT!' : 'KEEP PRACTISING!'}</Text>
        <View style={{ backgroundColor: '#2D3748', borderRadius: 16, padding: 20, width: '100%', marginTop: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#9AE6B4', fontSize: 32, fontWeight: '900' }}>{wordScore}</Text>
              <Text style={{ color: '#D6BCFA', fontSize: 11 }}>SCORE</Text>
            </View>
          </View>
          <Text style={{ color: '#D6BCFA', textAlign: 'center', marginTop: 10, fontSize: 12 }}>Brain Points earned: +{Math.floor(wordScore)} pts</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={startWordScramble} style={{ backgroundColor: '#9F7AEA', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 25 }}>
            <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 15 }}>Play Again 🔠</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveGame('hub')} style={{ backgroundColor: '#1A202C', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 25 }}>
            <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 15 }}>Hub 🎮</Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : null}
  </ScrollView>
) : null}
                  {/* 👾 BOSS BATTLE ACTIVE SCREEN */}
                  {activeGame === 'bossbattle' && (
                    <View style={[styles.gameContainer, { backgroundColor: '#1C0F2E' }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 15 }}>
                        <TouchableOpacity onPress={() => setActiveGame('hub')} style={styles.backBtn}>
                          <Text style={styles.backBtnTxt}>⬅️ Flee</Text>
                        </TouchableOpacity>
                        <Text style={{ fontWeight: 'bold', color: '#FFF' }}>Player HP: {playerHP}</Text>
                      </View>
                      {!bossGameOver && !totalVictory ? (
                        <View style={{ width: '100%', alignItems: 'center' }}>
                          <Text style={{ fontSize: 60, marginBottom: 10 }}>{activeBoss.emoji}</Text>
                          <Text style={{ color: activeBoss.color, fontSize: 20, fontWeight: 'bold' }}>{activeBoss.name}</Text>
                          <Text style={{ color: '#FC8181', marginBottom: 20 }}>Boss HP: {bossHP}</Text>
                          <View style={styles.questionCard}>
                            <Text style={styles.questionText}>{bossQ?.question}</Text>
                            {bossQ?.options.map((opt: string) => (
                              <TouchableOpacity key={opt} style={styles.bossOptBtn} onPress={() => handleBossAnswer(opt)} disabled={bossAnswered}>
                                <Text style={styles.bossOptText}>{opt}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      ) : (
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 50 }}>{totalVictory ? '🏆' : '💀'}</Text>
                          <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold', marginVertical: 20 }}>
                            {totalVictory ? 'YOU DEFEATED ALL BOSSES!' : 'YOU DIED.'}
                          </Text>
                          <TouchableOpacity style={styles.nextButton} onPress={startBossBattle}>
                            <Text style={styles.nextButtonText}>Try Again</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ) : null}

              {/* 🏆 RANK TAB */}
              {activeTab === 'rank' && (
                <View>
                  <View style={{ alignItems: 'center', marginBottom: 20 }}>
                    <Ionicons name="trophy" size={60} color="#D69E2E" />
                    <Text style={styles.sectionTitle}>{isGamer ? 'Global Leaderboard' : 'School Leaderboard'}</Text>
                    <Text style={{ color: '#718096', fontSize: 13, textAlign: 'center' }}>XP synchronizes in real-time!</Text>
                  </View>
                  <View style={styles.leaderboardContainer}>
                    {leaderboard.length > 0 ? leaderboard.map((student, index) => {
                      const isMe = student.user_id === profile?.id;
                      let medalColor = '#A0AEC0';
                      if (index === 0) medalColor = '#D69E2E';
                      else if (index === 1) medalColor = '#718096';
                      else if (index === 2) medalColor = '#975A16';
                      return (
                        <View key={index} style={[styles.leaderboardRow, isMe ? { backgroundColor: '#EBF8FF' } : null]}>
                          <View style={styles.rankCircle}><Text style={styles.rankNum}>{index + 1}</Text></View>
                          <Text style={{ flex: 1, fontWeight: isMe ? '900' : '600', color: isMe ? '#1A365D' : '#4A5568' }}>
                            {student.full_name} {isMe ? '(You)' : ''}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ fontWeight: 'bold', color: '#718096' }}>{student.brain_points} XP</Text>
                            {index < 3 && <Ionicons name="medal" size={16} color={medalColor} style={{ marginLeft: 5 }} />}
                          </View>
                        </View>
                      );
                    }) : <Text style={{ textAlign: 'center', padding: 20, color: '#A0AEC0' }}>No players found.</Text>}
                  </View>
                  <TouchableOpacity onPress={() => syncXPToDatabase(0)} style={{ marginTop: 30, padding: 15, backgroundColor: '#FED7D7', borderRadius: 8, alignItems: 'center' }}>
                    <Text style={{ color: '#E53E3E', fontWeight: 'bold' }}>Reset My XP (Start Over)</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* 💬 FLOATING WHATSAPP BUTTON */}
        <TouchableOpacity style={styles.floatingChatBtn} onPress={() => setIsChatOpen(true)}>
          <Ionicons name="logo-whatsapp" size={36} color="#FFF" />
        </TouchableOpacity>

        {/* 💬 CHAT MODAL */}
        <Modal visible={isChatOpen} animationType="slide" transparent={false} onRequestClose={() => setIsChatOpen(false)}>
          <View style={{ flex: 1, backgroundColor: '#075E54' }}>
            <View style={styles.chatModalHeader}>
              <TouchableOpacity onPress={() => setIsChatOpen(false)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="arrow-back" size={26} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 10 }}>Back to Dashboard</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, backgroundColor: '#FFF' }}>
              <ChatTab />
            </View>
          </View>
        </Modal>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 100 },
  scrollContainer: { padding: 20, paddingBottom: 100 },
  topNav: { backgroundColor: '#FFF', paddingHorizontal: 15, paddingTop: 10, paddingBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, elevation: 3 },
  greeting: { fontSize: 22, fontWeight: '900', color: '#1A365D' },
  subText: { fontSize: 13, color: '#4A5568', marginTop: 2, fontWeight: 'bold' },
  logoutButton: { padding: 8, backgroundColor: '#FED7D7', borderRadius: 10, alignSelf: 'center', marginRight: 5 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#EDF2F7', borderRadius: 10, padding: 4, marginTop: 10 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8 },
  tabBtnActive: { backgroundColor: '#1A365D', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 11, fontWeight: 'bold', color: '#718096', marginLeft: 4 },
  tabTextActive: { color: '#FFFFFF' },
  idCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2, borderWidth: 1, borderColor: '#E2E8F0' },
  avatarBubble: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EBF8FF', alignItems: 'center', justifyContent: 'center', marginRight: 15, borderWidth: 2, borderColor: '#3182CE' },
  avatarText: { fontSize: 18, fontWeight: '900', color: '#3182CE' },
  studentName: { fontSize: 18, fontWeight: '900', color: '#1A365D' },
  studentDetails: { fontSize: 12, color: '#718096', fontWeight: '600' },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEFCBF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  pointsText: { fontSize: 11, fontWeight: '900', marginLeft: 4 },
  progressBarBg: { height: 8, backgroundColor: '#EDF2F7', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  quoteCard: { backgroundColor: '#FEFCBF', padding: 15, borderRadius: 12, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#F6E05E' },
  quoteText: { fontSize: 13, fontStyle: 'italic', color: '#744210', textAlign: 'center', fontWeight: 'bold' },
  financeCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderLeftWidth: 4, borderColor: '#E2E8F0', elevation: 2 },
  financeTitle: { fontSize: 16, fontWeight: '900', marginBottom: 10 },
  financeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  financeLabel: { fontSize: 14, color: '#4A5568', fontWeight: '600' },
  financeValue: { fontSize: 14, fontWeight: 'bold', color: '#2D3748' },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 15 },
  timetableContainer: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  ttRow: { borderBottomWidth: 1, borderBottomColor: '#EDF2F7', padding: 15 },
  ttDay: { fontSize: 14, fontWeight: '900', marginBottom: 5 },
  ttSubjects: { fontSize: 13, color: '#4A5568', lineHeight: 20 },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  actionIconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FEEBC8', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  actionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
  actionDesc: { fontSize: 12, color: '#718096', marginTop: 3 },
  newsToggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  newsToggleText: { fontSize: 14, fontWeight: 'bold', color: '#A0AEC0' },
  newsCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#D69E2E', elevation: 1 },
 newsAuthor: { fontSize: 14, fontWeight: 'bold', color: '#2D3748', marginBottom: 5 },
  newsDate: { fontSize: 10, color: '#A0AEC0', fontWeight: 'bold' },
  newsContent: { fontSize: 14, color: '#4A5568', lineHeight: 22 },
  gameHubCard: { width: '100%' as any, borderRadius: 16, padding: 20, marginBottom: 14, flexDirection: 'row', alignItems: 'center' },
  gameContainer: { alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 16, elevation: 2, borderWidth: 1, borderColor: '#E2E8F0' },
  gameContainerOnFire: { borderColor: '#DD6B20', borderWidth: 2, backgroundColor: '#FFFAF0' }, 
  streakBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  restartBtn: { marginLeft: 10, padding: 6, borderRadius: 20 },
  questionCard: { width: '100%' as any, backgroundColor: '#F7FAFC', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  questionText: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  optBtn: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E0', marginBottom: 10, alignItems: 'center' },
  optText: { fontSize: 16, fontWeight: 'bold', color: '#4A5568' },
  bossOptBtn: { backgroundColor: '#2D1B69', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#4A5568', marginBottom: 10, alignItems: 'center' },
  bossOptText: { fontSize: 14, fontWeight: 'bold', color: '#E9D8FD' },
  nextButton: { paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25, elevation: 3, width: '100%' as any, alignItems: 'center' },
  nextButtonText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  mathTimerBar: { width: '100%', height: 12, backgroundColor: '#1A237E', borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  mathInput: { flex: 1, backgroundColor: '#1A237E', color: '#FFD700', fontSize: 24, fontWeight: '900', textAlign: 'center', padding: 14, borderRadius: 12, borderWidth: 2, borderColor: '#4A5568' },
  bossHPBar: { width: '100%', height: 14, backgroundColor: '#2D1B69', borderRadius: 7, overflow: 'hidden' },
  playerHPBar: { width: '100%', height: 10, backgroundColor: '#2D1B69', borderRadius: 5, overflow: 'hidden' },
  leaderboardContainer: { backgroundColor: '#FFF', borderRadius: 16, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', width: '100%' },
  leaderboardRow: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#EDF2F7', alignItems: 'center' },
  rankCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EDF2F7', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  rankNum: { fontSize: 14, fontWeight: 'bold', color: '#4A5568' },
  linkCard: { backgroundColor: '#FFF', padding: 30, borderRadius: 16, alignItems: 'center', marginTop: 20, elevation: 2 },
  linkTitle: { fontSize: 22, fontWeight: '900', marginBottom: 10 },
  linkDesc: { fontSize: 14, color: '#718096', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  input: { width: '100%', backgroundColor: '#F7FAFC', borderRadius: 10, padding: 15, fontSize: 16, color: '#2D3748', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
  linkButton: { width: '100%', backgroundColor: '#38A169', padding: 16, borderRadius: 10, alignItems: 'center' },
  linkButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  floatingChatBtn: { position: 'absolute', bottom: 25, right: 20, backgroundColor: '#25D366', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, zIndex: 9999 },
  chatModalHeader: { backgroundColor: '#075E54', paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 15, paddingHorizontal: 20, elevation: 4, zIndex: 10 },
  backBtn: { backgroundColor: '#EDF2F7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  backBtnTxt: { color: '#4A5568', fontWeight: 'bold' }
});