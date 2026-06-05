import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Layout from '@/components/Layout';
import ReceiptGenerator from './ReceiptGenerator';

export default async function ReceiptsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <Layout role={profile?.role ?? 'case_manager'}>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Donation Receipts</h1>
          <p className="text-gray-500 text-sm mt-1">
            Search donations by donor and generate in-kind donation receipts
          </p>
        </div>
        <ReceiptGenerator staffName={profile?.full_name ?? ''} staffEmail={user.email ?? ''} />
      </div>
    </Layout>
  );
}
