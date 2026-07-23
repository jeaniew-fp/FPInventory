import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Layout from '@/components/Layout';
import ReportsTabs from './ReportsTabs';

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/');

  // Pre-fetch all data for reports
  const { data: items } = await supabase
    .from('inventory_items')
    .select('*')
    .order('storage_location');

  const { data: checkIns } = await supabase
    .from('check_ins')
    .select('*, inventory_items(description, category), donors(name, organization)')
    .order('date_received', { ascending: false });

  const { data: checkOuts } = await supabase
    .from('check_outs')
    .select('*, inventory_items(description, category), profiles(full_name)')
    .order('date_given', { ascending: false });

  const { data: donors } = await supabase
    .from('donors')
    .select('*')
    .order('name');

  return (
    <Layout role="admin">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: '#3a1f4a' }}>Reports</h1>
          <p className="text-sm mt-1" style={{ color: '#8a7f92' }}>Analytics and exports for FPGWC in-kind inventory</p>
        </div>
        <ReportsTabs
          items={items ?? []}
          checkIns={checkIns ?? []}
          checkOuts={checkOuts ?? []}
          donors={donors ?? []}
        />
      </div>
    </Layout>
  );
}
