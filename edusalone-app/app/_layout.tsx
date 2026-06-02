import { Stack } from 'expo-router';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="super-admin" />
        <Stack.Screen name="teacher-dashboard" />
        <Stack.Screen name="student-dashboard" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}