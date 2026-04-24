import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="manual" />
      <Stack.Screen name="contact" />
      <Stack.Screen name="student-dashboard" />
      <Stack.Screen name="teacher-dashboard" />
      <Stack.Screen name="super-admin" /> {/* 🚨 ADDED SUPER ADMIN HERE! */}
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}