import { supabase } from '@/lib/supabaseClient';

export async function getHostByAuthId(authId: string) {
  const { data, error } = await supabase
    .from('hosts')
    .select('*')
    .eq('auth_id', authId)
    .single();

  if (error) {
    console.error('Error fetching host:', error);
    return null;
  }

  return data;
}
