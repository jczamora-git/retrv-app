import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://wertxmepxlozdkfriewu.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_X35InNxn0EnGtr_8HiIe5A_emvUHgsA";

export const supabase = createClient(supabaseUrl, supabaseKey);
