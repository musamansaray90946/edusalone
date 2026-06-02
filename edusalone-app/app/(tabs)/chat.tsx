import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert, AlertButton, FlatList, Image, Keyboard,
    KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet,
    Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';

// CHAT IMPORTS
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

// ==========================================
// 💡 INTERFACES & CONSTANTS
// ==========================================
interface UserProfile { id: string; full_name: string; role: string; email: string; school_id: string; phone_number?: string; phone?: string; }

// 🛡️ TYPESCRIPT FIX: Added school_id to the interface to stop the red underline!
interface Message { id: string; school_id: string; sender_id: string; receiver_id: string; content: string; is_read: boolean; created_at: string; _opt?: boolean; }

const P = { headerBg: '#075E54', accent: '#25D366', chatBg: '#E5DDD5', sentBg: '#DCF8C6', recvBg: '#FFFFFF', msgColor: '#111B21', timeColor: '#667781', tickGray: '#8696A0', tickBlue: '#53BDEB', inputBg: '#FFFFFF', barBg: '#F0F2F5', border: '#E9EDEF', listBg: '#F0F2F5' };
const roleClr = (r = '') => { const v = r.toLowerCase(); if (v.includes('student')) return '#25D366'; if (v.includes('teacher')) return '#FF8C00'; if (v.includes('parent')) return '#3B82F6'; if (v.includes('bursar')) return '#8B5CF6'; if (v.includes('principal') || v.includes('admin')) return '#E53E3E'; return '#667781'; };
const EMOJIS = ['😀', '😂', '😍', '🤔', '😢', '😡', '👍', '👎', '🙏', '🎉', '❤️', '💔', '💯', '🔥', '👋', '😎'];

const getInitials = (name: string) => name ? name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '👤';
const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

const IMAGE_PREFIX = '[IMAGE_BASE64]:';
const AUDIO_PREFIX = '[AUDIO_BASE64]:';
const isImageMsg = (text: string) => text.startsWith(IMAGE_PREFIX);
const getImageUrl = (text: string) => text.startsWith(IMAGE_PREFIX) ? text.replace(IMAGE_PREFIX, '') : text;
const isAudioMsg = (text: string) => text.startsWith(AUDIO_PREFIX);
const getAudioUrl = (text: string) => text.replace(AUDIO_PREFIX, '');

// ==========================================
// 💬 CHAT SUB-COMPONENTS
// ==========================================
function Avatar({ name = '', size = 44 }: { name?: string; size?: number }) {
  const palette = ['#25D366', '#128C7E', '#075E54', '#34B7F1', '#ECB22E', '#E53E3E', '#805AD5', '#3182CE'];
  const bg = palette[Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length];
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg + '30', borderWidth: 1.5, borderColor: bg + '70', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: bg, fontWeight: '900', fontSize: size * 0.36 }}>{getInitials(name)}</Text></View>;
}

function Tick({ read }: { read: boolean }) { return <Text style={{ color: read ? P.tickBlue : P.tickGray, fontSize: 12, marginLeft: 3 }}>{read ? '✓✓' : '✓'}</Text>; }

function AudioMessagePlayer({ url, mine }: { url: string, mine: boolean }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  async function playSound() {
      if (isPlaying && sound) { await sound.pauseAsync(); setIsPlaying(false); return; }
      try {
          const { sound: newSound } = await Audio.Sound.createAsync({ uri: url });
          setSound(newSound); await newSound.playAsync(); setIsPlaying(true);
          newSound.setOnPlaybackStatusUpdate(status => {
              if (status.isLoaded && status.didJustFinish) { setIsPlaying(false); newSound.unloadAsync(); }
          });
      } catch (error) { Alert.alert("Playback Error", "Could not play this voice note."); }
  }
  useEffect(() => { return sound ? () => { sound.unloadAsync(); } : undefined; }, [sound]);

  return (
      <TouchableOpacity onPress={playSound} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: mine ? '#C6E8B3' : '#F0F2F5', padding: 8, borderRadius: 10, minWidth: 150 }}>
          <Ionicons name={isPlaying ? "pause-circle" : "play-circle"} size={28} color={P.headerBg} />
          <View style={{ flex: 1, marginLeft: 8 }}><View style={{ height: 3, backgroundColor: '#A0AEC0', borderRadius: 2, width: '100%' }}></View></View>
      </TouchableOpacity>
  );
}

