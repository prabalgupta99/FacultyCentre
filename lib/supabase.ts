import { createClient } from '@supabase/supabase-js';

// Your Supabase credentials
const SUPABASE_URL = 'https://hkcbqmbvgysrhtxjwiro.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrY2JxbWJ2Z3lzcmh0eGp3aXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMjMyNTAsImV4cCI6MjA4MDY5OTI1MH0.wgUYfb-zJeTHyx9WLYyzIWF-k2zswYw3f9z1b16WnHM';

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
