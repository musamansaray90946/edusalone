import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/* Pulls your transparent PalmTech Logo */}
        <Image source={require('../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>WELCOME TO EDUSALONE</Text>
        <Text style={styles.subtitle}>The Premier Educational SaaS Platform</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/login')}>
          <Ionicons name="log-in" size={24} color="#FFF" style={styles.icon} />
          <View>
            <Text style={styles.primaryButtonText}>SECURE LOGIN</Text>
            <Text style={styles.buttonSubText}>Access your school portal</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/manual')}>
          <Ionicons name="book" size={24} color="#1A365D" style={styles.icon} />
          <View>
            <Text style={styles.secondaryButtonText}>USER MANUAL</Text>
            <Text style={styles.secondaryButtonSubText}>Learn how to use EduSalone</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/contact')}>
          <Ionicons name="headset" size={24} color="#1A365D" style={styles.icon} />
          <View>
            <Text style={styles.secondaryButtonText}>CONTACT SUPPORT</Text>
            <Text style={styles.secondaryButtonSubText}>Get help from PalmTech</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by PalmTech Group Ltd.</Text>
        <Text style={styles.footerText}>Version 1.0.0 | International Standard</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8', justifyContent: 'space-between' },
  header: { alignItems: 'center', marginTop: 80, paddingHorizontal: 20 },
  logo: { width: 120, height: 120, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '900', color: '#1A365D', textAlign: 'center', letterSpacing: 1 },
  subtitle: { fontSize: 14, color: '#718096', marginTop: 8, fontWeight: 'bold', textTransform: 'uppercase' },
  buttonContainer: { paddingHorizontal: 25, marginTop: 40 },
  icon: { marginRight: 15 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A365D', padding: 20, borderRadius: 16, marginBottom: 15, shadowColor: '#1A365D', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  buttonSubText: { color: '#E2E8F0', fontSize: 12, marginTop: 2 },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  secondaryButtonText: { color: '#1A365D', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  secondaryButtonSubText: { color: '#718096', fontSize: 12, marginTop: 2 },
  footer: { alignItems: 'center', marginBottom: 30 },
  footerText: { color: '#A0AEC0', fontSize: 12, fontWeight: '600', marginTop: 4 }
});