import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('colleges').select('id, college_name_place').ilike('college_name_place', '%RV%');
  console.log('Result:', data);
  if (error) console.error('Error:', error);
}
check();
