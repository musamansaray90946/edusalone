import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
    StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { supabase } from '../src/lib/supabase';

type Msg = { role: 'user' | 'ai'; text: string };

export default function AskAI({ themeColor = '#1A365D' }: { themeColor?: string }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const { data, error } = await supabase.functions.invoke('ask-ai', { body: { question: q } });
      if (error) throw error;
      const reply = data?.answer || data?.error || "Sorry, I couldn't answer that. Please try again.";
      setMessages(prev => [...prev, { role: 'ai', text: reply }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Could not reach the AI right now. Please check your connection and try again.' }]);
    }
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#F0F4F8' }}>
      <View style={[styles.header, { backgroundColor: themeColor }]}>
        <Ionicons name="sparkles" size={20} color="#FFF" />
        <Text style={styles.headerText}>  Ask EduSalone AI</Text>
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {messages.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40, paddingHorizontal: 20 }}>
            <Ionicons name="school" size={48} color={themeColor} />
            <Text style={{ color: '#4A5568', fontWeight: '900', fontSize: 16, marginTop: 12, textAlign: 'center' }}>Your personal study tutor</Text>
            <Text style={{ color: '#718096', fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
              Ask me to explain any topic, solve a maths problem step by step, or help you revise for BECE or WASSCE.
            </Text>
          </View>
        ) : (
          messages.map((m, i) => (
            <View key={i} style={[styles.bubble, m.role === 'user' ? [styles.userBubble, { backgroundColor: themeColor }] : styles.aiBubble]}>
              <Text style={m.role === 'user' ? styles.userText : styles.aiText}>{m.text}</Text>
            </View>
          ))
        )}
        {loading && (
          <View style={[styles.bubble, styles.aiBubble, { flexDirection: 'row', alignItems: 'center' }]}>
            <ActivityIndicator color={themeColor} size="small" />
            <Text style={{ color: '#718096', marginLeft: 8 }}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Ask a question..."
          placeholderTextColor="#A0AEC0"
          value={input}
          onChangeText={setInput}
          multiline
          onSubmitEditing={send}
        />
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: themeColor }]} onPress={send} disabled={loading}>
          <Ionicons name="send" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'android' ? 16 : 16, paddingBottom: 16, paddingHorizontal: 18 },
  headerText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 16, marginBottom: 10 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#FFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  userText: { color: '#FFF', fontSize: 14, lineHeight: 20 },
  aiText: { color: '#2D3748', fontSize: 14, lineHeight: 21 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  input: { flex: 1, backgroundColor: '#F7FAFC', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#2D3748', maxHeight: 120, borderWidth: 1, borderColor: '#E2E8F0' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
});