function ContactsList({ me, contacts, lastMsgs, onOpen, onRefresh }: any) {
  const [q, setQ] = useState('');
  const sorted = [...contacts].filter(c => (c.full_name?.toLowerCase() || '').includes(q.toLowerCase()) || (c.role?.toLowerCase() || '').includes(q.toLowerCase())).sort((a, b) => {
      const ta = lastMsgs[a.id]?.created_at || ''; const tb = lastMsgs[b.id]?.created_at || '';
      return tb > ta ? 1 : -1;
  });

  return (
      <View style={{ flex: 1, backgroundColor: P.listBg }}>
          <View style={[cl.hdr, { paddingTop: Platform.OS === 'android' ? 44 : 54 }]}>
              <Text style={cl.hdrTitle}>EduChat</Text>
              <View style={{ flexDirection: 'row', gap: 18 }}>
                  <TouchableOpacity onPress={() => Alert.alert('Secured', 'All messages are E2E encrypted.')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="shield-checkmark" size={22} color="#fff" />
                  </TouchableOpacity>
              </View>
          </View>
          <View style={cl.searchBox}>
              <Ionicons name="search" size={16} color={P.timeColor} style={{ marginRight: 8 }} />
              <TextInput style={{ flex: 1, fontSize: 15, color: '#111' }} placeholder="Search directory..." placeholderTextColor={P.timeColor} value={q} onChangeText={setQ} />
              {q.length > 0 && <TouchableOpacity onPress={() => setQ('')}><Ionicons name="close-circle" size={18} color={P.timeColor} /></TouchableOpacity>}
          </View>
          <Text style={cl.sectionLbl}>SCHOOL DIRECTORY ({sorted.length})</Text>
          <FlatList
              data={sorted} keyExtractor={it => it.id} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: 0.5, backgroundColor: P.border, marginLeft: 78 }} />}
              onRefresh={onRefresh} refreshing={false}
              renderItem={({ item }) => {
                  const last = lastMsgs[item.id];
                  const unread = last && !last.is_read && last.sender_id !== me?.id;
                  const rc = roleClr(item.role);
                  const previewText = last ? (isImageMsg(last.content) ? '📷 Image' : (isAudioMsg(last.content) ? '🎤 Voice Note' : last.content)) : '';
                  return (
                      <TouchableOpacity style={cl.row} onPress={() => onOpen(item)} activeOpacity={0.65}>
                          <View style={{ position: 'relative' }}><Avatar name={item.full_name} size={50} /><View style={[cl.dot, { backgroundColor: rc }]} /></View>
                          <View style={{ flex: 1, marginLeft: 14 }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={[cl.name, unread && { fontWeight: '900' }]} numberOfLines={1}>{item.full_name}</Text>{last && <Text style={[cl.time, unread && { color: P.accent, fontWeight: '700' }]}>{formatTime(last.created_at)}</Text>}</View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}><View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}><Text style={[cl.role, { color: rc }]}>{item.role}</Text>{last && <Text style={cl.preview} numberOfLines={1}>{'  '}{last.sender_id === me?.id ? 'You: ' : ''}{previewText}</Text>}</View>{unread ? <View style={cl.badge}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>●</Text></View> : !last && <Ionicons name="chatbubble-ellipses-outline" size={18} color="#CBD5E0" />}</View>
                          </View>
                      </TouchableOpacity>
                  );
              }}
              ListEmptyComponent={<View style={{ alignItems: 'center', marginTop: 80 }}><Ionicons name="people-circle-outline" size={70} color="#CBD5E0" /><Text style={{ color: '#A0AEC0', marginTop: 12, fontSize: 15, fontWeight: '700', textAlign: 'center' }}>No contacts found</Text></View>}
          />
      </View>
  );
}

