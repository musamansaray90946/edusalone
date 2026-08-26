import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 🔗 Hosted policy pages (live on Netlify):
const PRIVACY_URL = 'https://edusalone.netlify.app/privacy.html';
const TERMS_URL   = 'https://edusalone.netlify.app/terms.html';

export default function PrivacyFooter() {
  const open = (url: string) => Linking.openURL(url).catch(() => {});
  return (
    <View style={pf.wrap}>
      <View style={pf.line} />
      <View style={pf.row}>
        <TouchableOpacity onPress={() => open(PRIVACY_URL)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={pf.link}>Privacy Policy</Text>
        </TouchableOpacity>
        <Text style={pf.dot}>  •  </Text>
        <TouchableOpacity onPress={() => open(TERMS_URL)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={pf.link}>Terms of Service</Text>
        </TouchableOpacity>
      </View>
      <Text style={pf.note}>PalmRoot Tech SL Limited · Your data stays private to your school.</Text>
    </View>
  );
}

const pf = StyleSheet.create({
  wrap: { width: '100%' as any, alignItems: 'center', paddingTop: 20, paddingBottom: 10, paddingHorizontal: 16 },
  line: { width: '100%' as any, height: 1, backgroundColor: '#E2E8F0', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  link: { color: '#1A365D', fontWeight: '800' as any, fontSize: 14 },
  dot: { color: '#94A3B8', fontSize: 14 },
  note: { color: '#94A3B8', fontSize: 11, marginTop: 8, textAlign: 'center', fontWeight: '500' as any },
});