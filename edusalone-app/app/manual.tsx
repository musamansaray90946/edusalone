import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ManualScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.replace('/login')} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#1A365D" />
        <Text style={{ color: '#1A365D', fontWeight: 'bold', marginLeft: 5 }}>Back</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>User Manual</Text>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.heading}>1. For School Principals</Text>
          <Text style={styles.body}>As a Principal, use the Dashboard to generate your unique 'School Code'. Share this code with your Teachers and Students so they can register securely. You hold the authority to print end-of-term PDF Report Cards.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.heading}>2. For Teachers</Text>
          <Text style={styles.body}>Log into the Teacher Portal to enter Academic Grades and Affective Traits. Your data is automatically sent to the Principal for final approval before printing.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.heading}>3. For Parents & Students</Text>
          <Text style={styles.body}>Use your School Code to register. Once logged in, you can view your official PDF Report Cards and track class attendance.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8', padding: 24, paddingTop: 60 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '900', color: '#1A365D', marginBottom: 20 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, marginBottom: 15, elevation: 2 },
  heading: { fontSize: 18, fontWeight: 'bold', color: '#DD6B20', marginBottom: 8 },
  body: { fontSize: 14, color: '#4A5568', lineHeight: 22 }
});