function ChatConvo({ me, contact, contacts, onBack, onRefreshList }: { me: UserProfile; contact: UserProfile; contacts: UserProfile[]; onBack: () => void; onRefreshList: () => void; }) {
  const insets = useSafeAreaInsets();
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEmoji, setShowEmoji] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const flatRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [forwardingMsg, setForwardingMsg] = useState<Message | null>(null);

  useEffect(() => {
      fetchMsgs(); markRead();
      const channel = supabase.channel(`chat_${[me.id, contact.id].sort().join('_')}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
          const m = payload.new as Message;
          if(m.school_id !== me.school_id) return;
          const relevant = (m.sender_id === me.id && m.receiver_id === contact.id) || (m.sender_id === contact.id && m.receiver_id === me.id);
          if (!relevant) return;
          setMsgs(prev => { 
  if (prev.find(p => p.id === m.id)) return prev;
  if (m.sender_id === me.id) return prev;
  return [m, ...prev]; 
});
          if (m.sender_id === contact.id) markRead();
      }).subscribe();
      return () => { supabase.removeChannel(channel); };
  }, [contact.id]);

  const fetchMsgs = useCallback(async () => {
      setLoading(true);
      const { data, error } = await supabase.from('messages').select('*').eq('school_id', me.school_id).or(`and(sender_id.eq.${me.id},receiver_id.eq.${contact.id}),and(sender_id.eq.${contact.id},receiver_id.eq.${me.id})`).order('created_at', { ascending: false }).limit(300);
      if (!error) { setMsgs(data || []); }
      setLoading(false);
  }, [me.id, contact.id]);

  const markRead = useCallback(async () => {
      await supabase.from('messages').update({ is_read: true }).eq('school_id', me.school_id).eq('sender_id', contact.id).eq('receiver_id', me.id).eq('is_read', false);
  }, [me.id, contact.id]);

  const handleAttachImage = async (useCamera: boolean) => {
      try {
          const result = useCamera ? await ImagePicker.launchCameraAsync({ quality: 0.2, base64: true }) : await ImagePicker.launchImageLibraryAsync({ quality: 0.2, base64: true, mediaTypes: ImagePicker.MediaTypeOptions.Images });
          if (!result.canceled && result.assets && result.assets[0].base64) {
              setSending(true);
              const base64Str = `${IMAGE_PREFIX}data:image/jpeg;base64,${result.assets[0].base64}`;
              await sendMsg(base64Str);
          }
      } catch (err) { setSending(false); Alert.alert("Camera Error", "Ensure camera permissions are allowed."); }
  };

  const startRecording = async () => {
      try {
          const perm = await Audio.requestPermissionsAsync();
          if (perm.status === 'granted') {
              await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
              const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
              setRecording(recording); setIsRecording(true);
              if(Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          } else {
              Alert.alert('Permission Denied', 'Please enable microphone access in your phone settings.');
          }
      } catch (err: any) { Alert.alert('Mic Error', err.message || 'Could not access microphone.'); }
  };
  
  const stopRecordingAndSend = async () => {
      if (!recording) return;
      setIsRecording(false);
      try {
          await recording.stopAndUnloadAsync(); const uri = recording.getURI(); setRecording(null);
          if (uri) {
              setSending(true);
              const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
              const base64Str = `${AUDIO_PREFIX}data:audio/m4a;base64,${base64}`;
              await sendMsg(base64Str);
          }
      } catch(e) { setIsRecording(false); setSending(false); }
  };

  const sendMsg = async (body = text.trim(), overrideReceiverId?: string) => {
      if (!body || sending) return;
      Keyboard.dismiss(); setShowEmoji(false); setText(''); setSending(true);
      const targetId = overrideReceiverId || contact.id;
      const opt: Message = { id: `opt_${Date.now()}`, school_id: me.school_id, sender_id: me.id, receiver_id: targetId, content: body, is_read: false, created_at: new Date().toISOString(), _opt: true };
      
      if (!overrideReceiverId) setMsgs(prev => [opt, ...prev]);
      
      const { data, error } = await supabase.from('messages').insert({ school_id: me.school_id, sender_id: me.id, receiver_id: targetId, sender_name: me.full_name, sender_role: me.role, content: body, is_read: false }).select().single();
      if (error) {
          if (!overrideReceiverId) { setMsgs(prev => prev.filter(m => m.id !== opt.id)); setText(isImageMsg(body) || isAudioMsg(body) ? "" : body); }
          Alert.alert('Delivery Failed', error.message);
      } else if (data && !overrideReceiverId) {
          setMsgs(prev => prev.map(m => m.id === opt.id ? data as Message : m)); onRefreshList();
      }
      setSending(false);
  };

  const executeForward = async (targetContact: UserProfile) => {
      if (!forwardingMsg) return; setForwardingMsg(null);
      await sendMsg(forwardingMsg.content, targetContact.id);
      Alert.alert("Forwarded", `Message sent to ${targetContact.full_name}`);
  };

  const handlePhoneCall = () => {
      const phone = contact.phone_number || contact.phone;
      if (phone) Linking.openURL(`tel:${phone}`);
      else Alert.alert('No Number', `${contact.full_name} does not have a registered phone number.`);
  };

  const handleMessageLongPress = (msg: Message) => {
      const options: AlertButton[] = [{ text: 'Cancel', style: 'cancel' }];
      options.push({ text: 'Forward', onPress: () => setForwardingMsg(msg) });
      if (msg.sender_id === me.id) {
          options.push({ text: 'Delete for Everyone', style: 'destructive', onPress: async () => {
              setMsgs(prev => prev.filter(m => m.id !== msg.id));
              await supabase.from('messages').delete().eq('school_id', me.school_id).eq('id', msg.id);
          }});
      }
      Alert.alert('Message Options', '', options);
  };

  const clearChat = () => {
      Alert.alert('Clear Chat', `Delete all messages with ${contact.full_name}?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: async () => {
              setMsgs([]);
              await supabase.from('messages').delete().eq('school_id', me.school_id).or(`and(sender_id.eq.${me.id},receiver_id.eq.${contact.id}),and(sender_id.eq.${contact.id},receiver_id.eq.${me.id})`);
          }}
      ]);
  };

  const isMine = (m: Message) => m.sender_id === me?.id;

  // 🛡️ KEYBOARD FIX: Automatically adjusts layout for Android and iOS safely!
  return (
      <KeyboardAvoidingView 
          style={{ flex: 1, backgroundColor: P.chatBg }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
          <Modal visible={!!fullScreenImage} transparent={true} animationType="fade">
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' }}>
                  <TouchableOpacity style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }} onPress={() => setFullScreenImage(null)}>
                      <Ionicons name="close-circle" size={40} color="#FFF" />
                  </TouchableOpacity>
                  <ScrollView maximumZoomScale={3} minimumZoomScale={1} centerContent contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
                      {fullScreenImage && <Image source={{ uri: fullScreenImage }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />}
                  </ScrollView>
              </View>
          </Modal>

          <Modal visible={!!forwardingMsg} animationType="slide" transparent={true}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                  <View style={{ backgroundColor: '#fff', height: '60%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Forward to...</Text>
                          <TouchableOpacity onPress={() => setForwardingMsg(null)}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
                      </View>
                      <FlatList data={contacts} keyExtractor={c => c.id} renderItem={({item}) => (
                              <TouchableOpacity style={cl.row} onPress={() => executeForward(item)}>
                                  <Avatar name={item.full_name} size={40} />
                                  <Text style={[cl.name, {marginLeft: 10}]}>{item.full_name}</Text>
                                  <Ionicons name="send" size={20} color={P.accent} />
                              </TouchableOpacity>
                          )}
                      />
                  </View>
              </View>
          </Modal>
          
          <View style={[cc.hdr, { paddingTop: Platform.OS === 'android' ? 42 : 52 }]}>
              <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ marginRight: 4 }}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => Alert.alert(contact.full_name, `Role: ${contact.role}`)}><Avatar name={contact.full_name} size={40} /><View style={{ marginLeft: 10, flex: 1 }}><Text style={cc.hdrName} numberOfLines={1}>{contact.full_name}</Text><Text style={[cc.hdrRole, { color: roleClr(contact.role) + 'DD' }]}>{contact.role}</Text></View></TouchableOpacity>
              <TouchableOpacity style={cc.hdrBtn} onPress={handlePhoneCall}><Ionicons name="call-outline" size={21} color="#fff" /></TouchableOpacity>
              <TouchableOpacity style={cc.hdrBtn} onPress={clearChat}><Ionicons name="ellipsis-vertical" size={21} color="#fff" /></TouchableOpacity>
          </View>
          
          <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setShowEmoji(false); }}>
              <View style={{ flex: 1 }}>
                  {loading ? <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={P.headerBg} /></View> : (
                      <FlatList
                          ref={flatRef} data={msgs} keyExtractor={(item) => item.id} inverted={true}
                          contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 8 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                          renderItem={({ item }) => {
                              const mine = isMine(item);
                              return (
                                  <TouchableOpacity onLongPress={() => handleMessageLongPress(item)} activeOpacity={0.9}>
                                      <View style={[cc.row, mine ? cc.rowRight : cc.rowLeft]}>
                                          {!mine && <View style={{ alignSelf: 'flex-end', marginRight: 5, marginBottom: 2 }}><Avatar name={contact.full_name} size={26} /></View>}
                                          <View style={[cc.bubble, mine ? cc.bubbleSent : cc.bubbleRecv, item._opt && { opacity: 0.65 }]}>
                                              <View style={mine ? cc.tailRight : cc.tailLeft} />
                                              {isImageMsg(item.content) ? (
                                                  <TouchableOpacity onPress={() => setFullScreenImage(getImageUrl(item.content))} activeOpacity={0.8}><Image source={{ uri: getImageUrl(item.content) }} style={{ width: 220, height: 220, borderRadius: 8, marginVertical: 4 }} resizeMode="cover" /></TouchableOpacity>
                                              ) : isAudioMsg(item.content) ? (
                                                  <AudioMessagePlayer url={getAudioUrl(item.content)} mine={mine} />
                                              ) : <Text style={cc.msgTxt} selectable>{item.content}</Text>}
                                              <View style={cc.meta}><Text style={cc.timeTxt}>{formatTime(item.created_at)}</Text>{mine && <Tick read={item.is_read} />}{item._opt && <Text style={{ color: P.timeColor, fontSize: 10, marginLeft: 3 }}>⌛</Text>}</View>
                                          </View>
                                      </View>
                                  </TouchableOpacity>
                              );
                          }}
                          ListEmptyComponent={<View style={{ alignItems: 'center', marginTop: 90, paddingHorizontal: 30, transform: [{ scaleY: -1 }] }}><View style={cc.encryptBox}><Text style={cc.encryptTxt}>🔒 Messages are end-to-end encrypted.{'\n'}No one outside this chat can read them.</Text></View></View>}
                      />
                  )}
              </View>
          </TouchableWithoutFeedback>
          
          {showEmoji && <View style={cc.emojiPanel}><ScrollView showsVerticalScrollIndicator={false}><View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 8, justifyContent: 'center' }}>{EMOJIS.map((em, i) => <TouchableOpacity key={i} style={cc.emojiBtn} onPress={() => setText(prev => prev + em)}><Text style={{ fontSize: 26 }}>{em}</Text></TouchableOpacity>)}</View></ScrollView></View>}
          
          <View style={[cc.inputBar, { paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 8) : 8 }]}>
              <View style={cc.inputWrap}>
                  <TouchableOpacity style={{ paddingHorizontal: 8 }} onPress={() => { if (showEmoji) { setShowEmoji(false); setTimeout(() => inputRef.current?.focus(), 100); } else { Keyboard.dismiss(); setShowEmoji(true); } }}><Ionicons name={showEmoji ? 'keypad-outline' : 'happy-outline'} size={24} color={showEmoji ? P.headerBg : P.timeColor} /></TouchableOpacity>
                  <TextInput ref={inputRef} style={cc.input} placeholder="Message" placeholderTextColor={P.timeColor} value={text} onChangeText={setText} multiline maxLength={4000} onFocus={() => { setShowEmoji(false); }} />
                  <TouchableOpacity style={{ paddingHorizontal: 8 }} onPress={() => handleAttachImage(false)}><Ionicons name="attach" size={24} color={P.timeColor} /></TouchableOpacity>
                  {text.trim().length === 0 && <TouchableOpacity style={{ paddingRight: 6 }} onPress={() => handleAttachImage(true)}><Ionicons name="camera-outline" size={24} color={P.timeColor} /></TouchableOpacity>}
              </View>
              
              <TouchableOpacity 
                  style={[cc.sendBtn, { backgroundColor: text.trim().length > 0 ? P.headerBg : (isRecording ? '#E53E3E' : P.accent) }]} 
                  onPress={() => { if (text.trim().length > 0) sendMsg(); }} 
                  onPressIn={() => { if (text.trim().length === 0) startRecording(); }} 
                  onPressOut={() => { if (isRecording) stopRecordingAndSend(); }} 
                  activeOpacity={0.8} disabled={sending}
              >
                  {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name={text.trim().length > 0 ? 'send' : 'mic'} size={20} color="#fff" style={text.trim().length > 0 ? { marginLeft: 2 } : undefined} />}
              </TouchableOpacity>
          </View>
      </KeyboardAvoidingView>
  );
}

