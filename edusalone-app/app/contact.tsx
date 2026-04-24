import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ContactScreen() {
  const router = useRouter();

  // Function to open WhatsApp directly
  function openWhatsApp() {
    Linking.openURL('whatsapp://send?phone=+35796240674');
  }

  // Function to open your GitHub profile
  function openGitHub() {
    Linking.openURL('https://github.com/musamansaray90946');
  }

  // Function to send an email
  function openEmail() {
    Linking.openURL('mailto:mmans.sl.001@gmail.com?subject=EduSalone Support Request');
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.replace()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#1A365D" />
        <Text style={{ color: '#1A365D', fontWeight: 'bold', marginLeft: 5 }}>Back</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>Contact Support</Text>
      
      <View style={styles.card}>
        <Ionicons name="business" size={50} color="#38A169" style={{ marginBottom: 10 }} />
        <Text style={styles.heading}>PalmTech Group Ltd.</Text>
        <Text style={styles.body}>Lead Developer: Musa Mansaray</Text>
        
        <TouchableOpacity onPress={openEmail}>
          <Text style={styles.linkText}>Email: mmans.sl.001@gmail.com</Text>
        </TouchableOpacity>
        
        <Text style={styles.body}>Phone: +357 96 240 674</Text>
        
        <TouchableOpacity style={styles.githubButton} onPress={openGitHub}>
          <Ionicons name="logo-github" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.githubText}>View Developer GitHub</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.whatsappButton} onPress={openWhatsApp}>
          <Ionicons name="logo-whatsapp" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.whatsappText}>Message on WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8', padding: 24, paddingTop: 60 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '900', color: '#1A365D', marginBottom: 20 },
  card: { backgroundColor: '#FFF', padding: 30, borderRadius: 16, elevation: 3, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  heading: { fontSize: 24, fontWeight: '900', color: '#1A365D', marginBottom: 10 },
  body: { fontSize: 16, color: '#4A5568', marginBottom: 5, fontWeight: '600' },
  linkText: { fontSize: 16, color: '#3182CE', marginBottom: 5, fontWeight: 'bold', textDecorationLine: 'underline' },
  whatsappButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#25D366', padding: 15, borderRadius: 10, marginTop: 15, width: '100%', justifyContent: 'center' },
  whatsappText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  githubButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333333', padding: 15, borderRadius: 10, marginTop: 25, width: '100%', justifyContent: 'center' },
  githubText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});