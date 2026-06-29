import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, FlatList, Image, Keyboard,
  KeyboardAvoidingView, Linking, Modal, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity,
  TouchableWithoutFeedback, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AskAI from '../components/AskAI';
import { registerForPush } from '../src/lib/registerPush';
import { supabase } from '../src/lib/supabase';

// ─────────────────────────────────────────────
// INTERFACES & CONSTANTS
// ─────────────────────────────────────────────
interface UserProfile {
  id: string; full_name: string; role: string;
  email: string; school_id: string; phone_number?: string; phone?: string;
}
interface Message {
  id: string; sender_id: string; receiver_id: string; content: string;
  is_read: boolean; created_at: string; school_id?: string; _opt?: boolean;
}

const teacherQuotes = [
  'Teaching is the greatest act of optimism. 🌟',
  'A good teacher can inspire hope, ignite the imagination, and instill a love of learning. 📚',
  'It is the supreme art of the teacher to awaken joy in creative expression and knowledge. 🎨',
];

const P = {
  headerBg: '#075E54', accent: '#25D366', chatBg: '#E5DDD5',
  sentBg: '#DCF8C6', recvBg: '#FFFFFF', msgColor: '#111B21',
  timeColor: '#667781', tickGray: '#8696A0', tickBlue: '#53BDEB',
  inputBg: '#FFFFFF', barBg: '#F0F2F5', border: '#E9EDEF', listBg: '#F0F2F5',
};
const roleClr = (r = '') => {
  const v = r.toLowerCase();
  if (v.includes('student')) return '#25D366';
  if (v.includes('teacher')) return '#FF8C00';
  if (v.includes('parent')) return '#3B82F6';
  if (v.includes('bursar')) return '#8B5CF6';
  if (v.includes('principal') || v.includes('admin')) return '#E53E3E';
  return '#667781';
};
const EMOJIS = ['😀','😂','😍','🤔','😢','😡','👍','👎','🙏','🎉','❤️','💔','💯','🔥','👋','😎'];
const getInitials = (name: string) =>
  name ? name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '👨‍🏫';
const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

const IMAGE_PREFIX = '[IMAGE_BASE64]:';
const AUDIO_PREFIX = '[AUDIO_BASE64]:';
const isImageMsg = (t: string) => t.startsWith(IMAGE_PREFIX);
const getImageUrl = (t: string) => t.startsWith(IMAGE_PREFIX) ? t.replace(IMAGE_PREFIX, '') : t;
const isAudioMsg = (t: string) => t.startsWith(AUDIO_PREFIX);
const getAudioUrl = (t: string) => t.replace(AUDIO_PREFIX, '');

// ─────────────────────────────────────────────
// CHAT SUB-COMPONENTS
// ─────────────────────────────────────────────
function Avatar({ name = '', size = 44 }: { name?: string; size?: number }) {
  const palette = ['#25D366','#128C7E','#075E54','#34B7F1','#ECB22E','#E53E3E','#805AD5','#3182CE'];
  const bg = palette[Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg + '30', borderWidth: 1.5, borderColor: bg + '70', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: bg, fontWeight: '900', fontSize: size * 0.36 }}>{getInitials(name)}</Text>
    </View>
  );
}

function Tick({ read }: { read: boolean }) {
  return <Text style={{ color: read ? P.tickBlue : P.tickGray, fontSize: 12, marginLeft: 3 }}>{read ? '✓✓' : '✓'}</Text>;
}

function AudioMessagePlayer({ url, mine }: { url: string; mine: boolean }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  async function playSound() {
    if (isPlaying && sound) { await sound.pauseAsync(); setIsPlaying(false); return; }
    try {
      const { sound: s } = await Audio.Sound.createAsync({ uri: url });
      setSound(s); await s.playAsync(); setIsPlaying(true);
      s.setOnPlaybackStatusUpdate(st => {
        if (st.isLoaded && st.didJustFinish) { setIsPlaying(false); s.unloadAsync(); }
      });
    } catch { Alert.alert('Playback Error', 'Could not play this voice note.'); }
  }
  useEffect(() => () => { sound?.unloadAsync(); }, [sound]);
  return (
    <TouchableOpacity onPress={playSound} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: mine ? '#C6E8B3' : '#F0F2F5', padding: 8, borderRadius: 10, minWidth: 150 }}>
      <Ionicons name={isPlaying ? 'pause-circle' : 'play-circle'} size={28} color={P.headerBg} />
      <View style={{ flex: 1, marginLeft: 8 }}><View style={{ height: 3, backgroundColor: '#A0AEC0', borderRadius: 2, width: '100%' as any }} /></View>
    </TouchableOpacity>
  );
}

function ContactsList({ me, contacts, lastMsgs, onOpen }: any) {
  const [q, setQ] = useState('');
  const sorted = [...contacts]
    .filter(c => (c.full_name?.toLowerCase() || '').includes(q.toLowerCase()) || (c.role?.toLowerCase() || '').includes(q.toLowerCase()))
    .sort((a, b) => { const ta = lastMsgs[a.id]?.created_at || ''; const tb = lastMsgs[b.id]?.created_at || ''; return tb > ta ? 1 : -1; });
  return (
    <View style={{ flex: 1, backgroundColor: P.listBg }}>
      <View style={[cl.hdr, { paddingTop: 20 }]}><Text style={cl.hdrTitle}>EduChat</Text></View>
      <View style={cl.searchBox}>
        <Ionicons name="search" size={16} color={P.timeColor} style={{ marginRight: 8 }} />
        <TextInput style={{ flex: 1, fontSize: 15, color: '#111' }} placeholder="Search directory..." placeholderTextColor={P.timeColor} value={q} onChangeText={setQ} />
        {q.length > 0 && <TouchableOpacity onPress={() => setQ('')}><Ionicons name="close-circle" size={18} color={P.timeColor} /></TouchableOpacity>}
      </View>
      <Text style={cl.sectionLbl}>DIRECTORY ({sorted.length})</Text>
      <FlatList
        data={sorted} keyExtractor={it => it.id} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 0.5, backgroundColor: P.border, marginLeft: 78 }} />}
        renderItem={({ item }) => {
          const last = lastMsgs[item.id];
          const unread = last && !last.is_read && last.sender_id !== me?.id;
          const rc = roleClr(item.role);
          const preview = last ? (isImageMsg(last.content) ? '📷 Image' : isAudioMsg(last.content) ? '🎤 Voice Note' : last.content) : '';
          return (
            <TouchableOpacity style={cl.row} onPress={() => onOpen(item)} activeOpacity={0.65}>
              <View style={{ position: 'relative' }}><Avatar name={item.full_name} size={50} /><View style={[cl.dot, { backgroundColor: rc }]} /></View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[cl.name, unread && { fontWeight: '900' }]} numberOfLines={1}>{item.full_name}</Text>
                  {last && <Text style={[cl.time, unread && { color: P.accent, fontWeight: '700' }]}>{formatTime(last.created_at)}</Text>}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[cl.role, { color: rc }]}>{item.role}</Text>
                    {last && <Text style={cl.preview} numberOfLines={1}>{'  '}{last.sender_id === me?.id ? 'You: ' : ''}{preview}</Text>}
                  </View>
                  {unread ? <View style={cl.badge}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>●</Text></View>
                    : !last && <Ionicons name="chatbubble-ellipses-outline" size={18} color="#CBD5E0" />}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<View style={{ alignItems: 'center', marginTop: 80 }}><Ionicons name="people-circle-outline" size={70} color="#CBD5E0" /><Text style={{ color: '#A0AEC0', marginTop: 12, fontSize: 15, fontWeight: '700', textAlign: 'center' }}>No contacts found</Text></View>}
      />
    </View>
  );
}

function ChatConvo({ me, contact, onBack, onRefreshList }: { me: UserProfile; contact: UserProfile; onBack: () => void; onRefreshList: () => void; }) {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEmoji, setShowEmoji] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const flatRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    fetchMsgs(); markRead();
    const channel = supabase.channel(`chat_${[me.id, contact.id].sort().join('_')}_${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const m = payload.new as Message;
        if (m.school_id !== me.school_id) return;
        const ok = (m.sender_id === me.id && m.receiver_id === contact.id) || (m.sender_id === contact.id && m.receiver_id === me.id);
        if (!ok) return;
        setMsgs(prev => { if (prev.find(p => p.id === m.id)) return prev; return [m, ...prev]; });
        if (m.sender_id === contact.id) { markRead(); if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [contact.id]);

  // ⌨️ Lift the input bar above the Android keyboard (works inside the Modal)
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', e => setKbHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const fetchMsgs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('messages').select('*').eq('school_id', me.school_id)
      .or(`and(sender_id.eq.${me.id},receiver_id.eq.${contact.id}),and(sender_id.eq.${contact.id},receiver_id.eq.${me.id})`)
      .order('created_at', { ascending: false }).limit(300);
    if (data) setMsgs(data);
    setLoading(false);
  }, [me.id, contact.id]);

  const markRead = useCallback(async () => {
    await supabase.from('messages').update({ is_read: true }).eq('school_id', me.school_id).eq('sender_id', contact.id).eq('receiver_id', me.id).eq('is_read', false);
  }, [me.id, contact.id]);

  const handleAttachImage = async (useCamera: boolean) => {
    try {
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.2, base64: true })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.2, base64: true, mediaTypes: ImagePicker.MediaTypeOptions.Images });
      if (!result.canceled && result.assets?.[0].base64) {
        setSending(true);
        await sendMsg(`${IMAGE_PREFIX}data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch { setSending(false); Alert.alert('Camera Error', 'Ensure camera permissions are allowed.'); }
  };

  const startRecording = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Voice Notes', 'Voice recording works in the EduSalone mobile app. Please use your phone to send voice notes.');
      return;
    }
    try {
      if (recording) { try { await recording.stopAndUnloadAsync(); } catch {} setRecording(null); }
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') { Alert.alert('Permission Denied', 'Please enable microphone access in settings.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec); setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (err: any) {
      setIsRecording(false); setRecording(null);
      Alert.alert('Mic Error', err.message || 'Could not access microphone.');
    }
  };

  const stopRecordingAndSend = async () => {
    if (!recording) { setIsRecording(false); return; }
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI(); setRecording(null);
      // Reset audio mode so playback is at full volume afterwards
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      if (uri) {
        setSending(true);
        const b64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
        await sendMsg(`${AUDIO_PREFIX}data:audio/m4a;base64,${b64}`);
      }
    } catch { setIsRecording(false); setSending(false); setRecording(null); }
  };

  const sendMsg = async (body = text.trim()) => {
    if (!body || sending) return;
    Keyboard.dismiss(); setShowEmoji(false); setText(''); setSending(true);
    const opt: Message = { id: `opt_${Date.now()}`, sender_id: me.id, receiver_id: contact.id, content: body, is_read: false, created_at: new Date().toISOString(), _opt: true };
    setMsgs(prev => [opt, ...prev]);
    const { data, error } = await supabase.from('messages').insert({ school_id: me.school_id, sender_id: me.id, receiver_id: contact.id, sender_name: me.full_name, sender_role: me.role, content: body, is_read: false }).select().single();
    if (error) { setMsgs(prev => prev.filter(m => m.id !== opt.id)); setText(isImageMsg(body) || isAudioMsg(body) ? '' : body); Alert.alert('Delivery Failed', error.message); }
    else if (data) { setMsgs(prev => prev.map(m => m.id === opt.id ? data as Message : m)); onRefreshList(); }
    setSending(false);
  };

  const handlePhoneCall = () => {
    const phone = contact.phone_number || contact.phone;
    if (phone) Linking.openURL(`tel:${phone}`);
    else Alert.alert('No Number', `${contact.full_name} does not have a registered phone number.`);
  };

  const handleMessageLongPress = (msg: Message) => {
    if (msg.sender_id !== me.id) return;
    const doDelete = async () => { setMsgs(prev => prev.filter(m => m.id !== msg.id)); await supabase.from('messages').delete().eq('school_id', me.school_id).eq('id', msg.id); };
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this message?')) doDelete();
      return;
    }
    Alert.alert('Message Options', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => doDelete() },
    ]);
  };

  const isMine = (m: Message) => m.sender_id === me?.id;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: P.chatBg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Modal visible={!!fullScreenImage} transparent animationType="fade" onRequestClose={() => { setFullScreenImage(null); setImageZoom(1); }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.96)' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 50, right: 20, zIndex: 20, padding: 10 }} onPress={() => { setFullScreenImage(null); setImageZoom(1); }}>
            <Ionicons name="close-circle" size={40} color="#FFF" />
          </TouchableOpacity>

          <ScrollView
            style={{ flex: 1 }}
            horizontal
            bounces={false}
            maximumZoomScale={4}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}>
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
              {fullScreenImage && (
                <Image
                  source={{ uri: fullScreenImage }}
                  style={{ width: Dimensions.get('window').width * imageZoom, height: Dimensions.get('window').height * 0.8 * imageZoom }}
                  resizeMode="contain" />
              )}
            </ScrollView>
          </ScrollView>

          <View style={{ position: 'absolute', bottom: 40, alignSelf: 'center', flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 32, padding: 6 }}>
            <TouchableOpacity onPress={() => setImageZoom(z => Math.max(1, +(z - 0.5).toFixed(1)))} style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#2D3748', alignItems: 'center', justifyContent: 'center', marginHorizontal: 6 }}>
              <Ionicons name="remove" size={26} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setImageZoom(1)} style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#2D3748', alignItems: 'center', justifyContent: 'center', marginHorizontal: 6 }}>
              <Ionicons name="refresh" size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setImageZoom(z => Math.min(4, +(z + 0.5).toFixed(1)))} style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#2D3748', alignItems: 'center', justifyContent: 'center', marginHorizontal: 6 }}>
              <Ionicons name="add" size={26} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={[cc.hdr, { paddingTop: 20 }]}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ marginRight: 4 }}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => Alert.alert(contact.full_name, `Role: ${contact.role}`)}>
          <Avatar name={contact.full_name} size={40} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={cc.hdrName} numberOfLines={1}>{contact.full_name}</Text>
            <Text style={[cc.hdrRole, { color: roleClr(contact.role) + 'DD' }]}>{contact.role}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={cc.hdrBtn} onPress={handlePhoneCall}><Ionicons name="call-outline" size={21} color="#fff" /></TouchableOpacity>
      </View>

      <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setShowEmoji(false); }}>
        <View style={{ flex: 1 }}>
          {loading
            ? <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={P.headerBg} /></View>
            : <FlatList
                ref={flatRef} data={msgs} keyExtractor={item => item.id} inverted
                contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 8 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const mine = isMine(item);
                  return (
                    <TouchableOpacity onLongPress={() => handleMessageLongPress(item)} activeOpacity={0.9}>
                      <View style={[cc.row, mine ? cc.rowRight : cc.rowLeft]}>
                        {!mine && <View style={{ alignSelf: 'flex-end', marginRight: 5, marginBottom: 2 }}><Avatar name={contact.full_name} size={26} /></View>}
                        <View style={[cc.bubble, mine ? cc.bubbleSent : cc.bubbleRecv, item._opt && { opacity: 0.65 }]}>
                          <View style={mine ? cc.tailRight : cc.tailLeft} />
                          {isImageMsg(item.content)
                            ? <TouchableOpacity onPress={() => { setFullScreenImage(getImageUrl(item.content)); setImageZoom(1); }} onLongPress={() => handleMessageLongPress(item)} activeOpacity={0.8}><Image source={{ uri: getImageUrl(item.content) }} style={{ width: 220, height: 220, borderRadius: 8, marginVertical: 4 }} resizeMode="cover" /></TouchableOpacity>
                            : isAudioMsg(item.content)
                              ? <AudioMessagePlayer url={getAudioUrl(item.content)} mine={mine} />
                              : <Text style={cc.msgTxt} selectable>{item.content}</Text>}
                          <View style={cc.meta}>
                            <Text style={cc.timeTxt}>{formatTime(item.created_at)}</Text>
                            {mine && <Tick read={item.is_read} />}
                            {item._opt && <Text style={{ color: P.timeColor, fontSize: 10, marginLeft: 3 }}>⌛</Text>}
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', marginTop: 90, paddingHorizontal: 30, transform: [{ scaleY: -1 }] }}>
                    <View style={cc.encryptBox}><Text style={cc.encryptTxt}>🔒 Messages are sent over a secure, encrypted connection.{'\n'}They stay private to your school.</Text></View>
                  </View>
                }
              />}
        </View>
      </TouchableWithoutFeedback>

      <View style={[cc.inputBar, { marginBottom: Platform.OS === 'android' ? kbHeight : 0 }]}>
        <View style={cc.inputWrap}>
          <TouchableOpacity style={{ paddingHorizontal: 8 }} onPress={() => { if (showEmoji) { setShowEmoji(false); setTimeout(() => inputRef.current?.focus(), 100); } else { Keyboard.dismiss(); setShowEmoji(true); } }}>
            <Ionicons name={showEmoji ? 'keypad-outline' : 'happy-outline'} size={24} color={showEmoji ? P.headerBg : P.timeColor} />
          </TouchableOpacity>
          <TextInput ref={inputRef} style={cc.input} placeholder="Message" placeholderTextColor={P.timeColor} value={text} onChangeText={setText} multiline maxLength={4000} onFocus={() => setShowEmoji(false)} />
          <TouchableOpacity style={{ paddingHorizontal: 8 }} onPress={() => handleAttachImage(false)}><Ionicons name="attach" size={24} color={P.timeColor} /></TouchableOpacity>
          {text.trim().length === 0 && <TouchableOpacity style={{ paddingRight: 6 }} onPress={() => handleAttachImage(true)}><Ionicons name="camera-outline" size={24} color={P.timeColor} /></TouchableOpacity>}
        </View>
        <TouchableOpacity
          style={[cc.sendBtn, { backgroundColor: text.trim().length > 0 ? P.headerBg : (isRecording ? '#E53E3E' : P.accent), marginLeft: 8 }]}
          onPress={() => { if (text.trim().length > 0) sendMsg(); }}
          onPressIn={() => { if (text.trim().length === 0) startRecording(); }}
          onPressOut={() => { if (isRecording) stopRecordingAndSend(); }}
          activeOpacity={0.8} disabled={sending}>
          {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name={text.trim().length > 0 ? 'send' : 'mic'} size={20} color="#fff" style={text.trim().length > 0 ? { marginLeft: 2 } : undefined} />}
        </TouchableOpacity>
      </View>

      {showEmoji && (
        <View style={cc.emojiPanel}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 8, justifyContent: 'center' }}>
              {EMOJIS.map((em, i) => <TouchableOpacity key={i} style={cc.emojiBtn} onPress={() => setText(prev => prev + em)}><Text style={{ fontSize: 26 }}>{em}</Text></TouchableOpacity>)}
            </View>
          </ScrollView>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────
