import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { format } from 'date-fns';

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Stats
  const { data: items } = await supabase.from('inventory_items').select('*');
  const totalItems = items?.reduce((sum, i) => sum + i.current_quantity, 0) ?? 0;
  const lowStock = items?.filter(i => i.current_quantity > 0 && i.current_quantity < 3).length ?? 0;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { data: monthCheckouts } = await supabase
    .from('check_outs')
    .select('quantity')
    .gte('date_given', startOfMonth.toISOString().split('T')[0]);
  const checkedOutThisMonth = monthCheckouts?.reduce((sum, c) => sum + c.quantity, 0) ?? 0;

  const { data: checkIns } = await supabase.from('check_ins').select('total_fmv');
  const totalValue = checkIns?.reduce((sum, c) => sum + (c.total_fmv ?? 0), 0) ?? 0;

  // Location breakdown
  const locationMap: Record<string, number> = {};
  items?.forEach(i => {
    locationMap[i.storage_location] = (locationMap[i.storage_location] ?? 0) + i.current_quantity;
  });

  // Recent activity
  const { data: recentCheckIns } = await supabase
    .from('check_ins')
    .select('*, inventory_items(description), donors(name)')
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: recentCheckOuts } = await supabase
    .from('check_outs')
    .select('*, inventory_items(description)')
    .order('created_at', { ascending: false })
    .limit(5);

  // Merge and sort by created_at
  type ActivityItem = {
    id: string;
    type: 'in' | 'out';
    description: string;
    person: string;
    date: string;
    created_at: string;
  };

  const activity: ActivityItem[] = [
    ...(recentCheckIns ?? []).map(ci => ({
      id: ci.id,
      type: 'in' as const,
      description: (ci.inventory_items as { description: string } | null)?.description ?? 'Unknown item',
      person: (ci.donors as { name: string } | null)?.name ?? 'Unknown donor',
      date: ci.date_received,
      created_at: ci.created_at,
    })),
    ...(recentCheckOuts ?? []).map(co => ({
      id: co.id,
      type: 'out' as const,
      description: (co.inventory_items as { description: string } | null)?.description ?? 'Unknown item',
      person: `${co.client_first_name} ${co.client_last_name}`,
      date: co.date_given,
      created_at: co.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  return (
    <Layout role={profile?.role ?? 'case_manager'}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: '#3a1f4a' }}>Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: '#8a7f92' }}>
            Welcome back, {profile?.full_name ?? user.email}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(150deg,#2f8fd6,#1b6cb0)', boxShadow: '0 12px 28px -16px rgba(27,108,176,.85)' }}>
            <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,.8)' }}>Items in Stock</p>
            <p className="text-4xl font-extrabold mt-3">{totalItems.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(150deg,#33b277,#2e8b57)', boxShadow: '0 12px 28px -16px rgba(46,139,87,.85)' }}>
            <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,.85)' }}>Total FMV</p>
            <p className="text-3xl font-extrabold mt-4">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(150deg,#a4569a,#8b4a72)', boxShadow: '0 12px 28px -16px rgba(139,74,114,.85)' }}>
            <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,.85)' }}>Checked Out / Mo</p>
            <p className="text-4xl font-extrabold mt-3">{checkedOutThisMonth.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(150deg,#ffbe4d,#f18f1c)', boxShadow: '0 12px 28px -16px rgba(245,166,35,.9)' }}>
            <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,.95)' }}>Low Stock Items</p>
            <p className="text-4xl font-extrabold mt-3">{lowStock.toLocaleString()}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/check-in"
            className="text-white rounded-2xl p-5 flex items-center gap-4 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(130deg,#1b6cb0,#3f9be0)', boxShadow: '0 14px 30px -16px rgba(27,108,176,.85)' }}
          >
            <div className="flex-shrink-0 flex items-center justify-center text-2xl rounded-xl" style={{ width: 48, height: 48, background: 'rgba(255,255,255,.22)' }}>📥</div>
            <div>
              <div className="font-extrabold text-lg">Check In Donation</div>
              <div className="text-sm font-medium mt-0.5" style={{ color: 'rgba(255,255,255,.82)' }}>Record an in-kind gift</div>
            </div>
          </Link>
          <Link
            href="/check-out"
            className="text-white rounded-2xl p-5 flex items-center gap-4 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(130deg,#e87d4a,#f5a623)', boxShadow: '0 14px 30px -16px rgba(232,125,74,.85)' }}
          >
            <div className="flex-shrink-0 flex items-center justify-center text-2xl rounded-xl" style={{ width: 48, height: 48, background: 'rgba(255,255,255,.28)' }}>📤</div>
            <div>
              <div className="font-extrabold text-lg">Check Out Item</div>
              <div className="text-sm font-medium mt-0.5" style={{ color: 'rgba(255,255,255,.9)' }}>Give an item to a client</div>
            </div>
          </Link>
        </div>

        {/* Inventory by Location */}
        {Object.keys(locationMap).length > 0 && (
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 10px 30px -18px rgba(58,31,74,.3)', border: '1px solid rgba(58,31,74,.05)' }}>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-extrabold text-lg" style={{ color: '#3a1f4a' }}>Inventory by Location</h2>
              <span className="text-sm font-bold" style={{ color: '#8b4a72' }}>{totalItems} items total</span>
            </div>
            <div className="space-y-2">
              {Object.entries(locationMap)
                .sort((a, b) => b[1] - a[1])
                .map(([loc, qty]) => (
                  <div key={loc} className="flex justify-between items-center rounded-xl px-4 py-3" style={{ background: '#f7f4fb' }}>
                    <span className="text-sm font-semibold" style={{ color: '#3d3540' }}>{loc}</span>
                    <span className="text-xs font-extrabold px-3 py-1 rounded-full" style={{ background: '#e3f5ea', color: '#237347' }}>
                      {qty.toLocaleString()} item{qty !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 10px 30px -18px rgba(58,31,74,.3)', border: '1px solid rgba(58,31,74,.05)' }}>
          <h2 className="font-extrabold text-lg mb-4" style={{ color: '#3a1f4a' }}>Recent Activity</h2>
          {activity.length === 0 ? (
            <p className="text-sm" style={{ color: '#a79fb0' }}>No activity yet. Start by checking in a donation!</p>
          ) : (
            <div className="space-y-3">
              {activity.map(item => (
                <div key={`${item.type}-${item.id}`} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 text-base">
                    {item.type === 'in' ? '📥' : '📤'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p style={{ color: '#2a2333' }}>
                      <span className="font-semibold">{item.description}</span>
                      <span style={{ color: '#5d5468' }}>
                        {item.type === 'in' ? ' from ' : ' to '}
                        {item.person}
                      </span>
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#9a8fa0' }}>
                      {format(new Date(item.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
