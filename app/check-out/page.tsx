import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Layout from '@/components/Layout';
import CheckOutForm from './CheckOutForm';
import { Suspense } from 'react';

export default async function CheckOutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  return (
    <Layout role={profile?.role ?? 'staff'}>
      <Suspense fallback={<div className="py-12 text-center" style={{ color: '#9a8fa0' }}>Loading…</div>}>
        <CheckOutForm />
      </Suspense>
    </Layout>
  );
}
