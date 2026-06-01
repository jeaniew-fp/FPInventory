import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Layout from '@/components/Layout';
import AdminPanel from './AdminPanel';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/');

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name');

  return (
    <Layout role="admin">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">Manage users and roles</p>
        </div>
        <AdminPanel profiles={profiles ?? []} />
      </div>
    </Layout>
  );
}
