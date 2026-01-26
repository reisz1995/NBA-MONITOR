
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mvndfsdkyodhelqiszgw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_J3cpDsFRuXWYkfN70gn39Q_-nr_z-3a';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
