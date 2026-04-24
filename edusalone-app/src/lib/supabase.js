import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://spilunmicwebghqldisb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwaWx1bm1pY3dlYmdocWxkaXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzQxNDEsImV4cCI6MjA5MTQxMDE0MX0.kQA262x5--VyAST-StAsuCOcgDerAm0uuXPmBNOL5-I';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});