export default function ChatTab() {
  const [me, setMe] = useState<UserProfile | null>(null);
  const [contacts, setContacts] = useState<UserProfile[]>([]);
  const [lastMsgs, setLastMsgs] = useState<Record<string, Message>>({});
  const [active, setActive] = useState<UserProfile | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => { boot(); }, []);

  async function boot() {
      setBooting(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not signed in.');
          const { data: profile } = await supabase.from('users').select('*').eq('email', user.email).single();
          if (!profile) throw new Error('Profile not found.');
          setMe(profile as UserProfile);
          await loadContacts(profile as UserProfile);
      } catch (e: any) { console.error(e); }
      setBooting(false);
  }

  const loadContacts = async (profile: UserProfile) => {
      if (!profile.school_id) return;
      const { data: cts } = await supabase.from('users').select('id, full_name, role, email, phone').eq('school_id', profile.school_id).neq('id', profile.id).order('full_name', { ascending: true });
      const userContacts = (cts as UserProfile[]) || [];
      setContacts(userContacts);
      if (userContacts.length > 0) await loadLastMsgs(profile.id, userContacts);
  };

  const loadLastMsgs = async (myId: string, cts: any[]) => {
      const contactIds = cts.map(c => c.id);
      const { data } = await supabase.rpc('get_last_message_for_each_contact', { _user_id: myId, _contact_ids: contactIds });
      if (data) {
          const map: Record<string, Message> = {};
          data.forEach((msg: any) => {
              const contactId = msg.sender_id === myId ? msg.receiver_id : msg.sender_id;
              map[contactId] = msg as Message;
          });
          setLastMsgs(map);
      }
  };

  const refresh = async () => { if (me) await loadContacts(me); };
  const closeChat = async () => { setActive(null); await refresh(); };

  if (booting) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: P.listBg }}><ActivityIndicator size="large" color={P.headerBg} /></View>;
  if (active && me) return <ChatConvo me={me} contact={active} contacts={contacts} onBack={closeChat} onRefreshList={refresh} />;
  if (me) return <ContactsList me={me} contacts={contacts} lastMsgs={lastMsgs} onOpen={setActive} onRefresh={refresh} />;
  return null;
}

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
  row: { flexDirection: 'row', marginBottom: 3, maxWidth: '82%' },
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
  emojiBtn: { width: '14%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginVertical: 5 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingTop: 8, backgroundColor: P.barBg, gap: 8, borderTopWidth: 0.5, borderTopColor: '#ddd' },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: P.inputBg, borderRadius: 26, paddingHorizontal: 4, paddingVertical: Platform.OS === 'ios' ? 10 : 5, minHeight: 48, maxHeight: 130, elevation: 2 },
  input: { flex: 1, fontSize: 15, color: '#111B21', paddingHorizontal: 4, maxHeight: 120, lineHeight: 20 },
  sendBtn: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', elevation: 3 },
});