// STUDENT GRADE ROW
// ─────────────────────────────────────────────
const StudentGradeRow = ({ student, initialGrade, onGradeUpdate, onDelete }: any) => {
  const [t1, setT1] = useState(initialGrade?.test1 || '');
  const [t2, setT2] = useState(initialGrade?.test2 || '');
  const [ex, setEx] = useState(initialGrade?.exam || '');
  const [mn, setMn] = useState(initialGrade?.mean || '');
  const [rnk, setRnk] = useState(initialGrade?.rank || '');

  // Sync auto-rank from parent
  useEffect(() => {
    if (initialGrade?.rank && initialGrade.rank !== rnk) setRnk(initialGrade.rank);
  }, [initialGrade?.rank]);

  const total = (Number(t1) || 0) + (Number(t2) || 0) + (Number(ex) || 0);
  const isError = total > 100 || Number(t1) > 15 || Number(t2) > 15 || Number(ex) > 70;
  const isJSS = (student.current_class || '').toUpperCase().includes('JSS');

  let grade = 'F9'; let remark = 'FAIL';
  if (isJSS) {
    if (total >= 75) { grade = '1'; remark = 'EXCELLENT'; }
    else if (total >= 65) { grade = '2'; remark = 'V. GOOD'; }
    else if (total >= 55) { grade = '3'; remark = 'GOOD'; }
    else if (total >= 45) { grade = '4'; remark = 'CREDIT'; }
    else if (total >= 35) { grade = '5'; remark = 'PASS'; }
    else { grade = '6'; remark = 'FAIL'; }
  } else {
    if (total >= 75) { grade = 'A1'; remark = 'EXCELLENT'; }
    else if (total >= 70) { grade = 'B2'; remark = 'V. GOOD'; }
    else if (total >= 65) { grade = 'B3'; remark = 'GOOD'; }
    else if (total >= 60) { grade = 'C4'; remark = 'CREDIT'; }
    else if (total >= 55) { grade = 'C5'; remark = 'CREDIT'; }
    else if (total >= 50) { grade = 'C6'; remark = 'CREDIT'; }
    else if (total >= 45) { grade = 'D7'; remark = 'PASS'; }
    else if (total >= 40) { grade = 'E8'; remark = 'PASS'; }
  }
  const gradeColor = (grade === 'F9' || grade === '6') ? '#E53E3E' : '#3182CE';

  useEffect(() => {
    onGradeUpdate(student.id, { test1: t1, test2: t2, exam: ex, mean: mn, rank: rnk, isError });
  }, [t1, t2, ex, mn, rnk]);

  return (
    <View style={[styles.studentRow, isError && { borderColor: '#E53E3E', borderWidth: 2, backgroundColor: '#FFF5F5' }]}>
      <View style={{ width: 140, paddingRight: 5 }}>
        <Text style={styles.studentName} numberOfLines={1}>{student.users?.full_name}</Text>
        <Text style={styles.admText}>{student.admission_number || 'No ADM No.'}</Text>
      </View>
      <TextInput style={styles.scoreInput} keyboardType="numeric" maxLength={2} placeholder="-" placeholderTextColor="#CBD5E0" value={t1} onChangeText={v => { const d = v.replace(/[^0-9]/g, ''); const n = Number(d); setT1(d === '' ? '' : (n > 15 ? '15' : d)); if (Platform.OS !== 'web') Haptics.selectionAsync(); }} />
      <TextInput style={styles.scoreInput} keyboardType="numeric" maxLength={2} placeholder="-" placeholderTextColor="#CBD5E0" value={t2} onChangeText={v => { const d = v.replace(/[^0-9]/g, ''); const n = Number(d); setT2(d === '' ? '' : (n > 15 ? '15' : d)); if (Platform.OS !== 'web') Haptics.selectionAsync(); }} />
      <TextInput style={styles.scoreInput} keyboardType="numeric" maxLength={2} placeholder="-" placeholderTextColor="#CBD5E0" value={ex} onChangeText={v => { const d = v.replace(/[^0-9]/g, ''); const n = Number(d); setEx(d === '' ? '' : (n > 70 ? '70' : d)); if (Platform.OS !== 'web') Haptics.selectionAsync(); }} />
      {/* TOT — auto-calculated total out of 100 */}
      <View style={[styles.autoBox, { backgroundColor: total > 0 ? '#EBF8FF' : 'transparent', borderRadius: 6, borderWidth: total > 0 ? 1.5 : 0, borderColor: '#3182CE', minWidth: 50 }]}>
        {isError
          ? <Text style={{ color: '#E53E3E', fontSize: 12, fontWeight: '900' as any, textAlign: 'center' }}>ERR</Text>
          : <Text style={{ color: total > 0 ? '#2C5282' : '#CBD5E0', fontSize: 14, fontWeight: '900' as any, textAlign: 'center' }}>{total > 0 ? total : '-'}</Text>}
      </View>
      {/* RNK — auto class rank */}
      <View style={[styles.autoBox, { backgroundColor: rnk ? '#FFFBEB' : 'transparent', borderRadius: 6, borderWidth: rnk ? 1.5 : 0, borderColor: '#F6AD55', minWidth: 50 }]}>
        <Text style={{ color: rnk ? '#B7791F' : '#CBD5E0', fontWeight: '900' as any, fontSize: 13, textAlign: 'center' }}>{rnk || '-'}</Text>
      </View>
      <View style={styles.autoBox}><Text style={[styles.autoText, { color: total > 0 ? gradeColor : '#718096' }]}>{total > 0 ? grade : '-'}</Text></View>
      <View style={[styles.autoBox, { width: 90 }]}><Text style={[styles.autoText, { fontSize: 10, color: '#4A5568' }]}>{total > 0 ? remark : '-'}</Text></View>
      <TouchableOpacity
        onPress={() => {
          const clear = () => { setT1(''); setT2(''); setEx(''); setMn(''); setRnk(''); if (onDelete) onDelete(student.id); };
          if (Platform.OS === 'web') { if (window.confirm(`Clear This Row?\n\nRemove grades for ${student.users?.full_name}?`)) clear(); return; }
          Alert.alert('Clear This Row?', `Remove grades for ${student.users?.full_name}?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear', style: 'destructive', onPress: () => clear() },
          ]);
        }}
        style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#FFF5F5', alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
        <Ionicons name="trash-outline" size={16} color="#E53E3E" />
      </TouchableOpacity>
    </View>
  );
};

// ─────────────────────────────────────────────
// MAIN TEACHER DASHBOARD
// ─────────────────────────────────────────────
export default function TeacherDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [mode, setMode] = useState<'grades' | 'evaluations' | 'attendance' | 'timetable' | 'bio' | 'feed' | 'chat' | 'review' | 'materials' | 'assignments' | 'documents'>('grades');
  const [pendingSubjects, setPendingSubjects] = useState<any[]>([]);
  const [approvedSubjects, setApprovedSubjects] = useState<any[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [calculatingRank, setCalculatingRank] = useState(false);
  const [previewSubject, setPreviewSubject] = useState<string | null>(null);
  const [previewGrades, setPreviewGrades] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [rejectingSubject, setRejectingSubject] = useState(false);
  const [dailyQuote, setDailyQuote] = useState('');
  const [impactScore, setImpactScore] = useState(0);

  // Materials states
  const [materials, setMaterials] = useState<any[]>([]);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialSubject, setMaterialSubject] = useState('');
  const [materialTarget, setMaterialTarget] = useState<'class' | 'all'>('class');

  // Assignment states
  const [assignments, setAssignments] = useState<any[]>([]);
  const [postingAssignment, setPostingAssignment] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({ title: '', instructions: '', subject: '', dueDate: '' });
  const [assignmentSubs, setAssignmentSubs] = useState<Record<string, number>>({});
  const [markingAssignment, setMarkingAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [markDrafts, setMarkDrafts] = useState<Record<string, { score: string; grade: string; feedback: string }>>({});
  const [savingMarkId, setSavingMarkId] = useState<string | null>(null);
  const [officeDocs, setOfficeDocs] = useState<any[]>([]);
  const [loadingOfficeDocs, setLoadingOfficeDocs] = useState(false);
  const [sendDocTitle, setSendDocTitle] = useState('');
  const [sendDocNote, setSendDocNote] = useState('');
  const [sendDocAudience, setSendDocAudience] = useState('office');
  const [sendingMyDoc, setSendingMyDoc] = useState(false);
  const [mySentDocs, setMySentDocs] = useState<any[]>([]);
  const [showMySent, setShowMySent] = useState(false);

  const classOptions = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];
  const termOptions = ['First Term', 'Second Term', 'Third Term'];
  const yearOptions = ['2025/2026', '2026/2027', '2027/2028', '2028/2029', '2029/2030'];
  const ratingOptions = [1, 2, 3, 4, 5];

  const [selectedClass, setSelectedClass] = useState('JSS1');
  const [term, setTerm] = useState('First Term');
  const [selectedYear, setSelectedYear] = useState('2025/2026');
  const [students, setStudents] = useState<any[]>([]);
  const [subject, setSubject] = useState('');
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [addingSubject, setAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [gradesMap, setGradesMap] = useState<any>({});
  const [gradeMode, setGradeMode] = useState<'class' | 'individual'>('class');
  const [individualStudent, setIndividualStudent] = useState<any | null>(null);

  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [singleGrade, setSingleGrade] = useState({ test1: '', test2: '', exam: '' });
  const [savingSingle, setSavingSingle] = useState(false);
  const [savedStudentIds, setSavedStudentIds] = useState<string[]>([]);
  const [evalSearchQuery, setEvalSearchQuery] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const PAGE_SIZE = 20;
  const [currentPage, setCurrentPage] = useState(0);

  const [evalStudent, setEvalStudent] = useState<any | null>(null);
  const [traits, setTraits] = useState({ attentiveness: 0, attitude: 0, cooperation: 0, neatness: 0, politeness: 0, punctuality: 0 });
  const [skills, setSkills] = useState({ drawing_painting: 0, handling_tools: 0, games: 0, handwriting: 0, music: 0, verbal_fluency: 0 });
  const [comments, setComments] = useState({ teacher: '', promotion: '' });

  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
  const todayDate = new Date().toISOString().split('T')[0];
  const formattedDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  const [timetableMap, setTimetableMap] = useState<Record<string, string>>({ Monday: '', Tuesday: '', Wednesday: '', Thursday: '', Friday: '' });
  const [printingTimetable, setPrintingTimetable] = useState(false);
  const [bioData, setBioData] = useState({ prefix: '', phone: '', address: '', dob: '', pob: '', qualifications: '' });
  const [news, setNews] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [lastMsgs, setLastMsgs] = useState<Record<string, Message>>({});
  const [selectedContact, setSelectedContact] = useState<any>(null);

  useEffect(() => {
    setDailyQuote(teacherQuotes[Math.floor(Math.random() * teacherQuotes.length)]);
    fetchTeacherData();
  }, []);
  useEffect(() => {
    if (profile) { loadStudentsForClass(); loadSubjects(); loadTimetable(); fetchNews(); fetchContacts(); setCurrentPage(0); setSavedStudentIds([]); setStudentSearchQuery(''); setIndividualStudent(null); }
  }, [selectedClass, profile]);
  useEffect(() => { if (evalStudent && mode === 'evaluations') loadExistingEvaluation(); }, [evalStudent, term]);
  useEffect(() => { if (mode === 'review' && profile) fetchPendingSubjects(); }, [mode, term, selectedYear, profile]);
  useEffect(() => { if (mode === 'attendance' && students.length > 0) loadTodayAttendance(); }, [mode, students]);
  useEffect(() => { if (mode === 'materials' && profile) loadMaterials(); }, [mode, profile]);
  useEffect(() => { if (mode === 'assignments' && profile) loadAssignments(); }, [mode, selectedClass, profile]);
  useEffect(() => { if (mode === 'documents' && profile) { loadDocuments(); loadMySentDocs(); } }, [mode, profile]);

  async function fetchTeacherData() {
    setLoading(true);
    await supabase.auth.refreshSession().catch(() => {});
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/'); return; }
    const { data: profileData } = await supabase.from('users').select('*, schools(name, logo_url)').eq('email', user.email).single();
    if (profileData) {
      setProfile(profileData);
      // 🔔 Register THIS teacher's device for push notifications
      registerForPush(profileData.id).catch(() => {});
      setBioData({ prefix: profileData.prefix || '', phone: profileData.phone || '', address: profileData.address || '', dob: profileData.dob || '', pob: profileData.pob || '', qualifications: profileData.qualifications || '' });
      setImpactScore(Math.floor(Math.random() * 500) + 100);
    }
    setLoading(false);
  }

  async function fetchContacts() {
    if (!profile) return;
    const { data } = await supabase.from('users').select('id, full_name, role, email, phone').eq('school_id', profile.school_id).neq('id', profile.id).order('full_name', { ascending: true });
    if (data) { setContacts(data); await loadLastMsgs(profile.id, data); }
  }

  const loadLastMsgs = async (myId: string, cts: any[]) => {
    if (!profile) return;
    const contactIds = cts.map(c => c.id);
    const { data } = await supabase.rpc('get_last_message_for_each_contact', { _user_id: myId, _contact_ids: contactIds });
    if (data) {
      const map: Record<string, Message> = {};
      data.forEach((msg: any) => {
        if (msg.school_id === profile.school_id) {
          const contactId = msg.sender_id === myId ? msg.receiver_id : msg.sender_id;
          map[contactId] = msg as Message;
        }
      });
      setLastMsgs(map);
    }
  };

  async function fetchNews() {
    if (!profile) return;
    const { data } = await supabase.from('school_news').select('*').eq('school_id', profile.school_id).order('created_at', { ascending: false }).limit(10);
    if (data) setNews(data);
  }

  async function saveBioData() {
    setSubmitting(true);
    try {
      const { error } = await supabase.from('users').update({ prefix: bioData.prefix, phone: bioData.phone, address: bioData.address, dob: bioData.dob, pob: bioData.pob, qualifications: bioData.qualifications }).eq('id', profile.id);
      if (error) throw error;
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Profile Updated', "Your bio has been successfully synced with the Principal's directory.");
      setImpactScore(s => s + 50);
    } catch (err: any) { Alert.alert('Error', err.message); }
    setSubmitting(false);
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any, allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true });
    if (!result.canceled && result.assets[0].base64) {
      const b64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const { error } = await supabase.from('users').update({ avatar_url: b64 }).eq('id', profile.id);
      if (error) Alert.alert('Upload Failed', error.message);
      else { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setProfile({ ...profile, avatar_url: b64 }); }
    }
  }

  async function loadStudentsForClass() {
    setLoading(true);
    const { data } = await supabase.from('students').select('id, admission_number, current_class, users!user_id(full_name)').eq('school_id', profile.school_id).eq('current_class', selectedClass).order('admission_number', { ascending: true });
    if (data) { setStudents(data); setGradesMap({}); setEvalStudent(null); }
    setLoading(false);
  }

  async function loadSubjects() {
    if (!profile) return;
    const level = (selectedClass || '').toUpperCase().includes('JSS') ? 'JSS' : 'SS';
    const { data } = await supabase
      .from('subjects')
      .select('name')
      .eq('level', level)
      .eq('is_active', true)
      .or(`school_id.is.null,school_id.eq.${profile.school_id}`)
      .order('name', { ascending: true });
    if (data) setSubjectOptions([...new Set(data.map((s: any) => s.name))]);
  }

  async function addNewSubject() {
    const name = newSubjectName.trim().toUpperCase();
    if (!name) { Alert.alert('Empty', 'Type a subject name first.'); return; }
    if (subjectOptions.includes(name)) { setSubject(name); setNewSubjectName(''); setShowSubjectDropdown(false); return; }
    const level = (selectedClass || '').toUpperCase().includes('JSS') ? 'JSS' : 'SS';
    setAddingSubject(true);
    try {
      const { error } = await supabase.from('subjects').insert({ name, level, school_id: profile.school_id });
      if (error) throw error;
      setSubject(name); setNewSubjectName(''); setShowSubjectDropdown(false);
      await loadSubjects();
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) { Alert.alert('Could not add', err.message); }
    setAddingSubject(false);
  }

  // ── LIVE AUTO-RANK ──
  function handleGradeUpdate(studentId: string, gradeData: any) {
    setGradesMap((prev: any) => {
      const updated = { ...prev, [studentId]: gradeData };
      const withScores = Object.entries(updated)
        .filter(([, g]: any) => (Number(g.test1) || 0) + (Number(g.test2) || 0) + (Number(g.exam) || 0) > 0)
        .map(([id, g]: any) => ({ id, total: (Number(g.test1) || 0) + (Number(g.test2) || 0) + (Number(g.exam) || 0) }))
        .sort((a, b) => b.total - a.total);
      const ordinal = (n: number) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
      withScores.forEach((e, i) => { if (updated[e.id]) updated[e.id] = { ...updated[e.id], rank: ordinal(i + 1) }; });
      return updated;
    });
  }

  const filteredStudents = [...students]
    .sort((a, b) => (a.users?.full_name || '').localeCompare(b.users?.full_name || ''))
    .filter(s => {
      const q = studentSearchQuery.toLowerCase().trim();
      if (!q) return true;
      return (s.users?.full_name || '').toLowerCase().includes(q) || (s.admission_number || '').toLowerCase().includes(q);
    });

  const paginatedStudents = [...students]
    .sort((a, b) => (a.users?.full_name || '').localeCompare(b.users?.full_name || ''))
    .slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(students.length / PAGE_SIZE);

  // ── MATERIALS ──
  async function loadMaterials() {
    if (!profile) return;
    const { data } = await supabase.from('learning_materials').select('*').eq('school_id', profile.school_id).eq('teacher_id', profile.id).order('created_at', { ascending: false });
    if (data) setMaterials(data);
  }

  // Open/view/download a material file
  async function openMaterial(fileUrl: string, fileName: string) {
    if (!fileUrl) { Alert.alert('No File', 'This material has no file URL.'); return; }
    try {
      if (Platform.OS === 'web') {
        window.open(fileUrl, '_blank');
      } else {
        const supported = await Linking.canOpenURL(fileUrl);
        if (supported) await Linking.openURL(fileUrl);
        else Alert.alert('Cannot Open', `Unable to open ${fileName}. The file URL may be invalid.`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not open the file.');
    }
  }

  function decodeBase64(base64: string): Uint8Array {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  async function doUpload(fileName: string, fileType: string, fileSize: number, base64: string) {
    console.log('[Upload] Starting:', fileName, fileType, fileSize, 'bytes');
    if (fileSize > 10 * 1024 * 1024) {
      Alert.alert('File Too Large', 'Please choose a file smaller than 10MB.');
      setUploadingMaterial(false);
      return;
    }
    if (!profile?.school_id || !profile?.id) {
      Alert.alert('Not Signed In', 'Profile not loaded. Please log out and log back in.');
      setUploadingMaterial(false);
      return;
    }
    const fileExt = (fileName.split('.').pop() || 'pdf').toLowerCase();
    // Sanitize filename: remove spaces and special characters for Supabase storage
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_');
    const filePath = `${profile.school_id}/${profile.id}/${Date.now()}_${safeName}`;
    console.log('[Upload] Uploading to path:', filePath);
    const { error: uploadError } = await supabase.storage
      .from('school-materials')
      .upload(filePath, decodeBase64(base64), { contentType: fileType || 'application/octet-stream', upsert: false });
    if (uploadError) {
      console.error('[Upload] Storage error:', uploadError);
      Alert.alert('Storage Upload Failed', `${uploadError.message}\n\nThis usually means the school-materials bucket is missing or RLS policy is blocking. Run the SQL setup again.`);
      setUploadingMaterial(false);
      throw uploadError;
    }
    console.log('[Upload] Storage upload successful');
    const { data: urlData } = supabase.storage.from('school-materials').getPublicUrl(filePath);
    const { error: metaError } = await supabase.from('learning_materials').insert({
      school_id: profile.school_id, teacher_id: profile.id,
      title: materialTitle.trim(), subject: materialSubject.trim() || subject,
      class_name: materialTarget === 'class' ? selectedClass : 'ALL',
      file_url: urlData.publicUrl, file_name: safeName,
      file_size: fileSize, file_type: fileExt, target: materialTarget,
    });
    if (metaError) {
      // If metadata save fails, still show what uploaded
      console.error('Metadata error:', metaError);
      throw new Error(`File uploaded but metadata failed: ${metaError.message}. Check Supabase RLS policies.`);
    }
    Alert.alert('✅ Uploaded!', `"${materialTitle}" sent to ${materialTarget === 'class' ? selectedClass : 'all students'}.`);
    setMaterialTitle(''); setMaterialSubject('');
    loadMaterials();
    setImpactScore(s => s + 30);
  }

  // Web file upload handler — called when hidden <input> changes
  function handleWebFileSelected(event: any) {
    const file = event.target?.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      Alert.alert('File Too Large', 'Please choose a file smaller than 10MB.');
      event.target.value = '';
      return;
    }
    setUploadingMaterial(true);
    const reader = new FileReader();
    reader.onload = async function(ev) {
      try {
        const dataUrl = (ev.target as any).result as string;
        const base64 = dataUrl.split(',')[1];
        await doUpload(file.name, file.type, file.size, base64);
      } catch (err: any) {
        Alert.alert('Upload Failed', err.message || 'Could not upload file.');
      } finally {
        setUploadingMaterial(false);
        event.target.value = ''; // reset so same file can be re-selected
      }
    };
    reader.onerror = () => {
      Alert.alert('Read Failed', 'Could not read the file.');
      setUploadingMaterial(false);
    };
    reader.readAsDataURL(file);
  }

  async function uploadLessonNote() {
    if (!materialTitle.trim()) { Alert.alert('Missing Title', 'Please open the settings and enter a Material Title first.'); return; }

    if (Platform.OS === 'web') {
      // Trigger the hidden file input directly — no async gap before click
      const inp = document.getElementById('edusalone-file-upload') as HTMLInputElement;
      if (inp) { inp.value = ''; inp.click(); }
      return;
    }

    // ── MOBILE: use DocumentPicker ──
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword',
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
               'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      setUploadingMaterial(true);
      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: 'base64' });
      await doUpload(file.name, file.mimeType || 'application/octet-stream', file.size || 0, base64);
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Could not upload file.');
    }
    setUploadingMaterial(false);
  }

  async function deleteMaterial(id: string) {
    const doDelete = async () => { await supabase.from('learning_materials').delete().eq('id', id); loadMaterials(); };
    if (Platform.OS === 'web') {
      if (window.confirm('Delete Material?\n\nThis will remove it permanently.')) doDelete();
      return;
    }
    Alert.alert('Delete Material?', 'This will remove it permanently.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => doDelete() },
    ]);
  }

  function docAudLabel(a: string) {
    return ({ office: 'the Office', students: 'Students', parents: 'Parents', bursar: 'the Bursar', teachers: 'Teachers', staff: 'All Staff', secretary: 'the Secretary', all: 'Everyone' } as any)[a] || a;
  }

  async function loadMySentDocs() {
    if (!profile) return;
    const { data } = await supabase.from('school_documents')
      .select('*').eq('school_id', profile.school_id).eq('sender_id', profile.id)
      .order('created_at', { ascending: false }).limit(30);
    setMySentDocs(data || []);
  }

  async function sendMyDoc() {
    const title = sendDocTitle.trim();
    if (!title) { Alert.alert('Missing title', 'Add a document title first.'); return; }
    if (Platform.OS !== 'web') { Alert.alert('Use the web app', 'Sending documents is available on the web portal for now.'); return; }
    const aud = sendDocAudience;
    const note = sendDocNote.trim();
    const tClass = (aud === 'students' || aud === 'parents') ? (selectedClass || null) : null;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*';
    input.onchange = async () => {
      const file: any = input.files && input.files[0];
      if (!file) return;
      setSendingMyDoc(true);
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
          sender_name: profile.full_name || 'Teacher', sender_role: 'Teacher',
          title, note: note || null, file_url: pub.publicUrl, file_name: file.name, file_type: ftype,
          audience: aud, target_class: tClass,
        });
        if (insErr) throw insErr;
        window.alert('✅ Sent\n"' + title + '" delivered to ' + docAudLabel(aud) + (tClass ? ' (' + tClass + ')' : '') + '.');
        setSendDocTitle(''); setSendDocNote('');
        loadMySentDocs();
      } catch (e: any) { window.alert('Upload failed: ' + (e?.message || e)); }
      setSendingMyDoc(false);
    };
    input.click();
  }

  async function deleteMyDoc(id: string) {
    const go = async () => { await supabase.from('school_documents').delete().eq('id', id); setMySentDocs(prev => prev.filter((d: any) => d.id !== id)); };
    if (Platform.OS === 'web') { if (window.confirm('Delete this document for all recipients?')) go(); return; }
    Alert.alert('Delete document?', 'Removes it from all recipients.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: go }]);
  }

  async function loadDocuments() {
    if (!profile) return;
    setLoadingOfficeDocs(true);
    const { data } = await supabase.from('school_documents')
      .select('*').eq('school_id', profile.school_id)
      .in('audience', ['all', 'staff', 'teachers'])
      .order('created_at', { ascending: false });
    setOfficeDocs(data || []);
    setLoadingOfficeDocs(false);
  }

  function openDoc(url: string) {
    if (!url) return;
    if (Platform.OS === 'web') window.open(url, '_blank'); else Linking.openURL(url);
  }

  async function loadAssignments() {
    if (!profile) return;
    const { data } = await supabase.from('assignments')
      .select('*')
      .eq('school_id', profile.school_id)
      .eq('teacher_id', profile.id)
      .order('created_at', { ascending: false });
    if (data) {
      setAssignments(data);
      const ids = data.map((a: any) => a.id);
      if (ids.length) {
        const { data: subs } = await supabase.from('assignment_submissions').select('assignment_id').in('assignment_id', ids);
        const counts: Record<string, number> = {};
        (subs || []).forEach((s: any) => { counts[s.assignment_id] = (counts[s.assignment_id] || 0) + 1; });
        setAssignmentSubs(counts);
      } else setAssignmentSubs({});
    }
  }

  async function postAssignment() {
    if (!assignmentForm.title.trim()) { Alert.alert('Missing Title', 'Give the assignment a title.'); return; }
    if (!assignmentForm.instructions.trim()) { Alert.alert('Missing Instructions', 'Type the assignment question or instructions.'); return; }
    setPostingAssignment(true);
    try {
      const { error } = await supabase.from('assignments').insert({
        school_id: profile.school_id,
        teacher_id: profile.id,
        class_name: selectedClass,
        subject: (assignmentForm.subject || subject || '').trim().toUpperCase() || null,
        title: assignmentForm.title.trim(),
        instructions: assignmentForm.instructions.trim(),
        due_date: /^\d{4}-\d{2}-\d{2}$/.test(assignmentForm.dueDate.trim()) ? assignmentForm.dueDate.trim() : null,
      });
      if (error) throw error;
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Posted', `Assignment sent to all ${selectedClass} students.`);
      setAssignmentForm({ title: '', instructions: '', subject: '', dueDate: '' });
      setImpactScore(s => s + 20);
      loadAssignments();
    } catch (e: any) { Alert.alert('Could not post', e.message); }
    setPostingAssignment(false);
  }

  async function deleteAssignment(id: string) {
    const doDelete = async () => { await supabase.from('assignments').delete().eq('id', id); loadAssignments(); };
    if (Platform.OS === 'web') { if (window.confirm('Delete this assignment?\n\nStudent submissions will also be removed.')) doDelete(); return; }
    Alert.alert('Delete Assignment?', 'Student submissions will also be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => doDelete() },
    ]);
  }

  async function openMarking(a: any) {
    setMarkingAssignment(a);
    setLoadingSubs(true);
    setSubmissions([]);
    const { data: subs } = await supabase.from('assignment_submissions')
      .select('*').eq('assignment_id', a.id).order('submitted_at', { ascending: true });
    let rows = subs || [];
    if (rows.length) {
      const ids = rows.map((s: any) => s.student_id);
      const { data: studs } = await supabase.from('students')
        .select('id, admission_number, users!user_id(full_name)').in('id', ids);
      const nameMap: Record<string, string> = {};
      (studs || []).forEach((st: any) => { nameMap[st.id] = st.users?.full_name || st.admission_number || 'Student'; });
      rows = rows.map((s: any) => ({ ...s, _name: nameMap[s.student_id] || 'Student' }));
      const drafts: Record<string, any> = {};
      rows.forEach((s: any) => { drafts[s.id] = { score: s.score != null ? String(s.score) : '', grade: s.grade || '', feedback: s.feedback || '' }; });
      setMarkDrafts(drafts);
    }
    setSubmissions(rows);
    setLoadingSubs(false);
  }

  async function saveMark(sub: any) {
    const d = markDrafts[sub.id] || { score: '', grade: '', feedback: '' };
    setSavingMarkId(sub.id);
    try {
      const { error } = await supabase.from('assignment_submissions').update({
        score: d.score.trim() === '' ? null : Number(d.score),
        grade: d.grade.trim() || null,
        feedback: d.feedback.trim() || null,
        status: 'marked',
        marked_by: profile.id,
        marked_at: new Date().toISOString(),
      }).eq('id', sub.id);
      if (error) throw error;
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmissions(prev => prev.map((s: any) => s.id === sub.id ? { ...s, score: d.score.trim() === '' ? null : Number(d.score), grade: d.grade.trim() || null, feedback: d.feedback.trim() || null, status: 'marked' } : s));
      Alert.alert('✅ Marked', `Grade sent to ${sub._name || 'student'}.`);
    } catch (e: any) { Alert.alert('Could not save', e.message); }
    setSavingMarkId(null);
  }

  async function saveIndividualGrade() {
    if (!individualStudent) { Alert.alert('No Student', 'Please select a student first.'); return; }
    if (!subject.trim()) { Alert.alert('Missing Subject', 'Please enter the subject name.'); return; }
    const t1 = Number(singleGrade.test1) || 0;
    const t2 = Number(singleGrade.test2) || 0;
    const ex = Number(singleGrade.exam) || 0;
    const total = t1 + t2 + ex;
    if (t1 > 15) { Alert.alert('Score Error', 'Test 1 maximum is 15 marks.'); return; }
    if (t2 > 15) { Alert.alert('Score Error', 'Test 2 maximum is 15 marks.'); return; }
    if (ex > 70) { Alert.alert('Score Error', 'Exam maximum is 70 marks.'); return; }
    if (total > 100) { Alert.alert('Score Error', 'Total score cannot exceed 100.'); return; }
    if (total === 0) { Alert.alert('No Score', 'Please enter at least one score.'); return; }
    setSavingSingle(true);
    try {
      const isJSS = (individualStudent.current_class || '').toUpperCase().includes('JSS');
      let grade = 'F9'; let remark = 'FAIL';
      if (isJSS) {
        if (total >= 75) { grade = '1'; remark = 'EXCELLENT'; } else if (total >= 65) { grade = '2'; remark = 'V. GOOD'; } else if (total >= 55) { grade = '3'; remark = 'GOOD'; } else if (total >= 45) { grade = '4'; remark = 'CREDIT'; } else if (total >= 35) { grade = '5'; remark = 'PASS'; } else { grade = '6'; remark = 'FAIL'; }
      } else {
        if (total >= 75) { grade = 'A1'; remark = 'EXCELLENT'; } else if (total >= 70) { grade = 'B2'; remark = 'V. GOOD'; } else if (total >= 65) { grade = 'B3'; remark = 'GOOD'; } else if (total >= 60) { grade = 'C4'; remark = 'CREDIT'; } else if (total >= 55) { grade = 'C5'; remark = 'CREDIT'; } else if (total >= 50) { grade = 'C6'; remark = 'CREDIT'; } else if (total >= 45) { grade = 'D7'; remark = 'PASS'; } else if (total >= 40) { grade = 'E8'; remark = 'PASS'; }
      }
      const recordData = { school_id: profile.school_id, student_id: individualStudent.id, teacher_id: profile.id, subject: subject.trim().toUpperCase(), term, academic_year: selectedYear, test_1: t1, test_2: t2, exam: ex, score: total, grade, remark, submission_status: 'pending_review', submitted_by: profile.id, submitted_at: new Date().toISOString() };
      const { data: existing } = await supabase.from('academic_records').select('id').eq('student_id', individualStudent.id).eq('subject', subject.trim().toUpperCase()).eq('term', term).eq('academic_year', selectedYear).maybeSingle();
      if (existing) { const { error } = await supabase.from('academic_records').update(recordData).eq('id', existing.id); if (error) throw error; }
      else { const { error } = await supabase.from('academic_records').insert(recordData); if (error) throw error; }
      setSavedStudentIds(prev => [...prev.filter(id => id !== individualStudent.id), individualStudent.id]);
      recalculateClassRanks(subject.trim().toUpperCase(), term, selectedYear, selectedClass);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const savedName = individualStudent.users?.full_name;
      setSingleGrade({ test1: '', test2: '', exam: '' }); setIndividualStudent(null); setStudentSearchQuery(''); setImpactScore(s => s + 10);
      Alert.alert('✅ Submitted to Principal', `Grade for ${savedName} submitted for review.\n\nSubject: ${subject.trim().toUpperCase()}\nTotal: ${total} — Grade ${grade} (${remark})\n\nStatus: PENDING REVIEW`);
    } catch (err: any) { Alert.alert('Error', err.message); }
    setSavingSingle(false);
  }

  async function saveBulkGrades() {
    if (!subject.trim()) { Alert.alert('Missing Subject', 'Please open the ⚙ drawer (top right menu) and enter the subject name before submitting grades.'); return; }
    if (Object.values(gradesMap).some((g: any) => g.isError === true)) { Alert.alert('Mathematical Error', 'A student has a total score over 100. Please fix the red rows before saving.'); return; }
    const gradeCount = Object.values(gradesMap).filter((g: any) => g.test1 !== '' || g.test2 !== '' || g.exam !== '').length;
    if (gradeCount === 0) { Alert.alert('No Grades Entered', 'Please enter at least one student score before saving.'); return; }
    
    // Web: window.confirm works synchronously; Alert.alert buttons don't work on web
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `SUBMIT GRADES TO PRINCIPAL?\n\nSubject: ${subject.trim().toUpperCase()}\nClass: ${selectedClass}\nTerm: ${term} • ${selectedYear}\nStudents: ${gradeCount}\n\nThe Principal will review these grades.\nClick OK to submit.`
      );
      if (confirmed) executeSaveBulkGrades();
      return;
    }
    
    // Mobile: native Alert with buttons
    Alert.alert(
      '📤 Submit Grades to Principal?',
      `You are about to submit ${gradeCount} student grade(s) for:\n\n📚 Subject: ${subject.trim().toUpperCase()}\n🏫 Class: ${selectedClass}\n📅 ${term} • ${selectedYear}\n\nThe Principal will review and approve these grades.\n\nAre you sure everything is correct?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '✅ Yes, Submit Now', onPress: () => executeSaveBulkGrades() },
      ]
    );
  }

  async function executeSaveBulkGrades() {
    setSubmitting(true);
    let gradesEntered = false;
    try {
      const { data: existingRecords } = await supabase.from('academic_records').select('id, student_id').eq('term', term).eq('academic_year', selectedYear).eq('subject', subject.trim().toUpperCase()).in('student_id', students.map(s => s.id));
      const toInsert: any[] = [];
      for (const student of students) {
        const g = gradesMap[student.id];
        if (g && (g.test1 !== '' || g.test2 !== '' || g.exam !== '')) {
          gradesEntered = true;
          const total = (Number(g.test1) || 0) + (Number(g.test2) || 0) + (Number(g.exam) || 0);
          const isJSS = (selectedClass || '').toUpperCase().includes('JSS');
          let grade = 'F9'; let remark = 'FAIL';
          if (isJSS) { if (total >= 75) { grade = '1'; remark = 'EXCELLENT'; } else if (total >= 65) { grade = '2'; remark = 'V. GOOD'; } else if (total >= 55) { grade = '3'; remark = 'GOOD'; } else if (total >= 45) { grade = '4'; remark = 'CREDIT'; } else if (total >= 35) { grade = '5'; remark = 'PASS'; } else { grade = '6'; remark = 'FAIL'; } }
          else { if (total >= 75) { grade = 'A1'; remark = 'EXCELLENT'; } else if (total >= 70) { grade = 'B2'; remark = 'V. GOOD'; } else if (total >= 65) { grade = 'B3'; remark = 'GOOD'; } else if (total >= 60) { grade = 'C4'; remark = 'CREDIT'; } else if (total >= 55) { grade = 'C5'; remark = 'CREDIT'; } else if (total >= 50) { grade = 'C6'; remark = 'CREDIT'; } else if (total >= 45) { grade = 'D7'; remark = 'PASS'; } else if (total >= 40) { grade = 'E8'; remark = 'PASS'; } }
          const record = { school_id: profile.school_id, student_id: student.id, teacher_id: profile.id, subject: subject.trim().toUpperCase(), term, academic_year: selectedYear, test_1: Number(g.test1) || 0, test_2: Number(g.test2) || 0, exam: Number(g.exam) || 0, score: total, grade, remark, rank: g.rank, submission_status: 'pending_review', submitted_by: profile.id, submitted_at: new Date().toISOString() };
          const existing = existingRecords?.find(e => e.student_id === student.id);
          if (existing) { const { error } = await supabase.from('academic_records').update(record).eq('id', existing.id); if (error) throw error; }
          else toInsert.push(record);
        }
      }
      if (toInsert.length > 0) { const { error } = await supabase.from('academic_records').insert(toInsert); if (error) throw error; }
      if (!gradesEntered) { Alert.alert('No Data', 'You have not entered any grades yet.'); setSubmitting(false); return; }
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Grades Submitted!', `${subject.trim().toUpperCase()} grades for ${selectedClass} have been submitted to the Principal for review.\n\nStatus: PENDING REVIEW\n\nThe Principal will be notified and will review the grades shortly.`);
      setSubject(''); loadStudentsForClass(); recalculateClassRanks(subject.trim().toUpperCase(), term, selectedYear, selectedClass); setImpactScore(s => s + 100);
    } catch (err: any) { Alert.alert('Database Error', `Failed to save: ${err.message}`); }
    setSubmitting(false);
  }

  async function fetchPendingSubjects() {
    if (!profile) return;
    setReviewLoading(true);
    const myClass = profile.assigned_class || selectedClass;
    const { data: classStudents } = await supabase.from('students').select('id').eq('school_id', profile.school_id).eq('current_class', myClass);
    if (!classStudents || classStudents.length === 0) { setReviewLoading(false); return; }
    const studentIds = classStudents.map((s: any) => s.id);
    const { data: records } = await supabase.from('academic_records').select('subject, teacher_id, submission_status, submitted_at, reviewed_at, users!teacher_id(full_name)').eq('school_id', profile.school_id).eq('term', term).eq('academic_year', selectedYear).in('student_id', studentIds);
    if (!records) { setReviewLoading(false); return; }
    const subjectMap: any = {};
    records.forEach((r: any) => {
      const key = r.subject;
      if (!subjectMap[key]) subjectMap[key] = { subject: r.subject, teacher_name: r.users?.full_name || 'Unknown', teacher_id: r.teacher_id, status: r.submission_status, submitted_at: r.submitted_at, reviewed_at: r.reviewed_at, count: 0 };
      subjectMap[key].count++;
      if (r.submission_status === 'pending_review') subjectMap[key].status = 'pending_review';
      if (r.submission_status === 'approved') subjectMap[key].status = 'approved';
    });
    const all = Object.values(subjectMap);
    setPendingSubjects(all.filter((s: any) => s.status === 'pending_review' || s.status === 'draft'));
    setApprovedSubjects(all.filter((s: any) => s.status === 'approved' || s.status === 'published'));
    setReviewLoading(false);
  }

  async function fetchSubjectGrades(subjectName: string) {
    setPreviewLoading(true); setPreviewSubject(subjectName);
    const myClass = profile.assigned_class || selectedClass;
    const { data: classStudents } = await supabase.from('students').select('id, admission_number, users!user_id(full_name)').eq('school_id', profile.school_id).eq('current_class', myClass);
    if (!classStudents) { setPreviewLoading(false); return; }
    const studentIds = classStudents.map((s: any) => s.id);
    const { data: grades } = await supabase.from('academic_records').select('student_id, test_1, test_2, exam, score, grade, remark, rank, submission_status, teacher_id, teacher:users!teacher_id(full_name)').eq('subject', subjectName).eq('term', term).eq('academic_year', selectedYear).in('student_id', studentIds).order('score', { ascending: false });
    const merged = (grades || []).map((g: any) => { const st = classStudents.find((s: any) => s.id === g.student_id); return { ...g, student_name: (st as any)?.users?.full_name || 'Unknown', admission_number: (st as any)?.admission_number || '', teacher_name: (g as any)?.teacher?.full_name || 'Unknown' }; });
    setPreviewGrades(merged); setPreviewLoading(false);
  }

  async function rejectSubject(subjectName: string) {
    setRejectingSubject(true);
    const myClass = profile.assigned_class || selectedClass;
    const { data: classStudents } = await supabase.from('students').select('id').eq('school_id', profile.school_id).eq('current_class', myClass);
    if (!classStudents) { setRejectingSubject(false); return; }
    await supabase.from('academic_records').update({ submission_status: 'draft' }).eq('subject', subjectName).eq('term', term).eq('academic_year', selectedYear).in('student_id', classStudents.map((s: any) => s.id));
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setPreviewSubject(null); setPreviewGrades([]); fetchPendingSubjects();
    Alert.alert('↩️ Returned to Teacher', `${subjectName} grades have been sent back for correction.`);
    setRejectingSubject(false);
  }

  async function approveSubject(subjectName: string) {
    const myClass = profile.assigned_class || selectedClass;
    const { data: classStudents } = await supabase.from('students').select('id').eq('school_id', profile.school_id).eq('current_class', myClass);
    if (!classStudents) return;
    const { error } = await supabase.from('academic_records').update({ submission_status: 'approved', reviewed_by: profile.id, reviewed_at: new Date().toISOString() }).eq('subject', subjectName).eq('term', term).eq('academic_year', selectedYear).in('student_id', classStudents.map((s: any) => s.id));
    if (error) { Alert.alert('Error', error.message); return; }
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    fetchPendingSubjects(); setImpactScore(s => s + 20);
  }
function confirmApproveSubject() {
    if (!previewSubject) return;
    const msg = `Approve all ${previewGrades.length} grades for ${previewSubject}?`;
    const done = async () => { await approveSubject(previewSubject!); setPreviewSubject(null); setPreviewGrades([]); };
    if (Platform.OS === 'web') { if (window.confirm(`✅ Approve Grades\n\n${msg}`)) done(); return; }
    Alert.alert('✅ Approve Grades', msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Approve', onPress: () => done() }]);
  }

  function confirmReturnSubject() {
    if (!previewSubject) return;
    const msg = `Send ${previewSubject} back for correction?`;
    if (Platform.OS === 'web') { if (window.confirm(`↩️ Return to Teacher\n\n${msg}`)) rejectSubject(previewSubject!); return; }
    Alert.alert('↩️ Return to Teacher', msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Return', style: 'destructive', onPress: () => rejectSubject(previewSubject!) }]);
  }

  async function sendAllToPrincipal() {
    if (approvedSubjects.length === 0) { Alert.alert('Nothing Approved', 'Please approve at least one subject first.'); return; }
    const msg = `Publish ${approvedSubjects.length} approved subject(s) for ${profile.assigned_class || selectedClass}?`;
    if (Platform.OS === 'web') {
      if (window.confirm(`Send to Principal?\n\n${msg}`)) executeSendAllToPrincipal();
      return;
    }
    Alert.alert('Send to Principal?', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send', onPress: () => executeSendAllToPrincipal() },
    ]);
  }

  async function executeSendAllToPrincipal() {
    const myClass = profile.assigned_class || selectedClass;
    const { data: classStudents } = await supabase.from('students').select('id').eq('school_id', profile.school_id).eq('current_class', myClass);
    if (!classStudents) return;
    await supabase.from('academic_records').update({ submission_status: 'published' }).eq('submission_status', 'approved').eq('term', term).eq('academic_year', selectedYear).in('student_id', classStudents.map((s: any) => s.id));
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('✅ Sent!', 'Grades published to Principal successfully.'); fetchPendingSubjects(); setImpactScore(s => s + 100);
  }

  async function calculateOverallRank() {
    setCalculatingRank(true);
    try {
      const myClass = profile.assigned_class || selectedClass;
      const { data: classStudents } = await supabase.from('students').select('id, users!user_id(full_name)').eq('school_id', profile.school_id).eq('current_class', myClass);
      if (!classStudents || classStudents.length === 0) { setCalculatingRank(false); return; }
      const studentIds = classStudents.map((s: any) => s.id);
      const { data: records } = await supabase.from('academic_records').select('student_id, score').eq('term', term).eq('academic_year', selectedYear).in('student_id', studentIds).in('submission_status', ['approved', 'published']);
      if (!records || records.length === 0) { Alert.alert('No Data', 'No approved grades found to rank.'); setCalculatingRank(false); return; }
      const totals: Record<string, number> = {};
      const counts: Record<string, number> = {};
      records.forEach((r: any) => { totals[r.student_id] = (totals[r.student_id] || 0) + (r.score || 0); counts[r.student_id] = (counts[r.student_id] || 0) + 1; });
      const sorted = Object.entries(totals).sort(([, a], [, b]) => b - a);
      const ordinal = (n: number) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
      for (let i = 0; i < sorted.length; i++) {
        const [studentId, total] = sorted[i];
        await supabase.from('students').update({ overall_rank: ordinal(i + 1), total_score: total, no_of_subjects: counts[studentId] || 0 }).eq('id', studentId);
      }
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('🏆 Rankings Done!', `${sorted.length} students ranked for ${myClass}.`);
    } catch (err: any) { Alert.alert('Error', err.message); }
    setCalculatingRank(false);
  }

  async function recalculateClassRanks(subjectName: string, termName: string, year: string, className: string) {
    try {
      const { data: classStudents } = await supabase.from('students').select('id').eq('school_id', profile.school_id).eq('current_class', className);
      if (!classStudents || classStudents.length === 0) return;
      const { data: records } = await supabase.from('academic_records').select('id, student_id, score').eq('subject', subjectName).eq('term', termName).eq('academic_year', year).in('student_id', classStudents.map((s: any) => s.id));
      if (!records || records.length === 0) return;
      const sorted = [...records].sort((a, b) => (b.score || 0) - (a.score || 0));
      const ordinal = (n: number) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
      for (let i = 0; i < sorted.length; i++) await supabase.from('academic_records').update({ rank: ordinal(i + 1) }).eq('id', sorted[i].id);
    } catch { /* silent */ }
  }

  async function loadTimetable() {
    const { data } = await supabase.from('timetables').select('*').eq('school_id', profile.school_id).eq('class_name', selectedClass);
    const tt: Record<string, string> = { Monday: '', Tuesday: '', Wednesday: '', Thursday: '', Friday: '' };
    if (data) data.forEach(r => { tt[r.day_of_week as string] = r.subjects; });
    setTimetableMap(tt);
  }

  async function saveTimetable() {
    if (!Object.values(timetableMap).some(v => v.trim().length > 0)) { Alert.alert('Missing Information', 'Please enter at least one subject in the timetable before syncing.'); return; }
    setSubmitting(true);
    try {
      const { data: existingTT } = await supabase.from('timetables').select('id, day_of_week').eq('school_id', profile.school_id).eq('class_name', selectedClass);
      for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
        const subjects = timetableMap[day];
        const existing = existingTT?.find(e => e.day_of_week === day);
        if (existing) { const { error } = await supabase.from('timetables').update({ subjects, teacher_id: profile.id }).eq('id', existing.id); if (error) throw error; }
        else { const { error } = await supabase.from('timetables').insert({ school_id: profile.school_id, class_name: selectedClass, day_of_week: day, subjects, teacher_id: profile.id }); if (error) throw error; }
      }
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', `Timetable for ${selectedClass} pushed to students!`); setImpactScore(s => s + 30);
    } catch (err: any) { Alert.alert('Database Error', err.message); }
    setSubmitting(false);
  }

  async function generateTimetablePDF() {
    setPrintingTimetable(true);
    try {
      const logoHtml = profile?.schools?.logo_url ? `<img src="${profile.schools.logo_url}" style="height:60px;margin-bottom:5px;" />` : '';
      const html = `<html><head><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;color:#1A365D}.header{text-align:center;margin-bottom:20px}h1{font-size:24px;font-weight:900;margin:0;text-transform:uppercase;color:#800000}h2{font-size:16px;margin:5px 0 20px;background:#E2E8F0;padding:10px;display:inline-block;border-radius:8px}table{width:100%;border-collapse:collapse}th{background:#3182CE;color:#FFF;padding:15px;font-size:16px;width:15%;text-align:center;border:2px solid #2B6CB0}td{padding:15px;font-size:14px;border:2px solid #CBD5E0;background:#F7FAFC;font-weight:bold;color:#4A5568;line-height:1.6}</style></head><body><div class="header">${logoHtml}<h1>${profile?.schools?.name || 'School Timetable'}</h1><h2>OFFICIAL CLASS TIMETABLE: ${selectedClass}</h2></div><table><tr><th>MONDAY</th><td>${timetableMap.Monday || 'No subjects scheduled'}</td></tr><tr><th>TUESDAY</th><td>${timetableMap.Tuesday || 'No subjects scheduled'}</td></tr><tr><th>WEDNESDAY</th><td>${timetableMap.Wednesday || 'No subjects scheduled'}</td></tr><tr><th>THURSDAY</th><td>${timetableMap.Thursday || 'No subjects scheduled'}</td></tr><tr><th>FRIDAY</th><td>${timetableMap.Friday || 'No subjects scheduled'}</td></tr></table><p style="text-align:center;font-size:10px;color:#A0AEC0;margin-top:30px;">Generated by EduSalone on ${new Date().toLocaleString()}</p></body></html>`;
      if (Platform.OS === 'web') { const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); } }
      else { const { uri } = await Print.printToFileAsync({ html }); await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' }); }
    } catch { Alert.alert('Error', 'Could not generate PDF.'); }
    setPrintingTimetable(false);
  }

  function getPromotionOptions(currentClass: string) {
    const c = currentClass?.replace(/\s/g, '').toUpperCase() || '';
    const map: Record<string, string> = { JSS1: 'JSS 2', JSS2: 'JSS 3', JSS3: 'SS 1', SS1: 'SS 2', SS2: 'SS 3', SS3: 'GRADUATED' };
    return [`PROMOTED TO ${map[c] || 'NEXT CLASS'}`, 'PROMOTED ON TRIAL', `REPEATED ${c}`, 'PENDING'];
  }

  async function loadExistingEvaluation() {
    setLoading(true);
    const { data } = await supabase.from('student_evaluations').select('*').eq('student_id', evalStudent.id).eq('term', term).eq('academic_year', selectedYear).maybeSingle();
    if (data) {
      setTraits({ attentiveness: data.attentiveness || 0, attitude: data.attitude || 0, cooperation: data.cooperation || 0, neatness: data.neatness || 0, politeness: data.politeness || 0, punctuality: data.punctuality || 0 });
      setSkills({ drawing_painting: data.drawing_painting || 0, handling_tools: data.handling_tools || 0, games: data.games || 0, handwriting: data.handwriting || 0, music: data.music || 0, verbal_fluency: data.verbal_fluency || 0 });
      setComments({ teacher: data.teacher_comment || '', promotion: data.promotion_status || '' });
    } else {
      setTraits({ attentiveness: 0, attitude: 0, cooperation: 0, neatness: 0, politeness: 0, punctuality: 0 });
      setSkills({ drawing_painting: 0, handling_tools: 0, games: 0, handwriting: 0, music: 0, verbal_fluency: 0 });
      setComments({ teacher: '', promotion: '' });
    }
    setLoading(false);
  }

  async function saveEvaluation() {
    if (!evalStudent) return;
    const msg = `Save evaluation for ${evalStudent.users?.full_name} (${term} • ${selectedYear})?\n\nPromotion: ${comments.promotion || 'Not set'}`;
    if (Platform.OS === 'web') {
      if (window.confirm(`Submit Evaluation?\n\n${msg}`)) executeEvaluation();
      return;
    }
    Alert.alert('Submit Evaluation?', msg, [
      { text: 'Cancel', style: 'cancel' }, { text: 'Submit Evaluation', onPress: () => executeEvaluation() },
    ]);
  }

  async function executeEvaluation() {
    setSubmitting(true);
    try {
      const evalData = { school_id: profile.school_id, student_id: evalStudent.id, teacher_id: profile.id, academic_year: selectedYear, term, ...traits, ...skills, teacher_comment: comments.teacher, promotion_status: comments.promotion };
      const { data: existing } = await supabase.from('student_evaluations').select('id').eq('student_id', evalStudent.id).eq('academic_year', selectedYear).eq('term', term).maybeSingle();
      if (existing) { const { error } = await supabase.from('student_evaluations').update(evalData).eq('id', existing.id); if (error) throw error; }
      else { const { error } = await supabase.from('student_evaluations').insert(evalData); if (error) throw error; }
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Evaluation submitted.'); setImpactScore(s => s + 20);
    } catch (err: any) { Alert.alert('Database Error', err.message); }
    setSubmitting(false);
  }

  async function loadTodayAttendance() {
    const { data } = await supabase.from('daily_attendance').select('*').eq('school_id', profile.school_id).eq('date', todayDate);
    const attMap: any = {};
    students.forEach(s => { attMap[s.id] = 'Present'; });
    if (data) data.forEach(r => { attMap[r.student_id] = r.status; });
    setAttendanceMap(attMap);
  }

  function handleAttendanceChange(studentId: string, status: string) {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
  }

  async function saveAttendance() {
    const absentCount = Object.values(attendanceMap).filter(s => s === 'Absent').length;
    const lateCount = Object.values(attendanceMap).filter(s => s === 'Late').length;
    const summary = `${selectedClass} on ${formattedDate}.\nPresent: ${students.length - absentCount - lateCount}\nAbsent: ${absentCount}\nLate: ${lateCount}`;
    if (Platform.OS === 'web') {
      if (window.confirm(`Save Roll Call?\n\n${summary}`)) executeAttendance();
      return;
    }
    Alert.alert('Save Roll Call?', summary, [
      { text: 'Cancel', style: 'cancel' }, { text: 'Save Roll Call', onPress: () => executeAttendance() },
    ]);
  }

  async function executeAttendance() {
    setSubmitting(true);
    try {
      const { data: existing } = await supabase.from('daily_attendance').select('id, student_id').eq('school_id', profile.school_id).eq('date', todayDate).in('student_id', students.map(s => s.id));
      const toInsert: any[] = [];
      for (const s of students) {
        const status = attendanceMap[s.id] || 'Present';
        const ex = existing?.find(e => e.student_id === s.id);
        if (ex) { const { error } = await supabase.from('daily_attendance').update({ status, teacher_id: profile.id }).eq('id', ex.id); if (error) throw error; }
        else toInsert.push({ school_id: profile.school_id, student_id: s.id, teacher_id: profile.id, date: todayDate, status });
      }
      if (toInsert.length > 0) { const { error } = await supabase.from('daily_attendance').insert(toInsert); if (error) throw error; }
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', `Roll Call saved for ${selectedClass}!`); setImpactScore(s => s + 50);
    } catch (err: any) { Alert.alert('Database Error', err.message); }
    setSubmitting(false);
  }

  const renderRatingRow = (label: string, value: number, onChange: (v: number) => void) => (
    <View style={styles.ratingRow}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.ratingDots}>
        {ratingOptions.map(num => (
          <TouchableOpacity key={num} onPress={() => { onChange(num); if (Platform.OS !== 'web') Haptics.selectionAsync(); }} style={[styles.ratingDot, value === num && styles.ratingDotActive]}>
            <Text style={[styles.ratingDotText, value === num && styles.ratingDotTextActive]}>{num}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const getRank = (score: number) => score > 1000 ? 'Master Pedagogue 🎓' : score > 500 ? 'Senior Educator 🏅' : 'Inspiring Teacher 🌟';
  const firstName = profile?.full_name?.split(' ')[0] || 'Teacher';

  if (loading && !profile) return <ActivityIndicator size="large" color="#DD6B20" style={{ marginTop: 100 }} />;

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>

      {/* ── GRADE PREVIEW MODAL ── */}
      <Modal visible={!!previewSubject} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F4F8' }}>
          <View style={{ backgroundColor: '#1A365D', padding: 20, flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => { setPreviewSubject(null); setPreviewGrades([]); }} style={{ marginRight: 12 }}><Ionicons name="arrow-back" size={24} color="#FFF" /></TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900' as any }}>{previewSubject}</Text>
              <Text style={{ color: '#90CDF4', fontSize: 13, marginTop: 2 }}>{profile?.assigned_class || selectedClass} • {term} • {selectedYear}</Text>
            </View>
            <View style={{ backgroundColor: '#2D3748', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text style={{ color: '#FBD38D', fontWeight: '900' as any, fontSize: 13 }}>{previewGrades.length} students</Text>
            </View>
          </View>
          {previewLoading
            ? <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#1A365D" /></View>
            : <ScrollView style={{ flex: 1, padding: 15 }} showsVerticalScrollIndicator={false}>
                <View style={{ backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', elevation: 2, marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', backgroundColor: '#2D3748', padding: 12 }}>
                    <Text style={{ flex: 2, color: '#FFF', fontWeight: '900' as any, fontSize: 12 }}>STUDENT</Text>
                    {['T1','T2','EX','TOT','GRD','RNK'].map(h => <Text key={h} style={{ width: h === 'TOT' || h === 'GRD' ? 40 : 35, color: '#FBD38D', fontWeight: '900' as any, fontSize: 11, textAlign: 'center' }}>{h}</Text>)}
                  </View>
                  {previewGrades.length === 0
                    ? <View style={{ padding: 30, alignItems: 'center' }}><Ionicons name="document-outline" size={40} color="#CBD5E0" /><Text style={{ color: '#A0AEC0', marginTop: 8, fontStyle: 'italic' }}>No grades found</Text></View>
                    : previewGrades.map((g: any, idx: number) => {
                        const isFail = g.grade === 'F9' || g.grade === '6';
                        return (
                          <View key={g.student_id} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: idx % 2 === 0 ? '#FFF' : '#F7FAFC', borderBottomWidth: 0.5, borderBottomColor: '#EDF2F7' }}>
                            <View style={{ flex: 2 }}><Text style={{ fontWeight: 'bold' as any, color: '#2D3748', fontSize: 13 }} numberOfLines={1}>{g.student_name}</Text><Text style={{ color: '#A0AEC0', fontSize: 10 }}>{g.admission_number}</Text></View>
                            <Text style={{ width: 35, textAlign: 'center', color: '#4A5568', fontWeight: 'bold' as any, fontSize: 13 }}>{g.test_1 ?? '-'}</Text>
                            <Text style={{ width: 35, textAlign: 'center', color: '#4A5568', fontWeight: 'bold' as any, fontSize: 13 }}>{g.test_2 ?? '-'}</Text>
                            <Text style={{ width: 40, textAlign: 'center', color: '#4A5568', fontWeight: 'bold' as any, fontSize: 13 }}>{g.exam ?? '-'}</Text>
                            <Text style={{ width: 40, textAlign: 'center', fontWeight: '900' as any, fontSize: 14, color: isFail ? '#E53E3E' : '#1A365D' }}>{g.score ?? '-'}</Text>
                            <View style={{ width: 40, alignItems: 'center' }}><View style={{ backgroundColor: isFail ? '#FED7D7' : '#C6F6D5', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 }}><Text style={{ fontSize: 11, fontWeight: '900' as any, color: isFail ? '#E53E3E' : '#276749' }}>{g.grade}</Text></View></View>
                            <Text style={{ width: 35, textAlign: 'center', color: '#DD6B20', fontWeight: '900' as any, fontSize: 12 }}>{g.rank || '-'}</Text>
                          </View>
                        );
                      })}
                </View>
                {previewGrades.length > 0 && (() => {
                  const passes = previewGrades.filter((g: any) => g.grade !== 'F9' && g.grade !== '6').length;
                  const avg = Math.round(previewGrades.reduce((s: number, g: any) => s + (g.score || 0), 0) / previewGrades.length);
                  return (
                    <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 1 }}>
                      <Text style={[styles.label, { marginBottom: 12 }]}>📊 Class Statistics</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {[{ label: 'Average', value: `${avg}`, color: '#3182CE' }, { label: 'Passed', value: `${passes}`, color: '#38A169' }, { label: 'Failed', value: `${previewGrades.length - passes}`, color: '#E53E3E' }, { label: 'Pass Rate', value: `${Math.round((passes / previewGrades.length) * 100)}%`, color: passes > previewGrades.length - passes ? '#38A169' : '#E53E3E' }].map(s => (
                          <View key={s.label} style={{ width: '25%', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={{ fontSize: 22, fontWeight: '900' as any, color: s.color }}>{s.value}</Text>
                            <Text style={{ fontSize: 11, color: '#718096', fontWeight: 'bold' as any }}>{s.label}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })()}
                <View style={{ marginBottom: 40 }}>
                  <TouchableOpacity style={{ backgroundColor: '#38A169', borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 12, flexDirection: 'row', justifyContent: 'center' }}
                    onPress={confirmApproveSubject}>
                    <Ionicons name="checkmark-circle" size={22} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 16 }}>✅ APPROVE ALL GRADES</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ backgroundColor: '#E53E3E', borderRadius: 14, padding: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
                    onPress={confirmReturnSubject}
                    disabled={rejectingSubject}>
                    {rejectingSubject ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="arrow-undo" size={22} color="#FFF" style={{ marginRight: 8 }} /><Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 16 }}>↩️ RETURN TO TEACHER</Text></>}
                  </TouchableOpacity>
                </View>
              </ScrollView>}
        </SafeAreaView>
      </Modal>

      {/* ── SIDEBAR DRAWER ── */}
      {isDrawerOpen && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998, flexDirection: 'row' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setIsDrawerOpen(false)} activeOpacity={1} />
          <View style={{ width: 300, backgroundColor: '#FFF', height: '100%' as any, elevation: 20, paddingTop: Platform.OS === 'android' ? 40 : 50 }}>

            {/* Profile */}
            <View style={{ backgroundColor: '#1A365D', padding: 20, alignItems: 'center', paddingBottom: 20 }}>
              <TouchableOpacity onPress={pickImage} style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: '#FFFAF0', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#DD6B20', marginBottom: 10, overflow: 'hidden' }}>
                {profile?.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={{ width: '100%' as any, height: '100%' as any, borderRadius: 35 }} /> : <Text style={{ fontSize: 24, fontWeight: '900', color: '#DD6B20' }}>{getInitials(profile?.full_name)}</Text>}
              </TouchableOpacity>
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '900' }}>{profile?.full_name || 'Teacher'}</Text>
              <Text style={{ color: '#90CDF4', fontSize: 12, marginTop: 3 }}>{profile?.role || 'Teacher'} • {profile?.schools?.name}</Text>
              <View style={{ backgroundColor: '#DD6B20', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginTop: 8 }}>
                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '900' }}>{getRank(impactScore)} • {impactScore} pts</Text>
              </View>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled">

              {/* ── GRADE SETTINGS FIRST ── */}
              <View style={{ backgroundColor: '#FFFAF0', paddingBottom: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '900' as any, color: '#DD6B20', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6, letterSpacing: 1.2 }}>⚙ GRADE SETTINGS</Text>
                <View style={{ paddingHorizontal: 14 }}>

                  {/* CLASS */}
                  <Text style={{ fontSize: 10, fontWeight: '900' as any, color: '#718096', marginBottom: 6, textTransform: 'uppercase' as any, letterSpacing: 0.5 }}>📚 Class</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
                    {classOptions.map(c => (
                      <TouchableOpacity key={c} onPress={() => { setSelectedClass(c); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}
                        style={{ backgroundColor: selectedClass === c ? '#1A365D' : '#FFF', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9, marginRight: 6, marginBottom: 6, borderWidth: 1.5, borderColor: selectedClass === c ? '#1A365D' : '#CBD5E0', elevation: selectedClass === c ? 2 : 0 }}>
                        <Text style={{ fontSize: 13, fontWeight: '900' as any, color: selectedClass === c ? '#FFF' : '#4A5568' }}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* TERM */}
                  <Text style={{ fontSize: 10, fontWeight: '900' as any, color: '#718096', marginBottom: 6, textTransform: 'uppercase' as any, letterSpacing: 0.5 }}>📅 Term</Text>
                  <View style={{ marginBottom: 10 }}>
                    {termOptions.map(t => (
                      <TouchableOpacity key={t} onPress={() => { setTerm(t); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: term === t ? '#1A365D' : '#FFF', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 5, borderWidth: 1.5, borderColor: term === t ? '#1A365D' : '#CBD5E0' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700' as any, color: term === t ? '#FFF' : '#4A5568' }}>{t}</Text>
                        {term === t && <Ionicons name="checkmark-circle" size={16} color="#FFF" />}
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* YEAR */}
                  <Text style={{ fontSize: 10, fontWeight: '900' as any, color: '#718096', marginBottom: 6, textTransform: 'uppercase' as any, letterSpacing: 0.5 }}>🎓 Academic Year</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
                    {yearOptions.map(y => (
                      <TouchableOpacity key={y} onPress={() => { setSelectedYear(y); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}
                        style={{ backgroundColor: selectedYear === y ? '#6B46C1' : '#FFF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginRight: 6, marginBottom: 6, borderWidth: 1.5, borderColor: selectedYear === y ? '#6B46C1' : '#CBD5E0' }}>
                        <Text style={{ fontSize: 11, fontWeight: '900' as any, color: selectedYear === y ? '#FFF' : '#4A5568' }}>{y}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* SUBJECT — dropdown from subjects table, auto JSS/SS by class */}
                  <Text style={{ fontSize: 10, fontWeight: '900' as any, color: '#718096', marginBottom: 6, textTransform: 'uppercase' as any, letterSpacing: 0.5 }}>✏️ Subject</Text>
                  <TouchableOpacity onPress={() => setShowSubjectDropdown(v => !v)}
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1.5, borderColor: subject.length > 0 ? '#DD6B20' : '#CBD5E0', marginBottom: showSubjectDropdown ? 0 : 10 }}>
                    <Ionicons name="pencil" size={16} color={subject.length > 0 ? '#DD6B20' : '#A0AEC0'} style={{ marginRight: 8 }} />
                    <Text style={{ flex: 1, fontSize: 14, color: subject.length > 0 ? '#2D3748' : '#A0AEC0', fontWeight: 'bold' as any }}>{subject || 'Select subject'}</Text>
                    <Ionicons name={showSubjectDropdown ? 'chevron-up' : 'chevron-down'} size={18} color="#A0AEC0" />
                  </TouchableOpacity>
                  {showSubjectDropdown && (
                    <View style={{ backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0', borderTopWidth: 0, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, marginBottom: 10, maxHeight: 240 }}>
                      <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                        {subjectOptions.map(opt => (
                          <TouchableOpacity key={opt} onPress={() => { setSubject(opt); setShowSubjectDropdown(false); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}
                            style={{ paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: '#EDF2F7', backgroundColor: subject === opt ? '#FFFAF0' : '#FFF' }}>
                            <Text style={{ fontSize: 13, fontWeight: subject === opt ? '900' : '600' as any, color: subject === opt ? '#DD6B20' : '#2D3748' }}>{opt}</Text>
                          </TouchableOpacity>
                        ))}
                        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#F7FAFC' }}>
                          <TextInput style={{ flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#2D3748' }}
                            placeholder="Add another subject..." placeholderTextColor="#A0AEC0" value={newSubjectName} onChangeText={setNewSubjectName} autoCapitalize="characters" />
                          <TouchableOpacity onPress={addNewSubject} disabled={addingSubject}
                            style={{ marginLeft: 8, backgroundColor: '#38A169', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 }}>
                            {addingSubject ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 13 }}>Add</Text>}
                          </TouchableOpacity>
                        </View>
                      </ScrollView>
                    </View>
                  )}

                  {/* GRADE MODE */}
                  <Text style={{ fontSize: 10, fontWeight: '900' as any, color: '#718096', marginBottom: 6, textTransform: 'uppercase' as any, letterSpacing: 0.5 }}>📋 Grading Mode</Text>
                  <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                    <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: gradeMode === 'class' ? '#1A365D' : '#FFF', borderRadius: 10, padding: 10, marginRight: 6, borderWidth: 1.5, borderColor: gradeMode === 'class' ? '#1A365D' : '#CBD5E0' }}
                      onPress={() => { setGradeMode('class'); setIndividualStudent(null); setCurrentPage(0); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}>
                      <Ionicons name="grid" size={14} color={gradeMode === 'class' ? '#FFF' : '#4A5568'} style={{ marginRight: 5 }} />
                      <View><Text style={{ fontSize: 11, fontWeight: '900' as any, color: gradeMode === 'class' ? '#FFF' : '#1A365D' }}>Full Class</Text><Text style={{ fontSize: 9, color: gradeMode === 'class' ? '#90CDF4' : '#A0AEC0' }}>All students</Text></View>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: gradeMode === 'individual' ? '#DD6B20' : '#FFF', borderRadius: 10, padding: 10, borderWidth: 1.5, borderColor: gradeMode === 'individual' ? '#DD6B20' : '#CBD5E0' }}
                      onPress={() => { setGradeMode('individual'); setStudentSearchQuery(''); setIndividualStudent(null); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}>
                      <Ionicons name="person" size={14} color={gradeMode === 'individual' ? '#FFF' : '#4A5568'} style={{ marginRight: 5 }} />
                      <View><Text style={{ fontSize: 11, fontWeight: '900' as any, color: gradeMode === 'individual' ? '#FFF' : '#DD6B20' }}>One Student</Text><Text style={{ fontSize: 9, color: gradeMode === 'individual' ? '#FEEBC8' : '#A0AEC0' }}>Search & grade</Text></View>
                    </TouchableOpacity>
                  </View>

                  {/* APPLY */}
                  <TouchableOpacity style={{ backgroundColor: '#38A169', borderRadius: 12, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 12 }}
                    onPress={() => { setIsDrawerOpen(false); if (mode !== 'grades') setMode('grades'); if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}>
                    <Ionicons name="checkmark-circle" size={17} color="#FFF" style={{ marginRight: 7 }} />
                    <Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 13 }}>Apply & Start Grading</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* ── DIVIDER ── */}
              <View style={{ height: 1, backgroundColor: '#E2E8F0' }} />

              {/* ── NAVIGATE ── */}
              <Text style={{ fontSize: 10, fontWeight: '900' as any, color: '#A0AEC0', paddingHorizontal: 20, paddingVertical: 8, letterSpacing: 1 }}>NAVIGATE</Text>
              {([
                { icon: 'book', label: 'Grade Entry', mode: 'grades', color: '#1A365D' },
                { icon: 'clipboard', label: 'Evaluations', mode: 'evaluations', color: '#553C9A' },
                { icon: 'checkmark-circle', label: 'Roll Call', mode: 'attendance', color: '#276749' },
                { icon: 'calendar', label: 'Timetable', mode: 'timetable', color: '#2B6CB0' },
                { icon: 'cloud-upload', label: 'Lesson Materials', mode: 'materials', color: '#3182CE' },
                { icon: 'megaphone', label: 'School Feed', mode: 'feed', color: '#DD6B20' },
                { icon: 'person', label: 'My Profile', mode: 'bio', color: '#718096' },
                ...(profile?.teacher_type === 'class' || profile?.assigned_class
                  ? [{ icon: 'shield-checkmark', label: `Grade Review${pendingSubjects.length > 0 ? ` (${pendingSubjects.length})` : ''}`, mode: 'review', color: '#E53E3E' }]
                  : []),
              ] as any[]).map((item: any) => (
                <TouchableOpacity key={item.mode}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 13, backgroundColor: mode === item.mode ? item.color + '15' : 'transparent', borderLeftWidth: mode === item.mode ? 4 : 0, borderLeftColor: item.color }}
                  onPress={() => { setMode(item.mode); setIsDrawerOpen(false); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: mode === item.mode ? item.color : '#F7FAFC', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Ionicons name={item.icon as any} size={18} color={mode === item.mode ? '#FFF' : item.color} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: mode === item.mode ? '900' : '600', color: mode === item.mode ? item.color : '#2D3748', flex: 1 }}>{item.label}</Text>
                  {mode === item.mode && <Ionicons name="chevron-forward" size={14} color={item.color} />}
                </TouchableOpacity>
              ))}

              {/* ── DIVIDER ── */}
              <View style={{ height: 1, backgroundColor: '#EDF2F7', marginHorizontal: 20, marginVertical: 4 }} />

              {/* EduChat */}
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 13 }}
                onPress={() => { setIsDrawerOpen(false); setTimeout(() => setIsChatOpen(true), 200); }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="logo-whatsapp" size={18} color="#FFF" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#2D3748' }}>EduChat</Text>
              </TouchableOpacity>

              {/* Sign Out */}
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 13, marginBottom: 20 }}
                onPress={async () => { setIsDrawerOpen(false); await supabase.auth.signOut(); router.replace('/'); }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FED7D7', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="log-out-outline" size={18} color="#E53E3E" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#E53E3E' }}>Sign Out</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#EDF2F7' }}>
              <Text style={{ fontSize: 11, color: '#A0AEC0', textAlign: 'center' }}>EduSalone v1.0 • {profile?.schools?.name}</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarBubble}>
            {profile?.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} /> : <Text style={styles.avatarText}>{getInitials(profile?.full_name)}</Text>}
            <View style={styles.editIconBadge}><Ionicons name="camera" size={10} color="#FFF" /></View>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.greeting}>Hi, {firstName} 👋</Text>
            <Text style={styles.subText} numberOfLines={1}>{getRank(impactScore)} • {impactScore} Impact Pts</Text>
          </View>
        </View>
        <TouchableOpacity style={{ padding: 10, backgroundColor: '#EDF2F7', borderRadius: 12, marginLeft: 8 }} onPress={() => setIsDrawerOpen(true)}>
          <Ionicons name="menu" size={24} color="#1A365D" />
        </TouchableOpacity>
      </View>

      {/* ── TAB BAR ── */}
      <View style={{ marginHorizontal: 15, marginBottom: 15 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 10 }}>
          {([
            { icon: 'book', label: 'Grades', mode: 'grades' },
            { icon: 'clipboard', label: 'Evals', mode: 'evaluations' },
            { icon: 'checkmark-circle', label: 'Roll Call', mode: 'attendance' },
            { icon: 'calendar', label: 'Timetable', mode: 'timetable' },
            { icon: 'cloud-upload', label: 'Materials', mode: 'materials' },
            { icon: 'create', label: 'Assignments', mode: 'assignments' },
            { icon: 'folder-open', label: 'Office', mode: 'documents' },
            { icon: 'person', label: 'My Bio', mode: 'bio' },
            { icon: 'megaphone', label: 'Feed', mode: 'feed' },
          ] as any[]).map((tab: any) => (
            <TouchableOpacity key={tab.mode} style={[styles.modeButton, mode === tab.mode && styles.modeButtonActive]} onPress={() => { setMode(tab.mode); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}>
              <Ionicons name={tab.icon as any} size={14} color={mode === tab.mode ? '#FFF' : '#4A5568'} />
              <Text style={[styles.modeText, mode === tab.mode && styles.modeTextActive]}> {tab.label}</Text>
            </TouchableOpacity>
          ))}
          {(profile?.teacher_type === 'class' || profile?.assigned_class) && (
            <TouchableOpacity style={[styles.modeButton, mode === 'review' && { backgroundColor: '#E53E3E' }]} onPress={() => { setMode('review'); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}>
              <Ionicons name="shield-checkmark" size={14} color={mode === 'review' ? '#FFF' : '#4A5568'} />
              <Text style={[styles.modeText, mode === 'review' && { color: '#FFF' }]}> Review</Text>
              {pendingSubjects.length > 0 && <View style={{ backgroundColor: '#E53E3E', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, marginLeft: 4 }}><Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900' as any }}>{pendingSubjects.length}</Text></View>}
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* ── COMPACT STATUS BAR ── */}
      {mode !== 'bio' && mode !== 'feed' && mode !== 'materials' && (
        <TouchableOpacity onPress={() => setIsDrawerOpen(true)}
          style={{ marginHorizontal: 15, marginBottom: 10, backgroundColor: '#FFF', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 }}>
          <Ionicons name="settings-outline" size={16} color="#1A365D" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '900' as any, color: '#1A365D' }}>
              {selectedClass} • {term} • {selectedYear}{mode === 'grades' && subject ? ` • ${subject.toUpperCase()}` : ''}
            </Text>
            {mode === 'grades' && (
              <Text style={{ fontSize: 10, color: '#718096', marginTop: 1 }}>
                {gradeMode === 'class' ? '📋 Full Class mode' : '👤 One Student mode'}{savedStudentIds.length > 0 ? ` • ${savedStudentIds.length} graded` : ''}
              </Text>
            )}
          </View>
          <View style={{ backgroundColor: '#EBF8FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: '900' as any, color: '#2B6CB0' }}>EDIT ▶</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* ══════════════════════════════════════ */}
      {/* GRADES MODE                            */}
      {/* ══════════════════════════════════════ */}
      {mode === 'grades' && (
        <>
          {savedStudentIds.length > 0 && (
            <View style={{ backgroundColor: '#C6F6D5', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginHorizontal: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="checkmark-done-circle" size={16} color="#276749" style={{ marginRight: 6 }} />
              <Text style={{ color: '#276749', fontWeight: '900' as any, fontSize: 12 }}>✅ {savedStudentIds.length} of {students.length} students graded</Text>
            </View>
          )}

          {/* INDIVIDUAL MODE */}
          {gradeMode === 'individual' && (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
              <ScrollView style={{ flex: 1, paddingHorizontal: 15 }} keyboardShouldPersistTaps="handled">
                <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2 }}>
                  <Text style={styles.label}>🔍 Search Student by Name or ID</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1.5, borderColor: showStudentDropdown ? '#3182CE' : '#E2E8F0' }}>
                    <Ionicons name="search" size={18} color="#A0AEC0" style={{ marginRight: 8 }} />
                    <TextInput style={{ flex: 1, paddingVertical: 12, fontSize: 15, color: '#2D3748', fontWeight: 'bold' as any }} placeholder="Type name or admission number..." placeholderTextColor="#A0AEC0" value={studentSearchQuery} onChangeText={t => { setStudentSearchQuery(t); setShowStudentDropdown(true); setIndividualStudent(null); }} onFocus={() => setShowStudentDropdown(true)} />
                    {studentSearchQuery.length > 0 && <TouchableOpacity onPress={() => { setStudentSearchQuery(''); setIndividualStudent(null); setShowStudentDropdown(false); }}><Ionicons name="close-circle" size={20} color="#A0AEC0" /></TouchableOpacity>}
                  </View>
                  {showStudentDropdown && studentSearchQuery.length > 0 && (
                    <View style={{ backgroundColor: '#FFF', borderRadius: 10, marginTop: 6, borderWidth: 1, borderColor: '#E2E8F0', maxHeight: 220, overflow: 'hidden', elevation: 4 }}>
                      {filteredStudents.length === 0
                        ? <View style={{ padding: 16, alignItems: 'center' }}><Text style={{ color: '#A0AEC0', fontStyle: 'italic' }}>No student found</Text></View>
                        : <ScrollView keyboardShouldPersistTaps="handled">
                            {filteredStudents.map((s, idx) => (
                              <TouchableOpacity key={s.id}
                                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: idx < filteredStudents.length - 1 ? 0.5 : 0, borderBottomColor: '#EDF2F7', backgroundColor: individualStudent?.id === s.id ? '#EBF8FF' : '#FFF' }}
                                onPress={() => { setIndividualStudent(s); setStudentSearchQuery(s.users?.full_name || ''); setShowStudentDropdown(false); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}>
                                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A365D', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                  <Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 13 }}>{getInitials(s.users?.full_name || '')}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontWeight: 'bold' as any, color: '#2D3748', fontSize: 15 }}>{s.users?.full_name}</Text>
                                  <Text style={{ color: '#718096', fontSize: 12 }}>ID: {s.admission_number} • {s.current_class}</Text>
                                </View>
                                {savedStudentIds.includes(s.id) && <View style={{ backgroundColor: '#C6F6D5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ color: '#276749', fontSize: 11, fontWeight: '900' as any }}>✅ Done</Text></View>}
                              </TouchableOpacity>
                            ))}
                          </ScrollView>}
                    </View>
                  )}
                </View>

                {individualStudent && (
                  <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#DD6B20' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F7FAFC' }}>
                      <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#1A365D', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                        <Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 18 }}>{getInitials(individualStudent.users?.full_name || '')}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 18, fontWeight: '900' as any, color: '#1A365D' }}>{individualStudent.users?.full_name}</Text>
                        <Text style={{ color: '#718096', fontSize: 13, marginTop: 2 }}>ID: {individualStudent.admission_number} • {individualStudent.current_class} • {subject.toUpperCase() || 'No subject set'}</Text>
                      </View>
                      <TouchableOpacity onPress={() => { setIndividualStudent(null); setStudentSearchQuery(''); setSingleGrade({ test1: '', test2: '', exam: '' }); }} style={{ padding: 6 }}>
                        <Ionicons name="close-circle" size={24} color="#CBD5E0" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.label}>Enter Scores</Text>
                    <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                      {[{ label: 'TEST 1 (/15)', key: 'test1', max: 15 }, { label: 'TEST 2 (/15)', key: 'test2', max: 15 }, { label: 'EXAM (/70)', key: 'exam', max: 70 }].map((field, idx) => (
                        <View key={field.key} style={{ flex: 1, marginRight: idx < 2 ? 10 : 0 }}>
                          <Text style={{ fontSize: 11, color: '#718096', fontWeight: 'bold' as any, marginBottom: 6, textAlign: 'center' }}>{field.label}</Text>
                          <TextInput style={{ backgroundColor: '#EDF2F7', borderRadius: 10, textAlign: 'center', fontSize: 24, fontWeight: '900' as any, color: '#1A365D', paddingVertical: 14 }} keyboardType="numeric" maxLength={field.max === 70 ? 2 : 2} placeholder="–" placeholderTextColor="#CBD5E0" value={(singleGrade as any)[field.key]} onChangeText={v => {
                            const digits = v.replace(/[^0-9]/g, '');
                            // Clamp to max — cannot exceed field limit
                            const num = Number(digits);
                            const clamped = digits === '' ? '' : (num > field.max ? String(field.max) : digits);
                            setSingleGrade(p => ({ ...p, [field.key]: clamped }));
                            if (num > field.max && Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                          }} />
                          <Text style={{ fontSize: 9, color: '#A0AEC0', textAlign: 'center', marginTop: 3 }}>Max {field.max}</Text>
                        </View>
                      ))}
                    </View>
                    {(singleGrade.test1 || singleGrade.test2 || singleGrade.exam) && (() => {
                      const tot = (Number(singleGrade.test1) || 0) + (Number(singleGrade.test2) || 0) + (Number(singleGrade.exam) || 0);
                      const isErr = tot > 100;
                      const isJSSP = (individualStudent?.current_class || '').toUpperCase().includes('JSS');
                      let g = isErr ? 'ERR' : 'F9'; let rm = 'FAIL'; let gc = '#E53E3E';
                      if (!isErr) {
                        if (isJSSP) { if (tot >= 75) { g = '1'; rm = 'EXCELLENT'; gc = '#276749'; } else if (tot >= 65) { g = '2'; rm = 'V. GOOD'; gc = '#276749'; } else if (tot >= 55) { g = '3'; rm = 'GOOD'; gc = '#2B6CB0'; } else if (tot >= 45) { g = '4'; rm = 'CREDIT'; gc = '#744210'; } else if (tot >= 35) { g = '5'; rm = 'PASS'; gc = '#553C9A'; } else { g = '6'; rm = 'FAIL'; gc = '#E53E3E'; } }
                        else { if (tot >= 75) { g = 'A1'; rm = 'EXCELLENT'; gc = '#276749'; } else if (tot >= 70) { g = 'B2'; rm = 'V. GOOD'; gc = '#276749'; } else if (tot >= 65) { g = 'B3'; rm = 'GOOD'; gc = '#2B6CB0'; } else if (tot >= 60) { g = 'C4'; rm = 'CREDIT'; gc = '#744210'; } else if (tot >= 55) { g = 'C5'; rm = 'CREDIT'; gc = '#744210'; } else if (tot >= 50) { g = 'C6'; rm = 'CREDIT'; gc = '#744210'; } else if (tot >= 45) { g = 'D7'; rm = 'PASS'; gc = '#553C9A'; } else if (tot >= 40) { g = 'E8'; rm = 'PASS'; gc = '#553C9A'; } }
                      }
                      return (
                        <View style={{ flexDirection: 'row', backgroundColor: isErr ? '#FFF5F5' : '#F0FFF4', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16, borderWidth: 1.5, borderColor: isErr ? '#FC8181' : '#9AE6B4' }}>
                          <View style={{ flex: 1, alignItems: 'center' }}><Text style={{ fontSize: 11, color: '#718096', fontWeight: 'bold' as any }}>TOTAL</Text><Text style={{ fontSize: 28, fontWeight: '900' as any, color: isErr ? '#E53E3E' : '#1A365D' }}>{tot}</Text>{isErr && <Text style={{ color: '#E53E3E', fontSize: 11 }}>EXCEEDS 100!</Text>}</View>
                          <View style={{ width: 1, height: 40, backgroundColor: '#E2E8F0', marginHorizontal: 12 }} />
                          <View style={{ flex: 1, alignItems: 'center' }}><Text style={{ fontSize: 11, color: '#718096', fontWeight: 'bold' as any }}>GRADE</Text><Text style={{ fontSize: 28, fontWeight: '900' as any, color: gc }}>{g}</Text></View>
                          <View style={{ width: 1, height: 40, backgroundColor: '#E2E8F0', marginHorizontal: 12 }} />
                          <View style={{ flex: 1, alignItems: 'center' }}><Text style={{ fontSize: 11, color: '#718096', fontWeight: 'bold' as any }}>REMARK</Text><Text style={{ fontSize: 13, fontWeight: '900' as any, color: gc, textAlign: 'center' }}>{rm}</Text></View>
                        </View>
                      );
                    })()}
                    <TouchableOpacity style={[styles.saveButton, { width: '100%' as any, backgroundColor: savingSingle ? '#A0AEC0' : '#DD6B20' }]} onPress={saveIndividualGrade} disabled={savingSingle}>
                      {savingSingle ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>📤 Submit to Principal</Text>}
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          )}

          {/* FULL CLASS MODE */}
          {gradeMode === 'class' && (
            <>
              {totalPages > 1 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 15, marginBottom: 10, backgroundColor: '#FFF', borderRadius: 12, padding: 10, elevation: 1 }}>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: currentPage === 0 ? '#EDF2F7' : '#1A365D', borderRadius: 8 }} onPress={() => { if (currentPage > 0) { setCurrentPage(p => p - 1); if (Platform.OS !== 'web') Haptics.selectionAsync(); } }} disabled={currentPage === 0}>
                    <Ionicons name="chevron-back" size={16} color={currentPage === 0 ? '#A0AEC0' : '#FFF'} /><Text style={{ color: currentPage === 0 ? '#A0AEC0' : '#FFF', fontWeight: 'bold' as any, fontSize: 13, marginLeft: 4 }}>Prev</Text>
                  </TouchableOpacity>
                  <Text style={{ color: '#4A5568', fontWeight: 'bold' as any, fontSize: 13 }}>Students {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, students.length)} of {students.length}</Text>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: currentPage >= totalPages - 1 ? '#EDF2F7' : '#1A365D', borderRadius: 8 }} onPress={() => { if (currentPage < totalPages - 1) { setCurrentPage(p => p + 1); if (Platform.OS !== 'web') Haptics.selectionAsync(); } }} disabled={currentPage >= totalPages - 1}>
                    <Text style={{ color: currentPage >= totalPages - 1 ? '#A0AEC0' : '#FFF', fontWeight: 'bold' as any, fontSize: 13, marginRight: 4 }}>Next</Text><Ionicons name="chevron-forward" size={16} color={currentPage >= totalPages - 1 ? '#A0AEC0' : '#FFF'} />
                  </TouchableOpacity>
                </View>
              )}
              <ScrollView horizontal showsHorizontalScrollIndicator style={{ flex: 1 }} contentContainerStyle={{ minWidth: '100%' as any }}>
                <ScrollView style={styles.spreadsheetContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator contentContainerStyle={{ paddingBottom: 100 }}>
                  <View style={styles.spreadsheetHeader}>
                    <Text style={[styles.columnHeader, { width: 140, textAlign: 'left' }]}>Student</Text>
                    <Text style={[styles.columnHeader, { fontSize: 9 }]}>T1{'\n'}/15</Text>
                    <Text style={[styles.columnHeader, { fontSize: 9 }]}>T2{'\n'}/15</Text>
                    <Text style={[styles.columnHeader, { fontSize: 9 }]}>EX{'\n'}/70</Text>
                    <Text style={styles.columnHeader}>TOT</Text>
                    <Text style={[styles.columnHeader, { color: '#DD6B20', fontWeight: '900' as any }]}>RNK</Text>
                    <Text style={styles.columnHeader}>GRD</Text>
                    <Text style={[styles.columnHeader, { width: 90 }]}>REMARKS</Text>
                    <Text style={[styles.columnHeader, { width: 36 }]}>DEL</Text>
                  </View>
                  {loading ? <ActivityIndicator color="#DD6B20" style={{ marginTop: 20 }} />
                    : students.length === 0 ? <Text style={styles.emptyText}>No students in {selectedClass}.</Text>
                    : paginatedStudents.map(student => (
                        <StudentGradeRow key={student.id} student={student} initialGrade={gradesMap[student.id]} onGradeUpdate={handleGradeUpdate}
                          onDelete={(id: string) => setGradesMap((prev: any) => { const u = { ...prev }; delete u[id]; return u; })} />
                      ))}
                  {students.length > 0 && (
                    <TouchableOpacity style={styles.saveButton} onPress={saveBulkGrades} disabled={submitting}>
                      {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>📤 Submit to Principal</Text>}
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </ScrollView>
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════ */}
      {/* EVALUATIONS MODE                       */}
      {/* ══════════════════════════════════════ */}
      {mode === 'evaluations' && (
        <ScrollView style={{ flex: 1, paddingHorizontal: 15 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>Select Student to Evaluate:</Text>
          {students.length === 0 ? <Text style={styles.emptyText}>No students in class.</Text> : (
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 }}>
                <Ionicons name="search" size={16} color="#A0AEC0" style={{ marginRight: 8 }} />
                <TextInput style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: '#2D3748' }} placeholder="Search student by name..." placeholderTextColor="#A0AEC0" value={evalSearchQuery} onChangeText={setEvalSearchQuery} />
                {evalSearchQuery.length > 0 && <TouchableOpacity onPress={() => setEvalSearchQuery('')}><Ionicons name="close-circle" size={18} color="#A0AEC0" /></TouchableOpacity>}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {students.filter(s => (s.users?.full_name || '').toLowerCase().includes(evalSearchQuery.toLowerCase())).map(student => (
                  <TouchableOpacity key={student.id} style={[styles.chip, evalStudent?.id === student.id && styles.chipActive]} onPress={() => { setEvalStudent(student); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}>
                    <Text style={[styles.chipText, evalStudent?.id === student.id && styles.chipTextActive]}>{student.users?.full_name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          {evalStudent && (
            <View style={{ backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 50, elevation: 2 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A365D', marginBottom: 20, textAlign: 'center' }}>Evaluating: {evalStudent.users?.full_name}</Text>
              <Text style={styles.label}>Affective Traits</Text>
              {renderRatingRow('Attentiveness', traits.attentiveness, v => setTraits({ ...traits, attentiveness: v }))}
              {renderRatingRow('Attitude to Work', traits.attitude, v => setTraits({ ...traits, attitude: v }))}
              {renderRatingRow('Cooperation', traits.cooperation, v => setTraits({ ...traits, cooperation: v }))}
              {renderRatingRow('Neatness', traits.neatness, v => setTraits({ ...traits, neatness: v }))}
              {renderRatingRow('Politeness', traits.politeness, v => setTraits({ ...traits, politeness: v }))}
              {renderRatingRow('Punctuality', traits.punctuality, v => setTraits({ ...traits, punctuality: v }))}
              <Text style={[styles.label, { marginTop: 15 }]}>Psychomotor Skills</Text>
              {renderRatingRow('Drawing & Painting', skills.drawing_painting, v => setSkills({ ...skills, drawing_painting: v }))}
              {renderRatingRow('Handling of Tools', skills.handling_tools, v => setSkills({ ...skills, handling_tools: v }))}
              {renderRatingRow('Games & Sports', skills.games, v => setSkills({ ...skills, games: v }))}
              {renderRatingRow('Handwriting', skills.handwriting, v => setSkills({ ...skills, handwriting: v }))}
              {renderRatingRow('Music', skills.music, v => setSkills({ ...skills, music: v }))}
              {renderRatingRow('Verbal Fluency', skills.verbal_fluency, v => setSkills({ ...skills, verbal_fluency: v }))}
              <Text style={[styles.label, { marginTop: 15 }]}>End of Term Comments</Text>
              <TextInput style={styles.textArea} placeholder="Write your observation here..." multiline value={comments.teacher} onChangeText={v => setComments({ ...comments, teacher: v })} />
              <Text style={[styles.label, { marginTop: 10 }]}>Promotion Status</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 5, marginBottom: 15 }}>
                {getPromotionOptions(evalStudent.current_class).map(opt => (
                  <TouchableOpacity key={opt} style={[styles.chip, comments.promotion === opt && { backgroundColor: '#38A169', borderColor: '#38A169' }, { marginBottom: 8 }]} onPress={() => { setComments({ ...comments, promotion: opt }); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}>
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

      {/* ══════════════════════════════════════ */}
      {/* ATTENDANCE MODE                        */}
      {/* ══════════════════════════════════════ */}
      {mode === 'attendance' && (
        <ScrollView style={{ flex: 1, paddingHorizontal: 15 }} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: '#3182CE' }]}>🗓️ {formattedDate}</Text>
          {loading ? <ActivityIndicator color="#DD6B20" style={{ marginTop: 20 }} />
            : students.length === 0 ? <Text style={styles.emptyText}>No students in class.</Text>
            : students.map(student => {
                const status = attendanceMap[student.id] || 'Present';
                return (
                  <View key={student.id} style={styles.attendanceRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: 'bold', color: '#2D3748', fontSize: 16 }}>{student.users?.full_name}</Text>
                      <Text style={{ color: '#A0AEC0', fontSize: 12, fontWeight: 'bold' }}>{student.admission_number || 'No ADM No.'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                      <TouchableOpacity style={[styles.attBtn, status === 'Present' && { backgroundColor: '#38A169' }, { marginRight: 8 }]} onPress={() => handleAttendanceChange(student.id, 'Present')}><Text style={[styles.attText, status === 'Present' && { color: '#FFF' }]}>P</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.attBtn, status === 'Absent' && { backgroundColor: '#E53E3E' }, { marginRight: 8 }]} onPress={() => handleAttendanceChange(student.id, 'Absent')}><Text style={[styles.attText, status === 'Absent' && { color: '#FFF' }]}>A</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.attBtn, status === 'Late' && { backgroundColor: '#DD6B20' }]} onPress={() => handleAttendanceChange(student.id, 'Late')}><Text style={[styles.attText, status === 'Late' && { color: '#FFF' }]}>L</Text></TouchableOpacity>
                    </View>
                  </View>
                );
              })}
          {students.length > 0 && (
            <TouchableOpacity style={styles.saveButton} onPress={saveAttendance} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>💾 Save Roll Call</Text>}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* ══════════════════════════════════════ */}
      {/* TIMETABLE MODE                         */}
      {/* ══════════════════════════════════════ */}
      {mode === 'timetable' && (
        <ScrollView style={{ flex: 1, paddingHorizontal: 15 }} keyboardShouldPersistTaps="handled">
          <View style={{ backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 50, elevation: 2 }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="calendar" size={40} color="#3182CE" />
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A365D', marginTop: 10 }}>Weekly Timetable Setup</Text>
            </View>
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
              <View key={day} style={{ marginBottom: 15 }}>
                <Text style={styles.label}>{day}</Text>
                <TextInput style={[styles.inputInner, { backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12 }]} placeholder="e.g. Maths (8am) • English (10am)" placeholderTextColor="#A0AEC0" value={timetableMap[day]} onChangeText={v => setTimetableMap({ ...timetableMap, [day]: v })} />
              </View>
            ))}
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <TouchableOpacity style={[styles.saveButton, { flex: 1, backgroundColor: '#E2E8F0', marginRight: 10 }]} onPress={generateTimetablePDF} disabled={printingTimetable}>
                {printingTimetable ? <ActivityIndicator color="#3182CE" /> : <Text style={[styles.saveButtonText, { color: '#3182CE' }]}>🖨️ PDF</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, { flex: 2 }]} onPress={saveTimetable} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>📡 Sync to Students</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ══════════════════════════════════════ */}
      {/* MATERIALS MODE                         */}
      {/* ══════════════════════════════════════ */}
      {mode === 'materials' && (
        <ScrollView style={{ flex: 1, paddingHorizontal: 15 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Upload Card */}
          <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#3182CE' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#EBF8FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name="cloud-upload" size={24} color="#3182CE" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '900' as any, color: '#1A365D' }}>Upload Lesson Note</Text>
                <Text style={{ fontSize: 11, color: '#718096', marginTop: 2 }}>PDF, Word, or Image — sent directly to students</Text>
              </View>
            </View>

            <Text style={styles.label}>Material Title *</Text>
            <TextInput style={[styles.bioInput, { marginBottom: 10 }]} placeholder="e.g. Chapter 3 — Algebra Notes" value={materialTitle} onChangeText={setMaterialTitle} />

            <Text style={styles.label}>Subject (optional)</Text>
            <TextInput style={[styles.bioInput, { marginBottom: 10 }]} placeholder={`e.g. ${subject || 'Mathematics'}`} value={materialSubject} onChangeText={setMaterialSubject} />

            <Text style={styles.label}>Send To</Text>
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: materialTarget === 'class' ? '#1A365D' : '#F7FAFC', alignItems: 'center', marginRight: 8, borderWidth: 1.5, borderColor: materialTarget === 'class' ? '#1A365D' : '#E2E8F0' }} onPress={() => setMaterialTarget('class')}>
                <Text style={{ fontWeight: '900' as any, fontSize: 13, color: materialTarget === 'class' ? '#FFF' : '#4A5568' }}>📚 {selectedClass} Only</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: materialTarget === 'all' ? '#6B46C1' : '#F7FAFC', alignItems: 'center', borderWidth: 1.5, borderColor: materialTarget === 'all' ? '#6B46C1' : '#E2E8F0' }} onPress={() => setMaterialTarget('all')}>
                <Text style={{ fontWeight: '900' as any, fontSize: 13, color: materialTarget === 'all' ? '#FFF' : '#4A5568' }}>🏫 All Classes</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={{ backgroundColor: uploadingMaterial ? '#A0AEC0' : '#3182CE', borderRadius: 12, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }} onPress={uploadLessonNote} disabled={uploadingMaterial}>
              {uploadingMaterial
                ? <><ActivityIndicator color="#FFF" style={{ marginRight: 10 }} /><Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 14 }}>Uploading...</Text></>
                : <><Ionicons name="cloud-upload-outline" size={20} color="#FFF" style={{ marginRight: 8 }} /><Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 14 }}>Choose File & Upload</Text></>}
            </TouchableOpacity>
          </View>

          {/* Uploaded Materials List */}
          <Text style={[styles.label, { color: '#1A365D', fontSize: 12, marginBottom: 10 }]}>📁 My Uploaded Materials ({materials.length})</Text>
          {materials.length === 0
            ? <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 40 }}>
                <Ionicons name="folder-open-outline" size={50} color="#CBD5E0" />
                <Text style={{ color: '#A0AEC0', marginTop: 10, fontSize: 14, fontStyle: 'italic' }}>No materials uploaded yet.</Text>
              </View>
            : materials.map((m: any) => (
                <View key={m.id} style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 1, borderLeftWidth: 3, borderLeftColor: m.file_type === 'pdf' ? '#E53E3E' : '#3182CE' }}>
                  <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: m.file_type === 'pdf' ? '#FED7D7' : '#EBF8FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Ionicons name={m.file_type === 'pdf' ? 'document-text' : (['mp4','mov','webm','mkv','avi'].includes(m.file_type) ? 'videocam' : 'document')} size={22} color={m.file_type === 'pdf' ? '#E53E3E' : '#3182CE'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '900' as any, color: '#1A365D', fontSize: 14 }} numberOfLines={1}>{m.title}</Text>
                    <Text style={{ color: '#718096', fontSize: 11, marginTop: 2 }}>{m.subject || 'General'} • {m.class_name} • {new Date(m.created_at).toLocaleDateString('en-GB')}</Text>
                    <Text style={{ color: '#A0AEC0', fontSize: 10, marginTop: 1 }} numberOfLines={1}>{m.file_name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => openMaterial(m.file_url, m.file_name)} style={{ backgroundColor: '#EBF8FF', borderRadius: 8, padding: 8, marginRight: 8 }}>
                    <Ionicons name="eye-outline" size={18} color="#3182CE" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteMaterial(m.id)} style={{ backgroundColor: '#FFF5F5', borderRadius: 8, padding: 8 }}>
                    <Ionicons name="trash-outline" size={18} color="#E53E3E" />
                  </TouchableOpacity>
                </View>
              ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ══════════════════════════════════════ */}
      {/* ASSIGNMENTS MODE                       */}
      {/* ══════════════════════════════════════ */}
      {mode === 'assignments' && !markingAssignment && (
        <ScrollView style={{ flex: 1, paddingHorizontal: 15 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#9F7AEA' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#FAF5FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name="create" size={24} color="#9F7AEA" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '900' as any, color: '#1A365D' }}>Post Assignment</Text>
                <Text style={{ fontSize: 11, color: '#718096', marginTop: 2 }}>Goes to all {selectedClass} students</Text>
              </View>
            </View>

            <Text style={styles.label}>Title *</Text>
            <TextInput style={[styles.bioInput, { marginBottom: 10 }]} placeholder="e.g. Algebra Homework — Exercise 4" value={assignmentForm.title} onChangeText={t => setAssignmentForm(f => ({ ...f, title: t }))} />

            <Text style={styles.label}>Instructions / Question *</Text>
            <TextInput style={[styles.bioInput, { height: 110, textAlignVertical: 'top', marginBottom: 10 }]} placeholder="Type the assignment question or instructions here..." multiline value={assignmentForm.instructions} onChangeText={t => setAssignmentForm(f => ({ ...f, instructions: t }))} />

            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Subject</Text>
                <TextInput style={styles.bioInput} placeholder={subject || 'e.g. Mathematics'} value={assignmentForm.subject} onChangeText={t => setAssignmentForm(f => ({ ...f, subject: t }))} autoCapitalize="characters" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Due Date</Text>
                <TextInput style={styles.bioInput} placeholder="YYYY-MM-DD" value={assignmentForm.dueDate} onChangeText={t => setAssignmentForm(f => ({ ...f, dueDate: t }))} />
              </View>
            </View>

            <TouchableOpacity style={{ backgroundColor: postingAssignment ? '#A0AEC0' : '#9F7AEA', borderRadius: 12, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 4 }} onPress={postAssignment} disabled={postingAssignment}>
              {postingAssignment
                ? <ActivityIndicator color="#FFF" />
                : <><Ionicons name="send" size={18} color="#FFF" style={{ marginRight: 8 }} /><Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 14 }}>Post to {selectedClass}</Text></>}
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: '#1A365D', fontSize: 12, marginBottom: 10 }]}>📋 Posted Assignments ({assignments.length})</Text>
          {assignments.length === 0
            ? <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 40 }}>
                <Ionicons name="document-text-outline" size={50} color="#CBD5E0" />
                <Text style={{ color: '#A0AEC0', marginTop: 10, fontSize: 14, fontStyle: 'italic' }}>No assignments posted yet.</Text>
              </View>
            : assignments.map((a: any) => (
                <View key={a.id} style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 10, elevation: 1, borderLeftWidth: 3, borderLeftColor: '#9F7AEA' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontWeight: '900' as any, color: '#1A365D', fontSize: 15 }}>{a.title}</Text>
                      <Text style={{ color: '#718096', fontSize: 11, marginTop: 2 }}>{a.class_name}{a.subject ? ` • ${a.subject}` : ''}{a.due_date ? ` • Due ${a.due_date}` : ''}</Text>
                      <Text style={{ color: '#4A5568', fontSize: 12, marginTop: 6, lineHeight: 18 }} numberOfLines={3}>{a.instructions}</Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteAssignment(a.id)} style={{ backgroundColor: '#FFF5F5', borderRadius: 8, padding: 8 }}>
                      <Ionicons name="trash-outline" size={16} color="#E53E3E" />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                    <Ionicons name="people" size={14} color="#9F7AEA" style={{ marginRight: 5 }} />
                    <Text style={{ color: '#6B46C1', fontWeight: '900' as any, fontSize: 12 }}>{assignmentSubs[a.id] || 0} submission{(assignmentSubs[a.id] || 0) === 1 ? '' : 's'}</Text>
                    <TouchableOpacity onPress={() => openMarking(a)} style={{ marginLeft: 'auto' as any, backgroundColor: '#9F7AEA', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="checkmark-done" size={13} color="#FFF" style={{ marginRight: 4 }} />
                      <Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 11 }}>View & Mark</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ══════════════════════════════════════ */}
      {/* ASSIGNMENT MARKING VIEW                */}
      {/* ══════════════════════════════════════ */}
      {mode === 'assignments' && markingAssignment && (
        <ScrollView style={{ flex: 1, paddingHorizontal: 15 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => setMarkingAssignment(null)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 4 }}>
            <Ionicons name="arrow-back" size={20} color="#9F7AEA" />
            <Text style={{ color: '#9F7AEA', fontWeight: '900' as any, fontSize: 14, marginLeft: 6 }}>Back to assignments</Text>
          </TouchableOpacity>

          <View style={{ backgroundColor: '#FAF5FF', borderRadius: 14, padding: 16, marginBottom: 14, borderLeftWidth: 4, borderLeftColor: '#9F7AEA' }}>
            <Text style={{ fontSize: 16, fontWeight: '900' as any, color: '#1A365D' }}>{markingAssignment.title}</Text>
            <Text style={{ color: '#718096', fontSize: 11, marginTop: 2 }}>{markingAssignment.class_name}{markingAssignment.subject ? ` • ${markingAssignment.subject}` : ''}{markingAssignment.due_date ? ` • Due ${markingAssignment.due_date}` : ''}</Text>
            <Text style={{ color: '#4A5568', fontSize: 13, marginTop: 8, lineHeight: 19 }}>{markingAssignment.instructions}</Text>
          </View>

          {loadingSubs ? <ActivityIndicator color="#9F7AEA" style={{ padding: 20 }} /> :
            submissions.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 40 }}>
                <Ionicons name="people-outline" size={50} color="#CBD5E0" />
                <Text style={{ color: '#A0AEC0', marginTop: 10, fontStyle: 'italic' }}>No student has submitted yet.</Text>
              </View>
            ) : (
              submissions.map((s: any) => {
                const d = markDrafts[s.id] || { score: '', grade: '', feedback: '' };
                const isMarked = s.status === 'marked';
                return (
                  <View key={s.id} style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12, elevation: 1, borderLeftWidth: 3, borderLeftColor: isMarked ? '#38A169' : '#D69E2E' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Ionicons name="person-circle" size={22} color="#9F7AEA" style={{ marginRight: 6 }} />
                      <Text style={{ fontWeight: '900' as any, color: '#1A365D', fontSize: 14, flex: 1 }}>{s._name}</Text>
                      {isMarked && <View style={{ backgroundColor: '#C6F6D5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ color: '#276749', fontSize: 10, fontWeight: '900' as any }}>MARKED</Text></View>}
                    </View>

                    <Text style={{ color: '#718096', fontSize: 11 }}>Answer:</Text>
                    <Text style={{ color: '#2D3748', fontSize: 13, marginTop: 2, marginBottom: 12, lineHeight: 19 }}>{s.answer_text || '(no text answer)'}</Text>

                    <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.label}>Score</Text>
                        <TextInput style={styles.bioInput} placeholder="e.g. 18" keyboardType="numeric" value={d.score} onChangeText={t => setMarkDrafts(prev => ({ ...prev, [s.id]: { ...d, score: t } }))} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Grade</Text>
                        <TextInput style={styles.bioInput} placeholder="e.g. A1 / 18 of 20" value={d.grade} onChangeText={t => setMarkDrafts(prev => ({ ...prev, [s.id]: { ...d, grade: t } }))} />
                      </View>
                    </View>

                    <Text style={styles.label}>Feedback / Comment</Text>
                    <TextInput style={[styles.bioInput, { height: 70, textAlignVertical: 'top', marginBottom: 10 }]} placeholder="Well done / Re-do question 2..." multiline value={d.feedback} onChangeText={t => setMarkDrafts(prev => ({ ...prev, [s.id]: { ...d, feedback: t } }))} />

                    <TouchableOpacity onPress={() => saveMark(s)} disabled={savingMarkId === s.id} style={{ backgroundColor: savingMarkId === s.id ? '#A0AEC0' : (isMarked ? '#38A169' : '#9F7AEA'), borderRadius: 10, padding: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
                      {savingMarkId === s.id ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="send" size={15} color="#FFF" style={{ marginRight: 6 }} /><Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 13 }}>{isMarked ? 'Update Grade' : 'Send Grade to Student'}</Text></>}
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ══════════════════════════════════════ */}
      {/* OFFICE DOCUMENTS (INBOX)               */}
      {/* ══════════════════════════════════════ */}
      {mode === 'documents' && (
        <ScrollView style={{ flex: 1, paddingHorizontal: 15 }} showsVerticalScrollIndicator={false}>
          {/* SEND A DOCUMENT */}
          <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginTop: 14, marginBottom: 14, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#9F7AEA' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="paper-plane" size={20} color="#9F7AEA" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 15, fontWeight: '900' as any, color: '#1A365D' }}>Send a Document</Text>
            </View>
            <TextInput style={styles.bioInput} placeholder="Title (e.g. Lesson Plan Week 5)" value={sendDocTitle} onChangeText={setSendDocTitle} />
            <TextInput style={[styles.bioInput, { height: 60, textAlignVertical: 'top', marginTop: 8 }]} placeholder="Short note (optional)" multiline value={sendDocNote} onChangeText={setSendDocNote} />
            <Text style={{ fontSize: 10, color: '#718096', fontWeight: '900' as any, marginTop: 10, marginBottom: 6 }}>SEND TO</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {[{ key: 'office', label: 'Office' }, { key: 'students', label: `Students${selectedClass ? ' · ' + selectedClass : ''}` }, { key: 'parents', label: `Parents${selectedClass ? ' · ' + selectedClass : ''}` }].map((opt) => {
                const active = sendDocAudience === opt.key;
                return (
                  <TouchableOpacity key={opt.key} onPress={() => setSendDocAudience(opt.key)} style={{ backgroundColor: active ? '#9F7AEA' : '#EDF2F7', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, marginBottom: 8 }}>
                    <Text style={{ color: active ? '#FFF' : '#4A5568', fontWeight: '900' as any, fontSize: 12 }}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={sendMyDoc} disabled={sendingMyDoc} style={{ backgroundColor: sendingMyDoc ? '#A0AEC0' : '#9F7AEA', borderRadius: 10, padding: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 4 }}>
              {sendingMyDoc ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="cloud-upload" size={16} color="#FFF" style={{ marginRight: 6 }} /><Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 13 }}>Choose File & Send</Text></>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowMySent(!showMySent)} style={{ alignItems: 'center', paddingTop: 12 }}>
              <Text style={{ color: '#9F7AEA', fontWeight: '900' as any, fontSize: 12 }}>{showMySent ? '▲ Hide my sent documents' : `▼ My sent documents (${mySentDocs.length})`}</Text>
            </TouchableOpacity>
            {showMySent && (
              <View style={{ marginTop: 8 }}>
                {mySentDocs.length === 0 ? <Text style={{ color: '#A0AEC0', fontStyle: 'italic', textAlign: 'center', fontSize: 12 }}>You haven't sent any documents.</Text> :
                  mySentDocs.map((d: any) => (
                    <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                      <Ionicons name={d.file_type === 'image' ? 'image' : d.file_type === 'pdf' ? 'document-text' : 'document'} size={18} color="#9F7AEA" style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: '900' as any, color: '#1A365D' }} numberOfLines={1}>{d.title}</Text>
                        <Text style={{ fontSize: 10, color: '#A0AEC0', marginTop: 1 }}>To {docAudLabel(d.audience)}{d.target_class ? ` · ${d.target_class}` : ''}</Text>
                      </View>
                      <TouchableOpacity onPress={() => openDoc(d.file_url)} style={{ backgroundColor: '#EBF8FF', borderRadius: 8, padding: 7, marginLeft: 6 }}>
                        <Ionicons name="open-outline" size={14} color="#3182CE" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteMyDoc(d.id)} style={{ backgroundColor: '#FFF5F5', borderRadius: 8, padding: 7, marginLeft: 6 }}>
                        <Ionicons name="trash-outline" size={14} color="#E53E3E" />
                      </TouchableOpacity>
                    </View>
                  ))}
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 14 }}>
            <Ionicons name="folder-open" size={22} color="#3182CE" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 18, fontWeight: '900' as any, color: '#1A365D', flex: 1 }}>From the Office</Text>
            <TouchableOpacity onPress={loadDocuments}><Ionicons name="refresh" size={18} color="#3182CE" /></TouchableOpacity>
          </View>
          {loadingOfficeDocs ? <ActivityIndicator color="#3182CE" style={{ marginTop: 30 }} /> :
            officeDocs.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Ionicons name="file-tray-outline" size={50} color="#CBD5E0" />
                <Text style={{ color: '#A0AEC0', marginTop: 10, fontStyle: 'italic' }}>No documents from the office yet.</Text>
              </View>
            ) : officeDocs.map((d: any) => (
              <View key={d.id} style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 10, elevation: 1, borderLeftWidth: 3, borderLeftColor: '#3182CE' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={d.file_type === 'image' ? 'image' : d.file_type === 'pdf' ? 'document-text' : 'document'} size={26} color="#3182CE" style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '900' as any, color: '#1A365D', fontSize: 15 }}>{d.title}</Text>
                    <Text style={{ color: '#718096', fontSize: 11, marginTop: 2 }}>{d.sender_name || 'Office'}{d.sender_role ? ` (${d.sender_role})` : ''} · {new Date(d.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                  </View>
                </View>
                {d.note ? <Text style={{ color: '#4A5568', fontSize: 13, marginTop: 8, lineHeight: 19 }}>{d.note}</Text> : null}
                <TouchableOpacity onPress={() => openDoc(d.file_url)} style={{ backgroundColor: '#3182CE', borderRadius: 10, padding: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 12 }}>
                  <Ionicons name="download-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 13 }}>Open / Download</Text>
                </TouchableOpacity>
              </View>
            ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ══════════════════════════════════════ */}
      {/* BIO MODE                               */}
      {/* ══════════════════════════════════════ */}
      {mode === 'bio' && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1, paddingHorizontal: 15 }} showsVerticalScrollIndicator={false}>
            <View style={{ backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 50, elevation: 2 }}>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Ionicons name="person-circle" size={50} color="#DD6B20" />
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A365D', marginTop: 10 }}>My Bio Profile</Text>
                <Text style={{ fontSize: 12, color: '#718096', textAlign: 'center', marginTop: 5 }}>Updates here instantly sync with the Principal's Directory.</Text>
              </View>
              {[{ label: 'Prefix / Title', key: 'prefix', placeholder: 'e.g. Mr., Mrs., Dr.' }, { label: 'Phone Number', key: 'phone', placeholder: 'e.g. +232 77...' }, { label: 'Physical Address', key: 'address', placeholder: 'e.g. 123 Main St, Freetown' }, { label: 'Date of Birth', key: 'dob', placeholder: 'e.g. DD/MM/YYYY' }, { label: 'Place of Birth (POB)', key: 'pob', placeholder: 'e.g. Bo, Sierra Leone' }].map(f => (
                <View key={f.key}>
                  <Text style={styles.label}>{f.label}</Text>
                  <TextInput style={styles.bioInput} placeholder={f.placeholder} value={(bioData as any)[f.key]} onChangeText={v => setBioData({ ...bioData, [f.key]: v })} />
                </View>
              ))}
              <Text style={styles.label}>Academic Qualifications</Text>
              <TextInput style={[styles.bioInput, { height: 80, textAlignVertical: 'top' }]} placeholder="e.g. B.Sc Education, M.A. Linguistics" multiline value={bioData.qualifications} onChangeText={v => setBioData({ ...bioData, qualifications: v })} />
              <TouchableOpacity style={[styles.saveButton, { width: '100%' as any }]} onPress={saveBioData} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>🔄 Sync Profile to Directory</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ══════════════════════════════════════ */}
      {/* REVIEW MODE                            */}
      {/* ══════════════════════════════════════ */}
      {mode === 'review' && (
        <ScrollView style={{ flex: 1, paddingHorizontal: 15 }} showsVerticalScrollIndicator={false}>
          <View style={{ backgroundColor: '#1A365D', borderRadius: 16, padding: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900' as any }}>📋 Grade Review Panel</Text>
              <Text style={{ color: '#90CDF4', fontSize: 13, marginTop: 4 }}>{profile?.assigned_class || selectedClass} • {term} • {selectedYear}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#FBD38D', fontSize: 28, fontWeight: '900' as any }}>{pendingSubjects.length}</Text>
              <Text style={{ color: '#90CDF4', fontSize: 11 }}>PENDING</Text>
            </View>
          </View>
          {reviewLoading ? <ActivityIndicator color="#1A365D" style={{ marginTop: 30 }} /> : (
            <>
              {pendingSubjects.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.label, { color: '#E53E3E', marginBottom: 12 }]}>⏳ AWAITING YOUR REVIEW ({pendingSubjects.length})</Text>
                  {pendingSubjects.map((sub: any) => (
                    <View key={sub.subject} style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#F6AD55', elevation: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: '900' as any, color: '#1A365D' }}>{sub.subject}</Text>
                          <Text style={{ color: '#718096', fontSize: 13, marginTop: 2 }}>👤 {sub.teacher_name} • {sub.count} student(s)</Text>
                        </View>
                        <View style={{ backgroundColor: '#FEFCBF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                          <Text style={{ color: '#744210', fontSize: 11, fontWeight: '900' as any }}>PENDING</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row' }}>
                        <TouchableOpacity style={{ flex: 2, backgroundColor: '#3182CE', borderRadius: 10, padding: 12, alignItems: 'center', marginRight: 8 }} onPress={() => fetchSubjectGrades(sub.subject)}>
                          <Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 13 }}>👁 View & Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{ flex: 1, backgroundColor: '#EDF2F7', borderRadius: 10, padding: 12, alignItems: 'center' }} onPress={() => { setSubject(sub.subject); setMode('grades'); setGradeMode('class'); }}>
                          <Text style={{ color: '#4A5568', fontWeight: '900' as any, fontSize: 13 }}>✏️ Edit</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              {approvedSubjects.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.label, { color: '#38A169', marginBottom: 12 }]}>✅ APPROVED ({approvedSubjects.length})</Text>
                  {approvedSubjects.map((sub: any) => (
                    <View key={sub.subject} style={{ backgroundColor: '#F0FFF4', borderRadius: 14, padding: 16, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#38A169', flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}><Text style={{ fontSize: 15, fontWeight: '900' as any, color: '#276749' }}>{sub.subject}</Text><Text style={{ color: '#718096', fontSize: 12, marginTop: 2 }}>{sub.teacher_name} • {sub.count} students</Text></View>
                      <View style={{ backgroundColor: '#C6F6D5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}><Text style={{ color: '#276749', fontSize: 11, fontWeight: '900' as any }}>✅ APPROVED</Text></View>
                    </View>
                  ))}
                </View>
              )}
              {pendingSubjects.length === 0 && approvedSubjects.length === 0 && (
                <View style={{ alignItems: 'center', marginTop: 50 }}>
                  <Ionicons name="document-outline" size={60} color="#CBD5E0" />
                  <Text style={{ color: '#A0AEC0', marginTop: 12, fontSize: 15, fontWeight: 'bold' as any, textAlign: 'center' }}>No grades submitted yet for {profile?.assigned_class || selectedClass}</Text>
                </View>
              )}
              {approvedSubjects.length > 0 && (
                <View style={{ marginBottom: 40 }}>
                  <TouchableOpacity style={{ backgroundColor: '#6B46C1', borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 12, flexDirection: 'row', justifyContent: 'center' }} onPress={calculateOverallRank} disabled={calculatingRank}>
                    {calculatingRank ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="trophy" size={20} color="#FFF" style={{ marginRight: 8 }} /><Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 15, textTransform: 'uppercase' as any, letterSpacing: 1 }}>Calculate Overall Rank</Text></>}
                  </TouchableOpacity>
                  <TouchableOpacity style={{ backgroundColor: '#1A365D', borderRadius: 14, padding: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }} onPress={sendAllToPrincipal} disabled={submitting}>
                    {submitting ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="send" size={20} color="#FFF" style={{ marginRight: 8 }} /><Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 15, textTransform: 'uppercase' as any, letterSpacing: 1 }}>Send to Principal</Text></>}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* ══════════════════════════════════════ */}
      {/* FEED MODE                              */}
      {/* ══════════════════════════════════════ */}
      {mode === 'feed' && (
        <ScrollView style={{ flex: 1, paddingHorizontal: 15 }} showsVerticalScrollIndicator={false}>
          {news.filter((n: any) => !(n.content || '').toUpperCase().includes('FEE REMINDER')).length === 0
            ? <Text style={styles.emptyText}>No announcements from the Principal yet.</Text>
            : news.filter((n: any) => !(n.content || '').toUpperCase().includes('FEE REMINDER')).map(n => (
                <View key={n.id} style={{ backgroundColor: '#FFF', padding: 20, borderRadius: 12, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#E53E3E', elevation: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <Ionicons name="megaphone" size={20} color="#E53E3E" />
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#2D3748', marginLeft: 8, flex: 1 }}>{n.author_name}</Text>
                    <Text style={{ fontSize: 10, color: '#A0AEC0', fontWeight: 'bold' }}>{new Date(n.created_at).toLocaleDateString()}</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: '#4A5568', lineHeight: 22, marginTop: 5 }} selectable>{n.content}</Text>
                </View>
              ))}
        </ScrollView>
      )}

      {/* ── HIDDEN FILE INPUT FOR WEB UPLOAD ── */}
      {Platform.OS === 'web' && (
        <input
          id="edusalone-file-upload"
          type="file"
          accept=".pdf,.doc,.docx,image/*"
          style={{ display: 'none' }}
          onChange={handleWebFileSelected}
        />
      )}

      {/* ── FLOATING ASK-AI BUTTON ── */}
      <TouchableOpacity
        style={{ position: 'absolute', bottom: 100, right: 20, backgroundColor: '#6B46C1', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, zIndex: 9999 }}
        onPress={() => setIsAIOpen(true)} activeOpacity={0.85}>
        <Ionicons name="sparkles" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* ── FLOATING CHAT BUTTON ── */}
      <TouchableOpacity
        style={{ position: 'absolute', bottom: 25, right: 20, backgroundColor: '#25D366', width: 62, height: 62, borderRadius: 31, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, zIndex: 9999 }}
        onPress={() => setIsChatOpen(true)} activeOpacity={0.85}>
        <Ionicons name="logo-whatsapp" size={34} color="#FFF" />
      </TouchableOpacity>

      {/* ── ASK-AI MODAL ── */}
      <Modal visible={isAIOpen} animationType="slide" onRequestClose={() => setIsAIOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#F0F4F8', paddingTop: Platform.OS === 'android' ? 30 : 40 }}>
          <TouchableOpacity onPress={() => setIsAIOpen(false)} style={{ padding: 14, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={24} color="#1A365D" />
            <Text style={{ color: '#1A365D', fontWeight: '900', fontSize: 16, marginLeft: 8 }}>Back</Text>
          </TouchableOpacity>
          <AskAI themeColor="#1A365D" />
        </View>
      </Modal>

      {/* ── CHAT MODAL ── */}
      <Modal visible={isChatOpen} animationType="slide" transparent={false} onRequestClose={() => setIsChatOpen(false)}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ backgroundColor: '#075E54', paddingTop: Platform.OS === 'android' ? 10 : 0, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setIsChatOpen(false)} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="arrow-back" size={26} color="#FFF" />
              <Text style={{ color: '#FFF', fontSize: 17, fontWeight: 'bold', marginLeft: 10 }}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, backgroundColor: P.chatBg }}>
            {!selectedContact
              ? <ContactsList me={profile} contacts={contacts} lastMsgs={lastMsgs} onOpen={setSelectedContact} />
              : <ChatConvo me={profile} contact={selectedContact} onBack={() => setSelectedContact(null)} onRefreshList={fetchContacts} />}
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, backgroundColor: '#FFF', padding: 15, marginHorizontal: 15, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  avatarBubble: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#FFFAF0', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#DD6B20' },
  avatarImg: { width: '100%' as any, height: '100%' as any, borderRadius: 25 },
  avatarText: { fontSize: 16, fontWeight: '900', color: '#DD6B20' },
  editIconBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#2D3748', borderRadius: 10, padding: 3, borderWidth: 1, borderColor: '#FFF' },
  greeting: { fontSize: 20, fontWeight: '900', color: '#1A365D' },
  subText: { fontSize: 12, color: '#DD6B20', marginTop: 2, fontWeight: '900' },
  logoutButton: { padding: 8, backgroundColor: '#FED7D7', borderRadius: 12 },
  modeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginRight: 8, backgroundColor: '#E2E8F0' },
  modeButtonActive: { backgroundColor: '#1A365D', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  modeText: { fontSize: 12, fontWeight: 'bold', color: '#718096' },
  modeTextActive: { color: '#FFFFFF' },
  label: { fontSize: 11, fontWeight: 'bold', color: '#A0AEC0', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  chip: { backgroundColor: '#EDF2F7', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: 'transparent' },
  chipActive: { backgroundColor: '#DD6B20', borderColor: '#DD6B20' },
  chipText: { color: '#718096', fontWeight: 'bold', fontSize: 13 },
  chipTextActive: { color: '#FFFFFF' },
  inputInner: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#2D3748', fontWeight: 'bold' },
  bioInput: { backgroundColor: '#F7FAFC', borderRadius: 8, padding: 12, fontSize: 15, color: '#2D3748', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 15 },
  spreadsheetHeader: { flexDirection: 'row', paddingHorizontal: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#CBD5E0', width: 680 },
  columnHeader: { width: 50, fontSize: 11, fontWeight: 'bold', color: '#718096', textAlign: 'center' },
  spreadsheetContainer: { flex: 1, paddingHorizontal: 15, width: 680 },
  studentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingVertical: 12, paddingHorizontal: 10, marginBottom: 8, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.02, elevation: 1 },
  studentName: { fontSize: 14, fontWeight: 'bold', color: '#2D3748' },
  admText: { fontSize: 10, color: '#A0AEC0', fontWeight: 'bold' },
  scoreInput: { width: 50, backgroundColor: '#EDF2F7', marginHorizontal: 2, borderRadius: 8, textAlign: 'center', fontWeight: '900', fontSize: 15, color: '#1A365D', paddingVertical: 10 },
  meanInput: { width: 50, backgroundColor: '#EBF8FF', marginHorizontal: 2, borderRadius: 8, textAlign: 'center', fontWeight: '900', fontSize: 15, color: '#2B6CB0', paddingVertical: 10, borderWidth: 1, borderColor: '#BEE3F8' },
  rankInput: { width: 50, backgroundColor: '#FEFCBF', marginHorizontal: 2, borderRadius: 8, textAlign: 'center', fontWeight: '900', fontSize: 14, color: '#DD6B20', paddingVertical: 10, borderWidth: 1, borderColor: '#FBD38D' },
  autoBox: { width: 50, alignItems: 'center', justifyContent: 'center' },
  autoText: { fontSize: 15, fontWeight: '900', color: '#718096' },
  saveButton: { backgroundColor: '#38A169', marginVertical: 20, padding: 18, borderRadius: 12, alignItems: 'center', alignSelf: 'center', shadowColor: '#38A169', shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  saveButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
  emptyText: { textAlign: 'center', marginTop: 10, color: '#A0AEC0', fontStyle: 'italic', fontSize: 15, fontWeight: 'bold' },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F7FAFC' },
  ratingLabel: { fontSize: 14, color: '#4A5568', fontWeight: 'bold', flex: 1 },
  ratingDots: { flexDirection: 'row' },
  ratingDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EDF2F7', alignItems: 'center', justifyContent: 'center' },
  ratingDotActive: { backgroundColor: '#DD6B20', shadowColor: '#DD6B20', shadowOpacity: 0.4, elevation: 3 },
  ratingDotText: { fontSize: 15, fontWeight: '900', color: '#718096' },
  ratingDotTextActive: { color: '#FFF' },
  textArea: { backgroundColor: '#F7FAFC', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#E2E8F0', height: 100, textAlignVertical: 'top', marginBottom: 10, fontSize: 14, color: '#2D3748' },
  attendanceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.03, elevation: 1 },
  attBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EDF2F7', borderRadius: 10 },
  attText: { fontWeight: '900', fontSize: 16, color: '#A0AEC0' },
  controlsCard: { backgroundColor: '#FFFFFF', padding: 15, marginHorizontal: 15, borderRadius: 16, elevation: 2, marginBottom: 0 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  dropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 4 },
  dropdownValue: { fontSize: 15, fontWeight: '700' as any, color: '#1A365D', flex: 1 },
  dropdownList: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8, overflow: 'hidden', elevation: 6 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F7FAFC' },
  dropdownItemActive: { backgroundColor: '#1A365D' },
  dropdownItemText: { fontSize: 14, fontWeight: '600' as any, color: '#2D3748' },
  dropdownItemTextActive: { color: '#FFF', fontWeight: '900' as any },
});

const cl = StyleSheet.create({
  hdr: { backgroundColor: P.headerBg, paddingHorizontal: 18, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hdrTitle: { color: '#fff', fontSize: 21, fontWeight: '900' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 26, marginHorizontal: 10, marginVertical: 10, paddingHorizontal: 16, paddingVertical: 10, elevation: 2 },
  sectionLbl: { fontSize: 11, fontWeight: '800', color: P.timeColor, letterSpacing: 1.1, marginLeft: 18, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: P.border },
  dot: { position: 'absolute', bottom: 0, right: 0, width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  name: { fontSize: 16, color: '#111B21', fontWeight: '700', flex: 1 },
  time: { fontSize: 12, color: P.timeColor },
  role: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  preview: { fontSize: 13, color: P.timeColor, flex: 1 },
  badge: { backgroundColor: P.accent, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});

const cc = StyleSheet.create({
  hdr: { backgroundColor: P.headerBg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingBottom: 12 },
  hdrName: { color: '#fff', fontSize: 16, fontWeight: '800' },
  hdrRole: { fontSize: 12, fontWeight: '600', marginTop: 1, textTransform: 'uppercase' },
  hdrBtn: { padding: 8 },
  row: { flexDirection: 'row', marginBottom: 3, maxWidth: '82%' as any },
  rowLeft: { alignSelf: 'flex-start' },
  rowRight: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  bubble: { borderRadius: 10, paddingHorizontal: 11, paddingTop: 7, paddingBottom: 5, elevation: 1 },
  bubbleSent: { backgroundColor: P.sentBg, borderTopRightRadius: 2 },
  bubbleRecv: { backgroundColor: P.recvBg, borderTopLeftRadius: 2 },
  tailLeft: { position: 'absolute', top: 0, left: -7, borderTopWidth: 9, borderTopColor: P.recvBg, borderRightWidth: 8, borderRightColor: 'transparent' },
  tailRight: { position: 'absolute', top: 0, right: -7, borderTopWidth: 9, borderTopColor: P.sentBg, borderLeftWidth: 8, borderLeftColor: 'transparent' },
  msgTxt: { fontSize: 15, color: P.msgColor, lineHeight: 21 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 3 },
  timeTxt: { fontSize: 11, color: P.timeColor },
  encryptBox: { backgroundColor: '#FFF9E3', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 14, borderWidth: 1, borderColor: '#F0E68C' },
  encryptTxt: { color: '#555', textAlign: 'center', fontSize: 14, lineHeight: 22 },
  emojiPanel: { height: 180, backgroundColor: '#F8F9FA', borderTopWidth: 1, borderTopColor: P.border },
  emojiBtn: { width: '12%' as any, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginVertical: 5 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingVertical: 8, backgroundColor: P.barBg, borderTopWidth: 0.5, borderTopColor: '#ddd' },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: P.inputBg, borderRadius: 26, paddingHorizontal: 4, paddingVertical: Platform.OS === 'ios' ? 10 : 5, minHeight: 48, maxHeight: 130, elevation: 2 },
  input: { flex: 1, fontSize: 15, color: '#111B21', paddingHorizontal: 4, maxHeight: 120, lineHeight: 20 },
  sendBtn: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', elevation: 3 },
});
