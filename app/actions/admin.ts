'use server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function inviteUser(email: string, fullName: string, role: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/login`,
  });
  if (error) throw new Error(error.message);
}

export async function setUserPassword(userId: string, password: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, { password });
  if (error) throw new Error(error.message);
}

export async function updateUserRole(userId: string, role: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}
