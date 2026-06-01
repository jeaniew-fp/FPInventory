import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Layout from '@/components/Layout';
import InventoryTable from './InventoryTable';

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const { data: items } = await supabase
    .from('inventory_items')
    .select('*')
    .order('updated_at', { ascending: false });

  return (
    <Layout role={profile?.role ?? 'case_manager'}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
            <p className="text-gray-500 text-sm mt-1">
              {items?.length ?? 0} item type{items?.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <InventoryTable items={items ?? []} />
      </div>
    </Layout>
  );
}
